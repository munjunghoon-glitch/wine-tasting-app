import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { wineName, tasting } = await request.json();

    const prompt = `
당신은 와인 전문 소믈리에입니다.
사용자가 "${wineName}" 와인을 시음하고 아래와 같이 느꼈습니다.

[테이스팅 노트]
- 와인 타입: ${tasting.type}
- 느낀 향: ${tasting.flavors?.join(', ') || '없음'}
- 바디: ${tasting.body || '미입력'}
- 탄닌: ${tasting.tannin || '미입력'}
- 산도: ${tasting.acidity || '미입력'}
- 기포: ${tasting.bubble || '미입력'}
- 전체 느낌: ${tasting.feeling}

이 취향에 맞는 와인을 3가지 추천해주세요.
한국 와인 전문 쇼핑몰(와인앤모어, 이마트, GS25, 세븐일레븐)에서 실제 구매 가능한 와인 위주로 추천하세요.
반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

[
  {
    "name": "와인 전체 이름",
    "style": "스타일 한 줄 설명",
    "grape": "품종명",
    "country": "생산 국가 및 지역",
    "price": "예상 가격대 (예: 25,000원~35,000원)",
    "shopName": "추천 구매처",
    "description": "이 와인을 추천하는 이유 (취향과 연결해서, 2문장 이내)"
  }
]
`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // JSON 파싱
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('JSON not found in response');

    const recommendations = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      recommendations: recommendations.map((r: any) => ({
        ...r,
        source: 'ai' as const,
      })),
    });
  } catch (error) {
    console.error('AI recommend error:', error);
    return NextResponse.json(
      { success: false, error: 'AI 추천 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
