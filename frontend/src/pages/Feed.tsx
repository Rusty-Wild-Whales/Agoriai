import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ListFilter } from "lucide-react";
import { FilterBar } from "../components/feed/FilterBar";
import { PostComposer } from "../components/feed/PostComposer";
import { PostCard } from "../components/feed/PostCard";
import { PostCardSkeleton } from "../components/ui/Skeleton";
import { usePosts, useCreatePost } from "../hooks/usePosts";
import type { PostCategory } from "../types";

export default function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") ?? "recent");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const focusedPostId = searchParams.get("focus");

  const { data: posts, isLoading } = usePosts(filter, sortBy);
  const createMutation = useCreatePost();
  const urlSearchQuery = searchParams.get("q") ?? "";
  const urlSortBy = searchParams.get("sort") ?? "recent";

  useEffect(() => {
    setSearchQuery(urlSearchQuery);
  }, [urlSearchQuery]);

  useEffect(() => {
    setSortBy(urlSortBy);
  }, [urlSortBy]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    const nextParams = new URLSearchParams(searchParams);
    if (query.trim()) {
      nextParams.set("q", query);
    } else {
      nextParams.delete("q");
    }
    nextParams.set("sort", sortBy);
    setSearchParams(nextParams, { replace: true });
  };

  const handleSortChange = (nextSort: string) => {
    setSortBy(nextSort);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("sort", nextSort);
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

    return filtered;
  }, [posts, searchQuery]);

  useEffect(() => {
    if (!focusedPostId) return;
    const element = document.getElementById(`post-${focusedPostId}`);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedPostId, filteredPosts]);

  const handleCreatePost = async (post: {
    title: string;
    content: string;
    category: PostCategory;
    tags: string[];
    companyName?: string;
  }) => {
    await createMutation.mutateAsync(post);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
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
          onSortChange={handleSortChange}
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
            <PostCard key={post.id} post={post} highlighted={Boolean(focusedPostId && focusedPostId === post.id)} />
          ))
        )}
      </section>
    </div>
  );
}
