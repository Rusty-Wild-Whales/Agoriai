import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { SettingsModal } from "./SettingsModal";
import { NotificationsPanel } from "./NotificationsPanel";
import { useUIStore } from "../../stores/uiStore";

export function AppLayout() {
  const { sidebarOpen } = useUIStore();
  const location = useLocation();

  return (
    <div className="min-h-screen mosaic-shell">
      <Sidebar />
      <motion.div
        animate={{ marginLeft: sidebarOpen ? 240 : 72 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="min-h-screen flex flex-col relative z-10"
      >
        <TopNav />
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>

      {/* Global Modals */}
      <SettingsModal />
      <NotificationsPanel />
    </div>
  );
}
