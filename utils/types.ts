export type WineType = 'champagne' | 'sparkling' | 'white' | 'red';

export interface Wine {
  id: number;
  name: string;
  type: WineType;
  country: string;
  grape: string;
  desc: string;
}

export interface Session {
  sessionId: string;
  title: string;
  wineList: Wine[];
}

export interface TastingData {
  type: WineType;
  flavors: string[];
  bubble?: string;
  finish?: string;
  acidity?: string;
  body?: string;
  tannin?: string;
  feeling: string;
  isCustomWine?: boolean;
  customWineName?: string;
}

export interface WineProfile {
  title: string;
  aroma: string;
  structure: string;
  pairing: string;
  persona: string;
}

export interface WineRecommendItem {
  name: string;
  country: string;
  grape?: string;
  producer?: string;
  price: string;
  reason: string;
}

export interface WineRecommendations {
  by_country: WineRecommendItem[];
  by_grape: WineRecommendItem[];
  by_producer: WineRecommendItem[];
  by_price: WineRecommendItem[];
}

export interface AIAnalysisResult {
  profile: WineProfile;
  recommendations: WineRecommendations;
}
