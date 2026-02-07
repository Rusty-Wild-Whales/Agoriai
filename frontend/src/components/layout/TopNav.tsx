import { useState } from "react";
import { Search, Bell, BellOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/feed": "Feed",
  "/nexus": "Nexus",
  "/messages": "Messages",
};

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { setActiveModal, notifications, notificationsEnabled } = useUIStore();

  const title =
    pageTitles[location.pathname] ||
    (location.pathname.startsWith("/company") ? "Company" : "Profile");

  const unreadCount = notifications.filter((n) => !n.read).length;
  const NotificationIcon = notificationsEnabled ? Bell : BellOff;

  const handleSearch = () => {
    const query = searchTerm.trim();
    if (!query) return;
    navigate(`/feed?q=${encodeURIComponent(query)}`);
  };

  return (
    <header className="h-16 mosaic-surface backdrop-blur-sm border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <h1 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
        {title}
      </h1>

      <div className="flex items-center gap-4">
        <div className="w-64 hidden md:block">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Search the Agora..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/70 dark:bg-slate-800/55 border border-slate-200/70 dark:border-slate-700/70 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 transition-colors"
            />
          </div>
        </div>
        <button
          onClick={() => {
            if (notificationsEnabled) setActiveModal("notifications");
          }}
          className={`relative p-2 rounded-xl transition-colors ${
            notificationsEnabled
              ? "text-slate-400 hover:bg-white/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              : "text-slate-300 dark:text-slate-600 cursor-not-allowed"
          }`}
          title={notificationsEnabled ? "Open notifications" : "Notifications are disabled in settings"}
        >
          <NotificationIcon size={20} />
          {notificationsEnabled && unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-amber-500 text-slate-900 rounded-full px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
