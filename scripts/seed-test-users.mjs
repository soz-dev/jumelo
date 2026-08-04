#!/usr/bin/env node
/**
 * Crée / met à jour Alice & Bob dans Supabase Auth + profiles (+ DM seed).
 *
 * Prérequis :
 *   - Migration SQL appliquée (supabase/migrations/…)
 *   - `.env` avec EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage : npm run seed:test-users
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = resolve(ROOT, '.env');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split('\n')) {
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

// Prefer SUPABASE_URL (localhost) for seed on Mac; Expo uses EXPO_PUBLIC_* (LAN IP).
const url = (process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!url || !serviceRole) {
  console.error(`
❌ Variables manquantes.

Option A — local (recommandé) :
  npm run db:start
  npm run db:seed

Option B — cloud :
  1. Projet sur https://supabase.com
  2. Copie .env.example → .env (URL + anon + service_role)
  3. Applique supabase/migrations/*.sql
  4. npm run seed:test-users
`);
  process.exit(1);
}

if (serviceRole.includes('YOUR_') || url.includes('YOUR_PROJECT')) {
  console.error('❌ Remplace les placeholders dans `.env` par les vraies clés Supabase.');
  process.exit(1);
}

// Garde-fou : ne jamais logger la service_role (même partiellement).
if (process.env.DEBUG_SUPABASE_KEYS === '1') {
  console.error('❌ DEBUG_SUPABASE_KEYS interdit — retire cette variable.');
  process.exit(1);
}

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = 'jumelo1234';

/** @type {const} */
const USERS = [
  {
    email: 'alice@jumelo.app',
    password: PASSWORD,
    profile: {
      name: 'Alice',
      city: 'Lyon',
      bio: 'Valorant ranked le soir, café et boardgames le week-end.',
      avatar_color: '#0F8F8A',
      avatar_url:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
      level: 'intermediaire',
      vibe: 'fun',
      reliability: 92,
      theme_id: 'teal',
      onboarding_complete: true,
      languages: ['Français', 'Anglais'],
    },
    universes: ['gaming', 'hobbies'],
    interests: ['Valorant', 'Board games'],
    platforms: ['pc'],
    availability: ['soir', 'week-end'],
    objectives: ['S’amuser', 'Trouver une team fixe'],
  },
  {
    email: 'bob@jumelo.app',
    password: PASSWORD,
    profile: {
      name: 'Bob',
      city: 'Villeurbanne',
      bio: 'Football le dimanche, CS2 en semaine. Toujours partant pour un duo.',
      avatar_color: '#E07A3D',
      avatar_url:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
      level: 'intermediaire',
      vibe: 'social',
      reliability: 88,
      theme_id: 'coral',
      onboarding_complete: true,
      languages: ['Français'],
    },
    universes: ['gaming', 'sports'],
    interests: ['CS2', 'Football'],
    platforms: ['pc', 'console'],
    availability: ['soir', 'week-end'],
    objectives: ['Progresser', 'Rencontres locales'],
  },
];

async function findUserIdByEmail(email) {
  // Paginate lightly — test projects stay small
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

async function upsertAuthUser(email, password, name) {
  const existingId = await findUserIdByEmail(email);
  if (existingId) {
    const { data, error } = await admin.auth.admin.updateUserById(existingId, {
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error) throw error;
    console.log(`✓ Auth mis à jour : ${email} (${existingId})`);
    return data.user.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw error;
  console.log(`✓ Auth créé : ${email} (${data.user.id})`);
  return data.user.id;
}

async function replaceJunction(table, column, profileId, values) {
  await admin.from(table).delete().eq('profile_id', profileId);
  if (!values.length) return;
  const rows = values.map((value) => ({ profile_id: profileId, [column]: value }));
  const { error } = await admin.from(table).insert(rows);
  if (error) throw error;
}

async function upsertProfile(userId, email, seed) {
  const { error } = await admin.from('profiles').upsert(
    {
      id: userId,
      email,
      ...seed.profile,
    },
    { onConflict: 'id' },
  );
  if (error) throw error;

  await replaceJunction('profile_universes', 'universe', userId, seed.universes);
  await replaceJunction('profile_interests', 'interest', userId, seed.interests);
  await replaceJunction('profile_platforms', 'platform', userId, seed.platforms);
  await replaceJunction('profile_availability', 'slot', userId, seed.availability);
  await replaceJunction('profile_objectives', 'objective', userId, seed.objectives);
  console.log(`✓ Profil onboarding OK : ${seed.profile.name}`);
}

async function ensureDmWithSeed(aliceId, bobId) {
  const { data: aliceRows } = await admin
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', aliceId);

  const aliceConvIds = (aliceRows ?? []).map((r) => r.conversation_id);
  if (aliceConvIds.length) {
    const { data: peerRows } = await admin
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', bobId)
      .in('conversation_id', aliceConvIds);

    if (peerRows?.[0]?.conversation_id) {
      console.log(`✓ DM déjà présent : ${peerRows[0].conversation_id}`);
      return peerRows[0].conversation_id;
    }
  }

  const { data: conv, error: convError } = await admin
    .from('conversations')
    .insert({ is_group: false })
    .select('id')
    .single();
  if (convError) throw convError;

  const { error: memError } = await admin.from('conversation_members').insert([
    { conversation_id: conv.id, user_id: aliceId },
    { conversation_id: conv.id, user_id: bobId },
  ]);
  if (memError) throw memError;

  const { error: msgError } = await admin.from('messages').insert({
    conversation_id: conv.id,
    sender_id: aliceId,
    body: 'Salut Bob ! Prêt pour un duo ce soir ?',
  });
  if (msgError) throw msgError;

  console.log(`✓ DM seed créé : ${conv.id}`);
  return conv.id;
}

function redactError(err) {
  let msg = String(err?.message || err || '');
  // Ne jamais réafficher une clé JWT / service_role dans les logs d’erreur.
  msg = msg.replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[REDACTED_JWT]');
  msg = msg.replace(/service_role[=:\s]+\S+/gi, 'service_role=[REDACTED]');
  return msg;
}

async function main() {
  // URL seule (pas de clés) — utile pour confirmer local vs cloud
  console.log(`\nJumelo seed → ${url.replace(/\/\/.*@/, '//')}\n`);

  const ids = [];
  for (const seed of USERS) {
    const id = await upsertAuthUser(seed.email, seed.password, seed.profile.name);
    await upsertProfile(id, seed.email, seed);
    ids.push(id);
  }

  await ensureDmWithSeed(ids[0], ids[1]);

  console.log(`
✅ Comptes de test prêts (mots de passe documentés dans TEST.md — pas de secrets API)

  Alice  alice@jumelo.app
  Bob    bob@jumelo.app

Sur téléphone A / B :
  1. npx expo start   (racine du projet)
  2. Connexion Alice sur un téléphone, Bob sur l’autre
  3. Discover → ouvrir le profil de l’autre → Discuter
  4. Vérifier Table Editor → messages dans le dashboard Supabase

Voir TEST.md / AUTH.md.
`);
}

main().catch((err) => {
  console.error('\n❌ Seed échoué:', redactError(err));
  if (String(err.message || err).includes('relation') || String(err.code) === '42P01') {
    console.error(
      '\nAstuce : applique d’abord supabase/migrations/*.sql dans le SQL Editor.',
    );
  }
  process.exit(1);
});
