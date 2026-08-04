import type { LegalDocument } from './types';
import { LEGAL_CONTACT_EMAIL, LEGAL_VERSION } from './version';

export const cguDocument: LegalDocument = {
  id: 'cgu',
  title: 'Conditions générales d’utilisation',
  lastUpdated: LEGAL_VERSION,
  intro:
    'Les présentes Conditions générales d’utilisation (ci-après « CGU ») régissent l’accès et l’utilisation de l’application mobile Jumelo (« Trouve ton Jumelo »), éditée par [Nom de l’éditeur] (ci-après « l’Éditeur »). En créant un compte ou en utilisant Jumelo, vous acceptez ces CGU.',
  sections: [
    {
      title: '1. Objet du service',
      paragraphs: [
        'Jumelo est une plateforme de mise en relation de coéquipiers et binômes autour d’activités partagées (jeux vidéo, sport, études, musique, hobbies, etc.). Le service permet de créer un profil, de découvrir d’autres utilisateurs, de former des équipes, d’échanger des messages et d’organiser des sessions.',
        'Jumelo n’est pas un service de rencontre amoureuse. Les fonctionnalités de matching visent exclusivement la recherche de partenaires d’activité et de collaboration.',
      ],
    },
    {
      title: '2. Accès et éligibilité',
      paragraphs: [
        'Le service est destiné aux personnes majeures, ou aux mineurs âgés d’au moins 16 ans disposant, le cas échéant, de l’autorisation de leur représentant légal lorsque le droit applicable l’exige.',
        'Vous devez fournir des informations exactes lors de l’inscription et maintenir à jour les données de votre profil. Un compte est personnel et non cessible.',
        'L’Éditeur peut refuser, suspendre ou résilier un compte en cas de non-respect des présentes CGU, de la charte communauté ou de la réglementation applicable.',
      ],
    },
    {
      title: '3. Compte utilisateur',
      paragraphs: [
        'Vous êtes responsable de la confidentialité de vos identifiants et de toute activité réalisée via votre compte. En cas d’accès non autorisé, contactez-nous sans délai à ' +
          LEGAL_CONTACT_EMAIL +
          '.',
        'Vous pouvez demander la suppression de votre compte depuis Paramètres → Mes données (RGPD), sous réserve des obligations légales de conservation.',
      ],
    },
    {
      title: '4. Contenu et comportement',
      paragraphs: [
        'Vous êtes seul responsable des contenus que vous publiez (photo, bio, messages, noms d’équipes, etc.). Ces contenus ne doivent pas être illicites, diffamatoires, haineux, harcelants, pornographiques, violents, trompeurs, ni porter atteinte aux droits de tiers.',
        'Vous vous engagez à respecter la charte communauté Jumelo et à utiliser le service de bonne foi, sans spam, usurpation d’identité, scraping, ni tentative de contourner les mesures de sécurité.',
      ],
    },
    {
      title: '5. Matching, messages et équipes',
      paragraphs: [
        'Les scores et suggestions de matching sont fournis à titre indicatif. L’Éditeur ne garantit pas la disponibilité, la fiabilité ou le comportement des autres utilisateurs.',
        'Les échanges entre utilisateurs relèvent de leur responsabilité. Jumelo peut, sans obligation de surveillance généralisée, modérer ou supprimer des contenus signalés ou manifestement illicites.',
      ],
    },
    {
      title: '6. Propriété intellectuelle',
      paragraphs: [
        'L’application, sa marque, ses logos, interfaces et contenus éditoriaux sont protégés. Toute reproduction non autorisée est interdite.',
        'Vous conservez vos droits sur les contenus que vous publiez et accordez à l’Éditeur une licence non exclusive, mondiale et gratuite, pour les héberger, afficher et diffuser dans le cadre du fonctionnement du service.',
      ],
    },
    {
      title: '7. Disponibilité et évolution',
      paragraphs: [
        'Jumelo est fourni « en l’état ». Des interruptions (maintenance, incidents, mises à jour) peuvent survenir. L’Éditeur peut modifier, suspendre ou faire évoluer des fonctionnalités, en informant les utilisateurs lorsque cela est raisonnablement possible.',
      ],
    },
    {
      title: '8. Responsabilité',
      paragraphs: [
        'Dans les limites autorisées par le droit applicable, l’Éditeur n’est pas responsable des dommages indirects, de la perte de données résultant d’un usage non conforme, ni des litiges entre utilisateurs.',
        'Rien dans les présentes n’exclut la responsabilité qui ne peut légalement être limitée (notamment en cas de faute lourde ou de dommage corporel).',
      ],
    },
    {
      title: '9. Données personnelles',
      paragraphs: [
        'Le traitement des données personnelles est décrit dans la Politique de confidentialité. En utilisant Jumelo, vous reconnaissez en avoir pris connaissance.',
      ],
    },
    {
      title: '10. Résiliation',
      paragraphs: [
        'Vous pouvez cesser d’utiliser le service et supprimer votre compte à tout moment. L’Éditeur peut suspendre ou résilier l’accès en cas de manquement grave ou répété aux CGU.',
      ],
    },
    {
      title: '11. Droit applicable et contact',
      paragraphs: [
        'Les présentes CGU sont régies par le droit français. En cas de litige, et à défaut de résolution amiable, les tribunaux compétents seront ceux déterminés par les règles de procédure applicables.',
        'Contact : ' + LEGAL_CONTACT_EMAIL + '.',
      ],
    },
  ],
};
