import { useState, useMemo } from "react";
import { FilterBar } from "../components/feed/FilterBar";
import { PostComposer } from "../components/feed/PostComposer";
import { PostCard } from "../components/feed/PostCard";
import { PostCardSkeleton } from "../components/ui/Skeleton";
import { usePosts, useUpvotePost, useCreatePost } from "../hooks/usePosts";
import type { PostCategory } from "../types";

export default function Feed() {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: posts, isLoading } = usePosts(filter);
  const upvoteMutation = useUpvotePost();
  const createMutation = useCreatePost();

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    let result = [...posts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.companyName?.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (sortBy === "upvoted") {
      result.sort((a, b) => b.upvotes - a.upvotes);
    } else if (sortBy === "discussed") {
      result.sort((a, b) => b.commentCount - a.commentCount);
    } else {
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
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
    <div className="max-w-3xl mx-auto space-y-4">
      <PostComposer onSubmit={handleCreatePost} />
      <FilterBar
        activeFilter={filter}
        onFilterChange={setFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-400 text-lg mb-2">No posts found</p>
            <p className="text-neutral-400 text-sm">
              The Agora is waiting for your voice. Share your first experience.
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onUpvote={(id) => upvoteMutation.mutate(id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
