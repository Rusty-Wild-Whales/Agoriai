import "dotenv/config";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  commentsTable,
  companiesTable,
  connectionsTable,
  conversationParticipantsTable,
  conversationsTable,
  internshipsTable,
  messagesTable,
  postsTable,
  usersTable,
} from "./db/schema";
import { seedDatabase } from "./db/seed";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID ?? "u1";
const PORT = Number(process.env.PORT ?? 3001);

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const db = drizzle(pool);

type UserRow = typeof usersTable.$inferSelect;
type CompanyRow = typeof companiesTable.$inferSelect;

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
  stats: {
    postsCreated: number;
    questionsAnswered: number;
    helpfulVotes: number;
    connectionsCount: number;
    contributionScore: number;
  };
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

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  return (typeof value === "string" ? new Date(value) : value).toISOString();
}

function serializeUser(user: UserRow): UserResponse {
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
    stats: {
      postsCreated: user.postsCreated,
      questionsAnswered: user.questionsAnswered,
      helpfulVotes: user.helpfulVotes,
      connectionsCount: user.connectionsCount,
      contributionScore: user.contributionScore,
    },
  };
}

function getCompanyGroup(industry: string): string {
  const normalized = industry.toLowerCase();
  if (normalized.includes("tech")) return "engineering";
  if (normalized.includes("finance")) return "finance";
  if (normalized.includes("consult")) return "consulting";
  return normalized;
}

async function getUserById(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return user;
}

async function resolveCompanyId(companyName?: string, companyId?: string) {
  if (companyId) return companyId;
  if (!companyName) return undefined;

  const [company] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(sql`lower(${companiesTable.name}) = lower(${companyName})`)
    .limit(1);

  return company?.id;
}

