#!/usr/bin/env node
/**
 * Démarre Supabase local pour Jumelo.
 *
 * macOS bloque souvent le montage Docker de ~/Desktop (TCC).
 * On synchronise donc `supabase/` vers ~/jumelo-db et on lance `supabase start` depuis là.
 *
 * Usage : npm run db:start
 */

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIRROR = resolve(process.env.HOME || '~', 'jumelo-db');
const ENV_PATH = resolve(ROOT, '.env');

function sh(cmd, opts = {}) {
  // Ne pas logger stdout de supabase status (contient les clés).
  const quiet = opts.quiet === true;
  if (!quiet) console.log(`$ ${cmd}`);
  const { quiet: _q, ...rest } = opts;
  return execSync(cmd, { stdio: quiet ? 'pipe' : 'inherit', encoding: 'utf8', ...rest });
}

function shCapture(cmd, cwd) {
  const r = spawnSync('bash', ['-lc', cmd], {
    cwd,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || `Command failed: ${cmd}`);
  }
  return (r.stdout || '').trim();
}

function lanIp() {
  const nets = networkInterfaces();
  for (const name of ['en0', 'en1', 'eth0', 'wlan0']) {
    const list = nets[name] || [];
    for (const net of list) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

function ensureColima() {
  try {
    shCapture('docker info >/dev/null 2>&1');
    console.log('✓ Docker OK');
    return;
  } catch {
    /* continue */
  }

  console.log('→ Démarrage Colima (runtime Docker local)…');
  try {
    sh('colima start --cpu 4 --memory 6 --disk 40');
  } catch (err) {
    console.error(`
❌ Impossible de démarrer Docker/Colima.

Installe :
  brew install colima docker docker-compose supabase/tap/supabase
Puis :
  colima start
  npm run db:start
`);
    throw err;
  }
}

function syncMirror() {
  mkdirSync(resolve(MIRROR, 'supabase'), { recursive: true });
  sh(
    `rsync -a --delete --exclude .temp "${ROOT}/supabase/" "${MIRROR}/supabase/"`,
  );
  console.log(`✓ Miroir supabase → ${MIRROR}`);
}

function parseStatusEnv(raw) {
  const out = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)="(.*)"$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function writeEnv(status) {
  const ip = lanIp();
  const anon = status.ANON_KEY;
  const service = status.SERVICE_ROLE_KEY;
  if (!anon || !service) {
    throw new Error('ANON_KEY / SERVICE_ROLE_KEY manquants dans supabase status');
  }

  const body = `# Supabase local Jumelo — généré par npm run db:start
# Ne pas commit (.gitignore). Clés = démo locale Supabase.

# URL LAN pour téléphones (Expo Go) — même Wi‑Fi que ce Mac
EXPO_PUBLIC_SUPABASE_URL=http://${ip}:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=${anon}

# Seed uniquement (jamais Expo public)
SUPABASE_SERVICE_ROLE_KEY=${service}

# Scripts Node sur le Mac
SUPABASE_URL=http://127.0.0.1:54321
`;

  writeFileSync(ENV_PATH, body, 'utf8');
  console.log(`✓ .env écrit (API LAN http://${ip}:54321)`);
}

function main() {
  console.log('\nJumelo db:start\n');
  ensureColima();
  syncMirror();

  // Ignore failure if already running — stdout peut contenir des clés → quiet
  try {
    sh('supabase start', { cwd: MIRROR, quiet: true });
    console.log('✓ supabase start');
  } catch {
    console.log('→ supabase start a échoué ou était déjà up — on lit le status…');
  }

  // Capturé en mémoire uniquement — jamais echo des clés
  const statusRaw = shCapture('supabase status -o env', MIRROR);
  const status = parseStatusEnv(statusRaw);
  writeEnv(status);

  // Sync config.toml back if generated only on mirror
  const cfgMirror = resolve(MIRROR, 'supabase/config.toml');
  const cfgRoot = resolve(ROOT, 'supabase/config.toml');
  if (existsSync(cfgMirror) && !existsSync(cfgRoot)) {
    sh(`cp "${cfgMirror}" "${cfgRoot}"`);
  }

  console.log(`
✅ Supabase local prêt

  Studio : http://127.0.0.1:54323
  API    : ${status.API_URL || 'http://127.0.0.1:54321'}
  Expo   : voir EXPO_PUBLIC_SUPABASE_URL dans .env (IP LAN)
  Clés   : écrites dans .env uniquement (jamais affichées ici)

Ensuite :
  npm run db:seed
  npx expo start
`);
}

main();
