#!/usr/bin/env node
/**
 * Concatène supabase/migrations/*.sql (ordre chronologique) et copie dans
 * le presse-papiers macOS (pbcopy) pour collage dans le SQL Editor Supabase.
 *
 * Usage : node scripts/copy-cloud-migrations.mjs
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = resolve(ROOT, 'supabase/migrations');

if (!existsSync(MIGRATIONS_DIR)) {
  console.error('❌ Dossier migrations introuvable:', MIGRATIONS_DIR);
  process.exit(1);
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (!files.length) {
  console.error('❌ Aucune migration SQL.');
  process.exit(1);
}

const sql = files
  .map((f) => `-- >>> ${f}\n${readFileSync(join(MIGRATIONS_DIR, f), 'utf8')}`)
  .join('\n\n');

const r = spawnSync('pbcopy', [], { input: sql, encoding: 'utf8' });
if (r.status !== 0) {
  console.error('❌ pbcopy a échoué — SQL écrit dans /tmp/jumelo-all-migrations.sql');
  spawnSync('sh', ['-c', `cat > /tmp/jumelo-all-migrations.sql`], {
    input: sql,
    encoding: 'utf8',
  });
  process.exit(1);
}

console.log(
  `✅ ${files.length} migration(s) copiée(s) dans le presse-papiers (${sql.length} chars).`,
);
console.log('   Colle dans Supabase → SQL Editor → Run.');
console.log('   Fichiers:', files.join(', '));
