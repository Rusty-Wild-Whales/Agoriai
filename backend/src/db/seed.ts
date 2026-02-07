import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  authAccountsTable,
  commentVotesTable,
  commentsTable,
  companiesTable,
  connectionsTable,
  conversationParticipantsTable,
  conversationsTable,
  internshipsTable,
  messagesTable,
  postVotesTable,
  postsTable,
  usersTable,
} from "./schema";

const demoSeedPassword = process.env.SEED_USER_PASSWORD ?? "DemoPass!2026";

function toSchoolDomain(university: string) {
  const overrides: Record<string, string> = {
    MIT: "mit.edu",
    Stanford: "stanford.edu",
    "UC Berkeley": "berkeley.edu",
    "Georgia Tech": "gatech.edu",
    Harvard: "harvard.edu",
    "Carnegie Mellon": "cmu.edu",
    UPenn: "upenn.edu",
    UCLA: "ucla.edu",
  };

  if (overrides[university]) {
    return overrides[university];
  }

  const normalized = university
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized ? `${normalized}.edu` : "school.edu";
}

function aliasEmail(alias: string, university: string, idx: number) {
  const localPart = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${localPart || `student${idx + 1}`}@${toSchoolDomain(university)}`;
}

async function buildAuthAccounts(users: Array<typeof usersTable.$inferInsert>) {
  const passwordHash = await Bun.password.hash(demoSeedPassword);
  return users.map((user, idx) => ({
    userId: user.id,
    schoolEmail: aliasEmail(user.anonAlias, user.university, idx),
    passwordHash,
    createdAt: user.createdAt ?? new Date(),
    updatedAt: user.createdAt ?? new Date(),
  })) satisfies Array<typeof authAccountsTable.$inferInsert>;
}

const users: Array<typeof usersTable.$inferInsert> = [
  {
    id: "u1",
    anonAlias: "StellarPenguin",
    anonAvatarSeed: "seed-alpha",
    university: "MIT",
    graduationYear: 2026,
    visibilityLevel: "anonymous",
    fieldsOfInterest: ["engineering", "data"],
    isAnonymous: true,
    postsCreated: 14,
    questionsAnswered: 23,
    helpfulVotes: 87,
    connectionsCount: 12,
    contributionScore: 136,
    createdAt: new Date("2025-09-01T10:00:00Z"),
  },
  {
    id: "u2",
    anonAlias: "QuietMaple",
    anonAvatarSeed: "seed-beta",
    university: "Stanford",
    graduationYear: 2025,
    visibilityLevel: "anonymous",
    fieldsOfInterest: ["finance", "consulting"],
    isAnonymous: true,
    postsCreated: 9,
    questionsAnswered: 31,
    helpfulVotes: 102,
    connectionsCount: 18,
    contributionScore: 160,
    createdAt: new Date("2025-08-15T08:30:00Z"),
  },
  {
    id: "u3",
    anonAlias: "BrightLantern",
    anonAvatarSeed: "seed-gamma",
    university: "UC Berkeley",
    graduationYear: 2026,
    visibilityLevel: "role",
    fieldsOfInterest: ["engineering", "product"],
    isAnonymous: true,
    postsCreated: 22,
    questionsAnswered: 15,
    helpfulVotes: 64,
    connectionsCount: 9,
    contributionScore: 110,
    createdAt: new Date("2025-10-02T14:00:00Z"),
  },
  {
    id: "u4",
    anonAlias: "CosmicFalcon",
    anonAvatarSeed: "seed-delta",
    university: "Georgia Tech",
    graduationYear: 2027,
    visibilityLevel: "anonymous",
    fieldsOfInterest: ["engineering"],
    isAnonymous: true,
    postsCreated: 5,
    questionsAnswered: 8,
    helpfulVotes: 19,
    connectionsCount: 4,
    contributionScore: 36,
    createdAt: new Date("2025-11-10T09:15:00Z"),
  },
  {
    id: "u5",
    anonAlias: "SwiftCedar",
    anonAvatarSeed: "seed-epsilon",
    realName: "Jamie Rivera",
    university: "Harvard",
    graduationYear: 2025,
    visibilityLevel: "realName",
    fieldsOfInterest: ["finance", "consulting"],
    isAnonymous: false,
    postsCreated: 18,
    questionsAnswered: 42,
    helpfulVotes: 156,
    connectionsCount: 27,
    contributionScore: 243,
    createdAt: new Date("2025-07-20T16:00:00Z"),
  },
  {
    id: "u6",
    anonAlias: "GentlePrism",
    anonAvatarSeed: "seed-zeta",
    university: "Carnegie Mellon",
    graduationYear: 2026,
    visibilityLevel: "school",
    fieldsOfInterest: ["engineering", "design"],
    isAnonymous: true,
    postsCreated: 11,
    questionsAnswered: 19,
    helpfulVotes: 73,
    connectionsCount: 14,
    contributionScore: 117,
    createdAt: new Date("2025-09-28T11:00:00Z"),
  },
  {
    id: "u7",
    anonAlias: "BoldCompass",
    anonAvatarSeed: "seed-eta",
    university: "UPenn",
    graduationYear: 2026,
    visibilityLevel: "anonymous",
    fieldsOfInterest: ["finance"],
    isAnonymous: true,
    postsCreated: 7,
    questionsAnswered: 12,
    helpfulVotes: 34,
    connectionsCount: 6,
    contributionScore: 59,
    createdAt: new Date("2025-10-15T13:30:00Z"),
  },
  {
    id: "u8",
    anonAlias: "VividHarbor",
    anonAvatarSeed: "seed-theta",
    university: "UCLA",
    graduationYear: 2027,
    visibilityLevel: "anonymous",
    fieldsOfInterest: ["design", "product"],
    isAnonymous: true,
    postsCreated: 3,
    questionsAnswered: 5,
    helpfulVotes: 11,
    connectionsCount: 3,
    contributionScore: 22,
    createdAt: new Date("2025-11-01T10:45:00Z"),
  },
];

const companies: Array<typeof companiesTable.$inferInsert> = [
  {
    id: "c1",
    name: "Google",
    industry: "Technology",
    averageRating: 4.5,
    totalReviews: 42,
    tags: ["great-mentorship", "free-food", "competitive-pay"],
  },
  {
    id: "c2",
    name: "Goldman Sachs",
    industry: "Finance",
    averageRating: 3.9,
    totalReviews: 51,
    tags: ["prestigious", "intense-hours", "strong-network"],
  },
  {
    id: "c3",
    name: "McKinsey & Company",
    industry: "Consulting",
    averageRating: 4.2,
    totalReviews: 38,
    tags: ["prestigious", "travel", "great-mentorship"],
  },
  {
    id: "c4",
    name: "Meta",
    industry: "Technology",
    averageRating: 4.1,
    totalReviews: 35,
    tags: ["competitive-pay", "remote-friendly", "fast-paced"],
  },
  {
    id: "c5",
    name: "JPMorgan Chase",
    industry: "Finance",
    averageRating: 3.7,
    totalReviews: 44,
    tags: ["strong-network", "formal-culture"],
  },
  {
    id: "c6",
    name: "Apple",
    industry: "Technology",
    averageRating: 4.4,
    totalReviews: 29,
    tags: ["secretive", "great-mentorship", "competitive-pay"],
  },
  {
    id: "c7",
    name: "Boston Consulting Group",
    industry: "Consulting",
    averageRating: 4.3,
    totalReviews: 26,
    tags: ["great-culture", "travel", "learning-focused"],
  },
  {
    id: "c8",
    name: "Stripe",
    industry: "Technology",
    averageRating: 4.7,
    totalReviews: 18,
    tags: ["engineering-excellence", "small-teams", "competitive-pay"],
  },
];

const internships: Array<typeof internshipsTable.$inferInsert> = [
  {
    id: "i1",
    companyId: "c1",
    title: "Software Engineering Intern",
    location: "Mountain View, CA",
    season: "Summer 2025",
    compensationRange: "$45-55/hr",
    averageRating: 4.6,
    reviewCount: 28,
  },
  {
    id: "i2",
    companyId: "c2",
    title: "Investment Banking Summer Analyst",
    location: "New York, NY",
    season: "Summer 2025",
    compensationRange: "$40-50/hr",
    averageRating: 3.8,
    reviewCount: 34,
  },
  {
    id: "i3",
    companyId: "c3",
    title: "Business Analyst Intern",
    location: "Chicago, IL",
    season: "Summer 2025",
    compensationRange: "$38-48/hr",
    averageRating: 4.2,
    reviewCount: 22,
  },
  {
    id: "i4",
    companyId: "c4",
    title: "Software Engineering Intern",
    location: "Menlo Park, CA",
    season: "Summer 2025",
    compensationRange: "$47-57/hr",
    averageRating: 4.1,
    reviewCount: 20,
  },
  {
    id: "i5",
    companyId: "c5",
    title: "Investment Banking Summer Analyst",
    location: "New York, NY",
    season: "Summer 2025",
    compensationRange: "$38-48/hr",
    averageRating: 3.7,
    reviewCount: 30,
  },
  {
    id: "i6",
    companyId: "c6",
    title: "Hardware Engineering Intern",
    location: "Cupertino, CA",
    season: "Summer 2025",
    compensationRange: "$43-53/hr",
    averageRating: 4.4,
    reviewCount: 14,
  },
  {
    id: "i7",
    companyId: "c7",
    title: "Associate Intern",
    location: "Boston, MA",
    season: "Summer 2025",
    compensationRange: "$36-46/hr",
    averageRating: 4.3,
    reviewCount: 16,
  },
  {
    id: "i8",
    companyId: "c8",
    title: "Software Engineering Intern",
    location: "San Francisco, CA",
    season: "Summer 2025",
    compensationRange: "$50-60/hr",
    averageRating: 4.7,
    reviewCount: 10,
  },
];

const posts: Array<typeof postsTable.$inferInsert> = [
  {
    id: "p1",
    authorId: "u1",
    category: "interview-experience",
    title: "Google L3 SWE Interview - Full Loop Breakdown",
    content:
      "Just finished my Google interview loop for L3 new grad. Here's a breakdown of all 5 rounds and what to study.",
    companyId: "c1",
    tags: ["software-engineering", "new-grad", "leetcode"],
    upvotes: 47,
    commentCount: 5,
    isAnonymous: true,
    createdAt: new Date("2025-12-01T14:30:00Z"),
    updatedAt: new Date("2025-12-01T14:30:00Z"),
  },
  {
    id: "p2",
    authorId: "u2",
    category: "internship-review",
    title: "Goldman Sachs IB Summer Analyst - Honest Review",
    content:
      "10 weeks in GS investment banking. Great learning, intense hours, and very strong network effects.",
    companyId: "c2",
    tags: ["investment-banking", "summer-analyst", "finance"],
    upvotes: 38,
    commentCount: 3,
    isAnonymous: true,
    createdAt: new Date("2025-11-28T09:15:00Z"),
    updatedAt: new Date("2025-11-28T09:15:00Z"),
  },
  {
    id: "p3",
    authorId: "u3",
    category: "career-advice",
    title: "How I Networked My Way Into Tech Without Connections",
    content:
      "I sent 200+ targeted messages, contributed to open source, and focused on relationship building over transactional asks.",
    tags: ["networking", "first-gen", "career-switch"],
    upvotes: 89,
    commentCount: 2,
    isAnonymous: true,
    createdAt: new Date("2025-11-25T16:00:00Z"),
    updatedAt: new Date("2025-11-25T16:00:00Z"),
  },
  {
    id: "p4",
    authorId: "u5",
    category: "question",
    title: "Is it worth doing a consulting internship before switching to tech?",
    content:
      "I have a BCG offer but long-term want PM in tech. Will this help or hurt transition chances?",
    companyId: "c7",
    tags: ["consulting", "career-switch", "product-management"],
    upvotes: 24,
    commentCount: 2,
    isAnonymous: false,
    createdAt: new Date("2025-11-22T11:30:00Z"),
    updatedAt: new Date("2025-11-22T11:30:00Z"),
  },
  {
    id: "p5",
    authorId: "u6",
    category: "resource",
    title: "The Ultimate System Design Interview Prep Guide",
    content:
      "A reusable framework for system design rounds with recommended resources and trade-off templates.",
    tags: ["system-design", "interview-prep", "resources"],
    upvotes: 112,
    commentCount: 4,
    isAnonymous: true,
    createdAt: new Date("2025-11-20T13:45:00Z"),
    updatedAt: new Date("2025-11-20T13:45:00Z"),
  },
  {
    id: "p6",
    authorId: "u7",
    category: "career-advice",
    title: "Finance Recruiting Timeline Nobody Explains Clearly",
    content:
      "The biggest miss is starting too late. Most sophomore summer analyst roles open far earlier than people expect.",
    companyId: "c2",
    tags: ["finance-recruiting", "timeline", "banking"],
    upvotes: 43,
    commentCount: 1,
    isAnonymous: true,
    createdAt: new Date("2025-09-02T08:30:00Z"),
    updatedAt: new Date("2025-09-02T08:30:00Z"),
  },
  {
    id: "p7",
    authorId: "u8",
    category: "question",
    title: "How do design internship portfolios differ from full-time portfolios?",
    content: "What matters most for intern portfolios: school projects, redesigns, or measurable impact?",
    tags: ["design", "portfolio", "internship-application"],
    upvotes: 16,
    commentCount: 0,
    isAnonymous: true,
    createdAt: new Date("2025-09-08T10:00:00Z"),
    updatedAt: new Date("2025-09-08T10:00:00Z"),
  },
  {
    id: "p8",
    authorId: "u4",
    category: "question",
    title: "How important is GPA for quant trading internships?",
    content: "I have a 3.4 GPA and strong programming. Is GPA still an auto-filter for quant firms?",
    tags: ["quant", "gpa", "sophomore"],
    upvotes: 31,
    commentCount: 1,
    isAnonymous: true,
    createdAt: new Date("2025-11-12T08:00:00Z"),
    updatedAt: new Date("2025-11-12T08:00:00Z"),
  },
  {
    id: "p9",
    authorId: "u6",
    category: "interview-experience",
    title: "Apple Product Design Internship Interview",
    content:
      "Portfolio-heavy process with deep craft scrutiny, live design exercise, and team match interview.",
    companyId: "c6",
    tags: ["design-internship", "apple", "portfolio-review"],
    upvotes: 30,
    commentCount: 1,
    isAnonymous: true,
    createdAt: new Date("2025-08-30T14:00:00Z"),
    updatedAt: new Date("2025-08-30T14:00:00Z"),
  },
  {
    id: "p10",
    authorId: "u3",
    category: "resource",
    title: "Data Structures & Algorithms - The 20% That Covers 80% of Interviews",
    content: "Master a concise set of patterns and data structures; most interview problems are variations.",
    tags: ["dsa", "interview-prep", "patterns"],
    upvotes: 79,
    commentCount: 0,
    isAnonymous: true,
    createdAt: new Date("2025-09-12T09:00:00Z"),
    updatedAt: new Date("2025-09-12T09:00:00Z"),
  },
  {
    id: "p11",
    authorId: "u2",
    category: "internship-review",
    title: "McKinsey Business Analyst Intern - Summer 2025 Review",
    content: "Steep learning curve, strong training, collaborative culture, high return offer rate.",
    companyId: "c3",
    tags: ["consulting", "business-analyst", "summer-2025"],
    upvotes: 44,
    commentCount: 0,
    isAnonymous: true,
    createdAt: new Date("2025-11-10T12:00:00Z"),
    updatedAt: new Date("2025-11-10T12:00:00Z"),
  },
  {
    id: "p12",
    authorId: "u1",
    category: "career-advice",
    title: "Startup vs FAANG for New Grads",
    content: "A practical tradeoff analysis: ownership, compensation, growth speed, and mentorship structure.",
    companyId: "c8",
    tags: ["startup", "faang", "career-choice"],
    upvotes: 67,
    commentCount: 0,
    isAnonymous: true,
    createdAt: new Date("2025-11-15T15:30:00Z"),
    updatedAt: new Date("2025-11-15T15:30:00Z"),
  },
  {
    id: "p13",
    authorId: "u5",
    category: "resource",
    title: "Consulting Case Prep: 30-Day Sprint Plan",
    content:
      "## Weekly plan\n- Week 1: Market sizing drills\n- Week 2: Profitability trees\n- Week 3: Ops + growth cases\n- Week 4: Live mocks and feedback loops",
    companyId: "c3",
    tags: ["consulting", "case-prep", "resource"],
    upvotes: 54,
    commentCount: 2,
    isAnonymous: false,
    createdAt: new Date("2025-11-18T18:00:00Z"),
    updatedAt: new Date("2025-11-18T18:00:00Z"),
  },
  {
    id: "p14",
    authorId: "u6",
    category: "interview-experience",
    title: "Stripe SWE Intern Final Round: What Actually Showed Up",
    content:
      "Interview was practical and collaboration-heavy. They care about communication, not just perfect code.",
    companyId: "c8",
    tags: ["stripe", "swe", "final-round"],
    upvotes: 36,
    commentCount: 1,
    isAnonymous: true,
    createdAt: new Date("2025-12-03T11:20:00Z"),
    updatedAt: new Date("2025-12-03T11:20:00Z"),
  },
  {
    id: "p15",
    authorId: "u8",
    category: "question",
    title: "Should I optimize for brand name or manager quality?",
    content:
      "Torn between a bigger brand with less mentorship and a smaller team with an excellent manager.",
    tags: ["career-choice", "mentorship", "brand"],
    upvotes: 21,
    commentCount: 1,
    isAnonymous: true,
    createdAt: new Date("2025-11-19T10:10:00Z"),
    updatedAt: new Date("2025-11-19T10:10:00Z"),
  },
];

const comments: Array<typeof commentsTable.$inferInsert> = [
  {
    id: "cm1",
    postId: "p1",
    authorId: "u2",
    content: "Did they give feedback on the system design round?",
    upvotes: 8,
    isAnonymous: true,
    createdAt: new Date("2025-12-01T15:00:00Z"),
  },
  {
    id: "cm1r1",
    postId: "p1",
    authorId: "u1",
    parentCommentId: "cm1",
    content: "Yes, it was lighter than expected and mostly API/data modeling.",
    upvotes: 5,
    isAnonymous: true,
    createdAt: new Date("2025-12-01T15:30:00Z"),
  },
  {
    id: "cm2",
    postId: "p1",
    authorId: "u3",
    content: "How long did you prep before the loop?",
    upvotes: 6,
    isAnonymous: true,
    createdAt: new Date("2025-12-01T16:00:00Z"),
  },
  {
    id: "cm2r1",
    postId: "p1",
    authorId: "u1",
    parentCommentId: "cm2",
    content: "Around 4 months with consistent daily practice.",
    upvotes: 4,
    isAnonymous: true,
    createdAt: new Date("2025-12-01T16:30:00Z"),
  },
  {
    id: "cm3",
    postId: "p2",
    authorId: "u5",
    content: "How did you handle the workload during peak deal cycles?",
    upvotes: 7,
    isAnonymous: false,
    createdAt: new Date("2025-11-28T11:00:00Z"),
  },
  {
    id: "cm4",
    postId: "p3",
    authorId: "u4",
    content: "This gave me hope. Thanks for the practical breakdown.",
    upvotes: 15,
    isAnonymous: true,
    createdAt: new Date("2025-11-25T17:00:00Z"),
  },
  {
    id: "cm5",
    postId: "p4",
    authorId: "u7",
    content: "Consulting can help for PM if you emphasize user and business impact.",
    upvotes: 6,
    isAnonymous: true,
    createdAt: new Date("2025-11-22T12:30:00Z"),
  },
  {
    id: "cm6",
    postId: "p5",
    authorId: "u1",
    content: "Great framework. Do you have a one-page checklist version?",
    upvotes: 9,
    isAnonymous: true,
    createdAt: new Date("2025-11-20T14:30:00Z"),
  },
  {
    id: "cm7",
    postId: "p8",
    authorId: "u6",
    content: "For quant, GPA helps but interview performance is still decisive.",
    upvotes: 4,
    isAnonymous: true,
    createdAt: new Date("2025-11-12T09:00:00Z"),
  },
  {
    id: "cm8",
    postId: "p9",
    authorId: "u8",
    content: "Apple definitely rewards polish and design rationale depth.",
    upvotes: 3,
    isAnonymous: true,
    createdAt: new Date("2025-08-30T15:10:00Z"),
  },
  {
    id: "cm9",
    postId: "p13",
    authorId: "u2",
    content: "This schedule is realistic. Week 4 mocks were key for me.",
    upvotes: 5,
    isAnonymous: true,
    createdAt: new Date("2025-11-18T19:30:00Z"),
  },
  {
    id: "cm10",
    postId: "p13",
    authorId: "u5",
    content: "Agree. I tracked my weak structures and repeated them daily.",
    upvotes: 4,
    isAnonymous: false,
    createdAt: new Date("2025-11-18T20:00:00Z"),
  },
  {
    id: "cm11",
    postId: "p14",
    authorId: "u1",
    content: "Thanks for sharing. Was there any system design component?",
    upvotes: 3,
    isAnonymous: true,
    createdAt: new Date("2025-12-03T12:00:00Z"),
  },
  {
    id: "cm12",
    postId: "p15",
    authorId: "u3",
    content: "Manager quality compounds faster early in your career.",
    upvotes: 6,
    isAnonymous: true,
    createdAt: new Date("2025-11-19T11:00:00Z"),
  },
];

const connections: Array<typeof connectionsTable.$inferInsert> = [
  { sourceId: "u1", sourceType: "user", targetId: "c1", targetType: "company", weight: 4 },
  { sourceId: "u1", sourceType: "user", targetId: "c4", targetType: "company", weight: 2 },
  { sourceId: "u2", sourceType: "user", targetId: "c2", targetType: "company", weight: 5 },
  { sourceId: "u2", sourceType: "user", targetId: "c7", targetType: "company", weight: 3 },
  { sourceId: "u3", sourceType: "user", targetId: "c1", targetType: "company", weight: 3 },
  { sourceId: "u3", sourceType: "user", targetId: "c8", targetType: "company", weight: 2 },
  { sourceId: "u4", sourceType: "user", targetId: "c1", targetType: "company", weight: 1 },
  { sourceId: "u5", sourceType: "user", targetId: "c7", targetType: "company", weight: 4 },
  { sourceId: "u6", sourceType: "user", targetId: "c6", targetType: "company", weight: 3 },
  { sourceId: "u7", sourceType: "user", targetId: "c5", targetType: "company", weight: 4 },
  { sourceId: "u8", sourceType: "user", targetId: "c6", targetType: "company", weight: 1 },
  { sourceId: "u1", sourceType: "user", targetId: "u3", targetType: "user", weight: 3 },
  { sourceId: "u2", sourceType: "user", targetId: "u5", targetType: "user", weight: 4 },
  { sourceId: "u3", sourceType: "user", targetId: "u6", targetType: "user", weight: 2 },
  { sourceId: "u5", sourceType: "user", targetId: "u7", targetType: "user", weight: 2 },
  { sourceId: "u6", sourceType: "user", targetId: "u8", targetType: "user", weight: 2 },
  { sourceId: "u4", sourceType: "user", targetId: "u6", targetType: "user", weight: 2 },
  { sourceId: "u7", sourceType: "user", targetId: "u2", targetType: "user", weight: 3 },
  { sourceId: "u8", sourceType: "user", targetId: "c4", targetType: "company", weight: 2 },
  { sourceId: "u5", sourceType: "user", targetId: "c3", targetType: "company", weight: 4 },
  { sourceId: "u3", sourceType: "user", targetId: "c6", targetType: "company", weight: 2 },
];

const conversations: Array<typeof conversationsTable.$inferInsert> = [
  {
    id: "conv1",
    updatedAt: new Date("2025-12-02T10:15:00Z"),
    createdAt: new Date("2025-12-02T09:00:00Z"),
  },
  {
    id: "conv2",
    updatedAt: new Date("2025-12-01T18:30:00Z"),
    createdAt: new Date("2025-12-01T16:00:00Z"),
  },
  {
    id: "conv3",
    updatedAt: new Date("2025-11-30T14:00:00Z"),
    createdAt: new Date("2025-11-30T12:00:00Z"),
  },
  {
    id: "conv4",
    isIdentityMutuallyRevealed: true,
    updatedAt: new Date("2025-12-04T08:20:00Z"),
    createdAt: new Date("2025-12-04T07:40:00Z"),
  },
  {
    id: "conv5",
    updatedAt: new Date("2025-12-03T19:10:00Z"),
    createdAt: new Date("2025-12-03T18:30:00Z"),
  },
];

const conversationParticipants: Array<
  typeof conversationParticipantsTable.$inferInsert
> = [
  { conversationId: "conv1", userId: "u1", isAnonymous: true, isIdentityRevealed: false },
  { conversationId: "conv1", userId: "u3", isAnonymous: true, isIdentityRevealed: false },
  { conversationId: "conv2", userId: "u1", isAnonymous: true, isIdentityRevealed: false },
  { conversationId: "conv2", userId: "u6", isAnonymous: true, isIdentityRevealed: false },
  { conversationId: "conv3", userId: "u1", isAnonymous: true, isIdentityRevealed: false },
  { conversationId: "conv3", userId: "u2", isAnonymous: true, isIdentityRevealed: false },
  { conversationId: "conv4", userId: "u1", isAnonymous: false, isIdentityRevealed: true },
  { conversationId: "conv4", userId: "u5", isAnonymous: false, isIdentityRevealed: true },
  { conversationId: "conv5", userId: "u3", isAnonymous: true, isIdentityRevealed: false },
  { conversationId: "conv5", userId: "u8", isAnonymous: true, isIdentityRevealed: false },
];

const messages: Array<typeof messagesTable.$inferInsert> = [
  {
    id: "m1",
    conversationId: "conv1",
    senderId: "u3",
    content: "Hey! Saw your Google interview breakdown post. Really useful.",
    createdAt: new Date("2025-12-02T09:00:00Z"),
  },
  {
    id: "m2",
    conversationId: "conv1",
    senderId: "u1",
    content: "Happy it helped. Are you prepping for Google too?",
    createdAt: new Date("2025-12-02T09:45:00Z"),
  },
  {
    id: "m3",
    conversationId: "conv1",
    senderId: "u3",
    content: "Thanks for the tips on the Google interview! Really appreciate it.",
    createdAt: new Date("2025-12-02T10:15:00Z"),
  },
  {
    id: "m4",
    conversationId: "conv2",
    senderId: "u6",
    content: "Any specific system design resources you'd recommend?",
    createdAt: new Date("2025-12-01T16:00:00Z"),
  },
  {
    id: "m5",
    conversationId: "conv2",
    senderId: "u1",
    content: "Start with DDIA chapters on partitioning and replication.",
    createdAt: new Date("2025-12-01T17:00:00Z"),
  },
  {
    id: "m6",
    conversationId: "conv2",
    senderId: "u1",
    content: "Let me know if you want to do a mock interview sometime!",
    createdAt: new Date("2025-12-01T18:30:00Z"),
  },
  {
    id: "m7",
    conversationId: "conv3",
    senderId: "u1",
    content: "Interested in collaborating on a small open-source project?",
    createdAt: new Date("2025-11-30T12:00:00Z"),
  },
  {
    id: "m8",
    conversationId: "conv3",
    senderId: "u2",
    content: "Yes, definitely. Send me the repo details.",
    createdAt: new Date("2025-11-30T14:00:00Z"),
  },
  {
    id: "m9",
    conversationId: "conv4",
    senderId: "u5",
    content: "Happy to share my consulting prep docs if helpful.",
    createdAt: new Date("2025-12-04T07:40:00Z"),
  },
  {
    id: "m10",
    conversationId: "conv4",
    senderId: "u1",
    content: "That would be amazing. Thank you.",
    createdAt: new Date("2025-12-04T08:20:00Z"),
  },
  {
    id: "m11",
    conversationId: "conv5",
    senderId: "u3",
    content: "Loved your portfolio thread. Mind if I ask one follow-up?",
    createdAt: new Date("2025-12-03T18:30:00Z"),
  },
  {
    id: "m12",
    conversationId: "conv5",
    senderId: "u8",
    content: "Of course. Ask anything.",
    createdAt: new Date("2025-12-03T19:10:00Z"),
  },
];

const postVotes: Array<typeof postVotesTable.$inferInsert> = [
  { postId: "p1", userId: "u2", value: 1 },
  { postId: "p1", userId: "u3", value: 1 },
  { postId: "p2", userId: "u1", value: 1 },
  { postId: "p5", userId: "u6", value: 1 },
  { postId: "p5", userId: "u1", value: 1 },
  { postId: "p8", userId: "u3", value: -1 },
  { postId: "p13", userId: "u2", value: 1 },
  { postId: "p14", userId: "u1", value: 1 },
];

const commentVotes: Array<typeof commentVotesTable.$inferInsert> = [
  { commentId: "cm1", userId: "u1", value: 1 },
  { commentId: "cm3", userId: "u2", value: 1 },
  { commentId: "cm4", userId: "u3", value: 1 },
  { commentId: "cm10", userId: "u1", value: 1 },
  { commentId: "cm11", userId: "u6", value: 1 },
];

export async function seedDatabase(db: ReturnType<typeof drizzle>) {
  const [existingUsers] = await db.select({ count: count() }).from(usersTable);

  const existingCount = Number(existingUsers?.count ?? 0);

  if (existingCount === 0) {
    const authAccounts = await buildAuthAccounts(users);

    await db.transaction(async (tx) => {
      await tx.insert(usersTable).values(users);
      await tx.insert(authAccountsTable).values(authAccounts);
      await tx.insert(companiesTable).values(companies);
      await tx.insert(internshipsTable).values(internships);
      await tx.insert(postsTable).values(posts);
      await tx.insert(commentsTable).values(comments);
      await tx.insert(postVotesTable).values(postVotes);
      await tx.insert(commentVotesTable).values(commentVotes);
      await tx.insert(connectionsTable).values(connections);
      await tx.insert(conversationsTable).values(conversations);
      await tx.insert(conversationParticipantsTable).values(conversationParticipants);
      await tx.insert(messagesTable).values(messages);
    });

    return;
  }

  const [existingAuthAccounts] = await db.select({ count: count() }).from(authAccountsTable);
  const authAccountCount = Number(existingAuthAccounts?.count ?? 0);

  if (authAccountCount === 0) {
    const existingUserRows = await db.select().from(usersTable);
    const missingAccounts = await buildAuthAccounts(existingUserRows);
    if (missingAccounts.length > 0) {
      await db.insert(authAccountsTable).values(missingAccounts);
    }
  }
}
