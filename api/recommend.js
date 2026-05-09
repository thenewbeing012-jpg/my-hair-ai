export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { face, styles, life, note } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API 키가 설정되지 않았습니다. Vercel 설정을 확인하세요." });
    }

    const prompt = `당신은 전문 헤어스타일리스트 AI입니다. 다음 구조의 JSON으로만 응답하세요:
    {"face_tip":"...","top_styles":[{"name":"...","reason":"..."}],"caution":"...","memo":"..."}
    사용자 정보: 얼굴형 ${face}, 선호스타일 ${styles?.join(', ')}, 라이프스타일 ${life}, 메모 ${note}`;

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
      console.error("Gemini API Error:", data);
      return res.status(response.status).json({ error: "AI 서비스 응답 오류" });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    res.status(200).json(JSON.parse(text));

  } catch (err) {
    console.error("Server Error:", err.message);
    res.status(500).json({ error: "서버 내부 오류: " + err.message });
  }
}
