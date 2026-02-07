import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  anonAlias: text("anon_alias").notNull(),
  anonAvatarSeed: text("anon_avatar_seed").notNull(),
  realName: text("real_name"),
  university: text("university").notNull(),
  graduationYear: integer("graduation_year").notNull(),
  fieldsOfInterest: text("fields_of_interest")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  isAnonymous: boolean("is_anonymous").notNull().default(true),
  postsCreated: integer("posts_created").notNull().default(0),
  questionsAnswered: integer("questions_answered").notNull().default(0),
  helpfulVotes: integer("helpful_votes").notNull().default(0),
  connectionsCount: integer("connections_count").notNull().default(0),
  contributionScore: integer("contribution_score").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authAccountsTable = pgTable(
  "auth_accounts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    schoolEmail: text("school_email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("auth_accounts_user_idx").on(table.userId),
    uniqueUser: unique("auth_accounts_unique_user").on(table.userId),
    uniqueSchoolEmail: unique("auth_accounts_unique_school_email").on(table.schoolEmail),
  })
);

export const authSessionsTable = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("auth_sessions_user_idx").on(table.userId),
    tokenIdx: unique("auth_sessions_unique_token_hash").on(table.tokenHash),
    expiresIdx: index("auth_sessions_expires_idx").on(table.expiresAt),
  })
);

export const companiesTable = pgTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  industry: text("industry").notNull(),
  averageRating: real("average_rating").notNull().default(0),
  totalReviews: integer("total_reviews").notNull().default(0),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const internshipsTable = pgTable(
  "internships",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    location: text("location").notNull(),
    season: text("season").notNull(),
    compensationRange: text("compensation_range"),
    averageRating: real("average_rating").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
  },
  (table) => ({
    companyIdx: index("internships_company_id_idx").on(table.companyId),
  })
);

export const postsTable = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    companyId: text("company_id").references(() => companiesTable.id, {
      onDelete: "set null",
    }),
    tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
    upvotes: integer("upvotes").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    isAnonymous: boolean("is_anonymous").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    authorIdx: index("posts_author_id_idx").on(table.authorId),
    companyIdx: index("posts_company_id_idx").on(table.companyId),
    categoryIdx: index("posts_category_idx").on(table.category),
    createdAtIdx: index("posts_created_at_idx").on(table.createdAt),
  })
);

export const commentsTable = pgTable(
  "comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    parentCommentId: text("parent_comment_id").references(
      (): AnyPgColumn => commentsTable.id,
      {
        onDelete: "cascade",
      }
    ),
    content: text("content").notNull(),
    upvotes: integer("upvotes").notNull().default(0),
    isAnonymous: boolean("is_anonymous").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    postIdx: index("comments_post_id_idx").on(table.postId),
    parentIdx: index("comments_parent_id_idx").on(table.parentCommentId),
  })
);

export const postVotesTable = pgTable(
  "post_votes",
  {
    id: serial("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    postIdx: index("post_votes_post_idx").on(table.postId),
    userIdx: index("post_votes_user_idx").on(table.userId),
    uniquePostUser: unique("post_votes_unique").on(table.postId, table.userId),
  })
);

export const commentVotesTable = pgTable(
  "comment_votes",
  {
    id: serial("id").primaryKey(),
    commentId: text("comment_id")
      .notNull()
      .references(() => commentsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    commentIdx: index("comment_votes_comment_idx").on(table.commentId),
    userIdx: index("comment_votes_user_idx").on(table.userId),
    uniqueCommentUser: unique("comment_votes_unique").on(table.commentId, table.userId),
  })
);

export const connectionsTable = pgTable(
  "connections",
  {
    id: serial("id").primaryKey(),
    sourceId: text("source_id").notNull(),
    sourceType: text("source_type").notNull(),
    targetId: text("target_id").notNull(),
    targetType: text("target_type").notNull(),
    weight: integer("weight").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceIdx: index("connections_source_idx").on(table.sourceId),
    targetIdx: index("connections_target_idx").on(table.targetId),
  })
);

export const conversationsTable = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    updatedAtIdx: index("conversations_updated_at_idx").on(table.updatedAt),
  })
);

export const conversationParticipantsTable = pgTable(
  "conversation_participants",
  {
    id: serial("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    isAnonymous: boolean("is_anonymous").notNull().default(true),
    isIdentityRevealed: boolean("is_identity_revealed").notNull().default(false),
  },
  (table) => ({
    conversationIdx: index("conversation_participants_conversation_idx").on(table.conversationId),
    userIdx: index("conversation_participants_user_idx").on(table.userId),
    uniqueConversationUser: unique("conversation_participants_unique").on(
      table.conversationId,
      table.userId
    ),
  })
);

export const messagesTable = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    conversationIdx: index("messages_conversation_idx").on(table.conversationId),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  })
);
