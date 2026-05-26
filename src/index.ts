import { Hono } from "hono";
import { cors } from "hono/cors";

interface Env {
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  APP_SECRET_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

// 1. 전역 CORS 미들웨어 적용
// 토스 미니앱은 로컬 파일 스키마 또는 다양한 웹뷰 서브도메인에서 호출되므로 모든 origin(*)의 요청을 허용합니다.
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-App-Secret-Key"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

// 2. 무단 도용 방지를 위한 X-App-Secret-Key 검증 미들웨어
// /api/health 및 OPTIONS 프리플라이트(Preflight) 요청은 검증을 제외합니다.
app.use("/api/*", async (c, next) => {
  if (c.req.method === "OPTIONS" || c.req.path === "/api/health") {
    return await next();
  }

  const clientSecret = c.req.header("X-App-Secret-Key");
  const serverSecret = c.env.APP_SECRET_KEY;

  // 서버에 APP_SECRET_KEY가 설정되어 있을 때만 대조 검증을 진행합니다.
  if (serverSecret && clientSecret !== serverSecret) {
    return c.json(
      { error: "인증 키가 올바르지 않습니다. 비인가된 접근입니다. 🐾" },
      401
    );
  }

  await next();
});

// 3. 헬스 체크 API (환경변수 설정 및 연결 확인용)
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    message: "토스 미니앱 공통 API 서버가 정상 동작 중입니다멍! 🐶",
    config: {
      hasGeminiKey: !!c.env.GEMINI_API_KEY,
      hasOpenaiKey: !!c.env.OPENAI_API_KEY,
      hasSecretKey: !!c.env.APP_SECRET_KEY,
    },
  });
});

// 4. 꿈해몽 API (/api/dream)
app.post("/api/dream", async (c) => {
  try {
    const { dream } = await c.req.json<{ dream?: string }>();

    if (!dream || !dream.trim()) {
      return c.json({ error: "꿈 내용을 입력해 주세요멍! 🐾" }, 400);
    }

    const geminiKey = c.env.GEMINI_API_KEY;
    const openaiKey = c.env.OPENAI_API_KEY;

    if (!geminiKey && !openaiKey) {
      return c.json({ error: "로컬 환경변수 또는 Cloudflare API 설정이 없습니다. 🐾" }, 500);
    }

    const systemPrompt = `너는 신비롭지만 친근하고 귀여운 골든 리트리버 마법사야.
사용자가 입력한 꿈 내용을 바탕으로 전통적인 사주명리/해몽 지식과 심리학적 의미를 결합해 아주 전문적이고 그럴듯한 해석을 해줘.
전문적이지만 말투는 다정하고 따뜻해야 해. "🐾", "✨" 같은 이모지를 적절히 쓰고, 희망적인 조언으로 마무리해 줘.
모바일 화면에서 읽기 좋게 너무 길지 않게 3~4문단으로 핵심만 요약해 줘.`;

    let interpretationText = "";

    if (geminiKey) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const apiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n사용자 꿈 내용: ${dream}` }] }],
        }),
      });

      if (!apiRes.ok) {
        const errData: any = await apiRes.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Gemini API 에러: ${apiRes.status}`);
      }

      const result: any = await apiRes.json();
      interpretationText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (openaiKey) {
      const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: dream },
          ],
        }),
      });

      if (!apiRes.ok) {
        const errData: any = await apiRes.json().catch(() => ({}));
        throw new Error(errData.error?.message || `OpenAI API 에러: ${apiRes.status}`);
      }

      const result: any = await apiRes.json();
      interpretationText = result.choices?.[0]?.message?.content || "";
    }

    return c.json({ interpretation: interpretationText });
  } catch (error: any) {
    console.error("Dream API Error:", error);
    return c.json({ error: error.message || "해몽 진행 중 오류가 발생했개... 🐾" }, 500);
  }
});

