# Firebase Auth (Google + Apple) — checklist console

> **Tuto débutant (où coller les URI + TEST vs STORE)** : [`docs/TUTO_AUTH_GOOGLE_APPLE.md`](docs/TUTO_AUTH_GOOGLE_APPLE.md)

L’app utilise le **SDK JS Firebase** + `expo-auth-session` (Google) + `expo-apple-authentication` (Apple). Cible **Expo SDK 54** / Expo Go quand possible — pas de `@react-native-firebase` obligatoire.

## Matrice « ça marche où ? »

| | Google | Apple | Email |
|---|---|---|---|
| **Web** `localhost:8081` | ✅ redirect `http://localhost:8081/oauth` | ❌ désactivé (message) | ✅ |
| **Expo Go** (téléphone) | ✅ redirect `https://auth.expo.io/@OWNER/jumelo` | ❌ bloqué (`aud=host.exp.Exponent`) | ✅ |
| **EAS dev client** iOS | ✅ | ✅ bundle `app.jumelo` | ✅ |
| **Store** (plus tard) | ✅ + SHA-1 Android | ✅ | ✅ |

### Tester AUJOURD’HUI

```bash
# 1) Redirects à coller dans Google Cloud (client Web) :
npm run google:redirects

# 2) Web
npx expo start -c
# touche w → http://localhost:8081/login → CGU (register) → Google
# Alerte DEV = URI exacte → doit être dans Google Cloud → Save

# 3) Expo Go (même Wi‑Fi) : scanner QR → Google (Gmail perso, pas compte pro)

# 4) Apple (iPhone uniquement) — PAS Expo Go :
npm run eas:ios:dev          # eas build --profile development --platform ios
# installer le .ipa / lien EAS, puis :
npm run start:dev-client     # Login → Continuer avec Apple
```

## Variables `.env`

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# Client OAuth Web (Firebase → Authentication → Google → Web SDK)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=

# Compte Expo (sans @) — active le proxy HTTPS auth.expo.io sous Expo Go
# Ex. si ton profil est @sofyan → EXPO_PUBLIC_EXPO_OWNER=sofyan
# Redirect Google à déclarer : https://auth.expo.io/@sofyan/jumelo
EXPO_PUBLIC_EXPO_OWNER=

# Optionnel (builds natifs / clients OAuth iOS-Android séparés)
# EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
# EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

Puis redémarre Metro (`npx expo start -c`).

Script d’aide : `npm run firebase:setup` (détecte la CLI ; création de projet si `firebase login` déjà fait).

Au démarrage du login Google, Metro logue le **redirect_uri exact** (`[jumelo] Google OAuth redirect_uri → …`) + la liste à coller. Copie-les tel quel dans Google Cloud.

Aide CLI :

```bash
npm run google:redirects
# ou avec ton username Expo :
npm run google:redirects -- sofyan
```

---

## Erreur 400 : `invalid_request` (Accès bloqué)

Cause la plus fréquente sous **Expo Go** : Google reçoit `redirect_uri=exp://192.168.x.x:8081/--/auth/callback`. Les clients OAuth **Web** n’acceptent pas `exp://` (ni souvent les IP brutes).

L’app force donc des URI **stables** (plus de `makeRedirectUri` variable) :

| Environnement | `redirect_uri` Google | À enregistrer dans le client Web |
|---|---|---|
| **Navigateur** (`npm run web` / touche `w`) | `http://localhost:8081/oauth` (**forcé**) | cette URI + origins (section 4) |
| Expo Go / natif **avec** `EXPO_PUBLIC_EXPO_OWNER` | `https://auth.expo.io/@OWNER/jumelo` | cette URL HTTPS |
| Expo Go **sans** owner | *(login bloqué avec message clair)* | — |
| (évité) | `exp://…` / `jumelo://…` | **ne pas utiliser** — client Web Google refuse |

> `redirect_uri_mismatch` = URI absente du client OAuth Web. **Ce n’est PAS** le compte perso / Outlook / Workspace.

Le proxy `https://auth.expo.io` est **déprécié** par Expo mais reste le seul HTTPS simple pour Expo Go + client Web.

Sur **web**, Metro (Expo SDK 54) sert sur **:8081**. L’ancien packager utilisait **19006** — on déclare les deux.

