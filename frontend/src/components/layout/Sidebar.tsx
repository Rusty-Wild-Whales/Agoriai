import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  Network,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";
import { Avatar } from "../ui/Avatar";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/feed", icon: Newspaper, label: "Feed" },
  { to: "/mosaic", icon: Network, label: "Mosaic" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, isAnonymous, toggleAnonymity } = useAuthStore();

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 240 : 72 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed left-0 top-0 h-screen bg-primary-900 text-white flex flex-col z-40 border-r border-primary-800"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-primary-800">
        <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center text-primary-900 font-display font-bold text-sm shrink-0">
          a
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-display text-lg font-semibold tracking-tight"
            >
              agoriai
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary-700 text-accent-400 border-l-2 border-accent-400"
                  : "text-primary-200 hover:bg-primary-800 hover:text-white"
              }`
            }
          >
            <Icon size={20} className="shrink-0" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-medium"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="mx-2 mb-2 p-2 rounded-lg text-primary-300 hover:bg-primary-800 hover:text-white transition-colors cursor-pointer"
      >
        {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

      {/* User identity section */}
      <div className="border-t border-primary-800 p-3">
        <div className="flex items-center gap-3">
          <Avatar
            seed={user?.anonAvatarSeed || "default"}
            size="sm"
          />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-white truncate">
                  {isAnonymous
                    ? user?.anonAlias || "Anonymous"
                    : user?.realName || user?.anonAlias || "Anonymous"}
                </p>
                <button
                  onClick={toggleAnonymity}
                  className="flex items-center gap-1 text-xs text-primary-300 hover:text-accent-400 transition-colors cursor-pointer"
                >
                  {isAnonymous ? (
                    <>
                      <EyeOff size={12} /> Anonymous
                    </>
                  ) : (
                    <>
                      <Eye size={12} /> Visible
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
