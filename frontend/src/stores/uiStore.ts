import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Notification {
  id: string;
  type: "info" | "success" | "warning";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  feedFilter: string;
  darkMode: boolean;
  notifications: Notification[];
  setSidebarOpen: (open: boolean) => void;
  setActiveModal: (modal: string | null) => void;
  setFeedFilter: (filter: string) => void;
  setDarkMode: (dark: boolean) => void;
  toggleDarkMode: () => void;
  addNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

// Initial mock notifications
const initialNotifications: Notification[] = [
  {
    id: "n1",
    type: "success",
    title: "Welcome to Agoriai!",
    message: "Start by exploring the feed and sharing your experiences.",
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "n2",
    type: "info",
    title: "New post trending",
    message: "Your bookmarked topic 'System Design' has a new popular post.",
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "n3",
    type: "info",
    title: "Connection request",
    message: "Someone wants to connect with you based on your contributions.",
    read: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      activeModal: null,
      feedFilter: "all",
      darkMode: true, // Default to dark mode for the app aesthetic
      notifications: initialNotifications,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setActiveModal: (modal) => set({ activeModal: modal }),
      setFeedFilter: (filter) => set({ feedFilter: filter }),
      setDarkMode: (dark) => {
        set({ darkMode: dark });
        // Immediately update the DOM
        if (dark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },
      toggleDarkMode: () => {
        const newValue = !get().darkMode;
        set({ darkMode: newValue });
        // Immediately update the DOM
        if (newValue) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: `n${Date.now()}`,
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ],
        })),
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: "agoriai-ui-store",
      partialize: (state) => ({ darkMode: state.darkMode }),
      onRehydrateStorage: () => (state) => {
        // When state is rehydrated from storage, sync the DOM
        if (state) {
          if (state.darkMode) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
      },
    }
  )
);
