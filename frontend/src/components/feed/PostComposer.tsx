import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Eye, EyeOff, Send } from "lucide-react";
import { Input, Textarea } from "../ui/Input";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { useAuthStore } from "../../stores/authStore";
import type { PostCategory } from "../../types";

const categories: { value: PostCategory; label: string }[] = [
  { value: "interview-experience", label: "Interview Experience" },
  { value: "internship-review", label: "Internship Review" },
  { value: "career-advice", label: "Career Advice" },
  { value: "question", label: "Question" },
  { value: "resource", label: "Resource" },
];

interface PostComposerProps {
  onSubmit: (post: {
    title: string;
    content: string;
    category: PostCategory;
    tags: string[];
    companyName?: string;
  }) => void;
}

export function PostComposer({ onSubmit }: PostComposerProps) {
  const { isAnonymous } = useAuthStore();
  const [open, setOpen] = useState(false);
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
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-neutral-50 transition-colors"
      >
        <span className="text-sm text-neutral-500">
          {open ? "Composing a new post..." : "What did you learn in your last interview?"}
        </span>
        {open ? <ChevronUp size={18} className="text-neutral-400" /> : <ChevronDown size={18} className="text-neutral-400" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-neutral-100"
          >
            <div className="p-4 space-y-4">
              {/* Category */}
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      category === cat.value
                        ? "bg-primary-900 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <Input
                placeholder="Post title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <Textarea
                placeholder="Share your experience, advice, or question..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />

              <Input
                placeholder="Company (optional)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />

              {/* Tags */}
              <div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
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
                          className="ml-1 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                        >
                          x
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  {isAnonymous ? <EyeOff size={14} /> : <Eye size={14} />}
                  Posting as {isAnonymous ? "anonymous" : "yourself"}
                </div>
                <Button onClick={handleSubmit} disabled={!title.trim() || !content.trim()}>
                  <Send size={14} /> Post
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
