# Plan MVP Jumelo

## Vision

Jumelo aide à trouver un **jumelage** (coéquipier / binôme / partenaire) dans plusieurs univers : gaming, sports & fitness, éducation, musique, hobbies.

Slogan : **« Trouve ton jumelage. »**

## Scope MVP (livré)

- [x] Auth email + placeholders Apple/Google
- [x] Onboarding multi-étapes (univers → intérêts → vibe → dispos → profil)
- [x] Matching local multi-critères (score 0–100 + raisons)
- [x] Tabs Home / Discover / Teams / Chat / Profil
- [x] Écrans match reveal, chat détail, team détail, profil public
- [x] Design system + 10 thèmes persistés (AsyncStorage + `profiles.theme_id`)
- [x] Swipe like/pass sur Discover
- [x] Écran « C’est un match! » (`match-success/[id]`) — démo, seuil ≥ 80
- [x] Catégories → sous-catégories → plateformes
- [x] Flux Maintenant (recherche live + invitation)
- [x] UI alignée maquettes Base44
- [x] Compte démo `lea@jumelo.app`
- [x] Supabase : client Expo, schéma + RLS, auth/profil sync, messages list/send

## Prochaines étapes

1. Chat temps réel (Realtime) + notifications push
2. Activer Apple / Google Sign-In
3. Likes / matches serveur + Discover branché sur `listProfiles`
4. Création / rejoindre teams côté serveur
5. Modération & score de fiabilité dynamique

## Critères de matching (MVP)

| Critère | Poids max |
|---|---|
| Intérêts partagés | 30 |
| Niveau | 15 |
| Objectifs | 15 |
| Disponibilités | 15 |
| Vibe | 10 |
| Ville | 10 |
| Fiabilité | 5 |

**Seuil jumelage** : `MATCH_THRESHOLD = 80` — en dessous, like seul (pas de célébration). Voir TEST.md.

## Hors scope MVP

- Paiements
- Géolocalisation précise
- Admin / moderation tools
