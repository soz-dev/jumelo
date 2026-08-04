import type { LegalDocument } from './types';
import { LEGAL_CONTACT_EMAIL, LEGAL_VERSION } from './version';

/**
 * Règles d’usage Jumelo (charte communauté).
 * Contenu in-app — pas de dépendance à un fichier .md externe.
 */
export const communityDocument: LegalDocument = {
  id: 'community',
  title: 'Règles Jumelo',
  lastUpdated: LEGAL_VERSION,
  intro:
    'En créant un compte Jumelo, vous vous engagez à respecter les présentes règles. Jumelo sert à trouver des coéquipiers et binômes de confiance (jeux, sport, études, musique, hobbies) — pas à une démarche de rencontre amoureuse. Ces règles complètent les Conditions générales d’utilisation (CGU). Leur non-respect peut entraîner avertissement, suspension ou suppression de compte.',
  sections: [
    {
      title: '1. Esprit Jumelo',
      paragraphs: [
        'Jumelo est une plateforme de jumelage d’activités et de collaboration. Les suggestions de matching visent des sessions partagées, des équipes et des échanges autour d’intérêts communs.',
        'Soyez fiables : honorez vos sessions, prévenez en cas d’empêchement, et évitez le ghosting.',
        'Soyez clairs : un profil honnête (intérêts, niveau, disponibilités, attentes) améliore le matching pour tout le monde.',
        'Restez dans le cadre : jouer, s’entraîner, apprendre ou créer ensemble. Toute utilisation détournée vers la romance forcée, le harcèlement ou la sollicitation inappropriée est interdite.',
      ],
    },
    {
      title: '2. Âge minimum',
      paragraphs: [
        'Le service est réservé aux personnes âgées d’au moins 16 ans. Les fonctionnalités de matching concernent des activités de loisir et de collaboration ; elles ne constituent pas un service de dating.',
        'Si vous avez entre 16 et 17 ans, utilisez l’application de manière responsable et, lorsque le droit l’exige, avec l’accord de votre représentant légal.',
        'Les contenus à caractère sexuel, les sollicitations inappropriées et toute interaction visant un mineur de moins de 16 ans sont strictement interdits. Les utilisateurs majeurs (18+) ne doivent pas solliciter de mineurs à des fins détournées du but du service.',
      ],
    },
    {
      title: '3. Respect et anti-harcèlement',
      paragraphs: [
        'Traitez chaque membre avec courtoisie. Le désaccord est possible ; le mépris, l’intimidation et le harcèlement ne le sont pas.',
        'Sont notamment interdits : menaces, doxxing (diffusion d’informations personnelles sans consentement), discours haineux, discrimination (origine, genre, orientation, religion, handicap, apparence, etc.), et toute forme de pression répétée après un refus.',
        'Si quelqu’un refuse une invitation, un match ou une conversation, n’insistez pas et ne multipliez pas les comptes pour contourner un blocage.',
      ],
    },
    {
      title: '4. Pas de romance forcée',
      paragraphs: [
        'Jumelo n’est pas une appli de rencontre amoureuse. Les messages, bios et invitations doivent rester cohérents avec une recherche de coéquipier ou de binôme d’activité.',
        'Les avances non sollicitées à caractère romantique ou sexuel, les demandes insistantes de rendez-vous « hors cadre activité », et le détournement du matching à des fins de dating sont interdits.',
        'Un intérêt amical ou une amitié qui naît d’une activité partagée reste possible ; ce qui est interdit, c’est d’imposer une démarche romantique ou de harceler quelqu’un qui n’est pas intéressé.',
      ],
    },
    {
      title: '5. Contenu et profil',
      paragraphs: [
        'Votre photo, bio, messages et noms d’équipes doivent être licites, non trompeurs et respectueux. Pas de contenus pornographiques, violents gratuits, illégaux, diffamatoires ou portant atteinte aux droits de tiers.',
        'Usurpation d’identité, faux profils, spam, publicité non autorisée et arnaques (phishing, demandes d’argent, investissements douteux, etc.) sont interdits.',
        'Ne partagez pas hors Jumelo les données personnelles d’autrui sans accord explicite.',
      ],
    },
    {
      title: '6. Messages, équipes et sessions',
      paragraphs: [
        'Les chats et équipes sont des espaces partagés : restez courtois, même en désaccord sur un jeu, un entraînement ou un projet.',
        'Honorez autant que possible les créneaux convenus. En cas d’annulation, prévenez les coéquipiers dans un délai raisonnable.',
        'Ne contournez pas les mesures de sécurité, ne scrapez pas les données, et n’automatisez pas l’usage du service de façon abusive.',
      ],
    },
    {
      title: '7. Signalements',
      paragraphs: [
        'Si vous constatez un comportement contraire à ces règles, signalez-le via les moyens prévus dans l’app lorsqu’ils sont disponibles, ou contactez-nous à ' +
          LEGAL_CONTACT_EMAIL +
          ' en précisant le contexte (captures d’écran, identifiants, dates).',
        'Nous examinerons les signalements dans un délai raisonnable. Les signalements abusifs ou de mauvaise foi peuvent eux aussi faire l’objet de sanctions.',
        'En cas d’urgence ou de danger immédiat, contactez les services de secours ou les autorités compétentes.',
      ],
    },
    {
      title: '8. Données et confidentialité',
      paragraphs: [
        'Le traitement de vos données personnelles est décrit dans la Politique de confidentialité (RGPD), consultable dans l’application (Paramètres).',
        'Vous pouvez demander l’accès, la rectification ou la suppression de vos données depuis Paramètres → Mes données, sous réserve des obligations légales de conservation.',
        'En acceptant ces règles à l’inscription, vous confirmez avoir pris connaissance des CGU et de la Politique de confidentialité associées à la version indiquée dans l’app.',
      ],
    },
    {
      title: '9. Sanctions',
      paragraphs: [
        'Selon la gravité et la récurrence : avertissement, limitation temporaire de fonctionnalités, suspension, suppression de compte.',
        'L’Éditeur peut conserver les éléments nécessaires pour faire valoir ses droits, répondre à une obligation légale, ou traiter un signalement, dans les limites prévues par la loi.',
      ],
    },
    {
      title: '10. Évolution des règles',
      paragraphs: [
        'Ces règles peuvent évoluer. La version applicable est indiquée dans l’application. En cas de changement substantiel, une nouvelle acceptation pourra vous être demandée avant de continuer à utiliser Jumelo.',
        'Contact : ' + LEGAL_CONTACT_EMAIL + '.',
      ],
    },
  ],
};
