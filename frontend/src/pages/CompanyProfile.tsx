import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MapPin, Calendar, DollarSign, ArrowLeft } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { PostCard } from "../components/feed/PostCard";
import { Skeleton } from "../components/ui/Skeleton";
import { mockApi } from "../services/mockApi";
import { mockPosts } from "../mocks/data";
import type { Company } from "../types";

function RatingBar({ label, value }: { label: string; value: number }) {
  const percentage = (value / 5) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-neutral-600">{label}</span>
        <span className="font-medium text-primary-900">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
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
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    mockApi.getCompany(id).then((data) => {
      setCompany(data || null);
      setLoading(false);
    });
  }, [id]);

  const relatedPosts = mockPosts.filter((p) => p.companyId === id);

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
      <div className="text-center py-20">
        <p className="text-neutral-500 text-lg">Company not found</p>
        <Link to="/nexus" className="text-primary-500 hover:underline text-sm mt-2 inline-block">
          Back to Nexus
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/nexus" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-primary-700 transition-colors">
        <ArrowLeft size={16} /> Back to Nexus
      </Link>

      {/* Header */}
      <Card>
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-xl bg-accent-100 flex items-center justify-center text-accent-700 font-display text-2xl font-bold shrink-0">
            {company.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-primary-900">
              {company.name}
            </h1>
            <p className="text-neutral-500">{company.industry}</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-accent-500">
                <Star size={18} fill="currentColor" />
                <span className="font-semibold text-primary-900">
                  {company.averageRating.toFixed(1)}
                </span>
                <span className="text-sm text-neutral-400">
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
            <h3 className="font-display font-semibold text-primary-900">
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
            <h3 className="font-display font-semibold text-primary-900">
              Internships
            </h3>
          }
        >
          <div className="space-y-4">
            {company.internships.map((internship) => (
              <div
                key={internship.id}
                className="p-3 border border-neutral-100 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <p className="font-medium text-primary-900">{internship.title}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-neutral-500">
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
                  <span className="font-medium">{internship.averageRating.toFixed(1)}</span>
                  <span className="text-neutral-400">({internship.reviewCount} reviews)</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
            Related Posts
          </h3>
          <div className="space-y-4">
            {relatedPosts.map((post) => (
              <PostCard key={post.id} post={post} onUpvote={() => {}} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
