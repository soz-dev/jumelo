import { LegalDocumentView } from '../../src/components/LegalDocumentView';
import { communityDocument } from '../../src/legal';

export default function CommunityScreen() {
  return <LegalDocumentView document={communityDocument} />;
}
