const Anthropic = require('@anthropic-ai/sdk');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const PROMPT = `당신은 따뜻하고 공감적인 미술치료 전문가입니다.
이 그림은 PPAT(사과나무에서 사과 따는 사람 그림검사) 그림으로, 어린이집 자녀를 키우는 엄마가 직접 그린 것입니다.

아래 관점에서 따뜻하고 비진단적인 언어로 분석해주세요.

**색채**: 어떤 색을 어떻게 사용했는지, 그 에너지가 어떻게 느껴지는지
**공간**: 도화지를 어떻게 활용했는지 (넓게/좁게/한쪽으로 등)
**사람**: 사과를 따는 사람의 자세와 행동에서 느껴지는 것
**나무와 사과**: 나무와 사과의 특징에서 읽히는 것
**전체 인상**: 그림 전체에서 느껴지는 에너지와 감정

반드시 지켜야 할 원칙:
- 진단하거나 단정 짓지 말 것
- "~일 수 있어요", "~처럼 보여요", "~느껴집니다" 같은 부드러운 표현 사용
- 분석 마지막에 "오늘 나에게 건네볼 수 있는 질문" 1~2개를 별도로 제안
- 전체 500~600자 내외 한국어로 작성`;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }),
    };
  }

  let imageBase64, mediaType;
  try {
    ({ imageBase64, mediaType } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: '요청 형식이 올바르지 않습니다.' }) };
  }

  if (!imageBase64 || !mediaType) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: '이미지 데이터가 없습니다.' }) };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ analysis: message.content[0].text }),
    };
  } catch (error) {
    console.error('Anthropic API error:', error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }),
    };
  }
};
