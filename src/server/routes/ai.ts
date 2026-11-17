import { Router, Request, Response } from "express";

const router = Router();

// Fast, token-efficient system instruction
const SYSTEM_PROMPT = `You are an ultra-fast copy editor for SharePaste.
Quickly polish this content:
1. Fix typos, spelling, and grammar errors.
2. Rephrase clunky sentences to read clearly and smoothly.
3. Organize into clean HTML paragraphs (<p>), headings (<h2>, <h3>), or lists (<ul>, <ol>).
4. PRESERVE all LaTeX math ($...$, $$...$$), code blocks (<pre><code>), images, tables, and embeds untouched!
5. Output ONLY raw HTML. No conversational remarks, greetings, or markdown code fences (\`\`\`html).`;

// Active models to try in order of capability & speed
const CANDIDATE_MODELS = [
  { version: "v1beta", model: "gemini-3.8-flash" },
  { version: "v1beta", model: "gemini-3.8-flash-latest" },
  { version: "v1beta", model: "gemini-3.0-flash" },
  { version: "v1beta", model: "gemini-2.5-flash" },
  { version: "v1beta", model: "gemini-2.0-flash" },
  { version: "v1beta", model: "gemini-1.5-flash-latest" },
  { version: "v1beta", model: "gemini-1.5-flash" }
];

// In-memory cache of the verified working model (defaults to gemini-3.8-flash for instant 1-roundtrip response)
let cachedWorkingModel: { version: string; model: string } | null = {
  version: "v1beta",
  model: "gemini-3.8-flash"
};

function isExplicitKeyAuthError(data: any): boolean {
  const msg = (data?.error?.message || "").toLowerCase();
  return (
    msg.includes("api_key_invalid") ||
    msg.includes("api key not valid") ||
    msg.includes("invalid api key") ||
    msg.includes("permission denied") ||
    msg.includes("unauthenticated")
  );
}

