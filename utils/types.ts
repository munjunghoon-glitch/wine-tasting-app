export type WineType = 'champagne' | 'sparkling' | 'white' | 'red';

export interface Wine {
  id: number;
  name: string;
  type: WineType;
  country: string;
  grape: string;
  desc: string;
  // 관리자 등록 추천 와인 (방법1)
  curatedRecs?: CuratedWine[];
}

export interface CuratedWine {
  name: string;
  type: WineType;
  grape: string;
  country: string;
  style: string;
  price: string;
  shopName: string;       // 판매처 이름 (예: 와인앤모어, 이마트)
  shopUrl?: string;       // 구매 링크 (선택)
  description: string;
}

export interface Session {
  sessionId: string;
  title: string;
  subtitle: string;
  wineList: Wine[];
}

export interface TastingData {
  type: WineType;
  flavors: string[];
  // 샴페인/스파클링
  bubble?: string;
  finish?: string;
  // 화이트/레드 공통
  acidity?: string;
  body?: string;
  // 레드 전용
  tannin?: string;
  // 공통
  feeling: string;
  // 기타 입력 여부
  isCustomWine?: boolean;
  customWineName?: string;
}

export interface RecommendedWine {
  name?: string;
  style: string;
  grape: string;
  country: string;
  price: string;
  shopName?: string;
  shopUrl?: string;
  description: string;
  source: 'curated' | 'ai';  // 출처 표시용
}
