import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `당신은 세계 최고 수준의 와인 소믈리에입니다.
사용자의 테이스팅 경험을 바탕으로 두 가지를 제공합니다:

1. 심층 취향 분석 (페르소나 부여)
2. 카테고리별 구조화된 와인 추천

추천 와인은 한국에서 실제 구매 가능한 와인 위주로,
초보자도 이해하기 쉬운 언어로 설명해주세요.`;

export async function POST(request: NextRequest) {
  try {
    const { wineName, wineType, tasting } = await request.json();

    const userPrompt = `와인: ${wineName} (${wineType})

[테이스팅 노트]
- 향: ${(tasting.flavors ?? []).join(', ') || '없음'}
- 산도: ${tasting.acidity || '미입력'}
- 바디: ${tasting.body || '미입력'}
- 탄닌: ${tasting.tannin || '미입력'}
- 기포: ${tasting.bubble || '미입력'}
- 전체 느낌: ${tasting.feeling}

위 테이스팅 데이터를 분석하여 아래 JSON 형식으로만 응답하세요.
다른 텍스트, 마크다운, 백틱은 절대 포함하지 마세요.

{
  "profile": {
    "title": "취향을 한 문장으로 표현 (예: 산도를 즐기는 섬세한 미각의 소유자)",
    "aroma": "향 취향 설명 (2문장, 구체적으로)",
    "structure": "구조감 취향 설명 (2문장, 산도/바디/탄닌 분석)",
    "pairing": "어울리는 음식/상황 (구체적으로 3가지)",
    "persona": "이 취향의 와인 페르소나 별명 (예: 🌿 허브 정원의 산책자)"
  },
  "recommendations": {
    "by_country": [
      {
        "name": "와인 전체 이름",
        "country": "생산 국가 및 지역",
        "grape": "품종",
        "price": "예상 가격대",
        "reason": "이 나라/지역 와인을 추천하는 이유 (취향과 연결, 2문장)"
      }
    ],
    "by_grape": [
      {
        "name": "와인 전체 이름",
        "country": "생산 국가",
        "grape": "품종",
        "price": "예상 가격대",
        "reason": "이 품종을 추천하는 이유 (품종 특성과 취향 연결, 2문장)"
      }
    ],
    "by_producer": [
      {
        "name": "와인 전체 이름",
        "country": "생산 국가",
        "producer": "생산자/와이너리",
        "price": "예상 가격대",
        "reason": "이 생산자를 추천하는 이유 (생산자 철학과 취향 연결, 2문장)"
      }
    ],
    "by_price": [
      {
        "name": "와인 전체 이름",
        "country": "생산 국가",
        "grape": "품종",
        "price": "구체적 가격 (예: 18,000원)",
        "reason": "가성비 측면에서 추천 이유 (2문장)"
      }
    ]
  }
}

각 카테고리마다 3개씩 추천해줘.
by_price는 저렴한 순(3만원 이하 → 3~6만원 → 6만원 이상)으로 구성해줘.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const cleaned = content.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON not found in response');

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('AI recommend error:', error);
    return NextResponse.json(
      { success: false, error: 'AI 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
