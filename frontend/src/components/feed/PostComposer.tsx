import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenSquare,
  Eye,
  EyeOff,
  Send,
  X,
  Briefcase,
  Star,
  Target,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { Input, Textarea } from "../ui/Input";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Avatar } from "../ui/Avatar";
import {
  useAuthStore,
  useIsAnonymous,
  visibilityLabels,
} from "../../stores/authStore";
import type { PostCategory } from "../../types";

const categories: { value: PostCategory; label: string; icon: ReactNode }[] = [
  { value: "interview-experience", label: "Interview", icon: <Briefcase size={14} /> },
  { value: "internship-review", label: "Internship", icon: <Star size={14} /> },
  { value: "career-advice", label: "Advice", icon: <Target size={14} /> },
  { value: "question", label: "Question", icon: <HelpCircle size={14} /> },
  { value: "resource", label: "Resource", icon: <BookOpen size={14} /> },
];

interface PostComposerProps {
  onSubmit: (post: {
    title: string;
    content: string;
    category: PostCategory;
    tags: string[];
    companyName?: string;
  }) => Promise<void>;
  initialOpen?: boolean;
}

export function PostComposer({ onSubmit, initialOpen = false }: PostComposerProps) {
  const { user, visibilityLevel, getDisplayName } = useAuthStore();
  const isAnonymous = useIsAnonymous();

  const [open, setOpen] = useState(initialOpen);
  const [category, setCategory] = useState<PostCategory>("question");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setPublishing(true);
    setSubmitError(null);

    try {
      await onSubmit({
        title,
        content,
        category,
        tags,
        companyName: companyName || undefined,
      });

      setTitle("");
      setContent("");
      setCompanyName("");
      setTags([]);
      setTagInput("");
      setOpen(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to publish post.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <motion.div layout className="mosaic-surface-strong overflow-hidden rounded-2xl">
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="composer-closed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSubmitError(null);
              setOpen(true);
            }}
            className="group flex w-full cursor-pointer items-center gap-4 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/35"
          >
            <Avatar seed={user?.anonAvatarSeed || "default"} size="md" />
            <p className="flex-1 text-slate-500 transition-colors group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200">
              Share an experience, ask a question, or post a resource...
            </p>
            <div className="hidden items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 sm:flex">
              <PenSquare size={16} />
              New Post
            </div>
          </motion.button>
        ) : (
          <motion.div
            key="composer-open"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4"
          >
            <header className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700/70">
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Create Post</h3>
              <button
                onClick={() => {
                  setSubmitError(null);
                  setOpen(false);
                }}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </header>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Category
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                        category === cat.value
                          ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      }`}
                    >
                      {cat.icon}
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base font-medium"
              />

              <Textarea
                placeholder="Share the details. What worked? What should others know?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
              />

              <Input
                placeholder="Company (optional)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />

              <div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button variant="secondary" size="sm" onClick={addTag}>
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag}>
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <footer className="flex flex-col gap-3 border-t border-slate-200 pt-3 dark:border-slate-700/70 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  {isAnonymous ? <EyeOff size={15} /> : <Eye size={15} />}
                  <span>
                    Posting as <span className="font-medium text-slate-700 dark:text-slate-200">{getDisplayName()}</span>
                    {!isAnonymous && <span className="ml-1 text-xs">({visibilityLabels[visibilityLevel]})</span>}
                  </span>
                </div>

                <Button
                  onClick={() => {
                    void handleSubmit();
                  }}
                  disabled={!title.trim() || !content.trim() || publishing}
                >
                  <Send size={14} />
                  {publishing ? "Publishing..." : "Publish Post"}
                </Button>
              </footer>
              {submitError && (
                <p className="mt-2 rounded-lg border border-rose-300/70 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                  {submitError}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function CreatePostFAB({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-30 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20 md:hidden"
    >
      <PenSquare size={22} />
    </motion.button>
  );
}
