import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, Building2, FileText, Search, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";
import { agoraApi } from "../../services/agoraApi";
import type { SearchResults } from "../../types";

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
  const [searchResults, setSearchResults] = useState<SearchResults>({ users: [], companies: [], posts: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { setActiveModal, notifications, notificationsEnabled } = useUIStore();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const title = pageTitles[location.pathname] || (location.pathname.startsWith("/company") ? "Company" : "Profile");
  const unreadCount = notifications.filter((n) => !n.read).length;
  const NotificationIcon = notificationsEnabled ? Bell : BellOff;

  const totalResults = useMemo(
    () => searchResults.users.length + searchResults.companies.length + searchResults.posts.length,
    [searchResults]
  );

  useEffect(() => {
    const query = searchTerm.trim();
    if (!query) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void agoraApi
        .searchEverything(query, 5)
        .then((results) => {
          if (!cancelled) {
            setSearchResults(results);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            console.error("Search failed", error);
            setSearchResults({ users: [], companies: [], posts: [] });
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearchLoading(false);
          }
        });
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const handleSearch = () => {
    const query = searchTerm.trim();
    if (!query) return;
    setShowResults(false);
    navigate(`/feed?q=${encodeURIComponent(query)}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 px-4 md:px-6 dark:border-slate-800 mosaic-surface">
      <div className="min-w-0">
        <h1 className="font-display text-[1.35rem] font-semibold leading-none text-slate-900 dark:text-white">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div ref={searchContainerRef} className="relative hidden w-80 md:block">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setShowResults(true)}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSearchTerm(nextValue);
                if (!nextValue.trim()) {
                  setSearchResults({ users: [], companies: [], posts: [] });
                  setSearchLoading(false);
                } else {
                  setSearchLoading(true);
                }
                setShowResults(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearch();
                } else if (event.key === "Escape") {
                  setShowResults(false);
                }
              }}
              placeholder="Search users, companies, posts..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          {showResults && searchTerm.trim() && (
            <div className="mosaic-panel absolute right-0 top-[calc(100%+0.5rem)] z-50 max-h-[60vh] w-[440px] overflow-y-auto rounded-2xl p-3">
              {searchLoading ? (
                <p className="px-1 py-2 text-sm text-slate-500 dark:text-slate-400">Searching...</p>
              ) : totalResults === 0 ? (
                <p className="px-1 py-2 text-sm text-slate-500 dark:text-slate-400">No matching users, companies, or posts.</p>
              ) : (
                <div className="space-y-3">
                  {searchResults.users.length > 0 && (
                    <div>
                      <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Users
                      </p>
                      <div className="space-y-1">
                        {searchResults.users.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => {
                              setShowResults(false);
                              navigate(`/profile/${result.id}`);
                            }}
                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <UserRound size={14} className="text-slate-500 dark:text-slate-400" />
                            <span className="text-sm text-slate-900 dark:text-white">{result.realName || result.anonAlias}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.companies.length > 0 && (
                    <div>
                      <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Companies
                      </p>
                      <div className="space-y-1">
                        {searchResults.companies.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => {
                              setShowResults(false);
                              navigate(`/company/${result.id}`);
                            }}
                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Building2 size={14} className="text-slate-500 dark:text-slate-400" />
                            <span className="text-sm text-slate-900 dark:text-white">{result.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.posts.length > 0 && (
                    <div>
                      <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Posts
                      </p>
                      <div className="space-y-1">
                        {searchResults.posts.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => {
                              setShowResults(false);
                              navigate(`/feed?sort=trending&focus=${encodeURIComponent(result.id)}`);
                            }}
                            className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <FileText size={14} className="mt-0.5 text-slate-500 dark:text-slate-400" />
                            <span className="line-clamp-2 text-sm text-slate-900 dark:text-white">{result.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            if (notificationsEnabled) setActiveModal("notifications");
          }}
          className={`relative rounded-xl p-2 transition-colors ${
            notificationsEnabled
              ? "cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              : "cursor-not-allowed text-slate-300 dark:text-slate-600"
          }`}
          title={notificationsEnabled ? "Open notifications" : "Notifications are disabled in settings"}
        >
          <NotificationIcon size={20} />
          {notificationsEnabled && unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-slate-900">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
