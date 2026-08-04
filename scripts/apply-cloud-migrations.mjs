#!/usr/bin/env node
/**
 * Applique supabase/migrations/*.sql sur le projet cloud via Postgres.
 *
 * Prérequis dans `.env` :
 *   EXPO_PUBLIC_SUPABASE_URL (ou SUPABASE_URL)
 *   SUPABASE_DB_PASSWORD  ← mot de passe DB (Dashboard → Project Settings → Database)
 *
 * Usage : node scripts/apply-cloud-migrations.mjs
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = resolve(ROOT, '.env');
const MIGRATIONS_DIR = resolve(ROOT, 'supabase/migrations');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(ENV_PATH);

const projectUrl = (
  process.env.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  ''
).trim();
const password = (process.env.SUPABASE_DB_PASSWORD || '').trim();

if (!projectUrl || !password) {
  console.error(`
❌ Variables manquantes.

Ajoute dans \`.env\` :
  SUPABASE_DB_PASSWORD=<mot de passe Database du projet>

Puis : node scripts/apply-cloud-migrations.mjs
`);
  process.exit(1);
}

const refMatch = projectUrl.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
if (!refMatch) {
  console.error('❌ URL Supabase invalide:', projectUrl);
  process.exit(1);
}
const ref = refMatch[1];

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (!files.length) {
  console.error('❌ Aucune migration dans', MIGRATIONS_DIR);
  process.exit(1);
}

const sql = files
  .map((f) => `-- >>> ${f}\n${readFileSync(join(MIGRATIONS_DIR, f), 'utf8')}`)
  .join('\n\n');

async function ensurePg() {
  try {
    const require = createRequire(import.meta.url);
    return require(resolve(ROOT, 'node_modules/pg'));
  } catch {
    console.log('📦 Installation temporaire de pg…');
    const r = spawnSync('npm', ['install', 'pg@8.22.0', '--no-save'], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    if (r.status !== 0) process.exit(r.status ?? 1);
    const require = createRequire(import.meta.url);
    return require(resolve(ROOT, 'node_modules/pg'));
  }
}

// Projet jumelo (fctwmvgeoveoatkzclcu) → pooler aws-1-eu-west-1 confirmé.
// On garde d’autres régions en secours si le projet est déplacé.
const poolerHosts = [
  'aws-1-eu-west-1.pooler.supabase.com',
  'aws-0-eu-west-1.pooler.supabase.com',
  'aws-1-eu-central-1.pooler.supabase.com',
  'aws-0-eu-central-1.pooler.supabase.com',
];

const hosts = [
  { host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres' },
  ...poolerHosts.flatMap((host) => [
    { host, port: 5432, user: `postgres.${ref}` },
    { host, port: 6543, user: `postgres.${ref}` },
  ]),
];

const { Client } = await ensurePg();

let client;
let lastErr;
for (const h of hosts) {
  const c = new Client({
    ...h,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 12000,
  });
  try {
    await c.connect();
    client = c;
    console.log(`✅ Connecté via ${h.host}:${h.port} (${h.user})`);
    break;
  } catch (e) {
    lastErr = e;
    try {
      await c.end();
    } catch {
      /* ignore */
    }
  }
}

if (!client) {
  console.error('❌ Connexion Postgres impossible:', lastErr?.message);
  process.exit(1);
}

try {
  console.log(`📄 Application de ${files.length} migration(s)…`);
  await client.query(sql);
  console.log('✅ Migrations appliquées.');
} catch (e) {
  console.error('❌ Erreur SQL:', e.message);
  process.exit(1);
} finally {
  await client.end();
}
