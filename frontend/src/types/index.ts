// === User Types ===

export interface User {
  id: string;
  anonAlias: string;
  anonAvatarSeed: string;
  realName?: string;
  university: string;
  graduationYear: number;
  fieldsOfInterest: string[];
  isAnonymous: boolean;
  createdAt: string;
  stats: UserStats;
}

export interface UserStats {
  postsCreated: number;
  questionsAnswered: number;
  helpfulVotes: number;
  connectionsCount: number;
  contributionScore: number;
}

// === Post Types ===

export type PostCategory =
  | "interview-experience"
  | "internship-review"
  | "career-advice"
  | "question"
  | "resource";

export interface Post {
  id: string;
  authorId: string;
  authorAlias: string;
  authorAvatarSeed: string;
  category: PostCategory;
  title: string;
  content: string;
  companyId?: string;
  companyName?: string;
  tags: string[];
  upvotes: number;
  commentCount: number;
  isAnonymous: boolean;
  userVote?: -1 | 0 | 1;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorAlias: string;
  content: string;
  upvotes: number;
  isAnonymous: boolean;
  createdAt: string;
  replies?: Comment[];
}

// === Company Types ===

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  industry: string;
  averageRating: number;
  totalReviews: number;
  internships: Internship[];
  tags: string[];
}

export interface Internship {
  id: string;
  companyId: string;
  title: string;
  location: string;
  season: string;
  compensationRange?: string;
  averageRating: number;
  reviewCount: number;
}

export interface InternshipReview {
  id: string;
  internshipId: string;
  authorId: string;
  authorAlias: string;
  overallRating: number;
  ratings: {
    mentorship: number;
    workLifeBalance: number;
    compensation: number;
    learningOpportunity: number;
    returnOfferLikelihood: number;
  };
  pros: string;
  cons: string;
  advice: string;
  wouldRecommend: boolean;
  createdAt: string;
}

// === Network / Mosaic Types ===

export interface GraphNode {
  id: string;
  type: "user" | "company";
  label: string;
  size: number;
  group?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// === Message Types ===

export interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  lastMessage?: Message;
  updatedAt: string;
}

export interface ConversationParticipant {
  userId: string;
  alias: string;
  isAnonymous: boolean;
  isIdentityRevealed: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderAlias: string;
  content: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PlatformStats {
  users: number;
  posts: number;
  comments: number;
  messages: number;
  companies: number;
  userConnections: number;
  generatedAt: string;
  source: "live_database";
}