Sous Expo Go : `npx expo login && npx expo whoami` → `.env` : `EXPO_PUBLIC_EXPO_OWNER=<username>` → `npx expo start -c`.

---

## Workspace / compte pro — ce n’est PAS un bug Jumelo

Les comptes **Google Workspace** / pro sont souvent bloqués par la politique d’entreprise :

- apps OAuth **non vérifiées** / en statut **Testing** ;
- apps tierces interdites par l’admin Workspace ;
- message type « Accès bloqué », `access_denied`, `admin_policy_enforced`.

**L’app Jumelo ne peut pas contourner ça.** Deux solutions :

1. **Tester avec un Gmail personnel** (recommandé)  
   - Consent screen **External** + ajoute `toi@gmail.com` en **Test users**.  
   - Au login : choisir le Gmail perso (l’app affiche une alerte + `prompt=select_account`).  
   - Ne pas utiliser un compte Workspace / pro pour Jumelo.

2. **Autoriser via l’admin Workspace** (si tu dois utiliser le compte pro)  
   - Admin Google Workspace → **Sécurité** → **Contrôle des accès aux applications** / **API controls** → autoriser l’app Jumelo (client OAuth `216064971480-…`) ou assouplir « apps non vérifiées » pour les testeurs.  
   - Sans ça, le compte pro **échouera toujours**, même avec des redirect URIs parfaites.

L’app n’envoie **pas** de paramètre `hd=` (domaine Workspace) ni de `login_hint` (évite de pré-sélectionner un compte pro).

---

## Étapes console (clics exacts) — chemin minimal

### 1. Projet Firebase `jumelo-aca80`

