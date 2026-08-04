import type { LegalDocument } from './types';
import { LEGAL_CONTACT_EMAIL, LEGAL_VERSION } from './version';

export const communityDocument: LegalDocument = {
  id: 'community',
  title: 'Charte communauté & règles d’usage',
  lastUpdated: LEGAL_VERSION,
  intro:
    'Jumelo existe pour trouver des coéquipiers et binômes de confiance — pas pour harceler, discriminer ou détourner le matching. Cette charte complète les CGU. Son non-respect peut entraîner avertissement, suspension ou suppression de compte.',
  sections: [
    {
      title: '1. Esprit Jumelo',
      paragraphs: [
        'Soyez fiables : honorez vos sessions, prévenez en cas d’empêchement, et évitez le ghosting.',
        'Soyez clairs : un profil honnête (intérêts, niveau, disponibilités) améliore le matching pour tout le monde.',
        'Restez dans le cadre : Jumelo sert à jouer, s’entraîner, apprendre ou créer ensemble — pas à une démarche de rencontre amoureuse.',
      ],
    },
    {
      title: '2. Âge minimum',
      paragraphs: [
        'Le service est réservé aux personnes âgées d’au moins 16 ans. Les fonctionnalités de matching concernent des activités de loisir / collaboration ; elles ne constituent pas un service de dating.',
        'Si vous avez entre 16 et 17 ans, utilisez l’application de manière responsable et, lorsque le droit l’exige, avec l’accord de votre représentant légal. Les contenus à caractère sexuel, les sollicitations inappropriées et toute interaction visant un mineur de moins de 16 ans sont strictement interdits.',
        'Les utilisateurs majeurs (18+) ne doivent pas solliciter de mineurs à des fins détournées du but du service.',
      ],
    },
    {
      title: '3. Interdictions',
      paragraphs: [
        'Harcèlement, menaces, intimidation, doxxing, discours haineux ou discriminatoires.',
        'Contenus sexuels explicites, images non consenties, propos obscènes non sollicités.',
        'Usurpation d’identité, faux profils, spam, publicité non autorisée, arnaques (phishing, demandes d’argent, etc.).',
        'Partage de contenus illégaux, incitation à la violence, ou activités portant atteinte à la sécurité d’autrui.',
        'Contournement des mesures de sécurité, scraping massif, automatisation abusive.',
      ],
    },
    {
      title: '4. Messages et équipes',
      paragraphs: [
        'Respectez le consentement : si quelqu’un refuse une invitation ou une conversation, n’insistez pas.',
        'Les équipes et chats sont des espaces partagés : restez courtois, même en désaccord.',
        'Ne partagez pas hors Jumelo les données personnelles d’autrui sans accord explicite.',
      ],
    },
    {
      title: '5. Signalement',
      paragraphs: [
        'Si vous constatez un comportement contraire à cette charte, contactez-nous à ' +
          LEGAL_CONTACT_EMAIL +
          ' en précisant le contexte (captures, identifiants, dates). Nous examinerons les signalements dans un délai raisonnable.',
        'En cas d’urgence ou de danger immédiat, contactez les services de secours ou les autorités compétentes.',
      ],
    },
    {
      title: '6. Sanctions',
      paragraphs: [
        'Selon la gravité : avertissement, limitation temporaire, suspension, suppression de compte et, le cas échéant, conservation d’éléments nécessaires pour faire valoir nos droits ou répondre à une obligation légale.',
      ],
    },
  ],
};
