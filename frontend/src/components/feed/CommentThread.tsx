import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ThumbsUp, Reply } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import type { Comment } from "../../types";
import { formatDate } from "../../utils/helpers";
import { useAuthStore } from "../../stores/authStore";
import { agoraApi } from "../../services/agoraApi";
import { Markdown } from "../ui/Markdown";

function CommentItem({
  comment,
  onReply,
  onVoteChange,
}: {
  comment: Comment;
  onReply?: (content: string) => Promise<boolean>;
  onVoteChange?: (commentId: string, nextVote: -1 | 0 | 1) => Promise<void>;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [upvoted, setUpvoted] = useState(comment.upvotes > 0);
  const [upvoteCount, setUpvoteCount] = useState(comment.upvotes);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    setUpvoted(comment.upvotes > 0);
    setUpvoteCount(comment.upvotes);
  }, [comment.id, comment.upvotes]);

  const handleUpvote = async () => {
    const nextVote: -1 | 0 | 1 = upvoted ? 0 : 1;
    const delta = nextVote === 1 ? 1 : -1;
    setUpvoted(nextVote === 1);
    setUpvoteCount((current) => current + delta);

    try {
      setVoting(true);
      await onVoteChange?.(comment.id, nextVote);
    } catch (error) {
      console.error("Failed to update comment vote", error);
      setUpvoted((current) => !current);
      setUpvoteCount((current) => current - delta);
    } finally {
      setVoting(false);
    }
  };

  const handleReplySubmit = async () => {
    if (replyText.trim() && onReply) {
      const success = await onReply(replyText);
      if (success) {
        setReplyText("");
        setShowReplyInput(false);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Avatar seed={comment.authorAlias} size="sm" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {comment.authorAlias}
            </span>
            <span className="text-xs text-slate-400">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <Markdown
            content={comment.content}
            className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => {
                void handleUpvote();
              }}
              disabled={voting}
              className={`flex items-center gap-1 text-xs transition-colors cursor-pointer ${
                upvoted ? "text-amber-500" : "text-slate-400 hover:text-amber-500"
              }`}
            >
              <ThumbsUp size={12} fill={upvoted ? "currentColor" : "none"} />
              {upvoteCount}
            </button>
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-500 dark:hover:text-slate-400 transition-colors cursor-pointer"
            >
              <Reply size={12} />
              Reply
            </button>
          </div>

          {/* Reply Input */}
          {showReplyInput && (
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleReplySubmit();
                  }
                }}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300/80 dark:border-slate-600/70 bg-white/85 dark:bg-slate-900/60 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <Button
                size="sm"
                onClick={() => {
                  void handleReplySubmit();
                }}
                disabled={!replyText.trim()}
              >
                Reply
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-slate-200 dark:border-slate-700 pl-4">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <Avatar seed={reply.authorAlias} size="sm" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {reply.authorAlias}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDate(reply.createdAt)}
                  </span>
                </div>
                <Markdown content={reply.content} className="mt-1 text-sm text-slate-700 dark:text-slate-300" />
                <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 mt-1.5 transition-colors cursor-pointer">
                  <ThumbsUp size={12} /> {reply.upvotes}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentThreadProps {
  postId: string;
  comments?: Comment[];
  error?: string | null;
  loading?: boolean;
  onCommentAdded?: () => void;
}

export function CommentThread({
  postId,
  comments = [],
  error = null,
  loading = false,
  onCommentAdded,
}: CommentThreadProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [threadComments, setThreadComments] = useState<Comment[]>(comments);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    setThreadComments(comments);
  }, [comments]);

  const refreshComments = async () => {
    const latest = await agoraApi.getComments(postId);
    setThreadComments(latest);
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    setSubmissionError(null);
    try {
      await agoraApi.createComment(postId, {
        content: newComment.trim(),
      });
      await refreshComments();
      setNewComment("");
      onCommentAdded?.();
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
    } catch (error) {
      console.error("Failed to submit comment", error);
      setSubmissionError(error instanceof Error ? error.message : "Failed to submit comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReply = async (parentId: string, content: string): Promise<boolean> => {
    setSubmittingComment(true);
    setSubmissionError(null);
    try {
      await agoraApi.createComment(postId, {
        content: content.trim(),
        parentCommentId: parentId,
      });
      await refreshComments();
      onCommentAdded?.();
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
      return true;
    } catch (error) {
      console.error("Failed to submit reply", error);
      setSubmissionError(error instanceof Error ? error.message : "Failed to submit reply.");
    } finally {
      setSubmittingComment(false);
    }
    return false;
  };

  const handleVoteChange = async (commentId: string, nextVote: -1 | 0 | 1) => {
    try {
      const result = await agoraApi.voteComment(commentId, nextVote);

      const updateById = (items: Comment[]): Comment[] =>
        items.map((item) => {
          if (item.id === result.id) {
            return { ...item, upvotes: result.upvotes };
          }

          if (item.replies?.length) {
            return { ...item, replies: updateById(item.replies) };
          }

          return item;
        });

      setThreadComments((prev) => updateById(prev));
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
    } catch (error) {
      console.error("Failed to vote on comment", error);
    }
  };

  return (
    <div className="p-5 space-y-4">
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="rounded-lg border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      ) : threadComments.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">
          No comments yet. Be the first to respond.
        </p>
      ) : (
        threadComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={(content) => handleReply(comment.id, content)}
            onVoteChange={handleVoteChange}
          />
        ))
      )}

      {/* Comment input */}
      <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <Avatar seed={user?.anonAvatarSeed || "default"} size="sm" />
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                void handleSubmit();
              }
            }}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 rounded-xl border border-slate-300/80 dark:border-slate-600/70 bg-white/85 dark:bg-slate-900/60 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
          <Button
            size="sm"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={!newComment.trim() || submittingComment}
          >
            Comment
          </Button>
        </div>
      </div>
      {submissionError && (
        <p className="rounded-lg border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
          {submissionError}
        </p>
      )}
    </div>
  );
}
