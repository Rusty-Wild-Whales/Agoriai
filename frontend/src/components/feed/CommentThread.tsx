import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Reply, ThumbsUp, Trash2 } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import type { Comment } from "../../types";
import { formatDate } from "../../utils/helpers";
import { useAuthStore } from "../../stores/authStore";
import { agoraApi } from "../../services/agoraApi";
import { Markdown } from "../ui/Markdown";

function countComments(items: Comment[]): number {
  return items.reduce((total, comment) => total + 1 + countComments(comment.replies ?? []), 0);
}

function CommentItem({
  comment,
  currentUserId,
  depth = 0,
  onReply,
  onVoteChange,
  onEdit,
  onDelete,
}: {
  comment: Comment;
  currentUserId?: string;
  depth?: number;
  onReply: (parentId: string, content: string) => Promise<boolean>;
  onVoteChange: (commentId: string, nextVote: -1 | 0 | 1) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<void>;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [voting, setVoting] = useState(false);
  const [showEditInput, setShowEditInput] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [vote, setVote] = useState<-1 | 0 | 1>(comment.userVote ?? 0);
  const [upvoteCount, setUpvoteCount] = useState(comment.upvotes);

  useEffect(() => {
    setVote(comment.userVote ?? 0);
    setUpvoteCount(comment.upvotes);
    setEditText(comment.content);
  }, [comment.id, comment.content, comment.upvotes, comment.userVote]);

  const isOwnComment = currentUserId === comment.authorId;

  const handleUpvote = async () => {
    const nextVote: -1 | 0 | 1 = vote === 1 ? 0 : 1;
    const delta = nextVote - vote;
    setVote(nextVote);
    setUpvoteCount((current) => current + delta);
    setVoting(true);
    try {
      await onVoteChange(comment.id, nextVote);
    } catch (error) {
      console.error("Failed to update comment vote", error);
      setVote(vote);
      setUpvoteCount((current) => current - delta);
    } finally {
      setVoting(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim()) return;
    const success = await onReply(comment.id, replyText.trim());
    if (!success) return;
    setReplyText("");
    setShowReplyInput(false);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    const success = await onEdit(comment.id, editText.trim());
    if (!success) return;
    setShowEditInput(false);
  };

  const indentClass = depth > 0 ? "ml-8 border-l border-slate-200 pl-3 dark:border-slate-700" : "";

  return (
    <div className={`space-y-3 ${indentClass}`}>
      <div className="flex gap-3">
        <Avatar seed={comment.authorAlias} size="sm" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-900 dark:text-white">{comment.authorAlias}</span>
            <span className="text-xs text-slate-400">{formatDate(comment.createdAt)}</span>
            {(comment.authorRole || comment.authorSchool) && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {[comment.authorRole, comment.authorSchool].filter(Boolean).join(" • ")}
              </span>
            )}
          </div>

          {showEditInput ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
                className="min-h-[80px] w-full rounded-xl border border-slate-300/80 bg-white/85 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-600/70 dark:bg-slate-900/60 dark:text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowEditInput(false);
                    setEditText(comment.content);
                  }}
                  className="cursor-pointer rounded-lg px-2.5 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    void handleSaveEdit();
                  }}
                  className="cursor-pointer rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-medium text-slate-900 transition-colors hover:bg-amber-400"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <Markdown content={comment.content} className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300" />
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                void handleUpvote();
              }}
              disabled={voting}
              className={`flex cursor-pointer items-center gap-1 text-xs transition-colors ${
                vote === 1 ? "text-amber-500" : "text-slate-400 hover:text-amber-500"
              }`}
            >
              <ThumbsUp size={12} fill={vote === 1 ? "currentColor" : "none"} />
              {upvoteCount}
            </button>
            <button
              onClick={() => setShowReplyInput((prev) => !prev)}
              className="flex cursor-pointer items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
            >
              <Reply size={12} />
              Reply
            </button>
            {isOwnComment && (
              <>
                <button
                  onClick={() => setShowEditInput((prev) => !prev)}
                  className="flex cursor-pointer items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                <button
                  onClick={() => {
                    void onDelete(comment.id);
                  }}
                  className="flex cursor-pointer items-center gap-1 text-xs text-rose-400 transition-colors hover:text-rose-500"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </>
            )}
          </div>

          {showReplyInput && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleReplySubmit();
                  }
                }}
                placeholder="Write a reply..."
                className="flex-1 rounded-xl border border-slate-300/80 bg-white/85 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-600/70 dark:bg-slate-900/60 dark:text-white"
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

      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          currentUserId={currentUserId}
          depth={depth + 1}
          onReply={onReply}
          onVoteChange={onVoteChange}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

interface CommentThreadProps {
  postId: string;
  comments?: Comment[];
  error?: string | null;
  loading?: boolean;
  onCommentsCountChange?: (count: number) => void;
}

export function CommentThread({
  postId,
  comments = [],
  error = null,
  loading = false,
  onCommentsCountChange,
}: CommentThreadProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [threadComments, setThreadComments] = useState<Comment[]>(comments);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const totalComments = useMemo(() => countComments(threadComments), [threadComments]);

  useEffect(() => {
    setThreadComments(comments);
  }, [comments]);

  useEffect(() => {
    onCommentsCountChange?.(totalComments);
  }, [onCommentsCountChange, totalComments]);

  const refreshComments = async () => {
    const latest = await agoraApi.getComments(postId);
    setThreadComments(latest);
    onCommentsCountChange?.(countComments(latest));
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    setSubmissionError(null);
    try {
      await agoraApi.createComment(postId, { content: newComment.trim() });
      await refreshComments();
      setNewComment("");
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      return true;
    } catch (error) {
      console.error("Failed to submit comment", error);
      setSubmissionError(error instanceof Error ? error.message : "Failed to submit comment.");
    } finally {
      setSubmittingComment(false);
    }
    return false;
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
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
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
    const result = await agoraApi.voteComment(commentId, nextVote);

    const updateById = (items: Comment[]): Comment[] =>
      items.map((item) => {
        if (item.id === result.id) {
          return { ...item, upvotes: result.upvotes, userVote: result.userVote };
        }

        if (item.replies?.length) {
          return { ...item, replies: updateById(item.replies) };
        }

        return item;
      });

    setThreadComments((prev) => updateById(prev));
    void queryClient.invalidateQueries({ queryKey: ["current-user"] });
  };

  const handleEditComment = async (commentId: string, content: string) => {
    setSubmissionError(null);
    try {
      await agoraApi.updateComment(commentId, { content });
      await refreshComments();
      return true;
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Failed to update comment.");
      return false;
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) return;
    setSubmissionError(null);
    try {
      await agoraApi.deleteComment(commentId);
      await refreshComments();
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Failed to delete comment.");
    }
  };

  return (
    <div className="space-y-4 p-5">
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex animate-pulse gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="rounded-lg border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      ) : threadComments.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">No comments yet. Be the first to respond.</p>
      ) : (
        threadComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={user?.id}
            onReply={handleReply}
            onVoteChange={handleVoteChange}
            onEdit={handleEditComment}
            onDelete={handleDeleteComment}
          />
        ))
      )}

      <div className="flex gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
        <Avatar seed={user?.anonAvatarSeed || "default"} size="sm" />
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="Add a comment..."
            className="flex-1 rounded-xl border border-slate-300/80 bg-white/85 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-600/70 dark:bg-slate-900/60 dark:text-white"
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
