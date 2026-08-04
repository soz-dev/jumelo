import type { LegalDocument } from './types';
import { LEGAL_CONTACT_EMAIL, LEGAL_DPO_EMAIL, LEGAL_VERSION } from './version';

export const privacyDocument: LegalDocument = {
  id: 'privacy',
  title: 'Politique de confidentialité',
  lastUpdated: LEGAL_VERSION,
  intro:
    'La présente Politique de confidentialité décrit comment [Nom de l’éditeur] (« nous ») traite les données personnelles des utilisateurs de l’application Jumelo, conformément au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés. Elle s’applique à l’usage de Jumelo en France et dans l’Espace économique européen.',
  sections: [
    {
      title: '1. Responsable de traitement',
      paragraphs: [
        'Responsable de traitement : [Nom de l’éditeur], [forme juridique / SIRET à compléter], siège : [Adresse du siège].',
        'Contact vie privée / DPO (ou référent) : ' +
          LEGAL_DPO_EMAIL +
          ' — contact général : ' +
          LEGAL_CONTACT_EMAIL +
          '.',
      ],
    },
    {
      title: '2. Données collectées',
      paragraphs: [
        'Compte : adresse e-mail, identifiant technique, mot de passe (haché par le prestataire d’authentification), éventuellement données d’identité fournies via un fournisseur tiers (Apple, Google) si vous choisissez cette connexion.',
        'Profil : prénom ou pseudo, photo, ville, bio, univers/intérêts, niveau, vibe, disponibilités, objectifs, langues, score de fiabilité, préférences d’affichage (thème).',
        'Matching et interactions : likes, matches, scores de compatibilité calculés, invitations, appartenances à des équipes.',
        'Messages : contenu des conversations privées ou d’équipe, métadonnées techniques (horodatage, participants).',
        'Équipes : nom, description, membres, demandes d’adhésion.',
        'Données techniques : journaux applicatifs, identifiants de session, préférences locales (AsyncStorage), consentements (CGU, marketing), version de l’application et informations de device nécessaires au fonctionnement.',
        'Analytics (si activées) : statistiques d’usage agrégées ou pseudonymisées (écrans visités, événements produit). Aucun bandeau « cookies web » n’est affiché ; voir la note Traceurs & stockage local.',
      ],
    },
    {
      title: '3. Finalités et bases légales',
      paragraphs: [
        'Fourniture du service (création de compte, profil, matching, messages, équipes) — base : exécution du contrat (art. 6.1.b RGPD).',
        'Sécurité, prévention des abus, modération — bases : intérêt légitime et/ou obligation légale (art. 6.1.f et 6.1.c).',
        'Amélioration du produit et statistiques d’usage — base : intérêt légitime, ou consentement lorsque requis.',
        'Communications marketing (e-mails promotionnels) — base : consentement (art. 6.1.a), révocable à tout moment dans Paramètres → Consentements.',
        'Respect des obligations légales (comptabilité, réponses aux autorités) — base : obligation légale.',
      ],
    },
    {
      title: '4. Destinataires et sous-traitants',
      paragraphs: [
        'Vos données sont accessibles aux personnes habilitées de l’Éditeur et aux prestataires agissant en sous-traitance pour l’hébergement et le fonctionnement du service.',
        'Hébergeur / infrastructure backend : Supabase (Postgres, Auth, stockage éventuel), agissant en qualité de sous-traitant. L’infrastructure peut être localisée dans l’UE ou, selon configuration du projet, dans d’autres régions — à vérifier et documenter dans le contrat de sous-traitance.',
        'Fournisseurs d’identité (Apple, Google) si vous utilisez la connexion sociale — selon leurs conditions propres.',
        'Aucune vente de données personnelles à des tiers à des fins commerciales.',
      ],
    },
    {
      title: '5. Transferts hors UE',
      paragraphs: [
        'Si des données sont transférées hors de l’Espace économique européen, nous mettons en place des garanties appropriées (décision d’adéquation, clauses contractuelles types, mesures complémentaires) conformément au RGPD. Complétez ici la région exacte de votre projet Supabase et tout autre prestataire.',
      ],
    },
    {
      title: '6. Durées de conservation',
      paragraphs: [
        'Compte et profil actifs : pendant la durée d’utilisation du service, puis suppression ou anonymisation sous un délai raisonnable après demande de suppression (objectif : 30 jours, sauf obligation légale contraire).',
        'Messages et données d’équipes : conservés tant que le compte existe ou que la conversation/équipe est active ; suppression liée à la suppression du compte, sous réserve d’archives techniques temporaires.',
        'Journaux techniques : durée limitée nécessaire à la sécurité et au diagnostic (souvent quelques semaines à quelques mois).',
        'Preuves de consentement (CGU / marketing) : conservées pendant la durée nécessaire pour démontrer le respect de nos obligations.',
      ],
    },
    {
      title: '7. Vos droits',
      paragraphs: [
        'Conformément au RGPD, vous disposez des droits suivants : accès, rectification, effacement, portabilité, opposition, limitation du traitement, et retrait du consentement lorsque le traitement est fondé sur celui-ci.',
        'Vous pouvez exercer certains droits directement dans l’application (Paramètres → Mes données) : export JSON de votre profil et préférences, suppression de compte, consultation de cette politique.',
        'Pour toute demande : ' +
          LEGAL_DPO_EMAIL +
          ' ou ' +
          LEGAL_CONTACT_EMAIL +
          '. Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).',
      ],
    },
    {
      title: '8. Sécurité',
      paragraphs: [
        'Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables (authentification, contrôle d’accès, chiffrement en transit via HTTPS, politiques RLS côté base lorsque configurées). Aucun système n’étant infaillible, nous vous invitons à utiliser un mot de passe robuste et unique.',
      ],
    },
    {
      title: '9. Mineurs',
      paragraphs: [
        'Jumelo s’adresse aux utilisateurs âgés d’au moins 16 ans (voir CGU et charte communauté). Si vous estimez qu’un compte a été créé en violation de cette règle, contactez-nous pour suppression.',
      ],
    },
    {
      title: '10. Modifications',
      paragraphs: [
        'Nous pouvons mettre à jour cette politique. La version en vigueur est indiquée par la date / version ' +
          LEGAL_VERSION +
          '. En cas de changement substantiel, une nouvelle acceptation pourra vous être demandée dans l’application.',
      ],
    },
  ],
};
