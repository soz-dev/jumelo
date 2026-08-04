# Jumelo — conformité légale (fondation produit)

Ce document liste ce que le fondateur doit encore **compléter ou faire valider** avant un lancement store. Les écrans in-app et les textes sous `src/legal/` constituent une **base sérieuse et utilisable**, pas une certification juridique.

> **Important :** ces contenus ne remplacent pas un avis d’avocat. Faites relire CGU, politique de confidentialité, mentions légales et flux de consentement par un conseil avant publication App Store / Google Play / site public. Ne pas communiquer « 100 % conforme avocat ».

## Version des documents

- Constante applicative : `LEGAL_VERSION` dans `src/legal/version.ts` (actuelle : `2026-08-04`).
- À chaque mise à jour substantielle des politiques : incrémenter `LEGAL_VERSION` — les utilisateurs sans acceptation à jour verront `/settings/accept`.

## Placeholders à remplir

Remplacer partout (code + textes) les marqueurs entre crochets :

| Placeholder | Où | Exemple |
| --- | --- | --- |
| `[Nom de l’éditeur]` | Mentions, CGU, privacy | Société ou nom commercial |
| `[forme juridique / SIRET…]` | Mentions, privacy | SAS, SIRET… |
| `[Adresse du siège]` | Mentions, privacy | Adresse complète France |
| `[Nom du responsable]` | Mentions | Directeur de publication |
| `[email-contact@exemple.fr]` | `LEGAL_CONTACT_EMAIL` | Contact support |
| `[dpo@exemple.fr]` | `LEGAL_DPO_EMAIL` | DPO ou référent RGPD |
| `[n° TVA]` / capital / RCS | Mentions | Si applicable |
| `[région Supabase…]` | Mentions, privacy | Ex. `eu-central-1` |

Fichiers concernés : `src/legal/*.ts`, notamment `version.ts`, `mentions.ts`, `privacy.ts`, `cgu.ts`.

## Checklist fondateur (avant store)

1. **Identité éditeur** : forme juridique, SIRET, siège, responsable de publication.
2. **E-mails** : contact support + DPO/référent (même boîte possible en early stage, à documenter).
3. **Contrat sous-traitance Supabase** (DPA) + région du projet documentée ; vérifier transferts hors UE.
4. **Âge** : policy produit = 16+ (matching coéquipiers, pas dating) — aligner App Store age rating / questionnaire.
5. **Apple Privacy Nutrition Labels** & **Google Play Data safety** : déclarer compte, messages, profil, analytics éventuels, suppression de compte.
6. **Suppression Auth complète** : aujourd’hui l’app supprime le profil `public.profiles` (+ cascade) et le stockage local ; la purge `auth.users` peut nécessiter une Edge Function (service role). Prévoir ce endpoint avant scale.
7. **Migration RLS** : appliquer `supabase/migrations/20260804190000_profiles_delete_own.sql`.
8. **Analytics** : si vous ajoutez un SDK, mettre à jour `src/legal/cookies.ts` + consentement si requis.
9. **Revue avocat** avant mise en production publique.
10. **Process signalement** : adresse + délai de réponse (charte communauté).

## Où c’est dans l’app

- Hub : **Profil → Paramètres** (`/settings`)
- CGU, privacy, mentions, charte, traceurs, consentements, mes données, notifications
- Acceptation : checkbox à l’inscription ; écran `/settings/accept` si `legal_accepted_at` / version manquants
- Stockage local : `@jumelo/legal_accepted_at`, `@jumelo/legal_version`, `@jumelo/marketing_consent`

## Honnêteté produit

Cette fondation vise un MVP « en normes » côté UX et documentation. Elle n’est **pas** une garantie de conformité réglementaire. Toute communication externe doit rester prudente jusqu’à validation juridique.

## Marques & icônes de jeux (Simple Icons)

Jumelo affiche des **glyphes SVG** issus du projet open-source [Simple Icons](https://simpleicons.org/) (licence **CC0** sur les chemins SVG) pour certains jeux et plateformes (Valorant, League of Legends, etc.). Voir `src/constants/gameIcons.ts`.

**Point juridique important :**

- La licence CC0 concerne le **fichier SVG / path**, pas le droit des marques.
- Les noms, logos et identités visuelles des jeux (Riot, Epic, Valve, Microsoft, Nintendo, etc.) restent des **marques déposées** de leurs titulaires.
- Expédier ces glyphes dans une app **commerciale** (App Store / Google Play) sans droits ou guidelines d’usage peut être risqué (refus store, mise en demeure).
- Avant publication store : **vérifier l’usage des marques** auprès d’un conseil, ou **remplacer** par des assets licenciés / press kits officiels / pictogrammes génériques (Phosphor reste le fallback).

Ce n’est **pas** un avis d’avocat. Simple Icons ≠ autorisation de marque.
