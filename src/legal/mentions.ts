import type { LegalDocument } from './types';
import { LEGAL_CONTACT_EMAIL, LEGAL_VERSION } from './version';

export const mentionsDocument: LegalDocument = {
  id: 'mentions',
  title: 'Mentions légales',
  lastUpdated: LEGAL_VERSION,
  intro:
    'Conformément aux dispositions légales applicables (notamment la loi pour la confiance dans l’économie numérique), les présentes mentions identifient l’éditeur et l’hébergeur du service Jumelo. Les champs entre crochets sont des placeholders à compléter avant toute publication store / site.',
  sections: [
    {
      title: '1. Éditeur du service',
      paragraphs: [
        'Raison sociale / nom : [Nom de l’éditeur]',
        'Forme juridique : [SARL / SAS / micro-entreprise / association / …]',
        'Capital social : [montant] (le cas échéant)',
        'SIRET / RCS : [numéro SIRET] — [ville du RCS]',
        'Siège social : [Adresse complète du siège]',
        'Directeur / responsable de la publication : [Nom du responsable]',
        'Contact : ' + LEGAL_CONTACT_EMAIL,
        'TVA intracommunautaire : [n° TVA] (si applicable)',
      ],
    },
    {
      title: '2. Application',
      paragraphs: [
        'Nom commercial : Jumelo — « Trouve ton Jumelo »',
        'Nature : application mobile de mise en relation de coéquipiers / binômes',
        'Identifiants techniques (à confirmer) : iOS bundle app.jumelo — Android package app.jumelo',
      ],
    },
    {
      title: '3. Hébergement',
      paragraphs: [
        'Le backend et la base de données du service sont hébergés via Supabase (prestataire d’infrastructure cloud / BaaS).',
        'Éditeur du prestataire : Supabase, Inc. — informations publiques disponibles sur https://supabase.com — région du projet : [région Supabase à renseigner, ex. eu-west-1 / eu-central-1].',
        'Les binaires de l’application sont distribués via l’App Store (Apple) et/ou Google Play (Google), selon leurs conditions propres.',
      ],
    },
    {
      title: '4. Propriété intellectuelle',
      paragraphs: [
        'L’ensemble des éléments composant Jumelo (marque, design, textes, logiciels) est protégé. Toute utilisation non autorisée est interdite.',
      ],
    },
    {
      title: '5. Contact',
      paragraphs: [
        'Pour toute question relative aux mentions légales ou au service : ' + LEGAL_CONTACT_EMAIL + '.',
      ],
    },
  ],
};
