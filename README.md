# Jumelo

**Trouve ton jumelage.**

App mobile iOS + Android (Expo / React Native) pour trouver coéquipiers, binômes et partenaires — jeux vidéo, sports, études, musique et hobbies.

## Stack

- TypeScript + Expo SDK 54 (compatible Expo Go App Store / build ~1017756)
- Expo Router
- Firebase Auth (Google / Apple / email) — voir **[FIREBASE_AUTH.md](./FIREBASE_AUTH.md)**
- Supabase (Postgres + RLS / données) quand configuré
- AsyncStorage (mode démo offline / cache thème)

## Démarrer

À la racine du projet :

```bash
npm install
npx expo start
```

Scanne le QR avec **Expo Go** (App Store / Play Store), ou :

```bash
npx expo start --ios      # simulateur iOS (Xcode requis)
npx expo start --android  # émulateur Android
```

Sans variables Supabase dans `.env`, l’app tourne en **mode démo** local (**`__DEV__` uniquement**).

> **Pourquoi SDK 54 ?** Expo Go sur l’App Store est encore en SDK 54 (RN 0.81). Les SDK 55–57 existent déjà côté npm, mais leur Expo Go attend l’approbation Apple.

### Compte démo (dev only)

- Email : `lea@jumelo.app` — désactivé hors `__DEV__`
- Auth principale : **Apple** / **Google** via Firebase (voir **[FIREBASE_AUTH.md](./FIREBASE_AUTH.md)**)

## Sécurité (repo public)

- Ne committe **jamais** `.env` ni `SUPABASE_SERVICE_ROLE_KEY`.
- Client Expo = `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` uniquement.
- Si une clé `service_role` a fuité → **rotation immédiate** (Supabase → Settings → API).
- Checklist Firebase Google / Apple : **[FIREBASE_AUTH.md](./FIREBASE_AUTH.md)**.

## Configurer Supabase (BDD réelle)

### Cloud (recommandé — 2 téléphones sans LAN)

1. `.env` avec URL + `anon` + `service_role` (placeholders dans `.env.example` — **ne jamais committer `.env`**).
2. Appliquer `supabase/migrations/` (SQL Editor ou `supabase db push`).
3. Configurer Firebase + Google / Apple ([FIREBASE_AUTH.md](./FIREBASE_AUTH.md)), puis `npm run seed:test-users` et `npx expo start`.

Détails Alice/Bob / Expo Go : **[TEST.md](./TEST.md)**.

### Local (optionnel — Colima)

```bash
brew install colima docker docker-compose supabase/tap/supabase
npm run db:start   # démarre Colima + Supabase local, écrit .env (IP LAN)
npm run db:seed    # Alice & Bob
npx expo start
```

Studio : http://127.0.0.1:54323.

### Comptes de test (après seed)

| | Email | Mot de passe |
|---|---|---|
| Alice | `alice@jumelo.app` | `jumelo1234` |
| Bob | `bob@jumelo.app` | `jumelo1234` |

Avec Firebase configuré, login / register / Google / Apple utilisent Firebase Auth ; le pont idToken synchronise une session Supabase pour `profiles` / teams / messages.

## Scripts

| Commande | Description |
|---|---|
| `npx expo start` | Metro / Expo (commande recommandée) |
| `npm start` | Alias `expo start` |
| `npm run db:start` | Colima + Supabase local + `.env` (LAN) |
| `npm run db:stop` | Arrête Supabase local |
| `npm run db:seed` | Crée Alice & Bob (+ DM seed) |
| `npm run seed:test-users` | Alias de `db:seed` |
| `npm run firebase:setup` | Détecte CLI Firebase / placeholders `.env` |
| `npm run ios` / `android` / `web` | Plateformes |
| `npm run typecheck` | `tsc --noEmit` |

## Structure

```
app/(auth)              welcome, login, register
app/(onboarding)        univers → intérêts → vibe → dispos → profil
app/(tabs)              home, discover, teams, chat, profile
app/match/[id]          reveal compatibilité
app/user/[id]           profil public (Supabase si UUID)
app/chat/[id]           conversation (Supabase messages si UUID)
app/team/[id]           détail team
src/lib/firebase.ts     config Firebase JS SDK
src/lib/firebaseAuth.ts Google / Apple / email + pont Supabase
src/lib/supabase.ts    client données + session bridgée
src/lib/api/            profiles + messages
src/lib/matching        scoring multi-critères 0–100
src/data/mock           profils & threads démo
scripts/seed-test-users.mjs
supabase/migrations/    schéma MVP + RLS
TEST.md                 scénario Alice / Bob sur 2 téléphones
```
