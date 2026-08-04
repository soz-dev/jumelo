import type { LegalDocument } from './types';
import { LEGAL_VERSION } from './version';

export const cookiesDocument: LegalDocument = {
  id: 'cookies',
  title: 'Traceurs & stockage local',
  lastUpdated: LEGAL_VERSION,
  intro:
    'Jumelo est une application mobile. Contrairement à un site web, elle n’affiche pas de bandeau « cookies » classique. Cette note explique quels stockages et éventuels traceurs sont utilisés, dans un esprit de transparence RGPD / ePrivacy.',
  sections: [
    {
      title: '1. Stockage local essentiel',
      paragraphs: [
        'L’application utilise le stockage local du téléphone (AsyncStorage) pour des finalités strictement nécessaires au service : session / profil mis en cache, préférences de thème, préférences de notifications, preuves d’acceptation des CGU et de la politique de confidentialité, consentement marketing.',
        'Ces traitements sont nécessaires au fonctionnement de l’application ou à la mémorisation de vos choix. Ils ne constituent pas des publicités ciblées tierces.',
      ],
    },
    {
      title: '2. Session & authentification',
      paragraphs: [
        'Lorsque Supabase est configuré, un jeton de session est conservé localement pour vous maintenir connecté de façon sécurisée. Ce stockage est indispensable à l’accès à votre compte.',
      ],
    },
    {
      title: '3. Analytics et mesure d’audience',
      paragraphs: [
        'À ce stade du produit, aucune solution d’analytics tierce n’est garantie comme active dans toutes les builds. Si des outils de mesure (ex. analytics produit) sont ajoutés ultérieurement, ils seront listés ici et, lorsque le droit l’exige, soumis à consentement.',
        'Tant qu’aucun outil non essentiel n’est déployé, aucun consentement spécifique « cookies analytics » n’est demandé.',
      ],
    },
    {
      title: '4. Fournisseurs tiers (connexion sociale)',
      paragraphs: [
        'Si vous vous connectez via Apple ou Google, ces prestataires peuvent déposer ou lire leurs propres identifiants selon leurs politiques. Jumelo ne contrôle pas ces mécanismes hors de l’application.',
      ],
    },
    {
      title: '5. Vos choix',
      paragraphs: [
        'Vous pouvez gérer le consentement marketing et consulter vos données dans Paramètres. La suppression du compte et le vidage du stockage local Jumelo sont proposés dans Mes données (RGPD).',
        'Vous pouvez également désinstaller l’application, ce qui supprime en principe les données locales sur l’appareil (hors copies serveur).',
      ],
    },
  ],
};
