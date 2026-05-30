import * as migration_20260228_071513 from './20260228_071513';
import * as migration_20260228_192300 from './20260228_192300';
import * as migration_20260322_172113_add_post_slugs_and_seo from './20260322_172113_add_post_slugs_and_seo';
import * as migration_20260323_161459_visual_diversity_engine from './20260323_161459_visual_diversity_engine';
import * as migration_20260324_190439 from './20260324_190439';
import * as migration_20260325_120000_engine_router_flags from './20260325_120000_engine_router_flags';
import * as migration_20260327_221500_story_document_v3 from './20260327_221500_story_document_v3';
import * as migration_20260328_011800_add_story_v3_render_engine from './20260328_011800_add_story_v3_render_engine';

export const migrations = [
  {
    up: migration_20260228_071513.up,
    down: migration_20260228_071513.down,
    name: '20260228_071513',
  },
  {
    up: migration_20260228_192300.up,
    down: migration_20260228_192300.down,
    name: '20260228_192300',
  },
  {
    up: migration_20260322_172113_add_post_slugs_and_seo.up,
    down: migration_20260322_172113_add_post_slugs_and_seo.down,
    name: '20260322_172113_add_post_slugs_and_seo',
  },
  {
    up: migration_20260323_161459_visual_diversity_engine.up,
    down: migration_20260323_161459_visual_diversity_engine.down,
    name: '20260323_161459_visual_diversity_engine',
  },
  {
    up: migration_20260324_190439.up,
    down: migration_20260324_190439.down,
    name: '20260324_190439'
  },
  {
    up: migration_20260325_120000_engine_router_flags.up,
    down: migration_20260325_120000_engine_router_flags.down,
    name: '20260325_120000_engine_router_flags',
  },
  {
    up: migration_20260327_221500_story_document_v3.up,
    down: migration_20260327_221500_story_document_v3.down,
    name: '20260327_221500_story_document_v3',
  },
  {
    up: migration_20260328_011800_add_story_v3_render_engine.up,
    down: migration_20260328_011800_add_story_v3_render_engine.down,
    name: '20260328_011800_add_story_v3_render_engine',
  },
];
