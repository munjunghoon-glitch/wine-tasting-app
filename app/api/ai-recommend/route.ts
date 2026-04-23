import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

// Route segment config: 60초 타임아웃
export const maxDuration = 60;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `당신은 세계 최고 수준의 와인 소믈리에입니다. 사용자의 테이스팅 데이터를 분석해 취향 프로필과 카테고리별 와인 추천을 제공합니다. 한국에서 구매 가능한 와인 위주로, 쉬운 언어로 설명하세요.`;

export async function POST(request: NextRequest) {
  const { wineName, wineType, tasting } = await request.json();

  console.log('API 호출 시작', { wineName, wineType });
  console.log('API Key 존재:', !!process.env.ANTHROPIC_API_KEY);

  const flavors = (tasting.flavors ?? []).join(', ') || '없음';

  const userPrompt = `와인: ${wineName} (${wineType})
향: ${flavors} | 산도: ${tasting.acidity || '-'} | 바디: ${tasting.body || '-'} | 탄닌: ${tasting.tannin || '-'} | 기포: ${tasting.bubble || '-'} | 느낌: ${tasting.feeling}

아래 JSON 형식으로만 응답하세요. 다른 텍스트, 마크다운, 백틱 없이:
{
  "profile": {
    "persona": "이모지 포함 짧은 별명 (예: 🌿 허브 정원의 산책자)",
    "title": "취향 한 문장",
    "aroma": "향 취향 1문장",
    "structure": "구조감 취향 1문장 (산도/바디/탄닌 분석)",
    "pairing": "어울리는 음식/상황 2가지 (쉼표로 구분)"
  },
  "recommendations": {
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
      {"name":"","country":"","grape":"","price":"구체적 가격(원)","reason":""},
      {"name":"","country":"","grape":"","price":"","reason":""},
      {"name":"","country":"","grape":"","price":"","reason":""}
    ]
  }
}
by_price는 저렴한 순(3만원 이하→3~6만원→6만원 이상)으로 구성하세요.`;

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (error) {
        console.error('Stream error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
