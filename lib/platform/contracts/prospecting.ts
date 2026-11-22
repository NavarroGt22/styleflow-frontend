export interface Prospect {
  sourceUrl: string;
  businessName: string;
  city: string;
  neighborhood: string;
  excerpt: string;
  website: string | null;
  instagram: string | null;
  whatsapp: string | null;
}
export interface ProspectSearch {
  items: Prospect[];
  page: number;
  hasMore: boolean;
  collectedAt: string;
  source: "brave_search";
}
