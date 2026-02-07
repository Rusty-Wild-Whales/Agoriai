import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import type { Post, Comment } from "../../types";
import { formatDate, categoryLabel } from "../../utils/helpers";
import { CommentThread } from "./CommentThread";
import { agoraApi } from "../../services/agoraApi";
import { Markdown } from "../ui/Markdown";
import { useAuthStore } from "../../stores/authStore";

const categoryVariants: Record<string, "default" | "accent" | "success" | "warning"> = {
  "interview-experience": "accent",
  "internship-review": "success",
  "career-advice": "default",
  question: "warning",
  resource: "default",
};

interface PostCardProps {
  post: Post;
  highlighted?: boolean;
}

export function PostCard({ post, highlighted = false }: PostCardProps) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [showFullContent, setShowFullContent] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [vote, setVote] = useState<-1 | 0 | 1>(post.userVote ?? 0);
  const [voteCount, setVoteCount] = useState(post.upvotes);
  const [draftTitle, setDraftTitle] = useState(post.title);
  const [draftContent, setDraftContent] = useState(post.content);
  const [draftCompany, setDraftCompany] = useState(post.companyName ?? "");
  const [draftTags, setDraftTags] = useState(post.tags.join(", "));
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const isOwnPost = currentUser?.id === post.authorId;

  useEffect(() => {
    setVote(post.userVote ?? 0);
    setVoteCount(post.upvotes);
    setDraftTitle(post.title);
    setDraftContent(post.content);
    setDraftCompany(post.companyName ?? "");
    setDraftTags(post.tags.join(", "));
    setEditing(false);
    setEditError(null);
  }, [post.id, post.upvotes, post.userVote, post.title, post.content, post.companyName, post.tags]);

  const loadComments = async () => {
    if (comments.length > 0) return;

    setLoadingComments(true);
    setCommentsError(null);
    try {
      const data = await agoraApi.getComments(post.id);
      setComments(data);
      const total = data.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);
      setCommentCount(total);
    } catch (error) {
      console.error("Failed to load comments", error);
      setCommentsError(error instanceof Error ? error.message : "Failed to load comments.");
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

  const handleVote = async (nextVote: -1 | 1) => {
    const previousVote = vote;
    const resolvedVote: -1 | 0 | 1 = vote === nextVote ? 0 : nextVote;
    const delta = resolvedVote - previousVote;

    setVote(resolvedVote);
    setVoteCount((value) => value + delta);

    try {
      const response = await agoraApi.votePost(post.id, resolvedVote);
      setVote(response.userVote);
      setVoteCount(response.upvotes);
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      console.error("Failed to update vote", error);
      setVote(previousVote);
      setVoteCount((value) => value - delta);
    }
  };

  const handleSaveEdit = async () => {
    const title = draftTitle.trim();
    const content = draftContent.trim();
    if (!title || !content) {
      setEditError("Title and content are required.");
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    try {
      const trimmedCompany = draftCompany.trim();
      const shouldClearCompany = !trimmedCompany && Boolean(post.companyId);
      await agoraApi.updatePost(post.id, {
        title,
        content,
        tags: draftTags
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
        companyId: shouldClearCompany ? null : undefined,
        companyName: trimmedCompany || undefined,
      });
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Unable to save post changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePost = async () => {
    const confirmed = window.confirm("Delete this post permanently?");
    if (!confirmed) return;

    try {
      await agoraApi.deletePost(post.id);
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Unable to delete post.");
    }
  };

  const contentPreview =
    post.content.length > 200 && !showFullContent
      ? `${post.content.slice(0, 200)}...`
      : post.content;

  return (
    <motion.article
      layout
      id={`post-${post.id}`}
      className={`mosaic-surface-strong overflow-hidden rounded-2xl transition-all ${
        highlighted ? "ring-2 ring-amber-500/70 shadow-[0_0_0_1px_rgba(245,158,11,0.4)]" : ""
      }`}
    >
      <div className="p-4 md:p-5">
        <header className="mb-3 flex items-center gap-3">
          <Avatar seed={post.authorAvatarSeed} size="sm" />
          <div>
            <Link
              to={`/profile/${post.authorId}`}
              className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline dark:text-white"
            >
              {post.authorAlias}
            </Link>
            {(post.authorRole || post.authorSchool) && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {[post.authorRole, post.authorSchool].filter(Boolean).join(" • ")}
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(post.createdAt)}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isOwnPost && (
              <>
                <button
                  onClick={() => {
                    setEditing((prev) => !prev);
                    setEditError(null);
                  }}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-white"
                  title="Edit post"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => {
                    void handleDeletePost();
                  }}
                  className="cursor-pointer rounded-lg p-1.5 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  title="Delete post"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
            <Badge variant={categoryVariants[post.category] || "default"}>{categoryLabel(post.category)}</Badge>
          </div>
        </header>

        {editing ? (
          <div className="space-y-3">
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Post title"
            />
            <textarea
              value={draftContent}
              onChange={(event) => setDraftContent(event.target.value)}
              className="min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Post content"
            />
            <div className="grid gap-2 md:grid-cols-2">
              <input
                value={draftCompany}
                onChange={(event) => setDraftCompany(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="Company (optional)"
              />
              <input
                value={draftTags}
                onChange={(event) => setDraftTags(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="tags, separated, by commas"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setEditing(false);
                  setDraftTitle(post.title);
                  setDraftContent(post.content);
                  setDraftCompany(post.companyName ?? "");
                  setDraftTags(post.tags.join(", "));
                  setEditError(null);
                }}
                className="cursor-pointer rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void handleSaveEdit();
                }}
                disabled={savingEdit}
                className="cursor-pointer rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-400 disabled:opacity-60"
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
            </div>
            {editError && (
              <p className="rounded-lg border border-rose-300/70 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                {editError}
              </p>
            )}
          </div>
        ) : (
          <>
            <h3 className="mb-2 font-display text-xl font-semibold text-slate-900 dark:text-white">{post.title}</h3>

            <Markdown
              content={contentPreview}
              className="text-sm leading-relaxed text-slate-700 dark:text-slate-300"
            />

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
          </>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.companyId && post.companyName && (
            <Link to={`/company/${post.companyId}`}>
              <Badge variant="accent" className="cursor-pointer hover:brightness-110">
                {post.companyName}
              </Badge>
            </Link>
          )}
          {post.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>

        <footer className="mt-4 flex items-center gap-4 border-t border-slate-200/80 pt-3 dark:border-slate-700/70">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <motion.button
              whileTap={{ scale: 1.12 }}
              onClick={() => {
                void handleVote(1);
              }}
              className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                vote === 1
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                  : "text-slate-500 hover:bg-slate-200 hover:text-amber-600 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <ThumbsUp size={16} fill={vote === 1 ? "currentColor" : "none"} />
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
              onClick={() => {
                void handleVote(-1);
              }}
              className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                vote === -1
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                  : "text-slate-500 hover:bg-slate-200 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <ThumbsDown size={16} fill={vote === -1 ? "currentColor" : "none"} />
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
              error={commentsError}
              loading={loadingComments}
              onCommentsCountChange={setCommentCount}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