// 5. 타로 카드 운세 API (/api/tarot) - 미래 프로젝트용 확장 라우트
app.post("/api/tarot", async (c) => {
  try {
    const { question, cards } = await c.req.json<{ question?: string; cards?: string[] }>();

    if (!question || !question.trim()) {
      return c.json({ error: "알고 싶은 질문을 입력해 주세요멍! 🐾" }, 400);
    }

    const geminiKey = c.env.GEMINI_API_KEY;
    const openaiKey = c.env.OPENAI_API_KEY;

    if (!geminiKey && !openaiKey) {
      return c.json({ error: "API 키 설정이 없습니다. 🐾" }, 500);
    }

    const systemPrompt = `너는 신비로운 우주적 지혜를 품은 아기 고양이 타로 리더야.
사용자의 질문과 뽑은 타로 카드를 보고 직관적이고 따뜻하게 타로 리딩을 해줘.
말투는 다정하게 끝에 "냥", "🐾"을 적절히 섞고 이모지를 많이 써줘.
모바일 화면에서 읽기 좋게 너무 길지 않게 요약해줘.`;

    const cardInfo = cards && cards.length > 0 ? `뽑은 카드: ${cards.join(", ")}` : "카드를 무작위로 해석 중";
    const userPrompt = `질문: ${question}\n${cardInfo}`;

    let interpretationText = "";

    if (geminiKey) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const apiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        }),
      });

      if (!apiRes.ok) {
        const errData: any = await apiRes.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Gemini API 에러: ${apiRes.status}`);
      }

      const result: any = await apiRes.json();
      interpretationText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (openaiKey) {
      const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!apiRes.ok) {
        const errData: any = await apiRes.json().catch(() => ({}));
        throw new Error(errData.error?.message || `OpenAI API 에러: ${apiRes.status}`);
      }

      const result: any = await apiRes.json();
      interpretationText = result.choices?.[0]?.message?.content || "";
    }

    return c.json({ interpretation: interpretationText });
  } catch (error: any) {
    console.error("Tarot API Error:", error);
    return c.json({ error: error.message || "타로 리딩 중 오류가 발생했냥... 🐾" }, 500);
  }
});

// 6. 오늘의 종합 운세 API (/api/fortune) - 미래 프로젝트용 확장 라우트
app.post("/api/fortune", async (c) => {
  try {
    const { name, birthdate, birthtime, gender } = await c.req.json<{
      name?: string;
      birthdate?: string;
      birthtime?: string;
      gender?: string;
    }>();

    if (!birthdate || !name) {
      return c.json({ error: "이름과 생년월일을 정확히 입력해 주세요멍! 🐾" }, 400);
    }

    const geminiKey = c.env.GEMINI_API_KEY;
    const openaiKey = c.env.OPENAI_API_KEY;

    if (!geminiKey && !openaiKey) {
      return c.json({ error: "API 키 설정이 없습니다. 🐾" }, 500);
    }

    const systemPrompt = `너는 동양 전통 명리학을 마스터한 지혜로운 도사 거북이야.
사용자의 사주 정보(이름, 생년월일, 태어난 시간, 성별)를 분석해 오늘의 종합 운세를 재밌고 그럴듯하게 알려줘.
말투는 차분하고 정중하게 "허허", "🐢"를 쓰고, 하루를 활기차게 시작할 수 있는 조언으로 마무리해줘.`;

    const userPrompt = `이름: ${name}\n생년월일: ${birthdate}\n태어난 시간: ${birthtime || "모름"}\n성별: ${gender || "선택안함"}`;

    let interpretationText = "";

    if (geminiKey) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const apiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        }),
      });

      if (!apiRes.ok) {
        const errData: any = await apiRes.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Gemini API 에러: ${apiRes.status}`);
      }

      const result: any = await apiRes.json();
      interpretationText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (openaiKey) {
      const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!apiRes.ok) {
        const errData: any = await apiRes.json().catch(() => ({}));
        throw new Error(errData.error?.message || `OpenAI API 에러: ${apiRes.status}`);
      }

      const result: any = await apiRes.json();
      interpretationText = result.choices?.[0]?.message?.content || "";
    }

    return c.json({ interpretation: interpretationText });
  } catch (error: any) {
    console.error("Fortune API Error:", error);
    return c.json({ error: error.message || "운세 분석 중 오류가 발생했다네... 🐢" }, 500);
  }
});

export default app;
