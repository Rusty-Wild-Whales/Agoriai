import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AppLayout } from "./components/layout/AppLayout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Feed from "./pages/Feed";
import Mosaic from "./pages/Mosaic";
import CompanyProfile from "./pages/CompanyProfile";
import UserProfile from "./pages/UserProfile";
import Messages from "./pages/Messages";
import Onboarding from "./pages/Onboarding";
import { useEffect } from "react";
import { useAuthStore } from "./stores/authStore";
import { mockUsers } from "./mocks/data";

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { setUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      setUser(mockUsers[0]);
    }
  }, [setUser, isAuthenticated]);

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/mosaic" element={<Mosaic />} />
              <Route path="/company/:id" element={<CompanyProfile />} />
              <Route path="/profile/:id" element={<UserProfile />} />
              <Route path="/messages" element={<Messages />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthInitializer>
    </QueryClientProvider>
  );
}
