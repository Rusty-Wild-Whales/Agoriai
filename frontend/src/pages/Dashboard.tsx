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
} from "lucide-react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useAuthStore } from "../stores/authStore";
import { mockPosts } from "../mocks/data";
import { formatDate, categoryLabel } from "../utils/helpers";

function AnimatedCounter({ value, label, icon: Icon, accent = false }: { value: number; label: string; icon: React.ElementType; accent?: boolean }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
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
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4 }}
    >
      <Card className="text-center">
        <Icon
          size={20}
          className={accent ? "text-accent-500 mx-auto mb-2" : "text-primary-400 mx-auto mb-2"}
        />
        <p className={`text-3xl font-display font-bold ${accent ? "text-accent-600" : "text-primary-900"}`}>
          {count}
        </p>
        <p className="text-xs text-neutral-500 mt-1">{label}</p>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const stats = user?.stats;
  const recentPosts = mockPosts.slice(0, 5);
  const trendingPosts = [...mockPosts].sort((a, b) => b.upvotes - a.upvotes).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="font-display text-2xl font-semibold text-primary-900">
          Welcome back, {user?.anonAlias || "Explorer"}
        </h2>
        <p className="text-neutral-500 mt-1">
          {stats
            ? `You've answered ${stats.questionsAnswered} questions this week. The Agora grows stronger.`
            : "Your contributions shape the community."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <AnimatedCounter value={stats?.postsCreated ?? 0} label="Posts Created" icon={FileText} />
        <AnimatedCounter value={stats?.questionsAnswered ?? 0} label="Questions Answered" icon={MessageCircle} />
        <AnimatedCounter value={stats?.helpfulVotes ?? 0} label="Helpful Votes" icon={ThumbsUp} />
        <AnimatedCounter value={stats?.connectionsCount ?? 0} label="Connections" icon={Users} />
        <AnimatedCounter value={stats?.contributionScore ?? 0} label="Contribution Score" icon={Star} accent />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/feed">
          <Button>
            <PenSquare size={16} /> Share an Experience
          </Button>
        </Link>
        <Link to="/feed">
          <Button variant="secondary">
            <HelpCircle size={16} /> Ask a Question
          </Button>
        </Link>
        <Link to="/mosaic">
          <Button variant="secondary">
            <Network size={16} /> Explore the Mosaic
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card header={
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary-400" />
            <h3 className="font-display font-semibold text-primary-900">Recent Activity</h3>
          </div>
        }>
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <Link
                key={post.id}
                to="/feed"
                className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary-900 truncate">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge>{categoryLabel(post.category)}</Badge>
                    <span className="text-xs text-neutral-400">
                      {formatDate(post.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-neutral-400">
                  <ThumbsUp size={12} /> {post.upvotes}
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Trending */}
        <Card header={
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-accent-500" />
            <h3 className="font-display font-semibold text-primary-900">Trending on the Agora</h3>
          </div>
        }>
          <div className="space-y-3">
            {trendingPosts.map((post, i) => (
              <Link
                key={post.id}
                to="/feed"
                className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <span className={`text-lg font-display font-bold shrink-0 w-6 ${i < 3 ? "text-accent-500" : "text-neutral-300"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary-900 truncate">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-neutral-500">
                      {post.authorAlias}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {post.upvotes} upvotes
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
