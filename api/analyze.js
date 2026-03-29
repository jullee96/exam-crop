export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const { image, width, height, mediaType } = req.body;

    if (!image || !width || !height) {
      return res.status(400).json({ error: "Missing image, width, or height" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: image,
                },
              },
              {
                type: "text",
                text: `이 시험지 이미지를 분석하여 각 문제(문항)의 영역을 찾아주세요.

이미지 크기: ${width} x ${height} 픽셀

각 문제의 경계를 픽셀 좌표로 반환하세요. 문제의 본문, 보기(선택지), 수식, 그림 등을 모두 포함하는 영역이어야 합니다.
문제 번호가 보이면 해당 번호를 사용하고, 보이지 않으면 순서대로 번호를 매기세요.

반드시 아래 JSON 형식만 출력하세요. 다른 텍스트는 포함하지 마세요:

[
  { "num": 1, "x": 좌상단X, "y": 좌상단Y, "w": 너비, "h": 높이 },
  { "num": 2, "x": 좌상단X, "y": 좌상단Y, "w": 너비, "h": 높이 }
]

주의사항:
- 좌표는 반드시 0 이상, 이미지 크기 이내여야 합니다
- 각 문제 영역은 약간의 여백(padding)을 포함하세요
- 시험지 제목/헤더 영역은 포함하지 마세요
- 문제 사이 풀이 메모가 있다면 해당 문제 영역에 포함하세요
- 2단(컬럼) 레이아웃이면 왼쪽 컬럼 → 오른쪽 컬럼 순서로 처리하세요`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return res.status(response.status).json({ error: "API request failed", detail: errText });
    }

    const data = await response.json();
    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Parse JSON from response (handle markdown fences)
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const regions = JSON.parse(cleaned);

    // Validate & clamp coordinates
    const validated = regions
      .filter((r) => r && typeof r.x === "number" && typeof r.y === "number")
      .map((r) => ({
        num: r.num || 1,
        x: Math.max(0, Math.min(Math.round(r.x), width)),
        y: Math.max(0, Math.min(Math.round(r.y), height)),
        w: Math.max(20, Math.min(Math.round(r.w), width - r.x)),
        h: Math.max(20, Math.min(Math.round(r.h), height - r.y)),
      }));

    return res.status(200).json({ regions: validated });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}
