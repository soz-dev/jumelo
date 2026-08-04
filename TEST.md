# Test cross-téléphone (Alice ↔ Bob)

## Sécurité

- `.env` est gitignoré — **ne jamais le committer** (surtout `SUPABASE_SERVICE_ROLE_KEY`).
- Si la `service_role` a été collée dans un chat / ticket : **rotation** dans Supabase → Settings → API.
- Appliquer aussi la migration `20260804190000_rls_harden.sql` (join teams + invites DM).
- OAuth Apple / Google : checklist complète dans **[AUTH.md](./AUTH.md)**.

## Démarrage rapide (Supabase Cloud — recommandé)

Le fichier `.env` (gitignoré) doit contenir `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (seed uniquement) et `SUPABASE_URL`.

```bash
# Une fois : migrations + seed (si pas déjà fait)
# SQL Editor → fichiers dans supabase/migrations/ (ordre chronologique)
# ou : SUPABASE_DB_PASSWORD=... && node scripts/apply-cloud-migrations.mjs
npm run seed:test-users

# À chaque session de test
npx expo start      # QR Expo Go sur chaque téléphone
```

Après modification de `.env`, **redémarre Metro** (`Ctrl+C` puis `npx expo start`) pour recharger les `EXPO_PUBLIC_*`.

Colima / Supabase local est **optionnel** (voir plus bas) — le cloud suffit pour 2 téléphones.

Sans `.env` valide, l’app reste en mode démo local (`lea@jumelo.app`, **`__DEV__` only**) — les deux téléphones ne partagent pas la base.

## Test OAuth (Apple / Google)

Prérequis : providers activés + redirects `jumelo://**` (voir AUTH.md).

1. `npx expo start` → Expo Go.
2. Login → **Continuer avec Apple** ou **Continuer avec Google**.
3. Après retour dans l’app : vérifier `auth.users` + `profiles` dans le dashboard.
4. Email/mot de passe (Alice/Bob) reste un chemin de secours pour les tests BDD.

## Comptes

| | Email | Mot de passe |
|---|---|---|
| Alice | `alice@jumelo.app` | `jumelo1234` |
| Bob | `bob@jumelo.app` | `jumelo1234` |

## Téléphones (cloud)

- Pas besoin du même Wi‑Fi ni d’IP LAN : l’API est ton URL `*.supabase.co` (dans `.env`).
- Les deux téléphones scannent le même QR Expo Go (même session Metro).

## Option locale (Colima — optionnel)

Prérequis une fois : Docker via Colima + CLI Supabase

```bash
brew install colima docker docker-compose supabase/tap/supabase
colima start
npm run db:start    # écrit .env avec IP LAN + clés locales
npm run db:seed
npx expo start
```

> **Pourquoi un miroir `~/jumelo-db` ?** Sur macOS, Docker/Colima ne peut souvent pas monter `~/Desktop` (TCC). `db:start` synchronise `supabase/` vers `~/jumelo-db` et lance Supabase depuis là.

- Les deux téléphones + le Mac doivent être sur le **même Wi‑Fi**.
- `EXPO_PUBLIC_SUPABASE_URL` doit être `http://<IP_LAN_DU_MAC>:54321` (pas `localhost` sur un vrai téléphone).
- Studio local : http://127.0.0.1:54323 — arrêt : `npm run db:stop`.

## Migrations cloud (alternatives)

1. **Script** : `SUPABASE_DB_PASSWORD` dans `.env` puis `node scripts/apply-cloud-migrations.mjs`
2. **CLI** : `supabase login` + `supabase link --project-ref YOUR_PROJECT_REF` + `npx supabase db push`
3. **Dashboard** : SQL Editor → coller / exécuter les fichiers de `supabase/migrations/` dans l’ordre

## Scénario BDD

### Profils croisés

1. Téléphone A → login **Alice**.
2. Téléphone B → login **Bob**.
3. Sur A : onglet **Discover** → carte de Bob → ouvrir le profil (`/user/<uuid>`).
4. Sur B : Discover → profil d’Alice.

