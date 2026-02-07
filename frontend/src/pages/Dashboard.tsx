import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  FileText,
  MessageCircle,
  ThumbsUp,
  Users,
  Star,
  PenSquare,
  HelpCircle,
  Network,
  TrendingUp,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useAuthStore } from "../stores/authStore";
import { mockPosts } from "../mocks/data";
import { formatDate, categoryLabel } from "../utils/helpers";
import { useTutorial } from "../components/tutorial/TutorialProvider";

function AnimatedCounter({ value, label, icon: Icon, accent = false }: { value: number; label: string; icon: React.ElementType; accent?: boolean }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const animationRef = useRef<number | null>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 800;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [inView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4 }}
      className={`text-center p-5 rounded-xl border transition-all ${
        accent
          ? "bg-amber-500/10 border-amber-500/30"
          : "mosaic-surface hover:border-slate-300 dark:hover:border-slate-600/50"
      }`}
    >
      <div className={`p-2.5 rounded-xl mx-auto mb-3 w-fit ${accent ? "bg-amber-500/20" : "bg-slate-100 dark:bg-slate-700/50"}`}>
        <Icon
          size={20}
          className={accent ? "text-amber-400" : "text-slate-500 dark:text-slate-400"}
        />
      </div>
      <p className={`text-3xl font-display font-bold ${accent ? "text-amber-400" : "text-slate-900 dark:text-white"}`}>
        {count}
      </p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { startTutorial, completedTutorials } = useTutorial();
  const stats = user?.stats;
  const recentPosts = mockPosts.slice(0, 5);
  const trendingPosts = [...mockPosts].sort((a, b) => b.upvotes - a.upvotes).slice(0, 5);

  const showWelcomeBanner = !completedTutorials.includes("welcome");

  // Auto-start tutorial for first-time users
  useEffect(() => {
    if (showWelcomeBanner) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        startTutorial("welcome");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [showWelcomeBanner, startTutorial]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner with Tutorial */}
      {showWelcomeBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl mosaic-surface-strong p-6"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/20 backdrop-blur-sm">
                <Sparkles size={28} className="text-amber-400" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold mb-1 text-slate-900 dark:text-white">
                  Welcome to Agoriai, {user?.anonAlias || "Explorer"}!
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  New here? Take a quick tour to learn how to make the most of the platform.
                </p>
              </div>
            </div>
            <Button
              onClick={() => startTutorial("welcome")}
              className="shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-900"
            >
              <BookOpen size={16} />
              Start Tutorial
            </Button>
          </div>
        </motion.div>
      )}

      {/* Welcome */}
      <div>
        <h2 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">
          {showWelcomeBanner ? "Your Dashboard" : `Welcome back, ${user?.anonAlias || "Explorer"}`}
        </h2>
        <p className="text-slate-500 mt-1">
          {stats
            ? `You've answered ${stats.questionsAnswered} questions this week. The Agora grows stronger.`
            : "Your contributions shape the community."}
        </p>
      </div>

      {/* Stats */}
      <div data-tutorial="dashboard-stats" className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <AnimatedCounter value={stats?.postsCreated ?? 0} label="Posts Created" icon={FileText} />
        <AnimatedCounter value={stats?.questionsAnswered ?? 0} label="Questions Answered" icon={MessageCircle} />
        <AnimatedCounter value={stats?.helpfulVotes ?? 0} label="Helpful Votes" icon={ThumbsUp} />
        <AnimatedCounter value={stats?.connectionsCount ?? 0} label="Connections" icon={Users} />
        <AnimatedCounter value={stats?.contributionScore ?? 0} label="Contribution Score" icon={Star} accent />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/feed" data-tutorial="post-composer">
          <Button className="bg-amber-500 hover:bg-amber-400 text-slate-900">
            <PenSquare size={16} /> Share an Experience
          </Button>
        </Link>
        <Link to="/feed">
          <Button variant="secondary" className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <HelpCircle size={16} /> Ask a Question
          </Button>
        </Link>
        <Link to="/nexus">
          <Button variant="secondary" className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <Network size={16} /> Explore the Nexus
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="mosaic-surface-strong rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/70 dark:border-slate-700/70 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50">
              <FileText size={14} className="text-slate-400" />
            </div>
            <h3 className="font-display font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
          </div>
          <div className="p-3 space-y-1">
            {recentPosts.map((post) => (
              <Link
                key={post.id}
                to="/feed"
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge>{categoryLabel(post.category)}</Badge>
                    <span className="text-xs text-slate-500">
                      {formatDate(post.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-full">
                  <ThumbsUp size={12} /> {post.upvotes}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Trending */}
        <div className="mosaic-surface-strong rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/70 dark:border-slate-700/70 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20">
              <TrendingUp size={14} className="text-amber-400" />
            </div>
            <h3 className="font-display font-semibold text-slate-900 dark:text-white">Trending on the Agora</h3>
          </div>
          <div className="p-3 space-y-1">
            {trendingPosts.map((post, i) => (
              <Link
                key={post.id}
                to="/feed"
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors"
              >
                <span className={`flex items-center justify-center w-7 h-7 rounded-lg text-sm font-display font-bold shrink-0 ${
                  i < 3
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-slate-100 dark:bg-slate-700/50 text-slate-500"
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">
                      {post.authorAlias}
                    </span>
                    <span className="text-xs text-slate-600">
                      {post.upvotes} upvotes
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
