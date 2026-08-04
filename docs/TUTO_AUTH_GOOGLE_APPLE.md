# Tuto débutant — Google & Apple sur Jumelo

Guide pas à pas pour coller les **URI de redirection** Google (dev), puis comprendre ce qu’il faut **en plus** pour que Google/Apple marchent pour **tous les utilisateurs** une fois l’app sur l’App Store / Play Store.

Projet Firebase / Google Cloud : **jumelo-aca80**  
Bundle id : **app.jumelo**  
Client OAuth **Web** (celui à éditer pour le DEV) : ID qui commence par `216064971480-m2jetnk6k6p6jecg…`

> Doc technique complète : [`FIREBASE_AUTH.md`](../FIREBASE_AUTH.md) à la racine.

---

## Partie 1 — Où coller les redirect URIs (DEV)

Ces URI servent **uniquement** au développement (navigateur localhost + Expo Go). Ce n’est **pas** ce qui fait marcher le login store pour le grand public.

### Étapes numérotées (captures en texte)

1. Ouvre [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. En haut, sélectionne le projet **jumelo-aca80** (si tu ne le vois pas : menu déroulant « Sélectionner un projet »).
3. Menu ☰ (en haut à gauche) → **APIs et services** → **Identifiants** (Credentials).
4. Dans la liste **ID client OAuth 2.0**, clique le client de type **Application Web**  
   (pas iOS, pas Android) dont l’ID commence par  
   `216064971480-m2jetnk6k6p6jecg…`
5. Descends jusqu’à la section **URI de redirection autorisés** (Authorized redirect URIs).
6. Clique **Ajouter une URI** et colle **une URI à la fois** :

   ```text
   http://localhost:8081/oauth
   https://auth.expo.io/@sofyan/jumelo
   ```

7. Dans **Origines JavaScript autorisées** (Authorized JavaScript origins), ajoute :

   ```text
   http://localhost:8081
   ```

8. Clique **Enregistrer** (Save) en bas de la page. Attends 1–2 minutes.

### Aide mémoire visuelle

```
Google Cloud Console
 └─ Projet : jumelo-aca80
     └─ ☰ APIs et services
         └─ Identifiants
             └─ Client OAuth « Application Web » (216064971480-m2jetnk6k6p6jecg…)
                 ├─ Origines JS  → http://localhost:8081
                 └─ URI redirect → http://localhost:8081/oauth
                                 → https://auth.expo.io/@sofyan/jumelo
```

### Alerte DEV dans l’app

Quand tu lances Google depuis Jumelo en mode développement, une alerte / un log Metro affiche l’**URI exacte** envoyée à Google (`redirect_uri`).  
**Copie-colle exactement cette valeur** dans le client Web si elle manque — une faute de frappe = erreur `redirect_uri_mismatch`.

Aide CLI :

```bash
npm run google:redirects
# ou : npm run google:redirects -- sofyan
```

### Tester tout de suite

```bash
npx expo start -c
```

- **Web** : touche `w` → Welcome / Login → Google avec un **Gmail personnel** (pas un compte Workspace / pro).
- **Expo Go** (téléphone, même Wi‑Fi) : scanne le QR → Google (même Gmail perso).

> Apple **ne marche pas** dans Expo Go (audience `host.exp.Exponent` ≠ `app.jumelo`). Pour Apple : build EAS de développement iOS — voir Partie 3.

---

## Partie 2 — Différence TEST (dev) vs STORE (prod) — important

### Ce que font les redirect URI localhost / auth.expo.io

| URI | Usage |
|---|---|
| `http://localhost:8081/oauth` | Navigateur / Metro en local |
| `https://auth.expo.io/@sofyan/jumelo` | Expo Go sur téléphone |

→ **DEV uniquement.** Une fois l’app publiée sur les stores, les utilisateurs finaux **n’utilisent pas** ces URI.

### Ce que voient les utilisateurs sur l’App Store / Play Store

Sur un build **natif** (EAS production, pas Expo Go) :

- **iPhone** : « Continuer avec Apple » ouvre le sélecteur de compte Apple système (Face ID / Apple ID de **chaque** utilisateur).
- **Android** : « Continuer avec Google » ouvre le sélecteur de comptes Google du téléphone (compte **réel** de chaque utilisateur).

Oui : demain sur le store, Google/Apple doivent marcher avec **n’importe quel** compte utilisateur — **à condition** que la config production soit faite. Coller uniquement les redirect URI de dev **ne suffit pas** pour le store.

### Ce qu’il faut en plus pour la prod

1. **Firebase** : apps **iOS** et **Android** enregistrées avec le bundle / package `app.jumelo` (+ fichiers `GoogleService-Info.plist` / `google-services.json` dans le projet EAS).
2. **Google** :
   - Clients OAuth **iOS** et **Android** (en plus du client Web utilisé pour le SDK).
   - Android : empreinte **SHA-1** du keystore de **release** (EAS credentials) ajoutée au client Android.
   - Écran de consentement OAuth : passer en **Production** (ou rester en Testing avec une liste limitée de testeurs — pour le public store, il faut publier le consent ; vérification Google si demandée).
3. **Apple** :
   - Capability **Sign In with Apple** sur l’App ID `app.jumelo` (Apple Developer).
   - Provider **Apple** activé dans Firebase Authentication.
4. **Builds** : profils EAS **production** (pas Expo Go). Apple Sign-In nécessite un **dev client / standalone**, jamais Expo Go.

---

## Partie 3 — Checklist store avant publication

### iOS (App Store)

- [ ] App ID `app.jumelo` + capability **Sign In with Apple**
- [ ] App iOS enregistrée dans Firebase (`app.jumelo`)
- [ ] Provider Apple **activé** dans Firebase Auth
- [ ] Build EAS production iOS installable / TestFlight
- [ ] Test réel : « Continuer avec Apple » avec un Apple ID perso (hors Expo Go)
- [ ] Privacy Nutrition Labels / mentions Sign in with Apple si requis

### Android (Play Store)

- [ ] App Android `app.jumelo` dans Firebase
- [ ] Client OAuth Android + **SHA-1 release** (et debug si besoin)
- [ ] Provider Google activé dans Firebase
- [ ] Consent screen Google en **Production** (ou testeurs listés tant que Testing)
- [ ] Build EAS production Android (AAB) + test interne Play
- [ ] Test réel : « Continuer avec Google » avec un Gmail perso

### Commun

- [ ] Ne pas compter sur `localhost` / `auth.expo.io` pour les utilisateurs store
- [ ] Variables d’env de prod cohérentes (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, Firebase, etc.)
- [ ] CGU acceptées avant création de compte (écran Welcome / Register)

---

## Rappel plateformes dans l’app Jumelo

| Plateforme | Bouton social affiché |
|---|---|
| **iPhone** | Continuer avec Apple |
| **Android** | Continuer avec Google |
| **Web** | Continuer avec Google |

Email (« Créer un compte » / « Se connecter ») reste disponible partout.

---

## En cas de blocage

| Symptôme | Cause probable |
|---|---|
| `redirect_uri_mismatch` | URI absente du client OAuth **Web**, ou mauvais client (iOS/Android au lieu de Web) |
| Accès bloqué / Workspace | Compte pro / Workspace — tester avec Gmail perso |
| Apple échoue dans Expo Go | Normal — utiliser un EAS development build iOS |
| Google OK en local, rien sur le store | Config native (SHA-1, clients iOS/Android, consent Production) manquante |