Les profils viennent de `profiles` (+ tables junction). RLS : tout utilisateur authentifié peut **lire** les profils des autres.

### Messages persistés

1. Sur le profil de l’autre → **Discuter** (crée / rouvre un DM Supabase).
2. Envoie un message depuis A.
3. Sur B : onglet **Messages** → ouvre le thread → le message apparaît (pull / reouvrir l’écran ; pas encore de realtime).
4. Studio local → **Table Editor** → `messages` : ligne avec `sender_id` = UUID d’Alice, `body` visible.

Le seed crée déjà un DM avec le message : *« Salut Bob ! Prêt pour un duo ce soir ? »*.

## Cas de test : like reçu (mode démo)

Sans deux téléphones — login démo `lea@jumelo.app` (`__DEV__`).

1. Onglet **Home**.
2. Bandeau **Cas de test (__DEV__)** → **Like reçu** (ou laisse le seed auto Maxime au premier lancement).
3. Badge cœur (en-tête) et ligne **« Maxime a aimé ton profil »** dans **Activité récente**.
4. Tape la notif / le badge → sheet **« Maxime t’a liké »** (`/liked-me/u-maxime`).
5. **Liker en retour** → **« C’est un match! »** puis **Discuter** ; **Passer** retire la notif.

## Cas de test : like mutuel (mode démo)

1. Home → **Cas de test : Like mutuel** (seed : Maya t’a déjà liké).
2. Onglet **Discover** → like **Maya** (cœur / swipe droite).
3. Match immédiat **« C’est un match! »** (like mutuel, même si score &lt; 80).
4. **Discuter** ouvre / crée le DM.

## Cas de test : C’est un match! (score ≥ 80, mode démo)

Sans Supabase (`lea@jumelo.app`), un **jumelage officiel** exige un score de compatibilité **≥ 80** (`MATCH_THRESHOLD` dans `src/lib/matching.ts`) — sauf like mutuel ci-dessus.

### Reproduire la célébration (score)

1. Lance `npx expo start`, ouvre Expo Go, reste en démo (pas de `.env` Supabase).
2. Onglet **Discover**.
3. Like (cœur ou swipe droite) le **premier profil** dont le badge score est **≥ 80**  
   (souvent Noah / Maxime selon le ranking — le score est affiché en haut à droite de la carte).
4. L’écran modal **« C’est un match! »** (`/match-success/[id]`) s’ouvre avec :
   - les deux avatars + confetti Lottie
   - le score de compatibilité
   - boutons **Discuter**, **Voir le profil**, **Continuer Discover**

Variante : liker **Noah** (`u-noah`) ou **Léa** (`u-lea`) avec score ≥ 80 déclenche aussi le match (même après le premier like).

### Score &lt; 80 (sans like entrant)

- Le like est enregistré (AsyncStorage `@jumelo/likes`).
- Toast : **« Pas encore un jumelage (score X%) »**.
- Pas d’écran « C’est un match! ».

### Maintenant / Home

- Les scores restent visibles.
- Label **Jumelage** / bandeau **Match trouvé** seulement si score ≥ 80.
- Likes reçus + matches apparaissent dans **Activité récente** (persistance locale).

## Vérifications rapides

- Login Alice/Bob échoue → `.env` manquant / mauvais, ou `db:start` pas lancé, ou email non confirmé (le seed force `email_confirm`).
- Discover ne montre que des mocks → profils sans `onboarding_complete = true` (relancer `npm run db:seed`).
- « Discuter » ne crée rien → migration non appliquée, ou session démo (`lea@…` / id `u-*`).
- Message invisible côté B → recharger l’écran chat ; vérifier RLS / membership dans `conversation_members`.
- Téléphone ne joint pas l’API → URL encore en `127.0.0.1` / `localhost` ; utiliser l’IP LAN ; même Wi‑Fi.
- Pas d’écran match après like → vérifier le score sur la carte (&lt; 80 = toast seulement).
