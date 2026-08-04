#!/usr/bin/env node
/**
 * Affiche les Authorized redirect URIs (+ JS origins) à coller
 * dans Google Cloud → client OAuth Web.
 *
 * Usage:
 *   npm run google:redirects
 *   npm run google:redirects -- sofyan
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function ownerFromAppJson() {
  try {
    const raw = readFileSync(resolve(process.cwd(), 'app.json'), 'utf8');
    const json = JSON.parse(raw);
    return json?.expo?.owner?.replace(/^@/, '').trim() || undefined;
  } catch {
    return undefined;
  }
}

function detectExpoOwner() {
  const fromEnv = process.env.EXPO_PUBLIC_EXPO_OWNER?.replace(/^@/, '').trim();
  if (fromEnv) return fromEnv;

  const fromApp = ownerFromAppJson();
  if (fromApp) return fromApp;

  try {
    const whoami = execSync('npx expo whoami', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 15000,
    })
      .trim()
      .split('\n')
      .filter(Boolean)
      .pop();
    if (
      whoami &&
      !/not logged in/i.test(whoami) &&
      !/\s/.test(whoami) &&
      whoami !== 'anonymous'
    ) {
      return whoami.replace(/^@/, '');
    }
  } catch {
    /* offline / not logged in */
  }
  return undefined;
}

const ownerArg = process.argv[2]?.replace(/^@/, '').trim();
const owner = ownerArg || detectExpoOwner() || 'TON_COMPTE_EXPO';

/** Ce que l’app envoie vraiment (une URI par plateforme). */
const appSends = {
  web: 'http://localhost:8081/oauth',
  expoGo: `https://auth.expo.io/@${owner}/jumelo`,
};

/** Coller dans Google Cloud — liste courte + handlers Firebase. */
const redirects = [
  appSends.web,
  appSends.expoGo,
  'http://127.0.0.1:8081/oauth',
  'https://jumelo-aca80.firebaseapp.com/__/auth/handler',
  'https://jumelo-aca80.web.app/__/auth/handler',
];

const jsOrigins = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
];

console.log(`
╔══════════════════════════════════════════════════════════╗
║  Jumelo — Google OAuth (client Web uniquement)          ║
║  Owner Expo : @${owner.padEnd(42)}║
╚══════════════════════════════════════════════════════════╝

L’app envoie EXACTEMENT :
  • Web (npm run web)     →  ${appSends.web}
  • Expo Go / téléphone   →  ${appSends.expoGo}

⚠ Ouvre le client OAuth **Web** (ID type 216064971480-….apps.googleusercontent.com)
  PAS le client iOS ni Android.

1) Authorized JavaScript origins → Add URI → Save :
`);
for (const u of jsOrigins) console.log(`  ${u}`);

console.log(`
2) Authorized redirect URIs → Add URI (coller chacune) → Save :
`);
for (const u of redirects) console.log(`  ${u}`);

if (owner === 'TON_COMPTE_EXPO') {
  console.log(`
⚠ Owner inconnu :
  npx expo login && npx expo whoami
  puis .env → EXPO_PUBLIC_EXPO_OWNER=<username>
  ou : npm run google:redirects -- <username>
`);
}

console.log(`
3) Redémarre Metro : npx expo start -c
4) Sur Google press (__DEV__) : une alerte affiche l’URI exacte envoyée.
`);
