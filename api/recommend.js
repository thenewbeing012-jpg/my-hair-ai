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
  
  반드시 다음 구조의 JSON으로만 응답하세요. 인사말이나 마크다운 기호 없이 오직 JSON만 출력하세요:
  {"face_tip":"...","top_styles":[{"name":"...","reason":"..."}],"caution":"...","memo":"..."}`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    const data = await response.json();
    // 안전하게 텍스트 추출
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let parsed;
    try {
      // 1. 깨끗한 JSON 파싱 시도
      parsed = JSON.parse(rawText);
    } catch (e) {
      // 2. 실패 시 중괄호 추출 시도
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("유효한 응답 형식이 아닙니다.");
      }
    }

    res.status(200).json(parsed);
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: err.message });
  }
}
