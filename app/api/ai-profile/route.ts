import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `당신은 미슐랭 3스타 레스토랑 출신의 와인 소믈리에입니다.
고객의 테이스팅 노트를 분석해 간결하고 품격 있는 취향 프로파일을 작성합니다.

[작성 원칙]
• 따뜻하고 품격 있는 톤, 세련된 한국어 표현 사용
• 와인 전문 용어는 1~2개만 자연스럽게 포함
• 시적이고 감각적이되 군더더기 없이 간결하게
• 각 필드는 지정된 분량을 엄수하세요`;

export async function POST(request: NextRequest) {
  console.log('=== AI 프로파일 API 호출 ===');
  console.log('API Key 존재:', !!process.env.ANTHROPIC_API_KEY);

  try {
    const body = await request.json();
    const { wineName, wineType, tasting } = body;
    console.log('요청:', { wineName, wineType, feeling: tasting?.feeling });

    const flavors = Array.isArray(tasting?.flavors) ? tasting.flavors.join(', ') : '없음';

    const userPrompt = `와인: ${wineName} (${wineType})
테이스팅: 향(${flavors}) | 산도(${tasting?.acidity || '-'}) | 바디(${tasting?.body || '-'}) | 탄닌(${tasting?.tannin || '-'}) | 기포(${tasting?.bubble || '-'}) | 전체 느낌(${tasting?.feeling})

위 테이스팅 데이터를 분석하여 아래 JSON 형식으로만 응답하세요.
백틱, 마크다운, 설명 텍스트 없이 순수 JSON만 출력하세요.

{
  "persona": "이모지 + 시적인 별명 (15자 내외). 예: 🍋 지중해 햇살의 미식가",

  "title": "이 취향의 본질을 담은 한 문장 (30자 내외). 예: 생동감 넘치는 산도로 순간을 포착하는 감각주의자",

  "aroma": "아로마 취향을 1문장으로 (80자 내외). 감지된 향의 계열·특성과 이 향에 끌리는 이유를 함께 담아 품격 있게",

  "structure": "구조감 취향을 1문장으로 (80자 내외). 산도·바디·탄닌(또는 기포)을 와인 용어 1~2개 포함해 간결하게",

  "pairing": "어울리는 음식+상황 3가지를 줄바꿈 없이 번호 없이 슬래시(/)로 구분해 나열. 각 항목 30자 내외. 예: 훈제 연어 카나페와 파티 / 굴과 해변 저녁 / 치즈와 조용한 오후"
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log('프로파일 응답 길이:', text.length);
    console.log('응답 앞 200자:', text.slice(0, 200));

    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON 파싱 실패: ' + cleaned.slice(0, 100));

    const profile = JSON.parse(match[0]);
    console.log('=== 프로파일 파싱 성공 ===');
    console.log('persona:', profile.persona);
    console.log('title:', profile.title);

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('=== 프로파일 API 오류 ===', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
