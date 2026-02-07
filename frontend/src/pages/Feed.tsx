import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Compass, ListFilter } from "lucide-react";
import { FilterBar } from "../components/feed/FilterBar";
import { PostComposer } from "../components/feed/PostComposer";
import { PostCard } from "../components/feed/PostCard";
import { PostCardSkeleton } from "../components/ui/Skeleton";
import { usePosts, useCreatePost } from "../hooks/usePosts";
import type { PostCategory } from "../types";

export default function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");

  const { data: posts, isLoading } = usePosts(filter);
  const createMutation = useCreatePost();
  const urlSearchQuery = searchParams.get("q") ?? "";

  useEffect(() => {
    setSearchQuery(urlSearchQuery);
  }, [urlSearchQuery]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    const nextParams = new URLSearchParams(searchParams);
    if (query.trim()) {
      nextParams.set("q", query);
    } else {
      nextParams.delete("q");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    const q = searchQuery.trim().toLowerCase();

    const filtered = q
      ? posts.filter((post) => {
          const matchesQuery = (value: string | undefined) => value?.toLowerCase().includes(q) ?? false;
          return (
            matchesQuery(post.title) ||
            matchesQuery(post.content) ||
            matchesQuery(post.companyName) ||
            post.tags.some((tag) => matchesQuery(tag))
          );
        })
      : posts;

    const result = [...filtered];

    if (sortBy === "upvoted") {
      result.sort((a, b) => b.upvotes - a.upvotes);
    } else if (sortBy === "discussed") {
      result.sort((a, b) => b.commentCount - a.commentCount);
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [posts, searchQuery, sortBy]);

  const handleCreatePost = (post: {
    title: string;
    content: string;
    category: PostCategory;
    tags: string[];
    companyName?: string;
  }) => {
    createMutation.mutate(post);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <section className="mosaic-surface-strong rounded-2xl p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">Community Feed</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Share practical experiences and discover what works for others.
            </p>
          </div>
          <div className="hidden rounded-lg bg-slate-100 p-2 dark:bg-slate-700/40 md:block">
            <Compass size={18} className="text-slate-600 dark:text-slate-300" />
          </div>
        </div>
      </section>

      <div data-tutorial="feed-composer">
        <PostComposer onSubmit={handleCreatePost} />
      </div>

      <section data-tutorial="feed-filters" className="mosaic-surface-strong rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <ListFilter size={14} />
          <span>Filter and sort</span>
        </div>
        <FilterBar
          activeFilter={filter}
          onFilterChange={setFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />
      </section>

      <section className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <PostCardSkeleton key={i} />)
        ) : filteredPosts.length === 0 ? (
          <div className="mosaic-surface-strong rounded-2xl px-6 py-14 text-center">
            <p className="text-lg font-medium text-slate-700 dark:text-slate-200">No posts found</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Try a different filter or search term, or publish your own post.
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </section>
    </div>
  );
}
