import { useEffect, useRef, useState } from "react";
import { ThumbsUp, Reply } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import type { Comment } from "../../types";
import { formatDate } from "../../utils/helpers";
import { useAuthStore, useIsAnonymous } from "../../stores/authStore";

function CommentItem({ comment, onReply }: { comment: Comment; onReply?: (content: string) => void }) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(comment.upvotes);

  const handleUpvote = () => {
    if (upvoted) {
      setUpvoted(false);
      setUpvoteCount((c) => c - 1);
    } else {
      setUpvoted(true);
      setUpvoteCount((c) => c + 1);
    }
  };

  const handleReplySubmit = () => {
    if (replyText.trim() && onReply) {
      onReply(replyText);
      setReplyText("");
      setShowReplyInput(false);
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
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
            {comment.content}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleUpvote}
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
                onKeyDown={(e) => e.key === "Enter" && handleReplySubmit()}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300/80 dark:border-slate-600/70 bg-white/85 dark:bg-slate-900/60 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <Button size="sm" onClick={handleReplySubmit} disabled={!replyText.trim()}>
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
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                  {reply.content}
                </p>
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
  loading?: boolean;
  onCommentAdded?: () => void;
}

export function CommentThread({ postId, comments = [], loading = false, onCommentAdded }: CommentThreadProps) {
  const { user, getDisplayName } = useAuthStore();
  const isAnonymous = useIsAnonymous();
  const [threadComments, setThreadComments] = useState<Comment[]>(comments);
  const [addedComments, setAddedComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const nextCommentId = useRef(0);

  useEffect(() => {
    setThreadComments(comments);
  }, [comments]);

  const createComment = (content: string): Comment => ({
    id: `cm-${postId}-${nextCommentId.current++}`,
    postId,
    authorId: user?.id || "u1",
    authorAlias: getDisplayName(),
    content,
    upvotes: 0,
    isAnonymous,
    createdAt: new Date().toISOString(),
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    const comment = createComment(newComment.trim());
    setAddedComments((prev) => [...prev, comment]);
    setNewComment("");
    onCommentAdded?.();
  };

  const handleReply = (parentId: string, content: string) => {
    const reply = createComment(content.trim());
    const appendReply = (items: Comment[]): Comment[] =>
      items.map((item) => {
        if (item.id === parentId) {
          return {
            ...item,
            replies: [...(item.replies || []), reply],
          };
        }

        if (item.replies?.length) {
          return {
            ...item,
            replies: appendReply(item.replies),
          };
        }

        return item;
      });

    setThreadComments((prev) => appendReply(prev));
    setAddedComments((prev) => appendReply(prev));
    onCommentAdded?.();
  };

  const displayComments = [...threadComments, ...addedComments];

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
      ) : displayComments.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">
          No comments yet. Be the first to respond.
        </p>
      ) : (
        displayComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={(content) => handleReply(comment.id, content)}
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
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 rounded-xl border border-slate-300/80 dark:border-slate-600/70 bg-white/85 dark:bg-slate-900/60 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
          <Button size="sm" onClick={handleSubmit} disabled={!newComment.trim()}>
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
