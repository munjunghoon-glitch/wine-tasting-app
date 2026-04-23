import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `당신은 세계 최고 수준의 와인 소믈리에입니다. 사용자의 테이스팅 데이터를 분석해 취향 프로필과 카테고리별 와인 추천을 제공합니다. 한국에서 구매 가능한 와인 위주로, 쉬운 언어로 설명하세요.`;

export async function POST(request: NextRequest) {
  console.log('=== AI 추천 API 호출 시작 ===');
  console.log('API Key 존재:', !!process.env.ANTHROPIC_API_KEY);

  try {
    const body = await request.json();
    const { wineName, wineType, tasting } = body;
    console.log('요청 데이터:', { wineName, wineType, feeling: tasting?.feeling });

    const flavors = Array.isArray(tasting?.flavors) ? tasting.flavors.join(', ') : '없음';

    const userPrompt = `와인: ${wineName} (${wineType})
향: ${flavors} | 산도: ${tasting?.acidity || '-'} | 바디: ${tasting?.body || '-'} | 탄닌: ${tasting?.tannin || '-'} | 기포: ${tasting?.bubble || '-'} | 느낌: ${tasting?.feeling}

아래 JSON 형식으로만 응답하세요. 백틱, 마크다운, 추가 텍스트 없이 순수 JSON만 출력하세요.

{
  "profile": {
    "persona": "이모지 포함 짧은 별명 (예: 🌿 허브 정원의 산책자)",
    "title": "취향을 한 문장으로",
    "aroma": "향 취향 설명 1문장",
    "structure": "구조감 취향 설명 1문장 (산도/바디/탄닌 기반)",
    "pairing": "어울리는 음식/상황 2가지 (쉼표로 구분)"
  },
  "recommendations": {
    "by_country": [
      {"name": "와인명", "country": "국가/지역", "grape": "품종", "price": "가격대", "reason": "추천 이유 1문장"},
      {"name": "", "country": "", "grape": "", "price": "", "reason": ""},
      {"name": "", "country": "", "grape": "", "price": "", "reason": ""}
    ],
    "by_grape": [
      {"name": "", "country": "", "grape": "", "price": "", "reason": ""},
      {"name": "", "country": "", "grape": "", "price": "", "reason": ""},
      {"name": "", "country": "", "grape": "", "price": "", "reason": ""}
    ],
    "by_producer": [
      {"name": "", "country": "", "producer": "", "price": "", "reason": ""},
      {"name": "", "country": "", "producer": "", "price": "", "reason": ""},
      {"name": "", "country": "", "producer": "", "price": "", "reason": ""}
    ],
    "by_price": [
      {"name": "", "country": "", "grape": "", "price": "3만원 이하 구체적 가격", "reason": ""},
      {"name": "", "country": "", "grape": "", "price": "3~6만원 구체적 가격", "reason": ""},
      {"name": "", "country": "", "grape": "", "price": "6만원 이상 구체적 가격", "reason": ""}
    ]
  }
}`;

    console.log('Claude API 호출 중...');

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    console.log('Claude API 응답 수신. stop_reason:', message.stop_reason);

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error(`예상치 못한 응답 타입: ${content.type}`);
    }

    const rawText = content.text;
    console.log('응답 텍스트 길이:', rawText.length);
    console.log('응답 앞 200자:', rawText.slice(0, 200));

    // 백틱/마크다운 제거 후 JSON 추출
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('JSON 매칭 실패. 정제된 텍스트:', cleaned.slice(0, 300));
      throw new Error('응답에서 JSON을 찾을 수 없습니다.');
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log('=== JSON 파싱 성공 ===');

    return NextResponse.json({ success: true, result });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('=== API 오류 ===', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
