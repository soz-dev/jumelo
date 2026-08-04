#!/usr/bin/env node
/**
 * Aide setup Firebase pour Jumelo.
 * - Détecte firebase-tools / login
 * - Liste les projets ; propose jumelo s’il existe
 * - Création non-interactive si possible
 * - Rappelle les variables EXPO_PUBLIC_FIREBASE_*
 *
 * Usage: npm run firebase:setup
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');
const examplePath = resolve(root, '.env.example');

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: 'utf8',
    cwd: root,
    ...opts,
  });
}

function firebaseArgs(args) {
  // `firebase` CLI is published as package `firebase-tools`.
  return ['--yes', 'firebase-tools', ...args];
}

function hasFirebaseCli() {
  const local = run('npx', firebaseArgs(['--version']));
  return local.status === 0;
}

function projectsList() {
  const res = run('npx', firebaseArgs(['projects:list', '--json']), {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (res.status !== 0) {
    return { error: (res.stderr || res.stdout || '').trim() };
  }
  try {
    const parsed = JSON.parse(res.stdout);
    const list = parsed?.result ?? parsed;
    return { projects: Array.isArray(list) ? list : [] };
  } catch {
    return { error: 'Impossible de parser firebase projects:list' };
  }
}

function ensureEnvPlaceholders() {
  const keys = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  ];

  if (!existsSync(envPath)) {
    console.log('Aucun .env — copie depuis .env.example…');
    if (existsSync(examplePath)) {
      writeFileSync(envPath, readFileSync(examplePath, 'utf8'));
    } else {
      writeFileSync(envPath, keys.map((k) => `${k}=`).join('\n') + '\n');
    }
  }

  let env = readFileSync(envPath, 'utf8');
  let added = 0;
  for (const key of keys) {
    if (!new RegExp(`^${key}=`, 'm').test(env)) {
      env += `\n${key}=\n`;
      added += 1;
    }
  }
  if (added) {
    writeFileSync(envPath, env);
    console.log(`Ajouté ${added} clé(s) Firebase dans .env`);
  } else {
    console.log('.env contient déjà les clés Firebase (à remplir).');
  }
}

console.log('=== Jumelo Firebase setup ===\n');

if (!hasFirebaseCli()) {
  console.log('firebase-tools indisponible via npx.');
  console.log('Installe : npm i -g firebase-tools && firebase login');
  ensureEnvPlaceholders();
  console.log('\nEnsuite suis FIREBASE_AUTH.md');
  process.exit(0);
}

const listed = projectsList();
if (listed.error) {
  console.log('CLI Firebase présente, mais non authentifiée ou erreur :');
  console.log(listed.error.slice(0, 400));
  console.log('\n→ Lance : npx -y firebase-tools login');
  console.log('→ Puis : npm run firebase:setup');
  ensureEnvPlaceholders();
  console.log('\nChecklist manuelle : FIREBASE_AUTH.md');
  process.exit(0);
}

const projects = listed.projects ?? [];
const jumelo =
  projects.find((p) => p.projectId === 'jumelo' || p.displayName?.toLowerCase() === 'jumelo') ??
  projects.find((p) => String(p.projectId || '').includes('jumelo'));

if (jumelo) {
  console.log(`Projet trouvé : ${jumelo.projectId} (${jumelo.displayName || ''})`);
  console.log('Ouvre la console Web → Project settings → copie la config dans .env');
} else if (projects.length) {
  console.log('Projets Firebase existants :');
  for (const p of projects.slice(0, 15)) {
    console.log(`  - ${p.projectId}`);
  }
  console.log('\nAucun projet « jumelo ». Tentative de création non-interactive…');
  const created = run(
    'npx',
    firebaseArgs(['projects:create', 'jumelo', '--display-name', 'Jumelo']),
    { stdio: 'inherit' },
  );
  if (created.status !== 0) {
    console.log(
      '\nCréation CLI impossible (quota / permissions / ID pris). Crée « jumelo » dans la console web.',
    );
  }
} else {
  console.log('Aucun projet. Tentative de création « jumelo »…');
  const created = run(
    'npx',
    firebaseArgs(['projects:create', 'jumelo', '--display-name', 'Jumelo']),
    { stdio: 'inherit' },
  );
  if (created.status !== 0) {
    console.log('\nCrée le projet dans https://console.firebase.google.com/');
  }
}

ensureEnvPlaceholders();
console.log('\nÉtapes restantes (consoles) → FIREBASE_AUTH.md');
console.log('Placeholders natifs : google-services.json + GoogleService-Info.plist (à remplacer).');
