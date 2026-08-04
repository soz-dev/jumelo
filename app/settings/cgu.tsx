import { LegalDocumentView } from '../../src/components/LegalDocumentView';
import { cguDocument } from '../../src/legal';

export default function CguScreen() {
  return <LegalDocumentView document={cguDocument} />;
}
