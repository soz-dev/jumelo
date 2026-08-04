import { LegalDocumentView } from '../../src/components/LegalDocumentView';
import { communityDocument } from '../../src/legal';

/** Alias lisible « Règles » — même contenu que la charte communauté. */
export default function RulesScreen() {
  return <LegalDocumentView document={communityDocument} />;
}
