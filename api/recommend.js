export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { face, styles, life, note } = req.body;
  const prompt = `당신은 전문 헤어스타일리스트 AI입니다. 다음 정보를 바탕으로 최적의 헤어스타일을 추천하세요:
  - 얼굴형: ${face || '모름'}
  - 스타일: ${styles?.join(', ') || '없음'}
  - 라이프스타일: ${life || '없음'}
  - 참고사항: ${note || '없음'}
  
  반드시 다음 구조의 JSON으로만 응답하세요:
  {"face_tip":"...","top_styles":[{"name":"...","reason":"..."}],"caution":"...","memo":"..."}`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // 이 설정이 JSON 에러를 근본적으로 막아줍니다
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // 보조 파싱 로직
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { error: '파싱 실패', raw: text };
    }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