async function fetchPosts(options?: {
  filter?: string;
  where?: SQL<unknown>;
  orderBy?: "recent" | "trending" | "discussed";
  limit?: number;
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
        replies: stripParentField(
          replies as Array<CommentResponse & { parentCommentId: string | null }>
        ),
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

  const internshipsByCompany = internships.reduce<Record<string, typeof internships>>(
    (acc, internship) => {
      const current = acc[internship.companyId] ?? [];
      current.push(internship);
      acc[internship.companyId] = current;
      return acc;
    },
    {}
  );

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

function ensurePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

await seedDatabase(db);

const app = new Elysia()
  .use(
    cors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })
  )
  .get("/health", () => ({ ok: true }))
  .get("/api/users/me", async ({ query, set }) => {
    const userId = typeof query.userId === "string" ? query.userId : DEFAULT_USER_ID;
    const user = await getUserById(userId);

    if (!user) {
      set.status = 404;
      return { message: "User not found" };
    }

    return serializeUser(user);
  })
  .get("/api/users/:id", async ({ params, set }) => {
    const user = await getUserById(params.id);
    if (!user) {
      set.status = 404;
      return { message: "User not found" };
    }

    return serializeUser(user);
  })
  .get("/api/users/:id/posts", async ({ params }) => {
    return fetchPosts({ where: eq(postsTable.authorId, params.id), orderBy: "recent" });
  })
  .get("/api/companies", async () => {
    return getCompanyList();
  })
  .get("/api/companies/:id", async ({ params, set }) => {
    const companies = await getCompanyList();
    const company = companies.find((item) => item.id === params.id);

    if (!company) {
      set.status = 404;
      return { message: "Company not found" };
    }

    return company;
  })
  .get("/api/companies/:id/posts", async ({ params }) => {
    return fetchPosts({ where: eq(postsTable.companyId, params.id), orderBy: "recent" });
  })
  .get("/api/posts/recent", async ({ query }) => {
    const limit = ensurePositiveInt(
      typeof query.limit === "string" ? query.limit : undefined,
      5
    );
    return fetchPosts({ orderBy: "recent", limit });
  })
  .get("/api/posts/trending", async ({ query }) => {
    const limit = ensurePositiveInt(
      typeof query.limit === "string" ? query.limit : undefined,
      5
    );
    return fetchPosts({ orderBy: "trending", limit });
  })
  .get("/api/posts", async ({ query }) => {
    const filter = typeof query.filter === "string" ? query.filter : undefined;
    return fetchPosts({ filter, orderBy: "recent" });
  })
  .post("/api/posts", async ({ body, set }) => {
    const payload = body as {
      title?: string;
      content?: string;
      category?: string;
      tags?: string[];
      companyId?: string;
      companyName?: string;
      authorId?: string;
    };

    const title = payload.title?.trim();
    const content = payload.content?.trim();

    if (!title || !content) {
      set.status = 400;
      return { message: "Title and content are required" };
    }

    const authorId = payload.authorId ?? DEFAULT_USER_ID;
    const author = await getUserById(authorId);

    if (!author) {
      set.status = 404;
      return { message: "Author not found" };
    }

    const id = `p-${crypto.randomUUID()}`;
    const now = new Date();
    const companyId = await resolveCompanyId(payload.companyName, payload.companyId);

    await db.insert(postsTable).values({
      id,
      authorId,
      category: payload.category ?? "question",
      title,
      content,
      companyId,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
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
      .where(eq(usersTable.id, authorId));

    const [company] = companyId
      ? await db
          .select({ name: companiesTable.name })
          .from(companiesTable)
          .where(eq(companiesTable.id, companyId))
          .limit(1)
      : [];

    return {
      id,
      authorId,
      authorAlias: author.anonAlias,
      authorAvatarSeed: author.anonAvatarSeed,
      category: payload.category ?? "question",
      title,
      content,
      companyId,
      companyName: company?.name,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      upvotes: 0,
      commentCount: 0,
      isAnonymous: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    } satisfies PostResponse;
  })
  .post("/api/posts/:id/upvote", async ({ params, set }) => {
    const [updated] = await db
      .update(postsTable)
      .set({
        upvotes: sql`${postsTable.upvotes} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(postsTable.id, params.id))
      .returning({
        id: postsTable.id,
        upvotes: postsTable.upvotes,
      });

    if (!updated) {
      set.status = 404;
      return { message: "Post not found" };
    }

    return updated;
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
  .post("/api/posts/:id/comments", async ({ params, body, set }) => {
    const payload = body as {
      content?: string;
      authorId?: string;
      parentCommentId?: string;
    };

    const content = payload.content?.trim();
    if (!content) {
      set.status = 400;
      return { message: "Comment content is required" };
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

    const authorId = payload.authorId ?? DEFAULT_USER_ID;
    const author = await getUserById(authorId);

    if (!author) {
      set.status = 404;
      return { message: "Author not found" };
    }

    const id = `cm-${crypto.randomUUID()}`;
    const createdAt = new Date();

    await db.insert(commentsTable).values({
      id,
      postId: params.id,
      authorId,
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
      authorId,
      authorAlias: author.anonAlias,
      content,
      upvotes: 0,
      isAnonymous: true,
      createdAt: createdAt.toISOString(),
    } satisfies CommentResponse;
  })
  .get("/api/graph", async ({ query }) => {
    const industry = typeof query.industry === "string" ? query.industry.toLowerCase() : undefined;
    const university =
      typeof query.university === "string" ? query.university.toLowerCase() : undefined;

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
        group: getCompanyGroup(company.industry),
      })),
      ...filteredUsers.map((user) => ({
        id: user.id,
        type: "user" as const,
        label: user.anonAlias,
        size: Math.max(2, Math.round(user.contributionScore / 20)),
        group: user.fieldsOfInterest[0] ?? "general",
      })),
    ];

    const nodeIdSet = new Set(nodes.map((node) => node.id));

    const edges = connections
      .filter(
        (edge) => nodeIdSet.has(edge.sourceId) && nodeIdSet.has(edge.targetId)
      )
      .map((edge) => ({
        source: edge.sourceId,
        target: edge.targetId,
        weight: edge.weight,
      }));

    return { nodes, edges };
  })
  .get("/api/conversations", async ({ query }) => {
    const userId = typeof query.userId === "string" ? query.userId : DEFAULT_USER_ID;

    const participantRows = await db
      .select({ conversationId: conversationParticipantsTable.conversationId })
      .from(conversationParticipantsTable)
      .where(eq(conversationParticipantsTable.userId, userId));

    const conversationIds = participantRows.map((row) => row.conversationId);

    if (conversationIds.length === 0) {
      return [];
    }

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
  .get("/api/conversations/:id/messages", async ({ params, set }) => {
    const [conversation] = await db
      .select({ id: conversationsTable.id })
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
  .post("/api/conversations/:id/messages", async ({ params, body, set }) => {
    const payload = body as {
      content?: string;
      senderId?: string;
    };

    const content = payload.content?.trim();
    if (!content) {
      set.status = 400;
      return { message: "Message content is required" };
    }

    const senderId = payload.senderId ?? DEFAULT_USER_ID;

    const [participant] = await db
      .select({ userId: conversationParticipantsTable.userId })
      .from(conversationParticipantsTable)
      .where(
        and(
          eq(conversationParticipantsTable.conversationId, params.id),
          eq(conversationParticipantsTable.userId, senderId)
        )
      )
      .limit(1);

    if (!participant) {
      set.status = 403;
      return { message: "Sender is not a participant in this conversation" };
    }

    const sender = await getUserById(senderId);
    if (!sender) {
      set.status = 404;
      return { message: "Sender not found" };
    }

    const id = `m-${crypto.randomUUID()}`;
    const createdAt = new Date();

    await db.insert(messagesTable).values({
      id,
      conversationId: params.id,
      senderId,
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
      senderId,
      senderAlias: sender.anonAlias,
      content,
      createdAt: createdAt.toISOString(),
    };
  })
  .listen(PORT);

console.log(`🦊 API running at http://${app.server?.hostname}:${app.server?.port}`);
