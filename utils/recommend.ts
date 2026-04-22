// 룰 기반 추천: curatedRecs가 있으면 그대로 반환, 없으면 룰로 생성

import { TastingData, RecommendedWine, Wine } from './types';

export function getRecommendations(wine: Wine, tasting: TastingData): RecommendedWine[] {
  // 방법1: 관리자 등록 큐레이션 추천이 있으면 우선 사용
  if (wine.curatedRecs && wine.curatedRecs.length > 0) {
    return wine.curatedRecs.map(r => ({ ...r, source: 'curated' as const }));
  }

  // 방법1 fallback: 룰 기반 추천 (curatedRecs 없을 때)
  return getRuleBasedRecs(tasting);
}

function getRuleBasedRecs(tasting: TastingData): RecommendedWine[] {
  const { type, body, tannin, acidity, bubble } = tasting;

  if (type === 'champagne' || type === 'sparkling') {
    if (bubble === '섬세함' || acidity === '높음') {
      return [
        { style: '블랑 드 블랑 샴페인', grape: '샤르도네 100%', country: '프랑스 샹파뉴', price: '7~15만원', description: '섬세한 기포와 레몬, 미네랄. 우아함의 극치', source: 'curated' },
        { style: '크레망 달자스', grape: '피노 블랑', country: '프랑스 알자스', price: '2~4만원', description: '샴페인보다 합리적이지만 동급의 섬세함', source: 'curated' },
        { style: '프로세코 DOCG', grape: '글레라', country: '이탈리아 베네토', price: '2~3만원', description: '배, 사과의 과일향. 편하고 즐거운 버블', source: 'curated' },
      ];
    }
    return [
      { style: '논빈티지 샴페인', grape: '피노 누아 중심 블렌딩', country: '프랑스 샹파뉴', price: '6~10만원', description: '토스트, 과일, 균형의 클래식 스타일', source: 'curated' },
      { style: '카바 브루트', grape: '마카베오 / 파렐라다', country: '스페인 카탈루냐', price: '1~2만원', description: '가성비 최고의 스파클링. 사과, 레몬, 이스트', source: 'curated' },
      { style: '크레망 드 부르고뉴', grape: '피노 누아 / 샤르도네', country: '프랑스 부르고뉴', price: '3~5만원', description: '섬세한 기포와 붉은 과일향의 조화', source: 'curated' },
    ];
  }

  if (type === 'white') {
    if (acidity === '높음' && body === '가벼움') {
      return [
        { style: '소비뇽 블랑', grape: '소비뇽 블랑', country: '뉴질랜드 말버러', price: '2~4만원', description: '자몽, 패션프루트, 허브. 상큼함의 정점', source: 'curated' },
        { style: '알바리뇨', grape: '알바리뇨', country: '스페인 리아스 바이사스', price: '3~5만원', description: '복숭아, 살구, 짭조름한 미네랄. 해산물과 완벽', source: 'curated' },
        { style: '베르멘티노', grape: '베르멘티노', country: '이탈리아 사르데냐', price: '2~4만원', description: '레몬, 아몬드, 지중해 허브의 이탈리아 화이트', source: 'curated' },
      ];
    }
    if (body === '묵직함') {
      return [
        { style: '오크 샤르도네', grape: '샤르도네', country: '프랑스 부르고뉴 / 미국', price: '3~8만원', description: '버터, 바닐라, 황도. 크리미하고 풍부한 질감', source: 'curated' },
        { style: '비오니에', grape: '비오니에', country: '프랑스 론 밸리', price: '3~6만원', description: '살구, 복숭아꽃, 생강. 아로마틱 화이트의 왕', source: 'curated' },
        { style: '그르나슈 블랑', grape: '그르나슈 블랑', country: '프랑스 남부 론', price: '2~4만원', description: '흰 꽃, 멜론, 크리미한 질감. 론의 숨겨진 보석', source: 'curated' },
      ];
    }
    return [
      { style: '피노 그리지오', grape: '피노 그리지오', country: '이탈리아 알토 아디제', price: '2~3만원', description: '레몬, 사과, 아몬드. 가볍고 깔끔한 일상 화이트', source: 'curated' },
      { style: '무스카데', grape: '물롱 드 부르고뉴', country: '프랑스 루아르', price: '2~4만원', description: '미네랄, 레몬, 살짝 짭조름. 굴과 최고의 궁합', source: 'curated' },
      { style: '그뤼너 벨트리너', grape: '그뤼너 벨트리너', country: '오스트리아 바하우', price: '2~4만원', description: '화이트 페퍼, 라임, 미네랄. 다재다능한 오스트리아 화이트', source: 'curated' },
    ];
  }

  if (type === 'red') {
    if (tannin === '강함' && body === '묵직함') {
      return [
        { style: '카베르네 소비뇽', grape: '카베르네 소비뇽', country: '프랑스 보르도 / 미국', price: '3~10만원', description: '블랙커런트, 삼나무, 오크. 레드 와인의 왕', source: 'curated' },
        { style: '시라 / 쉬라즈', grape: '시라', country: '호주 바로사 / 프랑스 론', price: '2~6만원', description: '블루베리, 후추, 스모키. 강렬하고 파워풀', source: 'curated' },
        { style: '말벡', grape: '말벡', country: '아르헨티나 멘도사', price: '2~5만원', description: '자두, 다크 초콜릿, 부드러운 피니시. 가성비 최고', source: 'curated' },
      ];
    }
    if (tannin === '부드러움' || body === '가벼움') {
      return [
        { style: '피노 누아', grape: '피노 누아', country: '프랑스 부르고뉴 / 뉴질랜드', price: '3~10만원', description: '체리, 라즈베리, 흙내음. 섬세함과 우아함의 레드', source: 'curated' },
        { style: '가메이', grape: '가메이', country: '프랑스 보졸레', price: '1~3만원', description: '딸기, 바나나, 신선함. 가볍게 즐기는 보졸레', source: 'curated' },
        { style: '돌체토', grape: '돌체토', country: '이탈리아 피에몬테', price: '2~4만원', description: '체리, 아몬드, 낮은 산도. 피에몬테의 일상 레드', source: 'curated' },
      ];
    }
    return [
      { style: '산지오베제', grape: '산지오베제', country: '이탈리아 토스카나', price: '2~6만원', description: '체리, 토마토, 허브. 이탈리아 음식과 찰떡궁합', source: 'curated' },
      { style: '템프라니요', grape: '템프라니요', country: '스페인 리오하', price: '2~5만원', description: '딸기, 가죽, 바닐라. 스페인 레드의 클래식', source: 'curated' },
      { style: '멘시아', grape: '멘시아', country: '스페인 비에르소', price: '3~5만원', description: '붉은 과일, 미네랄, 가벼운 탄닌. 주목받는 스페인 품종', source: 'curated' },
    ];
  }

  return [];
}
