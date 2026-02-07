import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  MessageCircle,
  ThumbsUp,
  Users,
  Star,
  Eye,
  EyeOff,
  GraduationCap,
  Calendar,
} from "lucide-react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { Skeleton } from "../components/ui/Skeleton";
import { agoraApi } from "../services/agoraApi";
import { formatDate, categoryLabel } from "../utils/helpers";
import type { Post, User } from "../types";
import { Button } from "../components/ui/Button";
import { useAuthStore } from "../stores/authStore";

function StatCallout({
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
    <div ref={ref} className="text-center">
      <Icon
        size={18}
        className={accent ? "text-accent-500 mx-auto mb-1" : "text-primary-400 mx-auto mb-1"}
      />
      <p
        className={`text-2xl font-display font-bold ${accent ? "text-accent-600 dark:text-accent-500" : "text-primary-900 dark:text-white"}`}
      >
        {count}
      </p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [user, setUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const userId = id ?? currentUser?.id;

    if (!userId) {
      setUser(null);
      setUserPosts([]);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    void Promise.all([agoraApi.getUser(userId), agoraApi.getUserPosts(userId)])
      .then(([userData, posts]) => {
        if (cancelled) return;
        setUser(userData || null);
        setUserPosts(posts);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load user profile", error);
        setUser(null);
        setUserPosts([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, currentUser?.id]);

  const isOwnProfile = Boolean(user && currentUser && user.id === currentUser.id);
  const canShowRole = Boolean(user && (isOwnProfile || user.visibilityLevel === "role" || user.visibilityLevel === "school" || user.visibilityLevel === "realName"));
  const canShowSchool = Boolean(user && (isOwnProfile || user.visibilityLevel === "school" || user.visibilityLevel === "realName"));

  const handleConnect = async () => {
    if (!user || !currentUser || isOwnProfile) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const result = await agoraApi.connectUser(user.id);
      setActionMessage(result.alreadyConnected ? "Already connected." : "Connection created.");
      if (!result.alreadyConnected) {
        const refreshedProfile = await agoraApi.getUser(user.id);
        setUser(refreshedProfile);
      }
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Failed to connect.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!user || !currentUser || isOwnProfile) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const result = await agoraApi.createDirectConversation(user.id);
      navigate(`/messages?conversation=${encodeURIComponent(result.conversationId)}`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Failed to open conversation.");
      setActionLoading(false);
      return;
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-neutral-500 text-lg">User not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile Card */}
      <Card>
        <div className="flex flex-col items-center text-center">
          <Avatar seed={user.anonAvatarSeed} size="xl" />
          <h1 className="font-display text-2xl font-bold text-primary-900 dark:text-white mt-4">
            {user.realName || user.anonAlias}
          </h1>
          <div className="flex items-center gap-1.5 text-sm text-neutral-500 mt-1">
            {user.isAnonymous ? (
              <>
                <EyeOff size={14} /> Anonymous
              </>
            ) : (
              <>
                <Eye size={14} /> Identity revealed
              </>
            )}
          </div>
          {canShowSchool && (
            <div className="mt-3 flex items-center gap-4 text-sm text-neutral-500">
              <span className="flex items-center gap-1">
                <GraduationCap size={14} /> {user.university}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} /> Class of {user.graduationYear}
              </span>
            </div>
          )}
          {canShowRole && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {user.fieldsOfInterest.map((field) => (
                <Badge key={field} variant="accent">
                  {field}
                </Badge>
              ))}
            </div>
          )}

          {!isOwnProfile && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button onClick={handleConnect} disabled={actionLoading}>
                Connect
              </Button>
              <Button variant="secondary" onClick={handleMessage} disabled={actionLoading}>
                Message
              </Button>
            </div>
          )}

          {actionMessage && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{actionMessage}</p>}
        </div>
      </Card>

      {/* Stats */}
      <Card>
        <div className="grid grid-cols-5 gap-4">
          <StatCallout
            value={user.stats.postsCreated}
            label="Posts"
            icon={FileText}
          />
          <StatCallout
            value={user.stats.questionsAnswered}
            label="Answered"
            icon={MessageCircle}
          />
          <StatCallout
            value={user.stats.helpfulVotes}
            label="Helpful"
            icon={ThumbsUp}
          />
          <StatCallout
            value={user.stats.connectionsCount}
            label="Connections"
            icon={Users}
          />
          <StatCallout
            value={user.stats.contributionScore}
            label="Score"
            icon={Star}
            accent
          />
        </div>
      </Card>

      {/* Contribution History */}
      <Card
        header={
          <h3 className="font-display font-semibold text-primary-900 dark:text-white">
            Contribution History
          </h3>
        }
      >
        {userPosts.length === 0 ? (
          <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-4">
            No contributions yet.
          </p>
        ) : (
          <div className="space-y-3">
            {userPosts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-accent-400 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary-900 dark:text-white truncate">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge>{categoryLabel(post.category)}</Badge>
                    <span className="text-xs text-neutral-400">
                      {formatDate(post.createdAt)}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {post.upvotes} upvotes
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
