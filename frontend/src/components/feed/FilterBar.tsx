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
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onFilterChange(cat.value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              activeFilter === cat.value
                ? "bg-primary-900 dark:bg-primary-700 text-white"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
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
          className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 text-sm text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 cursor-pointer"
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
