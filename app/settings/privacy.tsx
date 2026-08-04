import { LegalDocumentView } from '../../src/components/LegalDocumentView';
import { privacyDocument } from '../../src/legal';

export default function PrivacyScreen() {
  return <LegalDocumentView document={privacyDocument} />;
}
