import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `당신은 파리의 미슐랭 3스타 레스토랑에서 20년 경력을 쌓은 세계 최고 수준의 와인 소믈리에입니다.
고객의 테이스팅 노트를 분석해 그들만의 고유한 와인 취향 프로파일을 작성합니다.

[작성 원칙]
• 소믈리에가 고객에게 직접 대화하듯 따뜻하고 품격 있는 톤으로 작성하세요
• 고급 와인 레스토랑 수준의 세련된 한국어 표현을 사용하세요
• 테루아, 미네랄리티, 아로마, 부케, 피니시, 탄닌의 실크감 등 와인 전문 용어를 자연스럽게 녹여내세요
• 사용자가 자신의 취향을 새롭게 발견하고 감동받는 경험을 선사하세요
• 시적이고 감각적인 묘사로 와인 경험의 깊이를 표현하세요
• 각 필드는 지정된 분량을 반드시 채워 풍부하게 서술하세요`;

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
  "persona": "이모지 + 시적이고 구체적인 별명 (20자 내외). 단순한 형용사 나열이 아닌, 한 편의 시처럼 이 취향을 표현하세요. 예: 🍋 햇살 가득한 지중해 테라스의 미식가",

  "title": "이 취향의 본질을 담은 풍부하고 감각적인 한 문장 (50자 내외). 와인을 통해 추구하는 감성과 경험의 핵심을 포착하세요. 예: 생동감 넘치는 산도 속에서 와인의 순수한 테루아를 음미하는 섬세한 감각의 소유자",

  "aroma": "3문장으로 서술 (총 150자 내외). 첫 문장: 감지된 아로마의 계열과 특성(시트러스·과일·플로럴·허브·미네랄 등)을 전문적으로 묘사. 둘째 문장: 이 향에 끌리는 취향적 이유와 심리적 연결. 셋째 문장: 이 아로마를 통해 원하는 감각적·감성적 경험",

  "structure": "3문장으로 서술 (총 150자 내외). 첫 문장: 산도·바디·탄닌(또는 기포) 각 요소를 와인 전문 용어로 정밀 분석. 둘째 문장: 이 구조가 만들어내는 전체적인 와인 스타일과 개성 해석. 셋째 문장: 이 구조적 취향이 궁극적으로 추구하는 음용 경험",

  "pairing": "3가지 각각 한 문장 (총 200자 내외). 단순 나열이 아닌, 각각: 어울리는 음식의 구체적 묘사 + 이상적인 장소와 상황 + 그 순간의 분위기와 감성까지 풍부하게 묘사하세요"
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
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
