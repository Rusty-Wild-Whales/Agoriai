import { Search } from "lucide-react";
import { Input } from "../ui/Input";

const categories = [
  { value: "all", label: "All" },
  { value: "interview-experience", label: "Interviews" },
  { value: "internship-review", label: "Internships" },
  { value: "career-advice", label: "Advice" },
  { value: "question", label: "Questions" },
  { value: "resource", label: "Resources" },
];

const sortOptions = [
  { value: "recent", label: "Most Recent" },
  { value: "upvoted", label: "Most Upvoted" },
  { value: "discussed", label: "Most Discussed" },
];

interface FilterBarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function FilterBar({
  activeFilter,
  onFilterChange,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="mosaic-surface-strong rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onFilterChange(cat.value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              activeFilter === cat.value
                ? "bg-slate-900 dark:bg-slate-700 text-white"
                : "bg-slate-100/85 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by keyword or company..."
            leftIcon={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300/80 dark:border-slate-600/70 text-sm text-slate-700 dark:text-slate-300 bg-white/85 dark:bg-slate-900/60 cursor-pointer"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
