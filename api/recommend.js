export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { face, styles, life, note } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // API 키 확인 (없으면 여기서 500 에러 발생)
    if (!apiKey) {
      console.error("Error: GEMINI_API_KEY is missing in Environment Variables.");
      return res.status(500).json({ error: "서버 설정 오류: API 키가 없습니다." });
    }

    const prompt = `당신은 전문 헤어스타일리스트 AI입니다. 다음 정보를 바탕으로 최적의 헤어스타일을 추천하세요:
    얼굴형: ${face || '모름'}, 스타일: ${styles?.join(', ') || '없음'}, 라이프스타일: ${life || '없음'}, 참고: ${note || '없음'}
    
    반드시 다음 구조의 JSON으로만 응답하세요:
    {"face_tip":"...","top_styles":[{"name":"...","reason":"..."}],"caution":"...","memo":"..."}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Gemini API Response Error:", data);
      return res.status(response.status).json({ error: "AI 서비스 응답 실패" });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    res.status(200).json(JSON.parse(text));

  } catch (err) {
    console.error("Server Runtime Error:", err.message);
    res.status(500).json({ error: "서버 내부 오류: " + err.message });
  }
}
