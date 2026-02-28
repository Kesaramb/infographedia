import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('user', 'admin');
  CREATE TYPE "public"."enum_ai_agent_config_allowed_chart_types" AS ENUM('bar-chart', 'pie-chart', 'line-chart', 'area-chart', 'timeline', 'stat-card', 'grouped-bar-chart', 'donut-chart');
  CREATE TYPE "public"."enum_ai_agent_config_allowed_themes" AS ENUM('glass-dark', 'glass-light', 'neon-cyberpunk', 'minimalist', 'editorial', 'warm-earth', 'ocean-depth');
  CREATE TYPE "public"."enum_ai_agent_config_model" AS ENUM('claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-haiku-4-20250414');
  CREATE TABLE "comments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"author_id" integer NOT NULL,
  	"post_id" integer NOT NULL,
  	"body" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ai_agent_config_allowed_chart_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_ai_agent_config_allowed_chart_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "ai_agent_config_allowed_themes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_ai_agent_config_allowed_themes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "ai_agent_config_few_shot_examples" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"dna_json" jsonb NOT NULL
  );
  
  CREATE TABLE "ai_agent_config" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"model" "enum_ai_agent_config_model" DEFAULT 'claude-sonnet-4-20250514' NOT NULL,
  	"temperature" numeric DEFAULT 1 NOT NULL,
  	"max_tokens" numeric DEFAULT 4096 NOT NULL,
  	"max_tool_rounds" numeric DEFAULT 5 NOT NULL,
  	"enable_web_search" boolean DEFAULT true,
  	"system_prompt" varchar DEFAULT '' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'user' NOT NULL;
  ALTER TABLE "posts" ADD COLUMN "metrics_comments" numeric DEFAULT 0;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "comments_id" integer;
  ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ai_agent_config_allowed_chart_types" ADD CONSTRAINT "ai_agent_config_allowed_chart_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."ai_agent_config"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ai_agent_config_allowed_themes" ADD CONSTRAINT "ai_agent_config_allowed_themes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."ai_agent_config"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ai_agent_config_few_shot_examples" ADD CONSTRAINT "ai_agent_config_few_shot_examples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ai_agent_config"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "comments_author_idx" ON "comments" USING btree ("author_id");
  CREATE INDEX "comments_post_idx" ON "comments" USING btree ("post_id");
  CREATE INDEX "comments_updated_at_idx" ON "comments" USING btree ("updated_at");
  CREATE INDEX "comments_created_at_idx" ON "comments" USING btree ("created_at");
  CREATE INDEX "ai_agent_config_allowed_chart_types_order_idx" ON "ai_agent_config_allowed_chart_types" USING btree ("order");
  CREATE INDEX "ai_agent_config_allowed_chart_types_parent_idx" ON "ai_agent_config_allowed_chart_types" USING btree ("parent_id");
  CREATE INDEX "ai_agent_config_allowed_themes_order_idx" ON "ai_agent_config_allowed_themes" USING btree ("order");
  CREATE INDEX "ai_agent_config_allowed_themes_parent_idx" ON "ai_agent_config_allowed_themes" USING btree ("parent_id");
  CREATE INDEX "ai_agent_config_few_shot_examples_order_idx" ON "ai_agent_config_few_shot_examples" USING btree ("_order");
  CREATE INDEX "ai_agent_config_few_shot_examples_parent_id_idx" ON "ai_agent_config_few_shot_examples" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_comments_fk" FOREIGN KEY ("comments_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_comments_id_idx" ON "payload_locked_documents_rels" USING btree ("comments_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "comments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ai_agent_config_allowed_chart_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ai_agent_config_allowed_themes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ai_agent_config_few_shot_examples" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ai_agent_config" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "comments" CASCADE;
  DROP TABLE "ai_agent_config_allowed_chart_types" CASCADE;
  DROP TABLE "ai_agent_config_allowed_themes" CASCADE;
  DROP TABLE "ai_agent_config_few_shot_examples" CASCADE;
  DROP TABLE "ai_agent_config" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_comments_fk";
  
  DROP INDEX "payload_locked_documents_rels_comments_id_idx";
  ALTER TABLE "users" DROP COLUMN "role";
  ALTER TABLE "posts" DROP COLUMN "metrics_comments";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "comments_id";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_ai_agent_config_allowed_chart_types";
  DROP TYPE "public"."enum_ai_agent_config_allowed_themes";
  DROP TYPE "public"."enum_ai_agent_config_model";`)
}