1. Ouvre [Firebase Console](https://console.firebase.google.com/) → projet **jumelo-aca80**.
2. ⚙️ **Project settings** → **Your apps** → app **Web** → copie la config dans `.env` (`EXPO_PUBLIC_FIREBASE_*`).
3. (Plus tard, builds stores) Ajouter apps iOS `app.jumelo` + Android `app.jumelo` et remplacer les placeholders `GoogleService-Info.plist` / `google-services.json`.

### 2. Activer Google dans Firebase

1. Menu **Build** → **Authentication**.
2. Onglet **Sign-in method** → **Add new provider** / clic **Google**.
3. **Enable** → **Save**.
4. Note le **Web client ID** (ressemble à `216064971480-….apps.googleusercontent.com`) → `.env` : `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=…`.

### 3. Écran de consentement OAuth (Google Cloud)

1. Ouvre [Google Cloud Console](https://console.cloud.google.com/) → sélectionne le projet lié à Firebase (**jumelo-aca80**).
2. Menu ☰ → **APIs & Services** → **OAuth consent screen** (ou **Google Auth platform** → **Audience** / **Branding** selon la nouvelle UI).
3. **User type** : **External** → **Create** / **Save**.
4. Remplis **App name** (Jumelo), **User support email**, **Developer contact** → **Save and Continue**.
5. Scopes : laisse les scopes par défaut (email / profile / openid) → **Save and Continue**.
6. **Test users** (tant que l’app est en statut **Testing**) :
   - **Add users** → ajoute ton **Gmail perso** (ex. `toi@gmail.com`).
   - **Ne mets pas** (ou retire) ton compte Workspace / pro si tu ne veux pas l’utiliser pour Jumelo.
7. **Save and Continue** → **Back to Dashboard**.

Sans ton Gmail en test user, Google peut bloquer ou n’afficher que les comptes déjà « connus » / session Safari.

### 4. Credentials → client OAuth **Web** → redirect URIs (coller tel quel)

> **Cause #1 de `redirect_uri_mismatch`** : URI absente du client OAuth **Web**, ou édition du client **iOS/Android** par erreur.

L’app n’envoie **qu’une** URI selon la plateforme :

| Plateforme | `redirect_uri` envoyé à Google |
|---|---|
| **Web** (`npm run web` / `http://localhost:8081`) | `http://localhost:8081/oauth` |
| **Expo Go** (téléphone) | `https://auth.expo.io/@sofyan/jumelo` |

(`@sofyan` vient de `app.json` → `owner` + `.env` → `EXPO_PUBLIC_EXPO_OWNER`. Vérifie avec `npx expo whoami`.)

1. Google Cloud → **APIs & Services** → **Credentials**.
2. Sous **OAuth 2.0 Client IDs**, ouvre le client **Web application**  
   ID : `216064971480-m2jetnk6k6p6jecgjek74lt9m0ohdc7q.apps.googleusercontent.com`.
3. **Authorized JavaScript origins** → **Add URI** :

   ```text
   http://localhost:8081
   http://127.0.0.1:8081
   ```

4. **Authorized redirect URIs** → colle **exactement** (puis **Save**) :

   ```text
   http://localhost:8081/oauth
   https://auth.expo.io/@sofyan/jumelo
   http://127.0.0.1:8081/oauth
   https://jumelo-aca80.firebaseapp.com/__/auth/handler
   https://jumelo-aca80.web.app/__/auth/handler
   ```

   Ou lance : `npm run google:redirects` (affiche la liste prête à coller).

   En **__DEV__**, un clic Google affiche une **alerte** avec l’URI exacte envoyée — colle-la si elle diffère.

5. **Save** (obligatoire).
6. `.env` :
   ```bash
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=216064971480-m2jetnk6k6p6jecgjek74lt9m0ohdc7q.apps.googleusercontent.com
   EXPO_PUBLIC_EXPO_OWNER=sofyan
   ```
7. `npx expo start -c` → Login/Register → Google → vérifier l’alerte DEV / log `[jumelo] Google OAuth redirect_uri → …`.

### 5. Apple Sign-In

1. Firebase → **Authentication** → activer **Apple**.
2. [Apple Developer](https://developer.apple.com/account) → App ID `app.jumelo` avec **Sign In with Apple**.
3. Config Expo déjà en place (`app.json`) :
   - `ios.bundleIdentifier`: `app.jumelo`
   - `ios.usesAppleSignIn`: `true`
   - plugin `expo-apple-authentication`
4. **Apple ne se teste pas dans Expo Go** (voir section erreur ci-dessous). Utilise un **development build** EAS.

#### Erreur `auth/invalid-credential` — audience `host.exp.Exponent`

Symptôme Firebase :

```text
auth/invalid-credential
The audience in ID token [host.exp.Exponent] does not match the expected audience
```

**Cause :** sous Expo Go, le binaire réel est Expo Go (`host.exp.Exponent`). Apple signe donc le JWT avec `aud = host.exp.Exponent`. Firebase Apple attend l’App ID / Services ID configuré (`app.jumelo`). Aucun workaround sûr.

**Solution — development build EAS (bundle `app.jumelo`) :**

```bash
npx eas-cli login
npx eas-cli init                    # une fois (projectId)
npm run eas:ios:dev                 # = eas build --profile development --platform ios
# ou simulateur : npm run eas:ios:sim

# Après install du build sur l’iPhone :
npm run start:dev-client
```

Login / Register → **Continuer avec Apple** → JWT `aud: app.jumelo` → Firebase OK.

Sous **Expo Go**, Apple est bloqué volontairement ; **Google** reste le chemin de test téléphone immédiat.

Sous **navigateur** : Apple désactivé (« iOS uniquement »).

### Android Google (EAS / store) — plus tard

1. `npm run eas:android:dev` (ou build production).
2. Récupérer le **SHA-1** du keystore EAS :
   ```bash
   eas credentials -p android
   # ou : keytool -list -v -keystore <path>
   ```
3. Firebase Console → Project settings → app Android `app.jumelo` → ajouter SHA-1.
4. Télécharger le vrai `google-services.json` (remplacer le placeholder du repo).
5. Google Cloud : client OAuth **Android** (package `app.jumelo` + SHA-1).  
   Le flux actuel Expo Go utilise encore le **client Web** + `auth.expo.io` — le client Android natif sert surtout aux builds store / `@react-native-google-signin`.

### 6. Pont Supabase (Teams / Messages)

Après Google/Apple, l’app envoie le même `idToken` à Supabase via `signInWithIdToken` pour obtenir un UUID `auth.users` + RLS.

À activer côté Supabase (si pas déjà fait) :

1. **Authentication → Providers → Google / Apple** avec les **mêmes** credentials OAuth que Firebase/Google/Apple.
2. Redirect URLs Supabase peuvent rester pour d’autres flux ; l’app n’utilise plus `signInWithOAuth` Supabase.

Sans bridge : session Firebase + profil local `fb-<uid>` (AsyncStorage). L’app reste utilisable ; sync Teams/Messages Supabase limitée.

---

## Pourquoi le compte pro / Workspace apparaît

Ce n’est **pas** Firebase qui « choisit » le compte. Sur iPhone, Google / Safari réutilisent la **session Google déjà ouverte** (souvent un compte Workspace / pro).

Correctifs :

1. Avant Google, l’app affiche une alerte FR : ne pas utiliser un compte pro / Workspace.
2. L’app envoie `prompt=select_account` (sans `hd=` / sans `login_hint`) → **Choisir un compte**.
3. Tape **Utiliser un autre compte** → Gmail perso (ajouté en **Test users**).
4. Si un seul compte : Safari → [accounts.google.com](https://accounts.google.com) → déco du pro, ou navigation privée ; réessaie.
5. Retire le compte pro des **Test users** si tu ne veux plus l’autoriser en Testing.
6. Si Google affiche « Accès bloqué » **après** choix d’un compte Workspace → restriction org (section ci-dessus) : utilise un Gmail perso.

---

## Tester

### Expo Go (téléphone) + localhost (navigateur) en parallèle

```bash
# 1. .env : Firebase + WEB_CLIENT_ID + EXPO_PUBLIC_EXPO_OWNER
# 2. npm run google:redirects  → coller les URIs + origins (section 4)
npm start
# ou : npx expo start -c
```

Scripts npm :

| Script | Commande |
|---|---|
| `npm start` | `expo start` — Metro pour Expo Go + option web |
| `npm run web` | `expo start --web` — ouvre le navigateur |
| `npm run ios` / `android` | lance le simulateur / émulateur |

Dans le terminal Metro :

- scanne le **QR code** / ouvre `exp://…` dans **Expo Go** (même Wi‑Fi que le Mac) ;
- appuie sur **`w`** pour le navigateur, ou `npm run web`.

URLs typiques (SDK 54 / Metro) :

| Cible | URL |
|---|---|
| Metro / Expo Go | `exp://192.168.x.x:8081` (IP LAN affichée par Expo) |
| Navigateur | `http://localhost:8081/oauth` |

Les deux partagent le **même** serveur Metro sur `:8081`.

1. **Téléphone** → Expo Go → Login / Register → CGU (register) → **Continuer avec Google**.
2. **Navigateur** → `http://localhost:8081` → même flux Google (Apple désactivé / « iOS uniquement »).
3. Confirmer l’alerte « compte pro / Workspace ».
4. Metro / console : vérifier `redirect_uri` ; écran Google = choix de compte.
5. Choisir le **Gmail perso** (pas le compte pro).
6. Firebase → Authentication → Users : nouvel utilisateur.
7. Si Supabase bridgé : `profiles` avec l’UUID Supabase.

### Si ça échoue encore

| Symptôme | Action |
|---|---|
| `invalid_request` + redirect `exp://` | App à jour + `EXPO_PUBLIC_EXPO_OWNER` + URI `auth.expo.io` |
| `invalid_request` + `jumelo://` / `auth.expo.io` | URI absente / typo dans Credentials → Web → Save |
| Google web `redirect_uri_mismatch` | Ajoute l’URI exacte loguée + origins `http://localhost:8081` (section 4) |
| `access_denied` / app en test | Gmail perso en **Test users** (consent External) |
| Accès bloqué après compte Workspace / pro | **Workspace** : org bloque les apps non vérifiées — Gmail perso obligatoire (pas un bug Jumelo) |
| Mauvais compte pré-sélectionné | Alerte + `select_account` + autre compte / déco Safari |
| Proxy `auth.expo.io` bloqué (cookies / ITP) | Dev build : `npx expo run:ios` + `jumelo://auth/callback` |
| Apple `auth/invalid-credential` + `host.exp.Exponent` | Normal Expo Go → `eas build --profile development --platform ios` |
| Alerte Apple Expo Go | Attendu : Google dans Expo Go, ou dev client EAS pour Apple |
| Apple grisé « iOS uniquement » sur localhost | Attendu : pas d’Apple Sign-In web dans ce MVP |