async function callGeminiGenerate(
  apiKey: string,
  version: string,
  modelName: string,
  prompt: string
): Promise<{ ok: boolean; status: number; text?: string; data?: any }> {
  const cleanModel = modelName.replace(/^models\//, "");
  const url = `https://generativelanguage.googleapis.com/${version}/models/${cleanModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

  // Use low thinking level on Gemini 3.x Flash to eliminate reasoning latency
  const isGemini3 = cleanModel.includes("3.8") || cleanModel.includes("3.0") || cleanModel.includes("3.");
  const thinkingConfig = isGemini3
    ? { thinkingConfig: { thinkingLevel: "low" } }
    : {};

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      ...thinkingConfig
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    const data = (await response.json()) as any;

    if (response.ok) {
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return { ok: true, status: response.status, text: rawText, data };
    }

    // If thinkingConfig is rejected by a model, retry once without thinkingConfig
    if (response.status === 400 && data?.error?.message?.includes("thinking")) {
      const fallbackResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
        })
      });
      const fallbackData = (await fallbackResponse.json()) as any;
      if (fallbackResponse.ok) {
        const rawText = fallbackData.candidates?.[0]?.content?.parts?.[0]?.text;
        return { ok: true, status: fallbackResponse.status, text: rawText, data: fallbackData };
      }
      return { ok: false, status: fallbackResponse.status, data: fallbackData };
    }

    return { ok: false, status: response.status, data };
  } catch (err: any) {
    return { ok: false, status: 500, data: { error: { message: err.message } } };
  }
}

router.post("/ai/polish", async (req: Request, res: Response) => {
  try {
    const { content, apiKey: customKey } = req.body;

    if (!content || typeof content !== "string" || !content.trim() || content.trim() === "<p><br></p>") {
      res.status(400).json({
        error: "EMPTY_CONTENT",
        message: "Please write or paste some content before polishing."
      });
      return;
    }

    const apiKey = customKey?.trim() || process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      res.status(400).json({
        error: "NO_API_KEY",
        message: "Gemini API key is required. You can provide your free key in the editor settings."
      });
      return;
    }

    const fullPrompt = `${SYSTEM_PROMPT}\n\nCONTENT TO POLISH:\n${content}`;

    let lastError: any = null;
    let lastStatus = 500;
    let generatedText: string | undefined;

    // 1. Fast Path: If we have a cached working model, try it first
    if (cachedWorkingModel) {
      const fastResult = await callGeminiGenerate(
        apiKey,
        cachedWorkingModel.version,
        cachedWorkingModel.model,
        fullPrompt
      );
      if (fastResult.ok && fastResult.text) {
        generatedText = fastResult.text;
      } else {
        lastError = fastResult.data;
        lastStatus = fastResult.status;
        if (isExplicitKeyAuthError(fastResult.data)) {
          res.status(400).json({
            error: "INVALID_API_KEY",
            message: "Invalid Gemini API key. Please check your key."
          });
          return;
        }
        // Invalidate cached model if it failed with model error
        cachedWorkingModel = null;
      }
    }

    // 2. Candidate models fallback
    if (!generatedText) {
      for (const candidate of CANDIDATE_MODELS) {
        const result = await callGeminiGenerate(apiKey, candidate.version, candidate.model, fullPrompt);

        if (result.ok && result.text) {
          generatedText = result.text;
          cachedWorkingModel = { version: candidate.version, model: candidate.model };
          break;
        }

        lastError = result.data;
        lastStatus = result.status;

        if (isExplicitKeyAuthError(result.data)) {
          break;
        }

        // Direct model suggestion check
        const errMsg = result.data?.error?.message || "";
        const modelSuggestion = errMsg.match(/use models\/([a-zA-Z0-9.-]+)/i);
        if (modelSuggestion && modelSuggestion[1]) {
          const suggested = modelSuggestion[1];
          const directTry = await callGeminiGenerate(apiKey, "v1beta", suggested, fullPrompt);
          if (directTry.ok && directTry.text) {
            generatedText = directTry.text;
            cachedWorkingModel = { version: "v1beta", model: suggested };
            break;
          }
        }
      }
    }

    // 3. Dynamic ListModels discovery if candidates all failed
    if (!generatedText && !isExplicitKeyAuthError(lastError)) {
      try {
        const listRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
          { headers: { "x-goog-api-key": apiKey } }
        );

        if (listRes.ok) {
          const listData = (await listRes.json()) as any;
          const models: any[] = listData.models || [];

          const usableModels = models
            .filter(
              (m) =>
                Array.isArray(m.supportedGenerationMethods) &&
                m.supportedGenerationMethods.includes("generateContent")
            )
            .sort((a, b) => {
              const aName = a.name || "";
              const bName = b.name || "";
              if (aName.includes("3.8") && !bName.includes("3.8")) return -1;
              if (!aName.includes("3.8") && bName.includes("3.8")) return 1;
              if (aName.includes("flash") && !bName.includes("flash")) return -1;
              if (!aName.includes("flash") && bName.includes("flash")) return 1;
              return 0;
            });

          for (const usable of usableModels.slice(0, 3)) {
            const dynamicResult = await callGeminiGenerate(apiKey, "v1beta", usable.name, fullPrompt);
            if (dynamicResult.ok && dynamicResult.text) {
              generatedText = dynamicResult.text;
              cachedWorkingModel = { version: "v1beta", model: usable.name };
              break;
            } else {
              lastError = dynamicResult.data;
              lastStatus = dynamicResult.status;
            }
          }
        }
      } catch (listErr) {
        console.warn("[ListModels Discovery Failed]", listErr);
      }
    }

    if (!generatedText) {
      const errMessage = lastError?.error?.message || "Failed to communicate with AI provider.";
      const isKeyError = isExplicitKeyAuthError(lastError);

      res.status(lastStatus >= 400 && lastStatus < 600 ? lastStatus : 502).json({
        error: isKeyError ? "INVALID_API_KEY" : "AI_PROVIDER_ERROR",
        message: isKeyError ? "Invalid Gemini API key. Please check your key." : errMessage
      });
      return;
    }

    // Clean up any markdown code fence wrappers
    let polished = generatedText.trim();
    if (polished.startsWith("```html")) {
      polished = polished.replace(/^```html\s*/i, "").replace(/\s*```$/, "");
    } else if (polished.startsWith("```")) {
      polished = polished.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    polished = polished.trim();

    res.json({
      success: true,
      polishedContent: polished
    });
  } catch (err: any) {
    console.error("[AI Polish Error]", err);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: err.message || "An unexpected error occurred during AI polish."
    });
  }
});

export default router;
