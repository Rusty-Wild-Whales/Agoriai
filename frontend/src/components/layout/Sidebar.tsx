import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  Network,
  PanelLeftClose,
  PanelLeft,
  Eye,
  EyeOff,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore, visibilityLabels } from "../../stores/authStore";
import { Avatar } from "../ui/Avatar";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/feed", icon: Newspaper, label: "Feed" },
  { to: "/nexus", icon: Network, label: "Nexus" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
];

const visibilityIcons = {
  anonymous: EyeOff,
  role: Briefcase,
  school: GraduationCap,
  realName: Eye,
};

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, setActiveModal } = useUIStore();
  const { user, visibilityLevel, getDisplayName } = useAuthStore();

  const VisibilityIcon = visibilityIcons[visibilityLevel];

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 240 : 72 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed left-0 top-0 h-screen bg-slate-900 text-white flex flex-col z-40"
    >
      {/* Logo + Collapse button */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800/50">
        <AnimatePresence mode="wait">
          {sidebarOpen ? (
            <motion.span
              key="full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-display text-xl font-bold tracking-tight text-white"
            >
              agoriai
            </motion.span>
          ) : (
            <motion.span
              key="short"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-display text-xl font-bold tracking-tight text-amber-500 w-full text-center"
            >
              A
            </motion.span>
          )}
        </AnimatePresence>
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="mx-auto mt-3 p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Expand sidebar"
        >
          <PanelLeft size={18} />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            data-tutorial={`nav-${label.toLowerCase()}`}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-slate-800/80 text-white"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon size={20} className={`shrink-0 ${isActive ? "text-amber-400" : ""}`} />
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
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User identity section */}
      <button
        onClick={() => setActiveModal("settings")}
        data-tutorial="user-profile"
        className="border-t border-slate-800/50 p-3 hover:bg-slate-800/40 transition-colors cursor-pointer text-left w-full"
      >
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
                  {getDisplayName()}
                </p>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <VisibilityIcon size={12} />
                  <span>{visibilityLabels[visibilityLevel]}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    </motion.aside>
  );
}
