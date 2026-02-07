import "dotenv/config";
import { randomBytes, createHash } from "crypto";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  authAccountsTable,
  authSessionsTable,
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
} from "./db/schema";
import { seedDatabase } from "./db/seed";
import { findModerationViolation } from "./moderation";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const PORT = Number(process.env.PORT ?? 3001);
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 30);

const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (corsOrigins.length === 0) {
  throw new Error("CORS_ORIGINS is required and must include at least one origin");
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

type UserRow = typeof usersTable.$inferSelect;
type PostVoteValue = -1 | 0 | 1;
type VisibilityLevel = "anonymous" | "role" | "school" | "realName";
type MessageKind = "text" | "identity-request" | "identity-accepted" | "identity-declined";

type UserStats = {
  postsCreated: number;
  questionsAnswered: number;
  helpfulVotes: number;
  connectionsCount: number;
  contributionScore: number;
};

type PostResponse = {
  id: string;
  authorId: string;
  authorAlias: string;
  authorRealName?: string;
  authorAvatarSeed: string;
  authorVisibilityLevel: VisibilityLevel;
  authorRole?: string;
  authorSchool?: string;
  authorGraduationYear?: number;
  category: string;
  title: string;
  content: string;
  companyId?: string;
  companyName?: string;
  tags: string[];
  upvotes: number;
  commentCount: number;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  userVote: PostVoteValue;
};

type UserResponse = {
  id: string;
  anonAlias: string;
  anonAvatarSeed: string;
  realName?: string;
  isConnected?: boolean;
  university: string;
  graduationYear: number;
  visibilityLevel: VisibilityLevel;
  fieldsOfInterest: string[];
  isAnonymous: boolean;
  createdAt: string;
  stats: UserStats;
};

type CommentResponse = {
  id: string;
  postId: string;
  authorId: string;
  authorAlias: string;
  authorRealName?: string;
  authorVisibilityLevel: VisibilityLevel;
  authorRole?: string;
  authorSchool?: string;
  authorGraduationYear?: number;
  content: string;
  upvotes: number;
  userVote: PostVoteValue;
  isAnonymous: boolean;
  createdAt: string;
  replies?: CommentResponse[];
};

type AuthSession = {
  token: string;
  user: UserRow;
  sessionId: string;
};

type PlatformStats = {
  users: number;
  posts: number;
  comments: number;
  messages: number;
  companies: number;
  userConnections: number;
  generatedAt: string;
  source: "live_database";
  derived: {
    usersWithPostsRate: number;
    connectedUsersRate: number;
    commentsPerPost: number;
    messagesPerUser: number;
  };
};

type ConversationIdentityResponse = {
  isRevealed: boolean;
  pendingRequest?: {
    fromUserId: string;
    fromAlias: string;
    requestedAt: string;
    isIncoming: boolean;
  };
};

function normalizeVisibilityLevel(level: string | null | undefined): VisibilityLevel {
  if (level === "role" || level === "school" || level === "realName") {
    return level;
  }
  return "anonymous";
}

function normalizeMessageKind(kind: string | null | undefined): MessageKind {
  if (kind === "identity-request" || kind === "identity-accepted" || kind === "identity-declined") {
    return kind;
  }
  return "text";
}

function getUserVisibilityPresentation(user: {
  anonAlias: string;
  realName: string | null;
  fieldsOfInterest: string[];
  university: string;
  graduationYear: number;
  visibilityLevel: string | null;
}) {
  const visibilityLevel = normalizeVisibilityLevel(user.visibilityLevel);
  const role = user.fieldsOfInterest[0] ?? undefined;

  if (visibilityLevel === "realName") {
    return {
      // Alias always stays primary; real name can be shown as additional context.
      displayName: user.anonAlias,
      realName: user.realName?.trim() || undefined,
      visibilityLevel,
      role,
      school: user.university,
      graduationYear: user.graduationYear,
      isAnonymous: false,
    } as const;
  }

  if (visibilityLevel === "school") {
    return {
      displayName: user.anonAlias,
      realName: undefined,
      visibilityLevel,
      role,
      school: user.university,
      graduationYear: user.graduationYear,
      isAnonymous: true,
    } as const;
  }

  if (visibilityLevel === "role") {
    return {
      displayName: user.anonAlias,
      realName: undefined,
      visibilityLevel,
      role,
      school: undefined,
      graduationYear: undefined,
      isAnonymous: true,
    } as const;
  }

  return {
    displayName: user.anonAlias,
    realName: undefined,
    visibilityLevel,
    role: undefined,
    school: undefined,
    graduationYear: undefined,
    isAnonymous: true,
  } as const;
}

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  return (typeof value === "string" ? new Date(value) : value).toISOString();
}

