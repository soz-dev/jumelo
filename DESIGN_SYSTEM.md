# Design system Jumelo

Fondation UI pour Expo SDK 54 — cohérente avec les **10 thèmes** (`ThemeContext`) et l’identité Jumelo (gradients teal/coral, énergie, Lottie, Outfit).

## Emplacement

```
src/design-system/
  tokens.ts       # spacing, radii, typography, elevation, iconSizes, motion
  Button.tsx
  TextField.tsx
  Screen.tsx
  SectionHeader.tsx
  ListRow.tsx
  Avatar.tsx
  Badge.tsx
  Chip.tsx
  EmptyState.tsx
  …
  index.ts
```

Import :

```ts
import { Button, Screen, spacing, typography } from '@/design-system';
// ou
import { Button, Screen } from '../src/design-system';
```

`src/components/ui.tsx` réexporte les composants pour la rétrocompatibilité.

## Couleurs

Ne pas hardcoder les teintes de marque. Toujours :

```ts
const { colors, palette } = useTheme();
// colors.primary, .accent, .cream, .ink, …
```

Les tokens `baseColors` (ink, cream, border…) restent stables ; primary/accent viennent de la palette active.

## Tokens

| Token | Usage |
|--------|--------|
| `spacing` | Grille 4pt (`xs`→`xxxl`, + `smd`, `ml`) |
| `radii` | `xs` → `xl`, `pill`, `full` |
| `typography` | `hero`, `display`, `title`, `section`, `body`, `caption`, `overline` |
| `elevation` | `soft`, `lift`, `glow(color)` — sparingly |
| `iconSizes` | `xs` 14 → `xl` 36 |
| `motion` | `fast` / `base` / `slow` + spring |

## Composants

- **Button** — primary / secondary / ghost / accent + micro-spring
- **TextField** — label, erreur, icône, toggle mot de passe
- **Screen** — `atmosphere` optionnel (`soft` \| `bold`)
- **SectionHeader** / **HeaderRow** — titre + action
- **ListRow** — lignes listes / réglages
- **Avatar** — photo ou initiales + online
- **Badge** / **ScoreBadge** — pastilles
- **Chip** — filtres / tags
- **EmptyState** — vide + CTA / Lottie

## Surfaces

Préférer l’`Atmosphere` + hiérarchie typo/espacement. Les “cards” ne servent que quand l’interaction le demande (swipe Discover, CTA Maintenant). Éviter bordures + ombres empilées partout.

## Motion

2–3 motions intentionnelles par flux (ex. spring bouton, fade hero welcome, swipe Discover). Pas d’animation décorative en boucle hors Lottie de fond.
