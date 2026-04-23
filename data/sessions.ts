// ✅ 강의 전날 이 파일만 수정하면 됩니다

import { Session } from '@/utils/types';

export const SESSIONS: Record<string, Session> = {

  // ─── 기본 세션 ───────────────────────────────────────────────
  default: {
    sessionId: 'default',
    title: '와인 테이스팅 클래스',
    wineList: [
      {
        id: 1,
        name: 'Piper-Heidsieck Brut',
        type: 'champagne',
        country: '🇫🇷 프랑스',
        grape: '샤르도네 / 피노 누아',
        desc: '빵, 토스트, 크리미한 버블',
      },
      {
        id: 2,
        name: 'Cloudy Bay Sauvignon Blanc',
        type: 'white',
        country: '🇳🇿 뉴질랜드',
        grape: '소비뇽 블랑',
        desc: '자몽, 패션프루트, 허브',
      },
      {
        id: 3,
        name: 'Kendall-Jackson Cabernet Sauvignon',
        type: 'red',
        country: '🇺🇸 미국',
        grape: '카베르네 소비뇽',
        desc: '블랙커런트, 삼나무, 오크',
      },
    ],
  },

  // ─── 4월 24일 강의 세션 ────────────────────────────────────────
  wine_class_0424: {
    sessionId: 'wine_class_0424',
    title: '4월 24일 와인 클래스',
    wineList: [
      {
        id: 1,
        name: 'Piper-Heidsieck Brut',
        type: 'champagne',
        country: '🇫🇷 프랑스',
        grape: '샤르도네 / 피노 누아',
        desc: '빵, 토스트, 크리미한 버블',
      },
      {
        id: 2,
        name: 'Bohigas Cava',
        type: 'sparkling',
        country: '🇪🇸 스페인',
        grape: '마카베오 / 파렐라다',
        desc: '사과, 레몬, 가벼운 이스트',
      },
      {
        id: 3,
        name: '르블랑 크레망',
        type: 'sparkling',
        country: '🇫🇷 프랑스',
        grape: '슈냉 블랑',
        desc: '배, 흰 꽃, 섬세한 기포',
      },
      {
        id: 4,
        name: 'Cloudy Bay Sauvignon Blanc',
        type: 'white',
        country: '🇳🇿 뉴질랜드',
        grape: '소비뇽 블랑',
        desc: '자몽, 패션프루트, 허브',
      },
      {
        id: 5,
        name: 'Kendall-Jackson Chardonnay',
        type: 'white',
        country: '🇺🇸 미국',
        grape: '샤르도네',
        desc: '복숭아, 바닐라, 버터리',
      },
      {
        id: 6,
        name: 'Kendall-Jackson Cabernet Sauvignon',
        type: 'red',
        country: '🇺🇸 미국',
        grape: '카베르네 소비뇽',
        desc: '블랙커런트, 삼나무, 오크',
      },
    ],
  },
};

// URL 파라미터로 세션 조회 (없으면 default)
export function getSession(sessionId?: string) {
  if (!sessionId) return SESSIONS['default'];
  return SESSIONS[sessionId] ?? SESSIONS['default'];
}
