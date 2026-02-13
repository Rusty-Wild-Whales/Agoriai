ALTER TABLE "conversations" ADD COLUMN "is_identity_mutually_revealed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "identity_reveal_requested_by" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "identity_reveal_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "kind" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "visibility_level" text DEFAULT 'anonymous' NOT NULL;