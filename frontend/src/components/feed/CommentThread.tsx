import { useState, useEffect } from "react";
import { ThumbsUp } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import type { Comment } from "../../types";
import { formatDate } from "../../utils/helpers";
import { mockApi } from "../../services/mockApi";

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Avatar seed={comment.authorAlias} size="sm" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary-900">
              {comment.authorAlias}
            </span>
            <span className="text-xs text-neutral-400">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm text-neutral-700 mt-1 leading-relaxed">
            {comment.content}
          </p>
          <button className="flex items-center gap-1 text-xs text-neutral-400 hover:text-accent-500 mt-1.5 transition-colors cursor-pointer">
            <ThumbsUp size={12} /> {comment.upvotes}
          </button>
        </div>
      </div>
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-neutral-200 pl-4">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <Avatar seed={reply.authorAlias} size="sm" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-primary-900">
                    {reply.authorAlias}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {formatDate(reply.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-neutral-700 mt-1">{reply.content}</p>
                <button className="flex items-center gap-1 text-xs text-neutral-400 hover:text-accent-500 mt-1.5 transition-colors cursor-pointer">
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

export function CommentThread({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mockApi.getComments(postId).then((data) => {
      setComments(data);
      setLoading(false);
    });
  }, [postId]);

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: `cm-${Date.now()}`,
      postId,
      authorId: "u1",
      authorAlias: "StellarPenguin",
      content: newComment,
      upvotes: 0,
      isAnonymous: true,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, comment]);
    setNewComment("");
  };

  return (
    <div className="p-5 space-y-4">
      {loading ? (
        <p className="text-sm text-neutral-400">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-neutral-400">No comments yet. Be the first to respond.</p>
      ) : (
        comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))
      )}

      {/* Comment input */}
      <div className="flex gap-3 pt-3 border-t border-neutral-200">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
        />
        <Button size="sm" onClick={handleSubmit} disabled={!newComment.trim()}>
          Reply
        </Button>
      </div>
    </div>
  );
}
