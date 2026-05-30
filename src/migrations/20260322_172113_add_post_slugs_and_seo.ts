import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

type ExistingPostRow = {
  id: number
  title: string | null
}

function normalizePostSlug(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

  if (!normalized) return 'post'
  if (/^\d+$/.test(normalized)) return `post-${normalized}`

  return normalized
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_ai_agent_config_allowed_chart_types" ADD VALUE 'pictogram';
  ALTER TYPE "public"."enum_ai_agent_config_allowed_chart_types" ADD VALUE 'vs-split';
  ALTER TYPE "public"."enum_ai_agent_config_allowed_chart_types" ADD VALUE 'map-chart';
  ALTER TABLE "posts" ADD COLUMN "slug" varchar;
  ALTER TABLE "posts" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "posts" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "posts" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "ai_agent_config" ADD COLUMN "enable_knowledge_base" boolean DEFAULT true;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;`)

  const result = (await db.execute(sql`
    SELECT "id", "title"
    FROM "posts"
    ORDER BY "created_at" ASC, "id" ASC
  `)) as {
    rows: ExistingPostRow[]
  }

  const usedSlugs = new Set<string>()

  for (const post of result.rows) {
    const title = typeof post.title === 'string' && post.title.trim().length > 0
      ? post.title
      : `post-${post.id}`

    const base = normalizePostSlug(title)
    let candidate = base
    let suffix = 2

    while (usedSlugs.has(candidate)) {
      candidate = `${base}-${suffix}`
      suffix++
    }

    usedSlugs.add(candidate)

    await db.execute(sql`
      UPDATE "posts"
      SET "slug" = ${candidate}
      WHERE "id" = ${post.id}
    `)
  }

  await db.execute(sql`
    ALTER TABLE "posts" ALTER COLUMN "slug" SET NOT NULL;
    CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
    CREATE INDEX "posts_meta_meta_image_idx" ON "posts" USING btree ("meta_image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DROP CONSTRAINT "posts_meta_image_id_media_id_fk";
  
  ALTER TABLE "ai_agent_config_allowed_chart_types" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_ai_agent_config_allowed_chart_types";
  CREATE TYPE "public"."enum_ai_agent_config_allowed_chart_types" AS ENUM('bar-chart', 'pie-chart', 'line-chart', 'area-chart', 'timeline', 'stat-card', 'grouped-bar-chart', 'donut-chart');
  ALTER TABLE "ai_agent_config_allowed_chart_types" ALTER COLUMN "value" SET DATA TYPE "public"."enum_ai_agent_config_allowed_chart_types" USING "value"::"public"."enum_ai_agent_config_allowed_chart_types";
  DROP INDEX "posts_slug_idx";
  DROP INDEX "posts_meta_meta_image_idx";
  ALTER TABLE "posts" DROP COLUMN "slug";
  ALTER TABLE "posts" DROP COLUMN "meta_title";
  ALTER TABLE "posts" DROP COLUMN "meta_description";
  ALTER TABLE "posts" DROP COLUMN "meta_image_id";
  ALTER TABLE "ai_agent_config" DROP COLUMN "enable_knowledge_base";`)
}
