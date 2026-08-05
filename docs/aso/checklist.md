# Checklist — publier le listing Jumelo

Aucun de ces champs n’est « magique » pour un #1 garanti. Objectif : couverture claire des requêtes à intention (coéquipier, binôme, jumelage, coop…).

## Avant soumission

- [ ] Icône 1024×1024, screenshots iPhone / Android aux formats exigés
- [ ] Privacy policy URL accessible (App Store & Play l’exigent)
- [ ] Catégorie principale choisie (Social / Lifestyle + secondaire Games ou Sports)
- [ ] Âge / questionnaire contenu renseigné (pas dating ; matching activité)
- [ ] Textes FR collés depuis `docs/aso/fr/`
- [ ] (Optionnel) Locale EN depuis `docs/aso/en/`

## App Store Connect

1. [ ] Apps → Jumelo → **App Store** → version en préparation  
2. [ ] Localisation **Français** : coller nom, sous-titre, description, promo, What’s New depuis [`fr/apple.md`](fr/apple.md)  
3. [ ] Champ **Keywords** (invisible sur le store public) : coller la ligne 100 car. — **virgules sans espaces**  
4. [ ] Vérifier que le nom affiché sous l’icône = celui d’ASC (peut différer du `CFBundleDisplayName` binaire)  
5. [ ] Support URL + Marketing URL (si tu as une page ; sinon support e-mail / page légale)  
6. [ ] Soumettre la version pour review  

**EAS Submit** (`eas submit -p ios`) envoie le binaire ; le copy listing se gère surtout dans ASC (sauf metadata avancée / config custom).

## Google Play Console

1. [ ] Présence sur le Play Store → **Fiche principale** → Français  
2. [ ] Coller titre, description courte, description longue depuis [`fr/google-play.md`](fr/google-play.md)  
3. [ ] Graphismes : icône, feature graphic, screenshots  
4. [ ] Catégorie + tags éventuels  
5. [ ] Politique de confidentialité  
6. [ ] Envoyer en revue / production  

**EAS Submit** (`eas submit -p android`) idem : binaire ≠ textes de fiche (sauf intégrations metadata spécifiques).

## Après mise en ligne (itérations)

- [ ] Suivre impressions / requêtes (ASC Analytics, Play Console insights)  
- [ ] Ajuster **texte promo** Apple sans rebuild  
- [ ] Tester A/B Play (titre / short desc) si volume suffisant  
- [ ] Mettre à jour What’s New à chaque version  
- [ ] Ne pas churner keywords / titre chaque semaine (laisser le temps à l’index)

## app.json (repo)

Déjà aligné côté Expo :

- `expo.name` / display names → **Jumelo** (marque sous l’icône sur device)
- `expo.description` → pitch store-oriented (FR)
- Bundle / package **non modifiés** : `app.jumelo`

Le **nom marketing store** (ex. `Jumelo - Coéquipiers & Duo`) se règle dans les consoles ; il peut être plus long que le nom device.
