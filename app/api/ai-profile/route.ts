import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  console.log('=== AI 프로파일 API 호출 ===');
  console.log('API Key 존재:', !!process.env.ANTHROPIC_API_KEY);

  try {
    const body = await request.json();
    const { wineName, wineType, tasting } = body;
    console.log('요청:', { wineName, wineType, feeling: tasting?.feeling });

    const flavors = Array.isArray(tasting?.flavors) ? tasting.flavors.join(', ') : '없음';

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: '당신은 세계 최고 수준의 와인 소믈리에입니다. 사용자의 테이스팅 경험을 분석해 취향 프로파일을 간결하게 제공합니다.',
      messages: [{
        role: 'user',
        content: `와인: ${wineName} (${wineType})
향: ${flavors} | 산도: ${tasting?.acidity || '-'} | 바디: ${tasting?.body || '-'} | 탄닌: ${tasting?.tannin || '-'} | 기포: ${tasting?.bubble || '-'} | 느낌: ${tasting?.feeling}

아래 JSON으로만 응답하세요. 백틱, 마크다운, 추가 텍스트 없이:
{"persona":"이모지 포함 짧은 별명","title":"취향 한 문장","aroma":"향 취향 1문장","structure":"구조감 취향 1문장","pairing":"어울리는 상황 2가지 (쉼표 구분)"}`,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log('프로파일 응답 길이:', text.length);
    console.log('응답 앞 150자:', text.slice(0, 150));

    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON 파싱 실패: ' + cleaned.slice(0, 100));

    const profile = JSON.parse(match[0]);
    console.log('=== 프로파일 파싱 성공 ===');

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('=== 프로파일 API 오류 ===', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
