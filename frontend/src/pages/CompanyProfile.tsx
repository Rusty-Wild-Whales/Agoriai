import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MapPin, Calendar, DollarSign, ArrowLeft } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { PostCard } from "../components/feed/PostCard";
import { Skeleton } from "../components/ui/Skeleton";
import { agoraApi } from "../services/agoraApi";
import type { Company, Post } from "../types";

function normalizeCompanyKey(value: string) {
  return decodeURIComponent(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const percentage = (value / 5) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-medium text-slate-900 dark:text-slate-100">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={`h-full rounded-full ${percentage >= 80 ? "bg-accent-500" : percentage >= 60 ? "bg-primary-400" : "bg-neutral-400"}`}
        />
      </div>
    </div>
  );
}

export default function CompanyProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [company, setCompany] = useState<Company | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadCompany = async (rawCompanyId: string) => {
      try {
        return await agoraApi.getCompany(rawCompanyId);
      } catch {
        const candidates = await agoraApi.getCompanies();
        const match = candidates.find(
          (candidate) =>
            normalizeCompanyKey(candidate.id) === normalizeCompanyKey(rawCompanyId) ||
            normalizeCompanyKey(candidate.name) === normalizeCompanyKey(rawCompanyId)
        );
        if (!match) {
          return null;
        }
        return agoraApi.getCompany(match.id);
      }
    };

    const run = async () => {
      setLoading(true);
      setLoadError(null);
      const preview = (location.state as { companyPreview?: Company } | null)?.companyPreview;
      if (preview) {
        const matchesRoute =
          normalizeCompanyKey(preview.id) === normalizeCompanyKey(id) ||
          normalizeCompanyKey(preview.name) === normalizeCompanyKey(id);
        if (matchesRoute) {
          setCompany(preview);
        }
      }
      try {
        const companyData = await loadCompany(id);
        if (cancelled) return;
        if (!companyData) {
          setCompany(null);
          setRelatedPosts([]);
          return;
        }

        setCompany(companyData);
        try {
          const posts = await agoraApi.getCompanyPosts(companyData.id);
          if (cancelled) return;
          setRelatedPosts(posts);
        } catch (postsError) {
          if (cancelled) return;
          console.error("Failed to load company posts", postsError);
          setRelatedPosts([]);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load company profile", error);
        setCompany(null);
        setRelatedPosts([]);
        setLoadError(error instanceof Error ? error.message : "Unable to load company profile.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [id, location.state]);

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/feed");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-slate-700 dark:text-slate-200">Company not found</p>
        {loadError && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{loadError}</p>
        )}
        <button
          onClick={goBack}
          className="mt-3 cursor-pointer text-sm text-amber-500 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={goBack}
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <Card>
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-xl bg-accent-100 flex items-center justify-center text-accent-700 font-display text-2xl font-bold shrink-0">
            {company.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              {company.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">{company.industry}</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-accent-500">
                <Star size={18} fill="currentColor" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  {company.averageRating.toFixed(1)}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  ({company.totalReviews} reviews)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {company.tags.map((tag) => (
                  <Badge key={tag} variant="accent">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rating Breakdown */}
        <Card
          header={
            <h3 className="font-display font-semibold text-slate-900 dark:text-white">
              Rating Breakdown
            </h3>
          }
        >
          <div className="space-y-4">
            <RatingBar label="Mentorship" value={4.2} />
            <RatingBar label="Work-Life Balance" value={3.4} />
            <RatingBar label="Compensation" value={4.6} />
            <RatingBar label="Learning Opportunity" value={4.3} />
            <RatingBar label="Return Offer Likelihood" value={3.8} />
          </div>
        </Card>

        {/* Internships */}
        <Card
          header={
            <h3 className="font-display font-semibold text-slate-900 dark:text-white">
              Internships
            </h3>
          }
        >
          <div className="space-y-4">
            {company.internships.map((internship) => (
              <div
                key={internship.id}
                className="rounded-lg border border-slate-200/80 p-3 transition-colors hover:bg-slate-100/70 dark:border-slate-700/80 dark:hover:bg-slate-800/45"
              >
                <p className="font-medium text-slate-900 dark:text-white">{internship.title}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {internship.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {internship.season}
                  </span>
                  {internship.compensationRange && (
                    <span className="flex items-center gap-1">
                      <DollarSign size={12} /> {internship.compensationRange}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <Star size={12} className="text-accent-500" fill="currentColor" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">{internship.averageRating.toFixed(1)}</span>
                  <span className="text-slate-500 dark:text-slate-400">({internship.reviewCount} reviews)</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div>
          <h3 className="mb-4 font-display text-lg font-semibold text-slate-900 dark:text-white">
            Related Posts
          </h3>
          <div className="space-y-4">
            {relatedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
