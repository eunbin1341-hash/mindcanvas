const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const PROMPT = `PPAT 미술치료사로서 아래 6개 항목을 모두 작성하라. 인사말·감정표현 금지. 항목별 2~3문장. 특수기호(*#) 금지.

[색채] 색 사용이 감정 상태·에너지에 대해 시사하는 심리적 의미
[공간 활용] 그림 위치·크기가 자아감·심리적 여유에 대해 시사하는 의미
[사람의 행동] 자세·행동 방식이 목표 대처 태도에 대해 시사하는 의미
[나무와 사과] 나무·사과 특징이 심리적 기반·목표 의식에 대해 시사하는 의미
[전체 심리 상태] 위 항목 종합한 현재 심리 상태 해석
[오늘 나에게 건네볼 수 있는 질문] 자기 성찰 질문 2개

규칙: 진단·단정 금지 / "~일 수 있어요" "~처럼 보여요" 등 부드러운 표현 사용 / 항목 사이 빈 줄`;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mediaType,
                  data: imageBase64,
                },
              },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', JSON.stringify(data));
      throw new Error(data.error?.message || 'Gemini API 오류');
    }

    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!analysis) throw new Error('분석 결과를 가져올 수 없습니다.');

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ analysis }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }),
    };
  }
};
