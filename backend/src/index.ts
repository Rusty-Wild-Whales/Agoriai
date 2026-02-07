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
  authorAvatarSeed: string;
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
  university: string;
  graduationYear: number;
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
  content: string;
  upvotes: number;
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

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  return (typeof value === "string" ? new Date(value) : value).toISOString();
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

async function serializeUser(user: UserRow): Promise<UserResponse> {
  const stats = await computeUserStats(user.id);

  return {
    id: user.id,
    anonAlias: user.anonAlias,
    anonAvatarSeed: user.anonAvatarSeed,
    realName: user.realName ?? undefined,
    university: user.university,
    graduationYear: user.graduationYear,
    fieldsOfInterest: user.fieldsOfInterest,
    isAnonymous: user.isAnonymous,
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
      authorAlias: usersTable.anonAlias,
      authorAvatarSeed: usersTable.anonAvatarSeed,
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

  return rows.map(({ post, authorAlias, authorAvatarSeed, companyName }) => ({
    id: post.id,
    authorId: post.authorId,
    authorAlias,
    authorAvatarSeed,
    category: post.category,
    title: post.title,
    content: post.content,
    companyId: post.companyId ?? undefined,
    companyName: companyName ?? undefined,
    tags: post.tags,
    upvotes: post.upvotes,
    commentCount: post.commentCount,
    isAnonymous: post.isAnonymous,
    createdAt: toIso(post.createdAt),
    updatedAt: toIso(post.updatedAt),
    userVote: voteByPostId.get(post.id) ?? 0,
  })) satisfies PostResponse[];
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

async function getPlatformStats(): Promise<PlatformStats> {
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
      user: await serializeUser(user),
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
      user: await serializeUser(account.user),
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
    return await serializeUser(auth.user);
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
  .get("/api/users/:id", async ({ params, set }) => {
    const user = await getUserById(params.id);
    if (!user) {
      set.status = 404;
      return { message: "User not found" };
    }
    return await serializeUser(user);
  })
  .get("/api/users/:id/posts", async ({ params, headers }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    return fetchPosts({
      where: eq(postsTable.authorId, params.id),
      orderBy: "recent",
      viewerId: auth?.user.id,
    });
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
    const company = companies.find((item) => item.id === params.id);
    if (!company) {
      set.status = 404;
      return { message: "Company not found" };
    }
    return company;
  })
  .get("/api/companies/:id/posts", async ({ params, headers }) => {
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    return fetchPosts({
      where: eq(postsTable.companyId, params.id),
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
    const auth = await getAuthSession(headers as Record<string, string | undefined>);
    return fetchPosts({ filter, orderBy: "recent", viewerId: auth?.user.id });
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
      isAnonymous: true,
      createdAt: now,
      updatedAt: now,
    });

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

    return {
      id,
      authorId: auth.user.id,
      authorAlias: auth.user.anonAlias,
      authorAvatarSeed: auth.user.anonAvatarSeed,
      category: payload.category ?? "question",
      title,
      content,
      companyId,
      companyName: company?.name,
      tags: Array.isArray(payload.tags) ? payload.tags.map((tag) => tag.trim()).filter(Boolean) : [],
      upvotes: 0,
      commentCount: 0,
      isAnonymous: true,
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
  .get("/api/posts/:id/comments", async ({ params }) => {
    const rows = await db
      .select({
        id: commentsTable.id,
        postId: commentsTable.postId,
        authorId: commentsTable.authorId,
        authorAlias: usersTable.anonAlias,
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

    return buildCommentsTree(
      rows.map((row) => ({
        id: row.id,
        postId: row.postId,
        authorId: row.authorId,
        authorAlias: row.authorAlias,
        content: row.content,
        upvotes: row.upvotes,
        isAnonymous: row.isAnonymous,
        createdAt: toIso(row.createdAt),
        parentCommentId: row.parentCommentId,
      }))
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
      isAnonymous: true,
      createdAt,
    });

    await db
      .update(postsTable)
      .set({
        commentCount: sql`${postsTable.commentCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(postsTable.id, params.id));

    return {
      id,
      postId: params.id,
      authorId: auth.user.id,
      authorAlias: auth.user.anonAlias,
      content,
      upvotes: 0,
      isAnonymous: true,
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
  .get("/api/graph", async ({ query }) => {
    const industry = typeof query.industry === "string" ? query.industry.toLowerCase() : undefined;
    const university = typeof query.university === "string" ? query.university.toLowerCase() : undefined;

    const users = await db.select().from(usersTable);
    const companies = await db.select().from(companiesTable);
    const connections = await db.select().from(connectionsTable);

    const filteredCompanies = industry
      ? companies.filter((company) => company.industry.toLowerCase().includes(industry))
      : companies;

    const filteredUsers = university
      ? users.filter((user) => user.university.toLowerCase().includes(university))
      : users;

    const nodes = [
      ...filteredCompanies.map((company) => ({
        id: company.id,
        type: "company" as const,
        label: company.name,
        size: Math.max(4, Math.round(company.totalReviews / 6)),
        group: "company",
      })),
      ...filteredUsers.map((user) => ({
        id: user.id,
        type: "user" as const,
        label: user.anonAlias,
        size: Math.max(2, Math.round(user.contributionScore / 20)),
        group: "user",
      })),
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

    const edges = [...edgesByPair.values()];

    return { nodes, edges };
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
      .select()
      .from(conversationsTable)
      .where(inArray(conversationsTable.id, conversationIds))
      .orderBy(desc(conversationsTable.updatedAt));

    const participants = await db
      .select({
        conversationId: conversationParticipantsTable.conversationId,
        userId: conversationParticipantsTable.userId,
        alias: usersTable.anonAlias,
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
        senderAlias: usersTable.anonAlias,
        content: messagesTable.content,
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
          alias: string;
          isAnonymous: boolean;
          isIdentityRevealed: boolean;
        }>
      >
    >((acc, row) => {
      const current = acc[row.conversationId] ?? [];
      current.push({
        userId: row.userId,
        alias: row.alias,
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

    return conversations.map((conversation) => {
      const lastMessage = latestMessageByConversation.get(conversation.id);
      return {
        id: conversation.id,
        participants: participantsByConversation[conversation.id] ?? [],
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              conversationId: lastMessage.conversationId,
              senderId: lastMessage.senderId,
              senderAlias: lastMessage.senderAlias,
              content: lastMessage.content,
              createdAt: toIso(lastMessage.createdAt),
            }
          : undefined,
        updatedAt: toIso(conversation.updatedAt),
      };
    });
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

    const rows = await db
      .select({
        id: messagesTable.id,
        conversationId: messagesTable.conversationId,
        senderId: messagesTable.senderId,
        senderAlias: usersTable.anonAlias,
        content: messagesTable.content,
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
      senderAlias: row.senderAlias,
      content: row.content,
      createdAt: toIso(row.createdAt),
    }));
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

    const id = `m-${crypto.randomUUID()}`;
    const createdAt = new Date();

    await db.insert(messagesTable).values({
      id,
      conversationId: params.id,
      senderId: auth.user.id,
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
      senderAlias: auth.user.anonAlias,
      content,
      createdAt: createdAt.toISOString(),
    };
  })
  .listen(PORT);

console.log(`🦊 API running at http://${app.server?.hostname}:${app.server?.port}`);
