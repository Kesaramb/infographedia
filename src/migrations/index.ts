import * as migration_20260228_071513 from './20260228_071513';
import * as migration_20260228_192300 from './20260228_192300';

export const migrations = [
  {
    up: migration_20260228_071513.up,
    down: migration_20260228_071513.down,
    name: '20260228_071513',
  },
  {
    up: migration_20260228_192300.up,
    down: migration_20260228_192300.down,
    name: '20260228_192300'
  },
];
