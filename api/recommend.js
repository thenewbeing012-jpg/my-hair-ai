export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { face, styles, life, note } = req.body;

  const prompt = `당신은 전문 헤어스타일리스트 AI입니다.

고객 정보:
- 얼굴형: ${face || '모름'}
- 관심 스타일: ${styles?.join(', ') || '없음'}
- 라이프스타일: ${life || '없음'}
- 추가 요청: ${note || '없음'}

아래 JSON 형식으로만 응답하세요. 마크다운 없이 순수 JSON만:
{"face_tip":"얼굴형에 대한 한 줄 팁","top_styles":[{"name":"스타일명","reason":"추천 이유 한 문장"},{"name":"스타일명","reason":"추천 이유 한 문장"},{"name":"스타일명","reason":"추천 이유 한 문장"}],"caution":"주의할 점 한 문장","memo":"미용사에게 전달할 자연스러운 메모 2~3문장"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const text = (data.content || []).map(i => i.text || '').join('').trim();
    if (!text) throw new Error('응답이 비어있어요');

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json|```/g, '').trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error('JSON 파싱 실패: ' + text.slice(0, 200));
      }
    }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
