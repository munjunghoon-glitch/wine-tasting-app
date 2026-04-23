import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  console.log('=== AI 추천 API 호출 ===');

  try {
    const body = await request.json();
    const { wineName, wineType, tasting, profile } = body;
    console.log('요청:', { wineName, wineType });

    const flavors = Array.isArray(tasting?.flavors) ? tasting.flavors.join(', ') : '없음';

    // 1단계에서 만든 프로파일이 있으면 컨텍스트로 활용
    const profileContext = profile
      ? `[취향 프로파일]\n페르소나: ${profile.persona}\n취향: ${profile.title}\n\n`
      : '';

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: '당신은 세계 최고 수준의 와인 소믈리에입니다. 사용자 취향에 맞는 와인을 카테고리별로 추천합니다. 한국에서 구매 가능한 와인 위주로, 쉬운 언어로 설명하세요.',
      messages: [{
        role: 'user',
        content: `${profileContext}와인: ${wineName} (${wineType})
향: ${flavors} | 산도: ${tasting?.acidity || '-'} | 바디: ${tasting?.body || '-'} | 탄닌: ${tasting?.tannin || '-'} | 기포: ${tasting?.bubble || '-'} | 느낌: ${tasting?.feeling}

아래 JSON으로만 응답하세요. 백틱, 마크다운, 추가 텍스트 없이:
{
  "by_country": [
    {"name":"와인명","country":"국가/지역","grape":"품종","price":"가격대","reason":"추천 이유 1문장"},
    {"name":"","country":"","grape":"","price":"","reason":""},
    {"name":"","country":"","grape":"","price":"","reason":""}
  ],
  "by_grape": [
    {"name":"","country":"","grape":"","price":"","reason":""},
    {"name":"","country":"","grape":"","price":"","reason":""},
    {"name":"","country":"","grape":"","price":"","reason":""}
  ],
  "by_producer": [
    {"name":"","country":"","producer":"","price":"","reason":""},
    {"name":"","country":"","producer":"","price":"","reason":""},
    {"name":"","country":"","producer":"","price":"","reason":""}
  ],
  "by_price": [
    {"name":"","country":"","grape":"","price":"3만원 이하 구체적 가격","reason":""},
    {"name":"","country":"","grape":"","price":"3~6만원 구체적 가격","reason":""},
    {"name":"","country":"","grape":"","price":"6만원 이상 구체적 가격","reason":""}
  ]
}
각 카테고리 3개. by_price는 저렴한 순(3만원 이하 → 3~6만원 → 6만원 이상).`,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log('추천 응답 길이:', text.length);

    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON 파싱 실패: ' + cleaned.slice(0, 100));

    const recommendations = JSON.parse(match[0]);
    console.log('=== 추천 파싱 성공 ===');

    return NextResponse.json({ success: true, recommendations });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('=== 추천 API 오류 ===', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
