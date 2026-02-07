import { useEffect, useMemo, useRef, useState } from "react";
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

function AnimatedCounter({
  value,
  label,
  icon: Icon,
  accent = false,
}: {
  value: number;
  label: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
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
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.28 }}
      className={`rounded-xl border p-4 text-center transition-colors ${
        accent
          ? "border-amber-300/60 bg-amber-50 dark:border-amber-600/60 dark:bg-amber-500/10"
          : "mosaic-surface"
      }`}
    >
      <div
        className={`mx-auto mb-3 w-fit rounded-lg p-2.5 ${
          accent ? "bg-amber-100 dark:bg-amber-500/20" : "bg-slate-100 dark:bg-slate-700/50"
        }`}
      >
        <Icon
          size={18}
          className={accent ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"}
        />
      </div>
      <p
        className={`font-display text-3xl font-bold ${
          accent ? "text-amber-700 dark:text-amber-400" : "text-slate-900 dark:text-white"
        }`}
      >
        {count}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { startTutorial, completedTutorials, activeTutorial } = useTutorial();
  const autoStartAttemptedRef = useRef(false);
  const stats = user?.stats;

  const recentPosts = useMemo(() => mockPosts.slice(0, 5), []);
  const trendingPosts = useMemo(
    () => [...mockPosts].sort((a, b) => b.upvotes - a.upvotes).slice(0, 5),
    []
  );

  const showWelcomeBanner = !completedTutorials.includes("welcome");

  useEffect(() => {
    if (!showWelcomeBanner || activeTutorial || autoStartAttemptedRef.current) return;
    autoStartAttemptedRef.current = true;
    const timer = setTimeout(() => {
      startTutorial("welcome");
    }, 700);
    return () => clearTimeout(timer);
  }, [showWelcomeBanner, activeTutorial, startTutorial]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {showWelcomeBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mosaic-surface-strong rounded-2xl p-5 md:p-6"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-100 p-3 dark:bg-amber-500/20">
                <Sparkles size={22} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
                  Welcome to Agoriai, {user?.anonAlias || "Explorer"}!
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Take a quick walkthrough to learn the core flows.
                </p>
              </div>
            </div>
            <Button onClick={() => startTutorial("welcome")} className="shrink-0">
              <BookOpen size={16} />
              Start Tutorial
            </Button>
          </div>
        </motion.div>
      )}

      <section>
        <h2 className="font-display text-3xl font-semibold text-slate-900 dark:text-white">
          {showWelcomeBanner ? "Your Dashboard" : `Welcome back, ${user?.anonAlias || "Explorer"}`}
        </h2>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          {stats
            ? `You answered ${stats.questionsAnswered} questions this week and contributed to ${stats.connectionsCount} connections.`
            : "Your contributions shape the community."}
        </p>
      </section>

      <section data-tutorial="dashboard-stats" className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        <AnimatedCounter value={stats?.postsCreated ?? 0} label="Posts Created" icon={FileText} />
        <AnimatedCounter value={stats?.questionsAnswered ?? 0} label="Questions Answered" icon={MessageCircle} />
        <AnimatedCounter value={stats?.helpfulVotes ?? 0} label="Helpful Votes" icon={ThumbsUp} />
        <AnimatedCounter value={stats?.connectionsCount ?? 0} label="Connections" icon={Users} />
        <AnimatedCounter value={stats?.contributionScore ?? 0} label="Contribution Score" icon={Star} accent />
      </section>

      <section className="mosaic-surface-strong rounded-2xl p-4 md:p-5">
        <p className="mb-3 text-sm font-medium text-slate-600 dark:text-slate-300">Quick actions</p>
        <div className="flex flex-wrap gap-2.5">
          <Link to="/feed" data-tutorial="post-composer">
            <Button>
              <PenSquare size={16} />
              Share an Experience
            </Button>
          </Link>
          <Link to="/feed">
            <Button variant="secondary">
              <HelpCircle size={16} />
              Ask a Question
            </Button>
          </Link>
          <Link to="/nexus">
            <Button variant="secondary">
              <Network size={16} />
              Explore the Nexus
            </Button>
          </Link>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="mosaic-surface-strong overflow-hidden rounded-2xl">
          <header className="flex items-center gap-2 border-b border-slate-200/80 px-4 py-3 dark:border-slate-700/70">
            <div className="rounded-md bg-slate-100 p-1.5 dark:bg-slate-700/50">
              <FileText size={14} className="text-slate-500 dark:text-slate-300" />
            </div>
            <h3 className="font-display font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
          </header>
          <div className="space-y-1 p-2">
            {recentPosts.map((post) => (
              <Link
                key={post.id}
                to="/feed"
                className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{post.title}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge>{categoryLabel(post.category)}</Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(post.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  <ThumbsUp size={12} />
                  {post.upvotes}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mosaic-surface-strong overflow-hidden rounded-2xl">
          <header className="flex items-center gap-2 border-b border-slate-200/80 px-4 py-3 dark:border-slate-700/70">
            <div className="rounded-md bg-amber-100 p-1.5 dark:bg-amber-500/20">
              <TrendingUp size={14} className="text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-display font-semibold text-slate-900 dark:text-white">Trending</h3>
          </header>
          <div className="space-y-1 p-2">
            {trendingPosts.map((post, index) => (
              <Link
                key={post.id}
                to="/feed"
                className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/40"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-display font-bold ${
                    index < 3
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{post.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{post.authorAlias}</span>
                    <span>{post.upvotes} upvotes</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
