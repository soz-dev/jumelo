# Auth Jumelo — Firebase (Google / Apple) + Supabase data

**Entrypoint auth = Firebase.** Voir le guide court : [FIREBASE_AUTH.md](./FIREBASE_AUTH.md).

Supabase reste la couche **données** (profiles, teams, messages). Après Google/Apple Firebase, l’app tente un pont `signInWithIdToken` vers Supabase pour conserver RLS.

## Règle absolue (repo public)

| Variable | Où | Commit ? |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_*` | Client Expo (config web publique) | Non (`.env` local) — apiKey Firebase est « publique » mais on ne commit pas `.env` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Client Expo | Non (`.env`) |
| `EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY` | Client Expo | Non (`.env`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Scripts Node uniquement | **Jamais** |
| Secrets Apple (`.p8`, private keys) | Consoles Apple / Firebase seulement | **Jamais** |

- `.env` est dans `.gitignore` — ne le force jamais avec `git add -f`.
- Placeholders natifs commitables : `google-services.json`, `GoogleService-Info.plist` (à remplacer par les vrais fichiers Firebase).

Scheme app : `jumelo` (`app.json` owner `sofyan`). Redirect Google **forcé** : web → `http://localhost:8081/oauth` ; Expo Go → `https://auth.expo.io/@sofyan/jumelo`. En __DEV__, alerte avec l’URI exacte. Liste : `npm run google:redirects`. Compte Workspace / pro : voir [FIREBASE_AUTH.md](./FIREBASE_AUTH.md).

## Flux

1. Login / Register → **Continuer avec Google** (Expo Go OK) ou **Continuer avec Apple** (dev build / standalone uniquement — pas Expo Go ; voir [FIREBASE_AUTH.md](./FIREBASE_AUTH.md) §5).
2. Firebase Auth crée / restaure la session (persistée AsyncStorage).
3. Si Supabase configuré + providers alignés → bridge idToken → session Supabase → `profiles` UUID.
4. Sinon → profil local `fb-<firebaseUid>` (Teams/Messages Supabase limités jusqu’au bridge).

Email / mot de passe secondaire via Firebase (ou Supabase legacy si Firebase absent).

## Mode démo

- `lea@jumelo.app` limité à `__DEV__`.
- Sans `EXPO_PUBLIC_FIREBASE_*` ni Supabase, offline démo uniquement en développement.
