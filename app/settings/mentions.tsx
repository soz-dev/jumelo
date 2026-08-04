import { LegalDocumentView } from '../../src/components/LegalDocumentView';
import { mentionsDocument } from '../../src/legal';

export default function MentionsScreen() {
  return <LegalDocumentView document={mentionsDocument} />;
}