function normalizeCompanyLookupKey(value: string) {
  return decodeURIComponent(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function computeUserStats(userId: string): Promise<UserStats> {
  const [postsCreatedRow] = await db
    .select({ count: count() })
    .from(postsTable)
    .where(eq(postsTable.authorId, userId));
  const postsCreated = Number(postsCreatedRow?.count ?? 0);

  const [questionsAnsweredRow] = await db
    .select({ count: count() })
    .from(commentsTable)
    .innerJoin(postsTable, eq(commentsTable.postId, postsTable.id))
    .where(and(eq(commentsTable.authorId, userId), eq(postsTable.category, "question")));
  const questionsAnswered = Number(questionsAnsweredRow?.count ?? 0);

  const [postHelpfulVotesRow] = await db
    .select({ total: sql<number>`coalesce(sum(${postsTable.upvotes}), 0)` })
    .from(postsTable)
    .where(eq(postsTable.authorId, userId));
  const [commentHelpfulVotesRow] = await db
    .select({ total: sql<number>`coalesce(sum(${commentsTable.upvotes}), 0)` })
    .from(commentsTable)
    .where(eq(commentsTable.authorId, userId));

  const postHelpfulVotes = Number(postHelpfulVotesRow?.total ?? 0);
  const commentHelpfulVotes = Number(commentHelpfulVotesRow?.total ?? 0);
  const helpfulVotes = postHelpfulVotes + commentHelpfulVotes;

  const connectionRows = await db
    .selectDistinct({ targetId: connectionsTable.targetId })
    .from(connectionsTable)
    .where(
      and(
        eq(connectionsTable.sourceId, userId),
        eq(connectionsTable.sourceType, "user"),
        eq(connectionsTable.targetType, "user")
      )
    );
  const connectionsCount = connectionRows.filter((row) => row.targetId !== userId).length;

  const contributionScore =
    postsCreated * 5 + questionsAnswered * 3 + helpfulVotes * 2 + connectionsCount * 4;

  return {
    postsCreated,
    questionsAnswered,
    helpfulVotes,
    connectionsCount,
    contributionScore,
  };
}

async function areUsersConnected(viewerUserId: string, targetUserId: string): Promise<boolean> {
  if (viewerUserId === targetUserId) return false;

  const [existingConnection] = await db
    .select({ id: connectionsTable.id })
    .from(connectionsTable)
    .where(
      and(
        eq(connectionsTable.sourceType, "user"),
        eq(connectionsTable.targetType, "user"),
        or(
          and(eq(connectionsTable.sourceId, viewerUserId), eq(connectionsTable.targetId, targetUserId)),
          and(eq(connectionsTable.sourceId, targetUserId), eq(connectionsTable.targetId, viewerUserId))
        )
      )
    )
    .limit(1);

  return Boolean(existingConnection);
}

async function serializeUser(
  user: UserRow,
  viewerUserId?: string,
  options?: { includeConnectionStatus?: boolean }
): Promise<UserResponse> {
  const stats = await computeUserStats(user.id);
  const visibilityLevel = normalizeVisibilityLevel(user.visibilityLevel);
  const isOwner = viewerUserId === user.id;
  const canSeeRealName = isOwner || visibilityLevel === "realName";
  const shouldIncludeConnectionStatus = Boolean(
    options?.includeConnectionStatus && viewerUserId && viewerUserId !== user.id
  );
  let isConnected: boolean | undefined;
  if (shouldIncludeConnectionStatus && viewerUserId) {
    isConnected = await areUsersConnected(viewerUserId, user.id);
  }

  return {
    id: user.id,
    anonAlias: user.anonAlias,
    anonAvatarSeed: user.anonAvatarSeed,
    realName: canSeeRealName ? user.realName ?? undefined : undefined,
    isConnected,
    university: user.university,
    graduationYear: user.graduationYear,
    visibilityLevel,
    fieldsOfInterest: user.fieldsOfInterest,
    isAnonymous: !canSeeRealName,
    createdAt: toIso(user.createdAt),
    stats,
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isSchoolEmail(email: string) {
  const trimmed = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return false;
  }

  const domain = trimmed.split("@")[1] ?? "";
  if (!domain) {
    return false;
  }

  return (
    domain.endsWith(".edu") ||
    /\.edu\.[a-z]{2,3}$/i.test(domain) ||
    /\.ac\.[a-z]{2,3}$/i.test(domain) ||
    /\.uni\.[a-z]{2,3}$/i.test(domain)
  );
}

function validatePasswordStrength(password: string) {
  if (password.length < 12) {
    return "Password must be at least 12 characters long";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include a lowercase letter";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include an uppercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include a number";
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return "Password must include a special character";
  }
  if (/\s/.test(password)) {
    return "Password cannot include spaces";
  }
  return null;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getBearerToken(headers: Record<string, string | undefined>) {
  const rawAuthHeader = headers.authorization ?? headers.Authorization;
  if (!rawAuthHeader) return null;

  const [type, token] = rawAuthHeader.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

function ensurePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function roundMetric(value: number, digits = 1) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function moderationMessage(field: string) {
  const normalized = field.trim().toLowerCase();
  const label = normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Content";
  return `${label} contains inappropriate language. Please revise and try again.`;
}

function classifySectorFromText(raw: string): "tech" | "finance" | "business" | "community" {
  const text = raw.toLowerCase();

  if (
    /(tech|software|engineering|computer|developer|ai|ml|data|cloud|cyber|product|design|startup)/.test(text)
  ) {
    return "tech";
  }
  if (/(finance|bank|investment|quant|trading|capital|accounting|equity|asset|fund)/.test(text)) {
    return "finance";
  }
  if (/(consult|business|marketing|sales|operations|management|policy|law|strategy|advisor)/.test(text)) {
    return "business";
  }

  return "community";
}

function parseVoteValue(value: unknown): PostVoteValue | null {
  if (value === -1 || value === 0 || value === 1) return value;
  if (typeof value === "number") {
    if (value > 0) return 1;
    if (value < 0) return -1;
    return 0;
  }
  return null;
}

async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const sessionId = `sess-${crypto.randomUUID()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(authSessionsTable).values({
    id: sessionId,
    userId,
    tokenHash,
    expiresAt,
    createdAt: now,
    lastUsedAt: now,
  });

  return token;
}

async function revokeSession(token: string) {
  await db
    .update(authSessionsTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessionsTable.tokenHash, hashToken(token)), isNull(authSessionsTable.revokedAt)));
}

async function getAuthSession(headers: Record<string, string | undefined>): Promise<AuthSession | null> {
  const token = getBearerToken(headers);
  if (!token) return null;

  const tokenHash = hashToken(token);
  const [row] = await db
    .select({
      user: usersTable,
      sessionId: authSessionsTable.id,
    })
    .from(authSessionsTable)
    .innerJoin(usersTable, eq(authSessionsTable.userId, usersTable.id))
    .where(
      and(
        eq(authSessionsTable.tokenHash, tokenHash),
        isNull(authSessionsTable.revokedAt),
        gt(authSessionsTable.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!row) return null;

  await db
    .update(authSessionsTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(authSessionsTable.id, row.sessionId));

  return {
    token,
    user: row.user,
    sessionId: row.sessionId,
  };
}

async function getUserById(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return user;
}

async function resolveCompanyId(companyName?: string, companyId?: string) {
  if (companyId) {
    const [companyById] = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(eq(companiesTable.id, companyId))
      .limit(1);
    return companyById?.id;
  }

  if (!companyName) return undefined;

  const [companyByName] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(sql`lower(${companiesTable.name}) = lower(${companyName})`)
    .limit(1);

  return companyByName?.id;
}

async function ensureUserCompanyConnection(userId: string, companyId: string) {
  const [existing] = await db
    .select({ id: connectionsTable.id, weight: connectionsTable.weight })
    .from(connectionsTable)
    .where(
      and(
        eq(connectionsTable.sourceId, userId),
        eq(connectionsTable.sourceType, "user"),
        eq(connectionsTable.targetId, companyId),
        eq(connectionsTable.targetType, "company")
      )
    )
    .limit(1);

  if (!existing) {
    await db.insert(connectionsTable).values({
      sourceId: userId,
      sourceType: "user",
      targetId: companyId,
      targetType: "company",
      weight: 1,
    });
    return;
  }

  await db
    .update(connectionsTable)
    .set({ weight: Math.min(existing.weight + 1, 10) })
    .where(eq(connectionsTable.id, existing.id));
}

async function countCommentSubtree(commentId: string) {
  const result = await db.execute(sql<{ total: number }>`
    with recursive subtree as (
      select id
      from comments
      where id = ${commentId}
      union all
      select c.id
      from comments c
      inner join subtree s on c.parent_comment_id = s.id
    )
    select count(*)::int as total from subtree
  `);

  return Number(result.rows[0]?.total ?? 0);
}

async function getConversationIdentity(
  conversation: {
    id: string;
    isIdentityMutuallyRevealed: boolean;
    identityRevealRequestedBy: string | null;
    identityRevealRequestedAt: Date | null;
  },
  viewerUserId: string
): Promise<ConversationIdentityResponse> {
  if (conversation.isIdentityMutuallyRevealed) {
    return { isRevealed: true };
  }

  if (!conversation.identityRevealRequestedBy || !conversation.identityRevealRequestedAt) {
    return { isRevealed: false };
  }

  const [requester] = await db
    .select({
      anonAlias: usersTable.anonAlias,
      realName: usersTable.realName,
      visibilityLevel: usersTable.visibilityLevel,
      fieldsOfInterest: usersTable.fieldsOfInterest,
      university: usersTable.university,
      graduationYear: usersTable.graduationYear,
    })
    .from(usersTable)
    .where(eq(usersTable.id, conversation.identityRevealRequestedBy))
    .limit(1);

  const display = requester ? getUserVisibilityPresentation(requester).displayName : "Anonymous";

  return {
    isRevealed: false,
    pendingRequest: {
      fromUserId: conversation.identityRevealRequestedBy,
      fromAlias: display,
      requestedAt: toIso(conversation.identityRevealRequestedAt),
      isIncoming: conversation.identityRevealRequestedBy !== viewerUserId,
    },
  };
}

async function getMutuallyRevealedPeerUserIds(viewerUserId: string): Promise<Set<string>> {
  const revealedConversationRows = await db
    .select({ conversationId: conversationParticipantsTable.conversationId })
    .from(conversationParticipantsTable)
    .innerJoin(conversationsTable, eq(conversationParticipantsTable.conversationId, conversationsTable.id))
    .where(
      and(
        eq(conversationParticipantsTable.userId, viewerUserId),
        eq(conversationsTable.isIdentityMutuallyRevealed, true)
      )
    );

  const conversationIds = revealedConversationRows.map((row) => row.conversationId);
  if (conversationIds.length === 0) {
    return new Set();
  }

  const peerRows = await db
    .select({ userId: conversationParticipantsTable.userId })
    .from(conversationParticipantsTable)
    .where(
      and(
        inArray(conversationParticipantsTable.conversationId, conversationIds),
        sql`${conversationParticipantsTable.userId} <> ${viewerUserId}`
      )
    );

  return new Set(peerRows.map((row) => row.userId));
}

async function fetchPosts(options?: {
  filter?: string;
  where?: SQL<unknown>;
  orderBy?: "recent" | "trending" | "discussed";
  limit?: number;
  viewerId?: string;
}) {
  const conditions: SQL<unknown>[] = [];

  if (options?.filter && options.filter !== "all") {
    conditions.push(eq(postsTable.category, options.filter));
  }

  if (options?.where) {
    conditions.push(options.where);
  }

  const whereClause =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  const baseQuery = db
    .select({
      post: postsTable,
      authorAvatarSeed: usersTable.anonAvatarSeed,
      authorAnonAlias: usersTable.anonAlias,
      authorRealName: usersTable.realName,
      authorVisibilityLevel: usersTable.visibilityLevel,
      authorUniversity: usersTable.university,
      authorGraduationYear: usersTable.graduationYear,
      authorFieldsOfInterest: usersTable.fieldsOfInterest,
      companyName: companiesTable.name,
    })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .leftJoin(companiesTable, eq(postsTable.companyId, companiesTable.id))
    .where(whereClause);

  const orderedQuery =
    options?.orderBy === "trending"
      ? baseQuery.orderBy(desc(postsTable.upvotes), desc(postsTable.createdAt))
      : options?.orderBy === "discussed"
        ? baseQuery.orderBy(desc(postsTable.commentCount), desc(postsTable.createdAt))
        : baseQuery.orderBy(desc(postsTable.createdAt));

  const rows = await (options?.limit ? orderedQuery.limit(options.limit) : orderedQuery);
  const postIds = rows.map((row) => row.post.id);

  let voteByPostId = new Map<string, PostVoteValue>();
  if (options?.viewerId && postIds.length > 0) {
    const votes = await db
      .select({
        postId: postVotesTable.postId,
        value: postVotesTable.value,
      })
      .from(postVotesTable)
      .where(and(eq(postVotesTable.userId, options.viewerId), inArray(postVotesTable.postId, postIds)));

    voteByPostId = new Map(
      votes.map((vote) => [vote.postId, parseVoteValue(vote.value) ?? 0] satisfies [string, PostVoteValue])
    );
  }

  const revealedPeerUserIds = options?.viewerId
    ? await getMutuallyRevealedPeerUserIds(options.viewerId)
    : new Set<string>();

  return rows.map(
    ({
      post,
      authorAvatarSeed,
      authorAnonAlias,
      authorRealName,
      authorVisibilityLevel,
      authorUniversity,
      authorGraduationYear,
      authorFieldsOfInterest,
      companyName,
    }) => {
      const visibleAuthor = getUserVisibilityPresentation({
        anonAlias: authorAnonAlias,
        realName: authorRealName,
        visibilityLevel: authorVisibilityLevel,
        university: authorUniversity,
        graduationYear: authorGraduationYear,
        fieldsOfInterest: authorFieldsOfInterest,
      });
      const revealedInConversation = Boolean(options?.viewerId && revealedPeerUserIds.has(post.authorId));

      return {
        id: post.id,
        authorId: post.authorId,
        authorAlias: visibleAuthor.displayName,
        authorRealName: revealedInConversation
          ? (authorRealName?.trim() || undefined)
          : visibleAuthor.realName,
        authorAvatarSeed,
        authorVisibilityLevel: visibleAuthor.visibilityLevel,
        authorRole: visibleAuthor.role,
        authorSchool: visibleAuthor.school,
        authorGraduationYear: visibleAuthor.graduationYear,
        category: post.category,
        title: post.title,
        content: post.content,
        companyId: post.companyId ?? undefined,
        companyName: companyName ?? undefined,
        tags: post.tags,
        upvotes: post.upvotes,
        commentCount: post.commentCount,
        isAnonymous: revealedInConversation ? false : visibleAuthor.isAnonymous,
        createdAt: toIso(post.createdAt),
        updatedAt: toIso(post.updatedAt),
        userVote: voteByPostId.get(post.id) ?? 0,
      } satisfies PostResponse;
    }
  );
}

function buildCommentsTree(
  comments: Array<
    CommentResponse & {
      parentCommentId: string | null;
    }
  >
) {
  const byId = new Map<string, CommentResponse & { parentCommentId: string | null }>();
  const roots: Array<CommentResponse & { parentCommentId: string | null }> = [];

  for (const comment of comments) {
    byId.set(comment.id, comment);
  }

  for (const comment of comments) {
    if (!comment.parentCommentId) {
      roots.push(comment);
      continue;
    }
    const parent = byId.get(comment.parentCommentId);
    if (!parent) {
      roots.push(comment);
      continue;
    }
    parent.replies = [...(parent.replies ?? []), comment];
  }

  const stripParentField = (
    items: Array<CommentResponse & { parentCommentId: string | null }>
  ): CommentResponse[] =>
    items.map((item) => {
      const { parentCommentId: _parentCommentId, replies, ...rest } = item;
      if (!replies || replies.length === 0) {
        return rest;
      }
      return {
        ...rest,
        replies: stripParentField(replies as Array<CommentResponse & { parentCommentId: string | null }>),
      };
    });

  return stripParentField(roots);
}

async function getCompanyList() {
  const companies = await db.select().from(companiesTable).orderBy(asc(companiesTable.name));
  const companyIds = companies.map((company) => company.id);

  const internships =
    companyIds.length === 0
      ? []
      : await db
          .select()
          .from(internshipsTable)
          .where(inArray(internshipsTable.companyId, companyIds));

  const internshipsByCompany = internships.reduce<Record<string, typeof internships>>((acc, internship) => {
    const current = acc[internship.companyId] ?? [];
    current.push(internship);
    acc[internship.companyId] = current;
    return acc;
  }, {});

  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    logoUrl: company.logoUrl ?? undefined,
    industry: company.industry,
    averageRating: company.averageRating,
    totalReviews: company.totalReviews,
    tags: company.tags,
    internships: (internshipsByCompany[company.id] ?? []).map((internship) => ({
      id: internship.id,
      companyId: internship.companyId,
      title: internship.title,
      location: internship.location,
      season: internship.season,
      compensationRange: internship.compensationRange ?? undefined,
      averageRating: internship.averageRating,
      reviewCount: internship.reviewCount,
    })),
  }));
}

async function readPlatformStats(): Promise<PlatformStats> {
  const [usersCountRow] = await db.select({ count: count() }).from(usersTable);
  const [postsCountRow] = await db.select({ count: count() }).from(postsTable);
  const [commentsCountRow] = await db.select({ count: count() }).from(commentsTable);
  const [messagesCountRow] = await db.select({ count: count() }).from(messagesTable);
  const [companiesCountRow] = await db.select({ count: count() }).from(companiesTable);
  const [usersWithPostsRow] = await db
    .select({ count: sql<number>`count(distinct ${postsTable.authorId})` })
    .from(postsTable);
  const [connectedUsersRow] = await db
    .select({ count: sql<number>`count(distinct ${connectionsTable.sourceId})` })
    .from(connectionsTable)
    .where(and(eq(connectionsTable.sourceType, "user"), eq(connectionsTable.targetType, "user")));

  const [connectionsCountRow] = await db
    .select({
      count: sql<number>`
        count(
          distinct least(${connectionsTable.sourceId}, ${connectionsTable.targetId}) || ':' ||
          greatest(${connectionsTable.sourceId}, ${connectionsTable.targetId})
        )
      `,
    })
    .from(connectionsTable)
    .where(
      and(
        eq(connectionsTable.sourceType, "user"),
        eq(connectionsTable.targetType, "user")
      )
    );

  const users = Number(usersCountRow?.count ?? 0);
  const posts = Number(postsCountRow?.count ?? 0);
  const comments = Number(commentsCountRow?.count ?? 0);
  const messages = Number(messagesCountRow?.count ?? 0);
  const companies = Number(companiesCountRow?.count ?? 0);
  const userConnections = Number(connectionsCountRow?.count ?? 0);
  const usersWithPosts = Number(usersWithPostsRow?.count ?? 0);
  const connectedUsers = Number(connectedUsersRow?.count ?? 0);

  const safeUserDivisor = Math.max(users, 1);
  const safePostDivisor = Math.max(posts, 1);

  return {
    users,
    posts,
    comments,
    messages,
    companies,
    userConnections,
    generatedAt: new Date().toISOString(),
    source: "live_database",
    derived: {
      usersWithPostsRate: roundMetric((usersWithPosts / safeUserDivisor) * 100),
      connectedUsersRate: roundMetric((connectedUsers / safeUserDivisor) * 100),
      commentsPerPost: roundMetric(comments / safePostDivisor, 2),
      messagesPerUser: roundMetric(messages / safeUserDivisor, 2),
    },
  };
}

async function getPlatformStats(): Promise<PlatformStats> {
  let stats = await readPlatformStats();

  // Self-heal empty local/dev databases so landing metrics and company profiles do not render as blank/zero.
  if (stats.users === 0 && stats.posts === 0 && stats.messages === 0 && stats.companies === 0) {
    await seedDatabase(db);
    stats = await readPlatformStats();
  }

  return stats;
}

async function applyPostVote(postId: string, userId: string, nextValue: PostVoteValue) {
  return db.transaction(async (tx) => {
    const [post] = await tx
      .select({ id: postsTable.id, upvotes: postsTable.upvotes })
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .limit(1);

    if (!post) return null;

    const [existingVote] = await tx
      .select({ id: postVotesTable.id, value: postVotesTable.value })
      .from(postVotesTable)
      .where(and(eq(postVotesTable.postId, postId), eq(postVotesTable.userId, userId)))
      .limit(1);

    const currentValue = parseVoteValue(existingVote?.value ?? 0) ?? 0;
    if (currentValue === nextValue) {
      return {
        id: post.id,
        upvotes: post.upvotes,
        userVote: currentValue,
      };
    }

    if (existingVote) {
      if (nextValue === 0) {
        await tx.delete(postVotesTable).where(eq(postVotesTable.id, existingVote.id));
      } else {
        await tx
          .update(postVotesTable)
          .set({ value: nextValue, updatedAt: new Date() })
          .where(eq(postVotesTable.id, existingVote.id));
      }
    } else if (nextValue !== 0) {
      await tx.insert(postVotesTable).values({
        postId,
        userId,
        value: nextValue,
      });
    }

    const delta = nextValue - currentValue;
    const [updatedPost] = await tx
      .update(postsTable)
      .set({
        upvotes: sql`${postsTable.upvotes} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(eq(postsTable.id, postId))
      .returning({
        id: postsTable.id,
        upvotes: postsTable.upvotes,
      });

    if (!updatedPost) return null;

    return {
      id: updatedPost.id,
      upvotes: updatedPost.upvotes,
      userVote: nextValue,
    };
  });
}

async function applyCommentVote(commentId: string, userId: string, nextValue: PostVoteValue) {
  return db.transaction(async (tx) => {
    const [comment] = await tx
      .select({ id: commentsTable.id, upvotes: commentsTable.upvotes })
      .from(commentsTable)
      .where(eq(commentsTable.id, commentId))
      .limit(1);

    if (!comment) return null;

    const [existingVote] = await tx
      .select({ id: commentVotesTable.id, value: commentVotesTable.value })
      .from(commentVotesTable)
      .where(and(eq(commentVotesTable.commentId, commentId), eq(commentVotesTable.userId, userId)))
      .limit(1);

    const currentValue = parseVoteValue(existingVote?.value ?? 0) ?? 0;
    if (currentValue === nextValue) {
      return {
        id: comment.id,
        upvotes: comment.upvotes,
        userVote: currentValue,
      };
    }

    if (existingVote) {
      if (nextValue === 0) {
        await tx.delete(commentVotesTable).where(eq(commentVotesTable.id, existingVote.id));
      } else {
        await tx
          .update(commentVotesTable)
          .set({ value: nextValue, updatedAt: new Date() })
          .where(eq(commentVotesTable.id, existingVote.id));
      }
    } else if (nextValue !== 0) {
      await tx.insert(commentVotesTable).values({
        commentId,
        userId,
        value: nextValue,
      });
    }

    const delta = nextValue - currentValue;
    const [updatedComment] = await tx
      .update(commentsTable)
      .set({ upvotes: sql`${commentsTable.upvotes} + ${delta}` })
      .where(eq(commentsTable.id, commentId))
      .returning({
        id: commentsTable.id,
        upvotes: commentsTable.upvotes,
      });

    if (!updatedComment) return null;

    return {
      id: updatedComment.id,
      upvotes: updatedComment.upvotes,
      userVote: nextValue,
    };
  });
}

await seedDatabase(db);

const app = new Elysia()
  .use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })
  )
  .get("/health", () => ({ ok: true }))
  .get("/api/stats/platform", async () => {
    return getPlatformStats();
  })
  .get("/api/auth/check-email", async ({ query }) => {
    const schoolEmail = normalizeEmail(typeof query.schoolEmail === "string" ? query.schoolEmail : "");

    if (!schoolEmail) {
      return { validFormat: false, available: false };
    }

    if (!isSchoolEmail(schoolEmail)) {
      return { validFormat: false, available: false };
    }

    const [existing] = await db
      .select({ id: authAccountsTable.id })
      .from(authAccountsTable)
      .where(eq(authAccountsTable.schoolEmail, schoolEmail))
      .limit(1);

    return {
      validFormat: true,
      available: !existing,
    };
  })
  .post("/api/auth/register", async ({ body, set }) => {
    const payload = body as {
      schoolEmail?: string;
      password?: string;
      realName?: string;
      university?: string;
      graduationYear?: number;
      fieldsOfInterest?: string[];
      anonAlias?: string;
      anonAvatarSeed?: string;
    };

    const schoolEmail = normalizeEmail(payload.schoolEmail ?? "");
    const password = payload.password ?? "";

    if (!isSchoolEmail(schoolEmail)) {
      set.status = 400;
      return { message: "A valid school email is required" };
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      set.status = 400;
      return { message: passwordError };
    }

    const [existing] = await db
      .select({ id: authAccountsTable.id })
      .from(authAccountsTable)
      .where(eq(authAccountsTable.schoolEmail, schoolEmail))
      .limit(1);

    if (existing) {
      set.status = 409;
      return { message: "An account with this school email already exists" };
    }

    const university = payload.university?.trim();
    if (!university) {
      set.status = 400;
      return { message: "University is required" };
    }

    const graduationYear = Number(payload.graduationYear);
    if (!Number.isInteger(graduationYear) || graduationYear < 2020 || graduationYear > 2050) {
      set.status = 400;
      return { message: "Graduation year is invalid" };
    }

    const anonAlias = payload.anonAlias?.trim() || `Member${Math.floor(Math.random() * 10000)}`;
    const anonAvatarSeed = payload.anonAvatarSeed?.trim() || `seed-${crypto.randomUUID()}`;
    const fieldsOfInterest = Array.isArray(payload.fieldsOfInterest)
      ? payload.fieldsOfInterest.map((item) => item.trim()).filter(Boolean).slice(0, 16)
      : [];

    const passwordHash = await Bun.password.hash(password);
    const now = new Date();
    const userId = `u-${crypto.randomUUID()}`;

    const user = await db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(usersTable)
        .values({
          id: userId,
          anonAlias,
          anonAvatarSeed,
          realName: payload.realName?.trim() || null,
          university,
          graduationYear,
          visibilityLevel: "anonymous",
          fieldsOfInterest,
          isAnonymous: true,
          postsCreated: 0,
          questionsAnswered: 0,
          helpfulVotes: 0,
          connectionsCount: 0,
          contributionScore: 0,
          createdAt: now,
        })
        .returning();

      if (!createdUser) {
        throw new Error("Failed to create user");
      }

      await tx.insert(authAccountsTable).values({
        userId,
        schoolEmail,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      });

      return createdUser;
    });

    const token = await createSession(user.id);
    return {
      token,
      user: await serializeUser(user, user.id),
    };
  })
  .post("/api/auth/login", async ({ body, set }) => {
    const payload = body as {
      schoolEmail?: string;
      password?: string;
    };

    const schoolEmail = normalizeEmail(payload.schoolEmail ?? "");
    const password = payload.password ?? "";

    if (!schoolEmail || !password) {
      set.status = 400;
      return { message: "School email and password are required" };
    }

    const [account] = await db
      .select({
        passwordHash: authAccountsTable.passwordHash,
        user: usersTable,
      })
      .from(authAccountsTable)
      .innerJoin(usersTable, eq(authAccountsTable.userId, usersTable.id))
      .where(eq(authAccountsTable.schoolEmail, schoolEmail))
      .limit(1);

    if (!account) {
      set.status = 401;
      return { message: "Invalid credentials" };
    }

    const passwordValid = await Bun.password.verify(password, account.passwordHash);
    if (!passwordValid) {
      set.status = 401;
      return { message: "Invalid credentials" };
    }

    const token = await createSession(account.user.id);
    return {
      token,
      user: await serializeUser(account.user, account.user.id),
    };
  })
  .post("/api/auth/logout", async ({ headers }) => {
    const token = getBearerToken(headers as Record<string, string | undefined>);
    if (token) {
      await revokeSession(token);
    }
    return { ok: true };
  })
  .post("/api/auth/delete-account", async ({ headers, body, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const payload = body as { password?: string };
    const password = payload.password ?? "";
    if (!password) {
      set.status = 400;
      return { message: "Password is required to delete your account" };
    }

    const [account] = await db
      .select({
        passwordHash: authAccountsTable.passwordHash,
      })
      .from(authAccountsTable)
      .where(eq(authAccountsTable.userId, auth.user.id))
      .limit(1);

    if (!account) {
      set.status = 404;
      return { message: "Account credentials not found" };
    }

    const passwordValid = await Bun.password.verify(password, account.passwordHash);
    if (!passwordValid) {
      set.status = 401;
      return { message: "Invalid password" };
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(connectionsTable)
        .where(or(eq(connectionsTable.sourceId, auth.user.id), eq(connectionsTable.targetId, auth.user.id)));

      await tx.delete(authSessionsTable).where(eq(authSessionsTable.userId, auth.user.id));
      await tx.delete(usersTable).where(eq(usersTable.id, auth.user.id));

      await tx.execute(sql`
        DELETE FROM conversations AS c
        WHERE (
          SELECT COUNT(*)
          FROM conversation_participants AS cp
          WHERE cp.conversation_id = c.id
        ) < 2
      `);
    });

    return { ok: true };
  })
  .get("/api/users/me", async ({ headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }
    return await serializeUser(auth.user, auth.user.id);
  })
  .patch("/api/users/me/settings", async ({ headers, body, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const payload = body as {
      visibilityLevel?: string;
    };

    const visibilityLevel = normalizeVisibilityLevel(payload.visibilityLevel);

    const [updated] = await db
      .update(usersTable)
      .set({
        visibilityLevel,
        isAnonymous: visibilityLevel !== "realName",
      })
      .where(eq(usersTable.id, auth.user.id))
      .returning();

    if (!updated) {
      set.status = 404;
      return { message: "User not found" };
    }

    return await serializeUser(updated, auth.user.id);
  })
  .get("/api/users", async ({ query }) => {
    const search = typeof query.q === "string" ? query.q.trim().toLowerCase() : "";
    const limit = ensurePositiveInt(typeof query.limit === "string" ? query.limit : undefined, 20);

    const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limit * 3);
    const filteredUsers = users
      .filter((user) => {
        if (!search) return true;
        return (
          user.anonAlias.toLowerCase().includes(search) ||
          user.university.toLowerCase().includes(search) ||
          user.fieldsOfInterest.some((field) => field.toLowerCase().includes(search))
        );
      })
      .slice(0, limit);

    return Promise.all(filteredUsers.map((item) => serializeUser(item)));
  })
  .get("/api/users/:id", async ({ params, headers, set }) => {
    const user = await getUserById(params.id);
    if (!user) {
      set.status = 404;
      return { message: "User not found" };
    }
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    return await serializeUser(user, auth?.user.id, { includeConnectionStatus: true });
  })
  .get("/api/users/:id/posts", async ({ params, headers }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    return fetchPosts({
      where: eq(postsTable.authorId, params.id),
      orderBy: "recent",
      viewerId: auth?.user.id,
    });
  })
  .get("/api/search", async ({ query, headers }) => {
    const q = typeof query.q === "string" ? query.q.trim().toLowerCase() : "";
    const limit = ensurePositiveInt(typeof query.limit === "string" ? query.limit : undefined, 6);
    const auth = await getAuthSession(headers as Record<string, string | undefined>);

    if (!q) {
      return {
        users: [],
        companies: [],
        posts: [],
      };
    }

    const [users, companies, posts] = await Promise.all([
      db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limit * 6),
      getCompanyList(),
      fetchPosts({ orderBy: "trending", limit: 120, viewerId: auth?.user.id }),
    ]);

    const matchedUsers = users
      .filter((user) => {
        const interests = user.fieldsOfInterest.join(" ").toLowerCase();
        return (
          user.anonAlias.toLowerCase().includes(q) ||
          user.university.toLowerCase().includes(q) ||
          interests.includes(q)
        );
      })
      .slice(0, limit);

    const userResults = await Promise.all(matchedUsers.map((user) => serializeUser(user, auth?.user.id)));

    const companyResults = companies
      .filter((company) => {
        return (
          company.name.toLowerCase().includes(q) ||
          company.industry.toLowerCase().includes(q) ||
          company.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      })
      .slice(0, limit);

    const postResults = posts
      .filter((post) => {
        return (
          post.title.toLowerCase().includes(q) ||
          post.content.toLowerCase().includes(q) ||
          (post.companyName ?? "").toLowerCase().includes(q) ||
          post.authorAlias.toLowerCase().includes(q) ||
          post.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      })
      .slice(0, limit);

    return {
      users: userResults,
      companies: companyResults,
      posts: postResults,
    };
  })
  .post("/api/users/:id/connect", async ({ params, headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const targetUserId = params.id;
    if (targetUserId === auth.user.id) {
      set.status = 400;
      return { message: "Cannot connect with yourself" };
    }

    const targetUser = await getUserById(targetUserId);
    if (!targetUser) {
      set.status = 404;
      return { message: "Target user not found" };
    }

    const [existing] = await db
      .select({ id: connectionsTable.id })
      .from(connectionsTable)
      .where(
        and(
          eq(connectionsTable.sourceType, "user"),
          eq(connectionsTable.targetType, "user"),
          or(
            and(eq(connectionsTable.sourceId, auth.user.id), eq(connectionsTable.targetId, targetUserId)),
            and(eq(connectionsTable.sourceId, targetUserId), eq(connectionsTable.targetId, auth.user.id))
          )
        )
      )
      .limit(1);

    if (existing) {
      return { connected: true, alreadyConnected: true };
    }

    await db.transaction(async (tx) => {
      await tx.insert(connectionsTable).values({
        sourceId: auth.user.id,
        sourceType: "user",
        targetId: targetUserId,
        targetType: "user",
        weight: 1,
      });

      await tx.insert(connectionsTable).values({
        sourceId: targetUserId,
        sourceType: "user",
        targetId: auth.user.id,
        targetType: "user",
        weight: 1,
      });

      await tx
        .update(usersTable)
        .set({ connectionsCount: sql`${usersTable.connectionsCount} + 1` })
        .where(inArray(usersTable.id, [auth.user.id, targetUserId]));
    });

    return { connected: true, alreadyConnected: false };
  })
  .get("/api/companies", async () => getCompanyList())
  .get("/api/companies/:id", async ({ params, set }) => {
    const companies = await getCompanyList();
    const lookupKey = normalizeCompanyLookupKey(params.id);
    const company = companies.find((item) => {
      if (item.id === params.id) return true;
      return (
        normalizeCompanyLookupKey(item.id) === lookupKey ||
        normalizeCompanyLookupKey(item.name) === lookupKey
      );
    });
    if (!company) {
      set.status = 404;
      return { message: "Company not found" };
    }
    return company;
  })
  .get("/api/companies/:id/posts", async ({ params, headers }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    const companies = await getCompanyList();
    const lookupKey = normalizeCompanyLookupKey(params.id);
    const company = companies.find((item) => {
      if (item.id === params.id) return true;
      return (
        normalizeCompanyLookupKey(item.id) === lookupKey ||
        normalizeCompanyLookupKey(item.name) === lookupKey
      );
    });
    if (!company) return [];
    return fetchPosts({
      where: eq(postsTable.companyId, company.id),
      orderBy: "recent",
      viewerId: auth?.user.id,
    });
  })
  .get("/api/posts/recent", async ({ query, headers }) => {
    const limit = ensurePositiveInt(typeof query.limit === "string" ? query.limit : undefined, 5);
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    return fetchPosts({ orderBy: "recent", limit, viewerId: auth?.user.id });
  })
  .get("/api/posts/trending", async ({ query, headers }) => {
    const limit = ensurePositiveInt(typeof query.limit === "string" ? query.limit : undefined, 5);
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    return fetchPosts({ orderBy: "trending", limit, viewerId: auth?.user.id });
  })
  .get("/api/posts", async ({ query, headers }) => {
    const filter = typeof query.filter === "string" ? query.filter : undefined;
    const sortRaw = typeof query.sort === "string" ? query.sort : "recent";
    const orderBy =
      sortRaw === "trending" || sortRaw === "upvoted"
        ? "trending"
        : sortRaw === "discussed"
          ? "discussed"
          : "recent";
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    return fetchPosts({ filter, orderBy, viewerId: auth?.user.id });
  })
  .post("/api/posts", async ({ body, headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const payload = body as {
      title?: string;
      content?: string;
      category?: string;
      tags?: string[];
      companyId?: string;
      companyName?: string;
    };

    const title = payload.title?.trim();
    const content = payload.content?.trim();
    if (!title || !content) {
      set.status = 400;
      return { message: "Title and content are required" };
    }

    const moderationViolation = findModerationViolation([
      { label: "title", value: title },
      { label: "content", value: content },
      ...((Array.isArray(payload.tags) ? payload.tags : []).map((tag) => ({
        label: "tag",
        value: tag,
      }))),
    ]);
    if (moderationViolation) {
      set.status = 400;
      return { message: moderationMessage(moderationViolation.field) };
    }

    const companyId = await resolveCompanyId(payload.companyName, payload.companyId);
    if (payload.companyId && !companyId) {
      set.status = 400;
      return { message: "Invalid companyId" };
    }

    if (payload.companyName && !payload.companyId && !companyId) {
      set.status = 400;
      return { message: "Company name not found" };
    }

    const id = `p-${crypto.randomUUID()}`;
    const now = new Date();

    await db.insert(postsTable).values({
      id,
      authorId: auth.user.id,
      category: payload.category ?? "question",
      title,
      content,
      companyId,
      tags: Array.isArray(payload.tags) ? payload.tags.map((tag) => tag.trim()).filter(Boolean) : [],
      upvotes: 0,
      commentCount: 0,
      isAnonymous: normalizeVisibilityLevel(auth.user.visibilityLevel) !== "realName",
      createdAt: now,
      updatedAt: now,
    });

    if (companyId) {
      await ensureUserCompanyConnection(auth.user.id, companyId);
    }

    await db
      .update(usersTable)
      .set({
        postsCreated: sql`${usersTable.postsCreated} + 1`,
        contributionScore: sql`${usersTable.contributionScore} + 2`,
      })
      .where(eq(usersTable.id, auth.user.id));

    const [company] = companyId
      ? await db
          .select({ name: companiesTable.name })
          .from(companiesTable)
          .where(eq(companiesTable.id, companyId))
          .limit(1)
      : [];

    const authorPresentation = getUserVisibilityPresentation({
      anonAlias: auth.user.anonAlias,
      realName: auth.user.realName,
      visibilityLevel: auth.user.visibilityLevel,
      university: auth.user.university,
      graduationYear: auth.user.graduationYear,
      fieldsOfInterest: auth.user.fieldsOfInterest,
    });

    return {
      id,
      authorId: auth.user.id,
      authorAlias: authorPresentation.displayName,
      authorRealName: authorPresentation.realName,
      authorAvatarSeed: auth.user.anonAvatarSeed,
      authorVisibilityLevel: authorPresentation.visibilityLevel,
      authorRole: authorPresentation.role,
      authorSchool: authorPresentation.school,
      authorGraduationYear: authorPresentation.graduationYear,
      category: payload.category ?? "question",
      title,
      content,
      companyId,
      companyName: company?.name,
      tags: Array.isArray(payload.tags) ? payload.tags.map((tag) => tag.trim()).filter(Boolean) : [],
      upvotes: 0,
      commentCount: 0,
      isAnonymous: authorPresentation.isAnonymous,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      userVote: 0,
    } satisfies PostResponse;
  })
  .post("/api/posts/:id/upvote", async ({ params, headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const result = await applyPostVote(params.id, auth.user.id, 1);
    if (!result) {
      set.status = 404;
      return { message: "Post not found" };
    }
    return result;
  })
  .post("/api/posts/:id/vote", async ({ params, body, headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const payload = body as { value?: number };
    const vote = parseVoteValue(payload.value);
    if (vote === null) {
      set.status = 400;
      return { message: "Vote value must be -1, 0, or 1" };
    }

    const result = await applyPostVote(params.id, auth.user.id, vote);
    if (!result) {
      set.status = 404;
      return { message: "Post not found" };
    }
    return result;
  })
  .patch("/api/posts/:id", async ({ params, body, headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const [existingPost] = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, params.id))
      .limit(1);

    if (!existingPost) {
      set.status = 404;
      return { message: "Post not found" };
    }

    if (existingPost.authorId !== auth.user.id) {
      set.status = 403;
      return { message: "You can only edit your own posts" };
    }

    const payload = body as {
      title?: string;
      content?: string;
      category?: string;
      tags?: string[];
      companyId?: string | null;
      companyName?: string;
    };

    const title = payload.title?.trim() ?? existingPost.title;
    const content = payload.content?.trim() ?? existingPost.content;
    if (!title || !content) {
      set.status = 400;
      return { message: "Title and content are required" };
    }

    const nextTags = Array.isArray(payload.tags)
      ? payload.tags.map((tag) => tag.trim()).filter(Boolean)
      : existingPost.tags;

    const moderationViolation = findModerationViolation([
      { label: "title", value: title },
      { label: "content", value: content },
      ...nextTags.map((tag) => ({ label: "tag", value: tag })),
    ]);
    if (moderationViolation) {
      set.status = 400;
      return { message: moderationMessage(moderationViolation.field) };
    }

    let companyId: string | undefined;
    if (payload.companyId === null) {
      companyId = undefined;
    } else if (typeof payload.companyId === "string" && payload.companyId.trim()) {
      companyId = await resolveCompanyId(undefined, payload.companyId.trim());
      if (!companyId) {
        set.status = 400;
        return { message: "Invalid companyId" };
      }
    } else if (typeof payload.companyName === "string" && payload.companyName.trim()) {
      companyId = await resolveCompanyId(payload.companyName.trim(), undefined);
      if (!companyId) {
        set.status = 400;
        return { message: "Company name not found" };
      }
    } else {
      companyId = existingPost.companyId ?? undefined;
    }

    await db
      .update(postsTable)
      .set({
        title,
        content,
        category: payload.category ?? existingPost.category,
        tags: nextTags,
        companyId: companyId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(postsTable.id, params.id));

    if (companyId) {
      await ensureUserCompanyConnection(auth.user.id, companyId);
    }

    const [post] = await fetchPosts({
      where: eq(postsTable.id, params.id),
      viewerId: auth.user.id,
      limit: 1,
    });

    if (!post) {
      set.status = 404;
      return { message: "Post not found after update" };
    }

    return post;
  })
  .delete("/api/posts/:id", async ({ params, headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const [existingPost] = await db
      .select({ id: postsTable.id, authorId: postsTable.authorId })
      .from(postsTable)
      .where(eq(postsTable.id, params.id))
      .limit(1);

    if (!existingPost) {
      set.status = 404;
      return { message: "Post not found" };
    }

    if (existingPost.authorId !== auth.user.id) {
      set.status = 403;
      return { message: "You can only delete your own posts" };
    }

    await db.transaction(async (tx) => {
      await tx.delete(postsTable).where(eq(postsTable.id, params.id));
      await tx
        .update(usersTable)
        .set({
          postsCreated: sql`greatest(${usersTable.postsCreated} - 1, 0)`,
          contributionScore: sql`greatest(${usersTable.contributionScore} - 2, 0)`,
        })
        .where(eq(usersTable.id, auth.user.id));
    });

    return { ok: true };
  })
  .get("/api/posts/:id/comments", async ({ params, headers }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    const rows = await db
      .select({
        id: commentsTable.id,
        postId: commentsTable.postId,
        authorId: commentsTable.authorId,
        authorAnonAlias: usersTable.anonAlias,
        authorRealName: usersTable.realName,
        authorVisibilityLevel: usersTable.visibilityLevel,
        authorUniversity: usersTable.university,
        authorGraduationYear: usersTable.graduationYear,
        authorFieldsOfInterest: usersTable.fieldsOfInterest,
        content: commentsTable.content,
        upvotes: commentsTable.upvotes,
        isAnonymous: commentsTable.isAnonymous,
        createdAt: commentsTable.createdAt,
        parentCommentId: commentsTable.parentCommentId,
      })
      .from(commentsTable)
      .innerJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
      .where(eq(commentsTable.postId, params.id))
      .orderBy(asc(commentsTable.createdAt));

    const commentIds = rows.map((row) => row.id);
    let voteByCommentId = new Map<string, PostVoteValue>();
    if (auth?.user.id && commentIds.length > 0) {
      const votes = await db
        .select({
          commentId: commentVotesTable.commentId,
          value: commentVotesTable.value,
        })
        .from(commentVotesTable)
        .where(
          and(
            eq(commentVotesTable.userId, auth.user.id),
            inArray(commentVotesTable.commentId, commentIds)
          )
        );

      voteByCommentId = new Map(
        votes.map((vote) => [vote.commentId, parseVoteValue(vote.value) ?? 0] satisfies [string, PostVoteValue])
      );
    }

    const revealedPeerUserIds = auth?.user.id
      ? await getMutuallyRevealedPeerUserIds(auth.user.id)
      : new Set<string>();

    return buildCommentsTree(
      rows.map((row) => {
        const visibleAuthor = getUserVisibilityPresentation({
          anonAlias: row.authorAnonAlias,
          realName: row.authorRealName,
          visibilityLevel: row.authorVisibilityLevel,
          university: row.authorUniversity,
          graduationYear: row.authorGraduationYear,
          fieldsOfInterest: row.authorFieldsOfInterest,
        });
        const revealedInConversation = auth?.user.id
          ? revealedPeerUserIds.has(row.authorId)
          : false;

        return {
          id: row.id,
          postId: row.postId,
          authorId: row.authorId,
          authorAlias: visibleAuthor.displayName,
          authorRealName: revealedInConversation
            ? (row.authorRealName?.trim() || undefined)
            : visibleAuthor.realName,
          authorVisibilityLevel: visibleAuthor.visibilityLevel,
          authorRole: visibleAuthor.role,
          authorSchool: visibleAuthor.school,
          authorGraduationYear: visibleAuthor.graduationYear,
          content: row.content,
          upvotes: row.upvotes,
          userVote: voteByCommentId.get(row.id) ?? 0,
          isAnonymous: revealedInConversation ? false : visibleAuthor.isAnonymous,
          createdAt: toIso(row.createdAt),
          parentCommentId: row.parentCommentId,
        };
      })
    );
  })
  .post("/api/posts/:id/comments", async ({ params, body, headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const payload = body as {
      content?: string;
      parentCommentId?: string;
    };

    const content = payload.content?.trim();
    if (!content) {
      set.status = 400;
      return { message: "Comment content is required" };
    }

    const moderationViolation = findModerationViolation([{ label: "comment", value: content }]);
    if (moderationViolation) {
      set.status = 400;
      return { message: moderationMessage(moderationViolation.field) };
    }

    const [post] = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.id, params.id))
      .limit(1);
    if (!post) {
      set.status = 404;
      return { message: "Post not found" };
    }

    if (payload.parentCommentId) {
      const [parent] = await db
        .select({ id: commentsTable.id, postId: commentsTable.postId })
        .from(commentsTable)
        .where(eq(commentsTable.id, payload.parentCommentId))
        .limit(1);
      if (!parent || parent.postId !== params.id) {
        set.status = 400;
        return { message: "Invalid parent comment" };
      }
    }

    const id = `cm-${crypto.randomUUID()}`;
    const createdAt = new Date();

    await db.insert(commentsTable).values({
      id,
      postId: params.id,
      authorId: auth.user.id,
      parentCommentId: payload.parentCommentId,
      content,
      upvotes: 0,
      isAnonymous: normalizeVisibilityLevel(auth.user.visibilityLevel) !== "realName",
      createdAt,
    });

    await db
      .update(postsTable)
      .set({
        commentCount: sql`${postsTable.commentCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(postsTable.id, params.id));

    const authorPresentation = getUserVisibilityPresentation({
      anonAlias: auth.user.anonAlias,
      realName: auth.user.realName,
      visibilityLevel: auth.user.visibilityLevel,
      university: auth.user.university,
      graduationYear: auth.user.graduationYear,
      fieldsOfInterest: auth.user.fieldsOfInterest,
    });

    return {
      id,
      postId: params.id,
      authorId: auth.user.id,
      authorAlias: authorPresentation.displayName,
      authorRealName: authorPresentation.realName,
      authorVisibilityLevel: authorPresentation.visibilityLevel,
      authorRole: authorPresentation.role,
      authorSchool: authorPresentation.school,
      authorGraduationYear: authorPresentation.graduationYear,
      content,
      upvotes: 0,
      userVote: 0,
      isAnonymous: authorPresentation.isAnonymous,
      createdAt: createdAt.toISOString(),
    } satisfies CommentResponse;
  })
  .post("/api/comments/:id/vote", async ({ params, body, headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const payload = body as { value?: number };
    const vote = parseVoteValue(payload.value);
    if (vote === null) {
      set.status = 400;
      return { message: "Vote value must be -1, 0, or 1" };
    }

    const result = await applyCommentVote(params.id, auth.user.id, vote);
    if (!result) {
      set.status = 404;
      return { message: "Comment not found" };
    }
    return result;
  })
  .patch("/api/comments/:id", async ({ params, body, headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const [comment] = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, params.id))
      .limit(1);

    if (!comment) {
      set.status = 404;
      return { message: "Comment not found" };
    }

    if (comment.authorId !== auth.user.id) {
      set.status = 403;
      return { message: "You can only edit your own comments" };
    }

    const payload = body as { content?: string };
    const content = payload.content?.trim();
    if (!content) {
      set.status = 400;
      return { message: "Comment content is required" };
    }

    const moderationViolation = findModerationViolation([{ label: "comment", value: content }]);
    if (moderationViolation) {
      set.status = 400;
      return { message: moderationMessage(moderationViolation.field) };
    }

    const [updated] = await db
      .update(commentsTable)
      .set({ content })
      .where(eq(commentsTable.id, params.id))
      .returning();

    if (!updated) {
      set.status = 404;
      return { message: "Comment not found after update" };
    }

    const authorPresentation = getUserVisibilityPresentation({
      anonAlias: auth.user.anonAlias,
      realName: auth.user.realName,
      visibilityLevel: auth.user.visibilityLevel,
      university: auth.user.university,
      graduationYear: auth.user.graduationYear,
      fieldsOfInterest: auth.user.fieldsOfInterest,
    });

    return {
      id: updated.id,
      postId: updated.postId,
      authorId: updated.authorId,
      authorAlias: authorPresentation.displayName,
      authorRealName: authorPresentation.realName,
      authorVisibilityLevel: authorPresentation.visibilityLevel,
      authorRole: authorPresentation.role,
      authorSchool: authorPresentation.school,
      authorGraduationYear: authorPresentation.graduationYear,
      content: updated.content,
      upvotes: updated.upvotes,
      userVote: 0,
      isAnonymous: authorPresentation.isAnonymous,
      createdAt: toIso(updated.createdAt),
    } satisfies CommentResponse;
  })
  .delete("/api/comments/:id", async ({ params, headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const [comment] = await db
      .select({
        id: commentsTable.id,
        authorId: commentsTable.authorId,
        postId: commentsTable.postId,
      })
      .from(commentsTable)
      .where(eq(commentsTable.id, params.id))
      .limit(1);

    if (!comment) {
      set.status = 404;
      return { message: "Comment not found" };
    }

    if (comment.authorId !== auth.user.id) {
      set.status = 403;
      return { message: "You can only delete your own comments" };
    }

    const removedCount = await countCommentSubtree(comment.id);

    await db.transaction(async (tx) => {
      await tx.delete(commentsTable).where(eq(commentsTable.id, comment.id));
      await tx
        .update(postsTable)
        .set({
          commentCount: sql`greatest(${postsTable.commentCount} - ${removedCount}, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(postsTable.id, comment.postId));
    });

    return { ok: true, removedCount };
  })
  .get("/api/graph", async ({ query }) => {
    const industry = typeof query.industry === "string" ? query.industry.toLowerCase() : undefined;
    const university = typeof query.university === "string" ? query.university.toLowerCase() : undefined;

    const users = await db.select().from(usersTable);
    const companies = await db.select().from(companiesTable);
    const connections = await db.select().from(connectionsTable);
    const postCompanyLinks = await db
      .select({
        authorId: postsTable.authorId,
        companyId: postsTable.companyId,
      })
      .from(postsTable)
      .where(isNotNull(postsTable.companyId));

    const filteredCompanies = industry
      ? companies.filter((company) => company.industry.toLowerCase().includes(industry))
      : companies;

    const filteredUsers = university
      ? users.filter((user) => user.university.toLowerCase().includes(university))
      : users;

    const nodes = [
      ...filteredCompanies.map((company) => {
        const sector = classifySectorFromText(
          [company.industry, company.name, ...(company.tags ?? [])].join(" ")
        );
        return {
          id: company.id,
          type: "company" as const,
          label: company.name,
          size: Math.max(4, Math.round(company.totalReviews / 6)),
          group: sector,
        };
      }),
      ...filteredUsers.map((user) => {
        const sector = classifySectorFromText(user.fieldsOfInterest.join(" "));
        return {
          id: user.id,
          type: "user" as const,
          label: user.anonAlias,
          size: Math.max(2, Math.round(user.contributionScore / 20)),
          group: sector,
        };
      }),
    ];

    const nodeIdSet = new Set(nodes.map((node) => node.id));
    const edgesByPair = new Map<string, { source: string; target: string; weight: number }>();
    connections
      .filter((edge) => nodeIdSet.has(edge.sourceId) && nodeIdSet.has(edge.targetId))
      .forEach((edge) => {
        const sorted = [edge.sourceId, edge.targetId].sort();
        const left = sorted[0] ?? edge.sourceId;
        const right = sorted[1] ?? edge.targetId;
        const key = `${left}:${right}`;
        const existing = edgesByPair.get(key);
        if (existing) {
          existing.weight = Math.max(existing.weight, edge.weight);
          return;
        }

        edgesByPair.set(key, {
          source: left,
          target: right,
          weight: edge.weight,
        });
      });

    postCompanyLinks
      .filter((edge) => edge.companyId && nodeIdSet.has(edge.authorId) && nodeIdSet.has(edge.companyId))
      .forEach((edge) => {
        if (!edge.companyId) return;
        const sorted = [edge.authorId, edge.companyId].sort();
        const left = sorted[0] ?? edge.authorId;
        const right = sorted[1] ?? edge.companyId;
        const key = `${left}:${right}`;
        const existing = edgesByPair.get(key);
        if (existing) {
          existing.weight = Math.min(existing.weight + 1, 10);
          return;
        }

        edgesByPair.set(key, {
          source: left,
          target: right,
          weight: 1,
        });
      });

    const edges = [...edgesByPair.values()];
    const connectedNodeIds = new Set<string>();
    for (const edge of edges) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }

    const connectedNodes = nodes.filter((node) => connectedNodeIds.has(node.id));

    return { nodes: connectedNodes, edges };
  })
  .post("/api/conversations/direct", async ({ body, headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const payload = body as { targetUserId?: string };
    const targetUserId = payload.targetUserId?.trim();
    if (!targetUserId) {
      set.status = 400;
      return { message: "targetUserId is required" };
    }

    if (targetUserId === auth.user.id) {
      set.status = 400;
      return { message: "Cannot create a conversation with yourself" };
    }

    const targetUser = await getUserById(targetUserId);
    if (!targetUser) {
      set.status = 404;
      return { message: "Target user not found" };
    }

    const myConversations = await db
      .select({ conversationId: conversationParticipantsTable.conversationId })
      .from(conversationParticipantsTable)
      .where(eq(conversationParticipantsTable.userId, auth.user.id));

    const myConversationIds = myConversations.map((row) => row.conversationId);
    if (myConversationIds.length > 0) {
      const participants = await db
        .select({
          conversationId: conversationParticipantsTable.conversationId,
          userId: conversationParticipantsTable.userId,
        })
        .from(conversationParticipantsTable)
        .where(inArray(conversationParticipantsTable.conversationId, myConversationIds));

      const participantMap = participants.reduce<Map<string, Set<string>>>((acc, row) => {
        if (!acc.has(row.conversationId)) {
          acc.set(row.conversationId, new Set());
        }
        acc.get(row.conversationId)?.add(row.userId);
        return acc;
      }, new Map());

      for (const [conversationId, userIds] of participantMap.entries()) {
        if (userIds.size === 2 && userIds.has(auth.user.id) && userIds.has(targetUserId)) {
          return { conversationId, existing: true };
        }
      }
    }

    const conversationId = `conv-${crypto.randomUUID()}`;
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.insert(conversationsTable).values({
        id: conversationId,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(conversationParticipantsTable).values([
        {
          conversationId,
          userId: auth.user.id,
          isAnonymous: true,
          isIdentityRevealed: false,
        },
        {
          conversationId,
          userId: targetUserId,
          isAnonymous: true,
          isIdentityRevealed: false,
        },
      ]);
    });

    return { conversationId, existing: false };
  })
  .get("/api/conversations", async ({ headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const participantRows = await db
      .select({ conversationId: conversationParticipantsTable.conversationId })
      .from(conversationParticipantsTable)
      .where(eq(conversationParticipantsTable.userId, auth.user.id));

    const conversationIds = participantRows.map((row) => row.conversationId);
    if (conversationIds.length === 0) return [];

    const conversations = await db
      .select({
        id: conversationsTable.id,
        updatedAt: conversationsTable.updatedAt,
        isIdentityMutuallyRevealed: conversationsTable.isIdentityMutuallyRevealed,
        identityRevealRequestedBy: conversationsTable.identityRevealRequestedBy,
        identityRevealRequestedAt: conversationsTable.identityRevealRequestedAt,
      })
      .from(conversationsTable)
      .where(inArray(conversationsTable.id, conversationIds))
      .orderBy(desc(conversationsTable.updatedAt));

    const participants = await db
      .select({
        conversationId: conversationParticipantsTable.conversationId,
        userId: conversationParticipantsTable.userId,
        anonAlias: usersTable.anonAlias,
        realName: usersTable.realName,
        visibilityLevel: usersTable.visibilityLevel,
        university: usersTable.university,
        graduationYear: usersTable.graduationYear,
        fieldsOfInterest: usersTable.fieldsOfInterest,
        isAnonymous: conversationParticipantsTable.isAnonymous,
        isIdentityRevealed: conversationParticipantsTable.isIdentityRevealed,
      })
      .from(conversationParticipantsTable)
      .innerJoin(usersTable, eq(conversationParticipantsTable.userId, usersTable.id))
      .where(inArray(conversationParticipantsTable.conversationId, conversationIds));

    const messageRows = await db
      .select({
        id: messagesTable.id,
        conversationId: messagesTable.conversationId,
        senderId: messagesTable.senderId,
        senderAnonAlias: usersTable.anonAlias,
        senderRealName: usersTable.realName,
        content: messagesTable.content,
        kind: messagesTable.kind,
        createdAt: messagesTable.createdAt,
      })
      .from(messagesTable)
      .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(inArray(messagesTable.conversationId, conversationIds))
      .orderBy(desc(messagesTable.createdAt));

    const participantsByConversation = participants.reduce<
      Record<
        string,
        Array<{
          userId: string;
          anonAlias: string;
          realName: string | null;
          visibilityLevel: string;
          university: string;
          graduationYear: number;
          fieldsOfInterest: string[];
          isAnonymous: boolean;
          isIdentityRevealed: boolean;
        }>
      >
    >((acc, row) => {
      const current = acc[row.conversationId] ?? [];
      current.push({
        userId: row.userId,
        anonAlias: row.anonAlias,
        realName: row.realName,
        visibilityLevel: row.visibilityLevel,
        university: row.university,
        graduationYear: row.graduationYear,
        fieldsOfInterest: row.fieldsOfInterest,
        isAnonymous: row.isAnonymous,
        isIdentityRevealed: row.isIdentityRevealed,
      });
      acc[row.conversationId] = current;
      return acc;
    }, {});

    const latestMessageByConversation = new Map<string, (typeof messageRows)[number]>();
    for (const message of messageRows) {
      if (!latestMessageByConversation.has(message.conversationId)) {
        latestMessageByConversation.set(message.conversationId, message);
      }
    }

    return Promise.all(conversations.map(async (conversation) => {
      const participantsForConversation = participantsByConversation[conversation.id] ?? [];
      const identity = await getConversationIdentity(conversation, auth.user.id);

      const serializedParticipants = participantsForConversation.map((participant) => {
        const visible = getUserVisibilityPresentation({
          anonAlias: participant.anonAlias,
          realName: participant.realName,
          visibilityLevel: participant.visibilityLevel,
          university: participant.university,
          graduationYear: participant.graduationYear,
          fieldsOfInterest: participant.fieldsOfInterest,
        });

        const alias = conversation.isIdentityMutuallyRevealed
          ? participant.realName?.trim() || participant.anonAlias
          : participant.anonAlias;

        return {
          userId: participant.userId,
          alias,
          isAnonymous: !conversation.isIdentityMutuallyRevealed,
          isIdentityRevealed: conversation.isIdentityMutuallyRevealed,
          role: conversation.isIdentityMutuallyRevealed ? visible.role : undefined,
          school: conversation.isIdentityMutuallyRevealed ? visible.school : undefined,
          graduationYear: conversation.isIdentityMutuallyRevealed ? visible.graduationYear : undefined,
        };
      });

      const lastMessage = latestMessageByConversation.get(conversation.id);
      return {
        id: conversation.id,
        participants: serializedParticipants,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              conversationId: lastMessage.conversationId,
              senderId: lastMessage.senderId,
              senderAlias: conversation.isIdentityMutuallyRevealed
                ? (lastMessage.senderRealName?.trim() || lastMessage.senderAnonAlias)
                : lastMessage.senderAnonAlias,
              content: lastMessage.content,
              kind: normalizeMessageKind(lastMessage.kind),
              createdAt: toIso(lastMessage.createdAt),
            }
          : undefined,
        identity,
        updatedAt: toIso(conversation.updatedAt),
      };
    }));
  })
  .get("/api/conversations/:id/messages", async ({ params, headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const [participant] = await db
      .select({ userId: conversationParticipantsTable.userId })
      .from(conversationParticipantsTable)
      .where(
        and(
          eq(conversationParticipantsTable.conversationId, params.id),
          eq(conversationParticipantsTable.userId, auth.user.id)
        )
      )
      .limit(1);

    if (!participant) {
      set.status = 403;
      return { message: "Not allowed to view this conversation" };
    }

    const [conversation] = await db
      .select({
        id: conversationsTable.id,
        isIdentityMutuallyRevealed: conversationsTable.isIdentityMutuallyRevealed,
      })
      .from(conversationsTable)
      .where(eq(conversationsTable.id, params.id))
      .limit(1);

    if (!conversation) {
      set.status = 404;
      return { message: "Conversation not found" };
    }

    const rows = await db
      .select({
        id: messagesTable.id,
        conversationId: messagesTable.conversationId,
        senderId: messagesTable.senderId,
        senderAnonAlias: usersTable.anonAlias,
        senderRealName: usersTable.realName,
        content: messagesTable.content,
        kind: messagesTable.kind,
        createdAt: messagesTable.createdAt,
      })
      .from(messagesTable)
      .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(eq(messagesTable.conversationId, params.id))
      .orderBy(asc(messagesTable.createdAt));

    return rows.map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      senderId: row.senderId,
      senderAlias: conversation.isIdentityMutuallyRevealed
        ? (row.senderRealName?.trim() || row.senderAnonAlias)
        : row.senderAnonAlias,
      content: row.content,
      kind: normalizeMessageKind(row.kind),
      createdAt: toIso(row.createdAt),
    }));
  })
  .post("/api/conversations/:id/identity/request", async ({ params, headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const [participant] = await db
      .select({ userId: conversationParticipantsTable.userId })
      .from(conversationParticipantsTable)
      .where(
        and(
          eq(conversationParticipantsTable.conversationId, params.id),
          eq(conversationParticipantsTable.userId, auth.user.id)
        )
      )
      .limit(1);

    if (!participant) {
      set.status = 403;
      return { message: "Sender is not a participant in this conversation" };
    }

    const [conversation] = await db
      .select({
        id: conversationsTable.id,
        isIdentityMutuallyRevealed: conversationsTable.isIdentityMutuallyRevealed,
        identityRevealRequestedBy: conversationsTable.identityRevealRequestedBy,
        identityRevealRequestedAt: conversationsTable.identityRevealRequestedAt,
      })
      .from(conversationsTable)
      .where(eq(conversationsTable.id, params.id))
      .limit(1);

    if (!conversation) {
      set.status = 404;
      return { message: "Conversation not found" };
    }

    if (conversation.isIdentityMutuallyRevealed) {
      return { ok: true, identity: { isRevealed: true } };
    }

    if (conversation.identityRevealRequestedBy && conversation.identityRevealRequestedBy !== auth.user.id) {
      return {
        ok: true,
        identity: await getConversationIdentity(conversation, auth.user.id),
      };
    }

    const now = new Date();
    await db
      .update(conversationsTable)
      .set({
        identityRevealRequestedBy: auth.user.id,
        identityRevealRequestedAt: now,
        updatedAt: now,
      })
      .where(eq(conversationsTable.id, params.id));

    const id = `m-${crypto.randomUUID()}`;
    await db.insert(messagesTable).values({
      id,
      conversationId: params.id,
      senderId: auth.user.id,
      kind: "identity-request",
      content: "Identity reveal requested.",
      createdAt: now,
    });

    const updatedConversation = {
      ...conversation,
      identityRevealRequestedBy: auth.user.id,
      identityRevealRequestedAt: now,
    };

    return {
      ok: true,
      identity: await getConversationIdentity(updatedConversation, auth.user.id),
    };
  })
  .post("/api/conversations/:id/identity/respond", async ({ params, body, headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const payload = body as { accept?: boolean };

    const [participant] = await db
      .select({ userId: conversationParticipantsTable.userId })
      .from(conversationParticipantsTable)
      .where(
        and(
          eq(conversationParticipantsTable.conversationId, params.id),
          eq(conversationParticipantsTable.userId, auth.user.id)
        )
      )
      .limit(1);

    if (!participant) {
      set.status = 403;
      return { message: "Sender is not a participant in this conversation" };
    }

    const [conversation] = await db
      .select({
        id: conversationsTable.id,
        isIdentityMutuallyRevealed: conversationsTable.isIdentityMutuallyRevealed,
        identityRevealRequestedBy: conversationsTable.identityRevealRequestedBy,
        identityRevealRequestedAt: conversationsTable.identityRevealRequestedAt,
      })
      .from(conversationsTable)
      .where(eq(conversationsTable.id, params.id))
      .limit(1);

    if (!conversation) {
      set.status = 404;
      return { message: "Conversation not found" };
    }

    if (!conversation.identityRevealRequestedBy || !conversation.identityRevealRequestedAt) {
      set.status = 400;
      return { message: "No pending identity reveal request" };
    }

    if (conversation.identityRevealRequestedBy === auth.user.id) {
      set.status = 400;
      return { message: "Cannot respond to your own identity request" };
    }

    const accept = payload.accept === true;
    const now = new Date();

    if (accept) {
      await db.transaction(async (tx) => {
        await tx
          .update(conversationsTable)
          .set({
            isIdentityMutuallyRevealed: true,
            identityRevealRequestedBy: null,
            identityRevealRequestedAt: null,
            updatedAt: now,
          })
          .where(eq(conversationsTable.id, params.id));

        await tx
          .update(conversationParticipantsTable)
          .set({
            isAnonymous: false,
            isIdentityRevealed: true,
          })
          .where(eq(conversationParticipantsTable.conversationId, params.id));

        await tx.insert(messagesTable).values({
          id: `m-${crypto.randomUUID()}`,
          conversationId: params.id,
          senderId: auth.user.id,
          kind: "identity-accepted",
          content: "Identity reveal accepted.",
          createdAt: now,
        });
      });

      return {
        ok: true,
        identity: {
          isRevealed: true,
        } satisfies ConversationIdentityResponse,
      };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(conversationsTable)
        .set({
          identityRevealRequestedBy: null,
          identityRevealRequestedAt: null,
          updatedAt: now,
        })
        .where(eq(conversationsTable.id, params.id));

      await tx.insert(messagesTable).values({
        id: `m-${crypto.randomUUID()}`,
        conversationId: params.id,
        senderId: auth.user.id,
        kind: "identity-declined",
        content: "Identity reveal request declined.",
        createdAt: now,
      });
    });

    return {
      ok: true,
      identity: {
        isRevealed: false,
      } satisfies ConversationIdentityResponse,
    };
  })
  .post("/api/conversations/:id/messages", async ({ params, body, headers, set }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    if (!auth) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const payload = body as { content?: string };
    const content = payload.content?.trim();
    if (!content) {
      set.status = 400;
      return { message: "Message content is required" };
    }

    const moderationViolation = findModerationViolation([{ label: "message", value: content }]);
    if (moderationViolation) {
      set.status = 400;
      return { message: moderationMessage(moderationViolation.field) };
    }

    const [participant] = await db
      .select({ userId: conversationParticipantsTable.userId })
      .from(conversationParticipantsTable)
      .where(
        and(
          eq(conversationParticipantsTable.conversationId, params.id),
          eq(conversationParticipantsTable.userId, auth.user.id)
        )
      )
      .limit(1);

    if (!participant) {
      set.status = 403;
      return { message: "Sender is not a participant in this conversation" };
    }

    const [conversation] = await db
      .select({
        id: conversationsTable.id,
        isIdentityMutuallyRevealed: conversationsTable.isIdentityMutuallyRevealed,
      })
      .from(conversationsTable)
      .where(eq(conversationsTable.id, params.id))
      .limit(1);

    if (!conversation) {
      set.status = 404;
      return { message: "Conversation not found" };
    }

    const id = `m-${crypto.randomUUID()}`;
    const createdAt = new Date();

    await db.insert(messagesTable).values({
      id,
      conversationId: params.id,
      senderId: auth.user.id,
      kind: "text",
      content,
      createdAt,
    });

    await db
      .update(conversationsTable)
      .set({ updatedAt: createdAt })
      .where(eq(conversationsTable.id, params.id));

    return {
      id,
      conversationId: params.id,
      senderId: auth.user.id,
      senderAlias: conversation.isIdentityMutuallyRevealed
        ? (auth.user.realName?.trim() || auth.user.anonAlias)
        : auth.user.anonAlias,
      content,
      kind: "text" as const,
      createdAt: createdAt.toISOString(),
    };
  })
  .listen(PORT);

console.log(`🦊 API running at http://${app.server?.hostname}:${app.server?.port}`);
