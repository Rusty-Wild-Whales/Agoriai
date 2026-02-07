import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import type { Post, Comment } from "../../types";
import { formatDate, categoryLabel } from "../../utils/helpers";
import { CommentThread } from "./CommentThread";
import { mockApi } from "../../services/mockApi";

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
  const [downvoted, setDownvoted] = useState(false);
  const [voteCount, setVoteCount] = useState(post.upvotes);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [loadingComments, setLoadingComments] = useState(false);

  // Load comments when expanded
  useEffect(() => {
    if (expanded && comments.length === 0) {
      setLoadingComments(true);
      mockApi.getComments(post.id).then((data) => {
        setComments(data);
        // Calculate total comments including replies
        const total = data.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);
        setCommentCount(total);
        setLoadingComments(false);
      });
    }
  }, [expanded, post.id, comments.length]);

  const handleUpvote = () => {
    if (upvoted) {
      // Remove upvote
      setUpvoted(false);
      setVoteCount((v) => v - 1);
    } else {
      // Add upvote, remove downvote if exists
      setUpvoted(true);
      if (downvoted) {
        setDownvoted(false);
        setVoteCount((v) => v + 2);
      } else {
        setVoteCount((v) => v + 1);
        onUpvote(post.id);
      }
    }
  };

  const handleDownvote = () => {
    if (downvoted) {
      // Remove downvote
      setDownvoted(false);
      setVoteCount((v) => v + 1);
    } else {
      // Add downvote, remove upvote if exists
      setDownvoted(true);
      if (upvoted) {
        setUpvoted(false);
        setVoteCount((v) => v - 2);
      } else {
        setVoteCount((v) => v - 1);
      }
    }
  };

  const contentPreview =
    post.content.length > 200 && !expanded
      ? post.content.slice(0, 200) + "..."
      : post.content;

  return (
    <motion.div
      layout
      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar seed={post.authorAvatarSeed} size="sm" />
          <div>
            <p className="text-sm font-medium text-primary-900 dark:text-white">
              {post.authorAlias}
            </p>
            <p className="text-xs text-neutral-400">{formatDate(post.createdAt)}</p>
          </div>
          <Badge variant={categoryVariants[post.category] || "default"} className="ml-auto">
            {categoryLabel(post.category)}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="font-display text-lg font-semibold text-primary-900 dark:text-white mb-2">
          {post.title}
        </h3>

        {/* Content */}
        <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
          {contentPreview}
        </div>
        {post.content.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-2 flex items-center gap-1 cursor-pointer"
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
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          {/* Upvote/Downvote */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
            <motion.button
              whileTap={{ scale: 1.2 }}
              onClick={handleUpvote}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                upvoted
                  ? "text-accent-500 bg-accent-50 dark:bg-accent-900/30"
                  : "text-neutral-500 hover:text-accent-500 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              }`}
            >
              <ThumbsUp size={16} fill={upvoted ? "currentColor" : "none"} />
            </motion.button>
            <span className={`min-w-[2rem] text-center text-sm font-medium ${
              voteCount > 0 ? "text-accent-600 dark:text-accent-400" :
              voteCount < 0 ? "text-red-500" : "text-neutral-500"
            }`}>
              {voteCount}
            </span>
            <motion.button
              whileTap={{ scale: 1.2 }}
              onClick={handleDownvote}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                downvoted
                  ? "text-red-500 bg-red-50 dark:bg-red-900/30"
                  : "text-neutral-500 hover:text-red-500 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              }`}
            >
              <ThumbsDown size={16} fill={downvoted ? "currentColor" : "none"} />
            </motion.button>
          </div>

          {/* Comments */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-500 dark:hover:text-primary-400 transition-colors cursor-pointer"
          >
            <MessageCircle size={16} />
            <span>{commentCount} {commentCount === 1 ? "comment" : "comments"}</span>
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
            className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30"
          >
            <CommentThread
              postId={post.id}
              comments={comments}
              loading={loadingComments}
              onCommentAdded={() => setCommentCount((c) => c + 1)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
