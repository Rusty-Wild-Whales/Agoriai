import { Search, Bell } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Input } from "../ui/Input";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/feed": "Feed",
  "/mosaic": "Mosaic",
  "/messages": "Messages",
};

export function TopNav() {
  const location = useLocation();
  const title =
    pageTitles[location.pathname] ||
    (location.pathname.startsWith("/company") ? "Company" : "Profile");

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6">
      <h1 className="font-display text-xl font-semibold text-primary-900">
        {title}
      </h1>

      <div className="flex items-center gap-4">
        <div className="w-64 hidden md:block">
          <Input
            placeholder="Search the Agora..."
            leftIcon={<Search size={16} />}
          />
        </div>
        <button className="relative p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors cursor-pointer">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
