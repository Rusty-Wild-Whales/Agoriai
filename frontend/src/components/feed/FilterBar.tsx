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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onFilterChange(cat.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeFilter === cat.value
                ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
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
          className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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
