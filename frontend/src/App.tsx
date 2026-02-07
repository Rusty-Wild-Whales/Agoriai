import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AppLayout } from "./components/layout/AppLayout";
import { useAuthStore } from "./stores/authStore";
import { useUIStore } from "./stores/uiStore";
import { TutorialProvider } from "./components/tutorial/TutorialProvider";
import { agoraApi } from "./services/agoraApi";

const Landing = lazy(() => import("./pages/Landing"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Feed = lazy(() => import("./pages/Feed"));
const Nexus = lazy(() => import("./pages/Nexus"));
const CompanyProfile = lazy(() => import("./pages/CompanyProfile"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Messages = lazy(() => import("./pages/Messages"));

// Global dark mode synchronizer - runs on all pages
function DarkModeSync({ children }: { children: React.ReactNode }) {
  const darkMode = useUIStore((state) => state.darkMode);

  useEffect(() => {
    // Sync dark mode class with state
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return <>{children}</>;
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { setUser, isAuthenticated, user, logout } = useAuthStore();
  const [initializing, setInitializing] = useState(() => {
    const token = localStorage.getItem("auth_token");
    return Boolean(token && !(isAuthenticated && user));
  });

  useEffect(() => {
    const token = localStorage.getItem("auth_token");

    if (!token) {
      if (isAuthenticated) {
        logout();
      }
      return;
    }

    if (isAuthenticated && user) {
      return;
    }

    let cancelled = false;
    void agoraApi
      .getCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setUser(user);
        }
      })
      .catch((error) => {
        console.error("Failed to initialize auth user", error);
        if (!cancelled) {
          logout();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setInitializing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setUser, isAuthenticated, user, logout]);

  if (initializing) {
    return <RouteFallback />;
  }

  return <>{children}</>;
}

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
      Loading...
    </div>
  );
}

function withRouteFallback(node: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DarkModeSync>
        <AuthInitializer>
          <BrowserRouter>
            <TutorialProvider>
              <Routes>
                <Route path="/" element={withRouteFallback(<Landing />)} />
                <Route path="/onboarding" element={withRouteFallback(<Onboarding />)} />
                <Route
                  element={
                    <RequireAuth>
                      <AppLayout />
                    </RequireAuth>
                  }
                >
                  <Route path="/dashboard" element={withRouteFallback(<Dashboard />)} />
                  <Route path="/feed" element={withRouteFallback(<Feed />)} />
                  <Route path="/nexus" element={withRouteFallback(<Nexus />)} />
                  <Route path="/company/:id" element={withRouteFallback(<CompanyProfile />)} />
                  <Route path="/profile/:id" element={withRouteFallback(<UserProfile />)} />
                  <Route path="/messages" element={withRouteFallback(<Messages />)} />
                </Route>
              </Routes>
            </TutorialProvider>
          </BrowserRouter>
        </AuthInitializer>
      </DarkModeSync>
    </QueryClientProvider>
  );
}
