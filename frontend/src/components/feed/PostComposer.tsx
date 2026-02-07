import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenSquare, Eye, EyeOff, Send, X, Sparkles, Briefcase, Star, Target, HelpCircle, BookOpen } from "lucide-react";
import { Input, Textarea } from "../ui/Input";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Avatar } from "../ui/Avatar";
import { useAuthStore, useIsAnonymous, visibilityLabels } from "../../stores/authStore";
import type { PostCategory } from "../../types";

const categories: { value: PostCategory; label: string; icon: ReactNode }[] = [
  { value: "interview-experience", label: "Interview Experience", icon: <Briefcase size={14} /> },
  { value: "internship-review", label: "Internship Review", icon: <Star size={14} /> },
  { value: "career-advice", label: "Career Advice", icon: <Target size={14} /> },
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
  }) => void;
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

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    onSubmit({
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
    setOpen(false);
  };

  return (
    <motion.div
      layout
      className="mosaic-surface-strong rounded-2xl overflow-hidden"
    >
      {/* Collapsed State - Inviting CTA */}
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="closed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(true)}
            className="w-full flex items-center gap-4 p-4 text-left cursor-pointer hover:bg-white/80 dark:hover:bg-slate-800 transition-colors group"
          >
            <Avatar seed={user?.anonAvatarSeed || "default"} size="md" />
            <div className="flex-1">
              <p className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors">
                Share your experience, ask a question, or help others...
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-medium text-sm transition-colors">
              <PenSquare size={16} />
              <span>New Post</span>
            </div>
          </motion.button>
        ) : (
          <motion.div
            key="open"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200/70 dark:border-slate-700/70">
              <div className="flex items-center gap-3">
                <Sparkles size={18} className="text-amber-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Create a Post</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Category Selection */}
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                  What are you sharing?
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                        category === cat.value
                          ? "bg-slate-900 dark:bg-slate-700 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <Input
                  placeholder="Give your post a title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-medium"
                />
              </div>

              {/* Content */}
              <Textarea
                placeholder="Share the details... What did you learn? What would help others?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
              />

              {/* Company (Optional) */}
              <Input
                placeholder="Company name (optional)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />

              {/* Tags */}
              <div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tags to help others find your post..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button variant="secondary" size="sm" onClick={addTag}>
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag}>
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200/70 dark:border-slate-700/70">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  {isAnonymous ? <EyeOff size={16} /> : <Eye size={16} />}
                  <span>
                    Posting as{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-400">
                      {getDisplayName()}
                    </span>
                    {!isAnonymous && (
                      <span className="text-xs ml-1">({visibilityLabels[visibilityLevel]})</span>
                    )}
                  </span>
                </div>
                <Button onClick={handleSubmit} disabled={!title.trim() || !content.trim()}>
                  <Send size={14} /> Publish Post
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Floating Action Button for mobile/quick access
export function CreatePostFAB({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-full shadow-lg flex items-center justify-center cursor-pointer z-30 md:hidden"
    >
      <PenSquare size={24} />
    </motion.button>
  );
}
