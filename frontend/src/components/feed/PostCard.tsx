import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import type { Post } from "../../types";
import { formatDate, categoryLabel } from "../../utils/helpers";
import { CommentThread } from "./CommentThread";

const categoryVariants: Record<string, "default" | "accent" | "success" | "warning"> = {
  "interview-experience": "accent",
  "internship-review": "success",
  "career-advice": "default",
  question: "warning",
  resource: "default",
};

interface PostCardProps {
  post: Post;
  onUpvote: (id: string) => void;
}

export function PostCard({ post, onUpvote }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [upvoted, setUpvoted] = useState(false);

  const handleUpvote = () => {
    if (!upvoted) {
      onUpvote(post.id);
      setUpvoted(true);
    }
  };

  const contentPreview =
    post.content.length > 200 && !expanded
      ? post.content.slice(0, 200) + "..."
      : post.content;

  return (
    <motion.div
      layout
      className="bg-white border border-neutral-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar seed={post.authorAvatarSeed} size="sm" />
          <div>
            <p className="text-sm font-medium text-primary-900">
              {post.authorAlias}
            </p>
            <p className="text-xs text-neutral-400">{formatDate(post.createdAt)}</p>
          </div>
          <Badge variant={categoryVariants[post.category] || "default"} className="ml-auto">
            {categoryLabel(post.category)}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="font-display text-lg font-semibold text-primary-900 mb-2">
          {post.title}
        </h3>

        {/* Content */}
        <div className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
          {contentPreview}
        </div>
        {post.content.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-primary-500 hover:text-primary-700 mt-2 flex items-center gap-1 cursor-pointer"
          >
            {expanded ? (
              <>Show less <ChevronUp size={14} /></>
            ) : (
              <>Read more <ChevronDown size={14} /></>
            )}
          </button>
        )}

        {/* Company & Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {post.companyName && (
            <Badge variant="accent">{post.companyName}</Badge>
          )}
          {post.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-5 mt-4 pt-3 border-t border-neutral-100">
          <motion.button
            whileTap={{ scale: 1.3 }}
            onClick={handleUpvote}
            className={`flex items-center gap-1.5 text-sm transition-colors cursor-pointer ${
              upvoted ? "text-accent-500" : "text-neutral-400 hover:text-accent-500"
            }`}
          >
            <ThumbsUp size={16} fill={upvoted ? "currentColor" : "none"} />
            <span>{post.upvotes + (upvoted ? 1 : 0)}</span>
          </motion.button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-primary-500 transition-colors cursor-pointer"
          >
            <MessageCircle size={16} />
            <span>{post.commentCount}</span>
          </button>
        </div>
      </div>

      {/* Comments */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-neutral-100 bg-neutral-50/50"
          >
            <CommentThread postId={post.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
