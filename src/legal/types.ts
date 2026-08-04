export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  id: string;
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
};
