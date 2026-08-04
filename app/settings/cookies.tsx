import { LegalDocumentView } from '../../src/components/LegalDocumentView';
import { cookiesDocument } from '../../src/legal';

export default function CookiesScreen() {
  return <LegalDocumentView document={cookiesDocument} />;
}
