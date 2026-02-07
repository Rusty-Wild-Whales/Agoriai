import { Search, Bell } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/feed": "Feed",
  "/nexus": "Nexus",
  "/messages": "Messages",
};

export function TopNav() {
  const location = useLocation();
  const { setActiveModal, notifications } = useUIStore();

  const title =
    pageTitles[location.pathname] ||
    (location.pathname.startsWith("/company") ? "Company" : "Profile");

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-16 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-6">
      <h1 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
        {title}
      </h1>

      <div className="flex items-center gap-4">
        <div className="w-64 hidden md:block">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search the Agora..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
        </div>
        <button
          onClick={() => setActiveModal("notifications")}
          className="relative p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-amber-500 text-slate-900 rounded-full px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
