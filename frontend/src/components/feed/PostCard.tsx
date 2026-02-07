import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
  const [showFullContent, setShowFullContent] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const [downvoted, setDownvoted] = useState(false);
  const [voteCount, setVoteCount] = useState(post.upvotes);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [loadingComments, setLoadingComments] = useState(false);

  const loadComments = async () => {
    if (comments.length > 0) return;

    setLoadingComments(true);
    try {
      const data = await mockApi.getComments(post.id);
      setComments(data);
      const total = data.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);
      setCommentCount(total);
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    const nextOpen = !showComments;
    setShowComments(nextOpen);
    if (nextOpen) {
      void loadComments();
    }
  };

  const handleUpvote = () => {
    if (upvoted) {
      setUpvoted(false);
      setVoteCount((value) => value - 1);
      return;
    }

    setUpvoted(true);
    if (downvoted) {
      setDownvoted(false);
      setVoteCount((value) => value + 2);
    } else {
      setVoteCount((value) => value + 1);
    }
    onUpvote(post.id);
  };

  const handleDownvote = () => {
    if (downvoted) {
      setDownvoted(false);
      setVoteCount((value) => value + 1);
      return;
    }

    setDownvoted(true);
    if (upvoted) {
      setUpvoted(false);
      setVoteCount((value) => value - 2);
    } else {
      setVoteCount((value) => value - 1);
    }
  };

  const contentPreview =
    post.content.length > 200 && !showFullContent
      ? `${post.content.slice(0, 200)}...`
      : post.content;

  return (
    <motion.article layout className="mosaic-surface-strong overflow-hidden rounded-2xl">
      <div className="p-4 md:p-5">
        <header className="mb-3 flex items-center gap-3">
          <Avatar seed={post.authorAvatarSeed} size="sm" />
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{post.authorAlias}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(post.createdAt)}</p>
          </div>
          <Badge variant={categoryVariants[post.category] || "default"} className="ml-auto">
            {categoryLabel(post.category)}
          </Badge>
        </header>

        <h3 className="mb-2 font-display text-xl font-semibold text-slate-900 dark:text-white">{post.title}</h3>

        <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {contentPreview}
        </div>

        {post.content.length > 200 && (
          <button
            onClick={() => setShowFullContent((prev) => !prev)}
            className="mt-2 inline-flex cursor-pointer items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {showFullContent ? (
              <>
                Show less
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                Read more
                <ChevronDown size={14} />
              </>
            )}
          </button>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.companyName && <Badge variant="accent">{post.companyName}</Badge>}
          {post.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>

        <footer className="mt-4 flex items-center gap-4 border-t border-slate-200/80 pt-3 dark:border-slate-700/70">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <motion.button
              whileTap={{ scale: 1.12 }}
              onClick={handleUpvote}
              className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                upvoted
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                  : "text-slate-500 hover:bg-slate-200 hover:text-amber-600 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <ThumbsUp size={16} fill={upvoted ? "currentColor" : "none"} />
            </motion.button>

            <span
              className={`min-w-[2rem] text-center text-sm font-medium ${
                voteCount > 0
                  ? "text-amber-700 dark:text-amber-400"
                  : voteCount < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-500 dark:text-slate-300"
              }`}
            >
              {voteCount}
            </span>

            <motion.button
              whileTap={{ scale: 1.12 }}
              onClick={handleDownvote}
              className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                downvoted
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                  : "text-slate-500 hover:bg-slate-200 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <ThumbsDown size={16} fill={downvoted ? "currentColor" : "none"} />
            </motion.button>
          </div>

          <button
            onClick={toggleComments}
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
          >
            <MessageCircle size={16} />
            <span>
              {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </span>
          </button>
        </footer>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-200/80 bg-slate-50/70 dark:border-slate-700/70 dark:bg-slate-800/30"
          >
            <CommentThread
              postId={post.id}
              comments={comments}
              loading={loadingComments}
              onCommentAdded={() => setCommentCount((value) => value + 1)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
