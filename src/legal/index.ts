export { LEGAL_CONTACT_EMAIL, LEGAL_DPO_EMAIL, LEGAL_VERSION } from './version';
export type { LegalDocument, LegalSection } from './types';
export { cguDocument } from './cgu';
export { privacyDocument } from './privacy';
export { mentionsDocument } from './mentions';
export { communityDocument } from './community';
export { cookiesDocument } from './cookies';
export {
  acceptLegal,
  clearLegalAcceptance,
  getLegalAcceptance,
  getMarketingConsent,
  getNotifPrefs,
  hasAcceptedCurrentLegal,
  setMarketingConsent,
  setNotifPrefs,
  wipeJumeloLocalStorage,
  type NotifPrefs,
} from './storage';

import { communityDocument } from './community';
import { cookiesDocument } from './cookies';
import { cguDocument } from './cgu';
import { mentionsDocument } from './mentions';
import { privacyDocument } from './privacy';
import type { LegalDocument } from './types';

export const legalDocuments: Record<string, LegalDocument> = {
  cgu: cguDocument,
  privacy: privacyDocument,
  mentions: mentionsDocument,
  community: communityDocument,
  cookies: cookiesDocument,
};
