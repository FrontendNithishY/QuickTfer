import { Router, Request, Response } from "express";

const router = Router();

const SYSTEM_PROMPT = `You are an expert copy editor and formatter for SharePaste.
Your ONLY task is to polish the provided HTML/text content:
1. Fix all spelling, typo, and grammar mistakes.
2. Rephrase clunky, confusing, or awkward sentences so they read clearly, smoothly, and professionally.
3. Auto-align and organize paragraphs into clean, well-spaced semantic HTML:
   - Wrap paragraphs in <p>...</p>.
   - Preserve or enhance headings (<h2>, <h3>) where appropriate.
   - Format bullet lists (<ul><li>...</li></ul>) and numbered lists (<ol><li>...</li></ol>) cleanly.
   - Use <blockquote> for quotes or callouts.
4. CRITICAL PRESERVATION RULES:
   - Strictly PRESERVE all mathematical formulas (LaTeX $...$, $$...$$, or KaTeX spans) exactly as they are.
   - Strictly PRESERVE all code snippets and blocks (<pre><code>...</code></pre>).
   - Strictly PRESERVE all embedded media (<img ...>, <iframe>, <table>, hyperlinks <a ...>).
5. Do NOT add any introductory, conversational, or concluding remarks (e.g. "Here is the revised text:", "I have fixed...").
6. Output ONLY the raw HTML content suitable for insertion into contenteditable. Do NOT wrap the output in markdown code blocks like \`\`\`html or \`\`\`.`;

// Active models to try in order of capability & availability
const CANDIDATE_MODELS = [
  { version: "v1beta", model: "gemini-3.8-flash" },
  { version: "v1beta", model: "gemini-3.8-flash-latest" },
  { version: "v1beta", model: "gemini-3.0-flash" },
  { version: "v1beta", model: "gemini-2.5-flash" },
  { version: "v1beta", model: "gemini-2.0-flash" },
  { version: "v1beta", model: "gemini-1.5-flash-latest" },
  { version: "v1beta", model: "gemini-1.5-flash" },
  { version: "v1", model: "gemini-1.5-flash" },
  { version: "v1beta", model: "gemini-1.5-flash-8b" },
  { version: "v1beta", model: "gemini-1.5-pro" }
];

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

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192
        }
      })
    });

    const data = (await response.json()) as any;

    if (response.ok) {
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return { ok: true, status: response.status, text: rawText, data };
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

    const fullPrompt = `${SYSTEM_PROMPT}\n\n--- CONTENT TO POLISH ---\n${content}`;

    let lastError: any = null;
    let lastStatus = 500;
    let generatedText: string | undefined;

    // 1. Try candidate models in order (starting with gemini-3.8-flash)
    for (const candidate of CANDIDATE_MODELS) {
      const result = await callGeminiGenerate(apiKey, candidate.version, candidate.model, fullPrompt);

      if (result.ok && result.text) {
        generatedText = result.text;
        break;
      }

      lastError = result.data;
      lastStatus = result.status;

      // If the API key itself is definitively invalid, abort immediately
      if (isExplicitKeyAuthError(result.data)) {
        break;
      }

      // If Google explicitly suggests a model in the error message (e.g. "Please update your code to use models/gemini-3.8-flash"), try that model directly!
      const errMsg = result.data?.error?.message || "";
      const modelSuggestion = errMsg.match(/use models\/([a-zA-Z0-9.-]+)/i);
      if (modelSuggestion && modelSuggestion[1]) {
        const suggested = modelSuggestion[1];
        const directTry = await callGeminiGenerate(apiKey, "v1beta", suggested, fullPrompt);
        if (directTry.ok && directTry.text) {
          generatedText = directTry.text;
          break;
        }
      }
    }

    // 2. If candidate loop didn't generate text and the key isn't invalid, auto-discover enabled models via ListModels
    if (!generatedText && !isExplicitKeyAuthError(lastError)) {
      try {
        const listRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
          {
            headers: { "x-goog-api-key": apiKey }
          }
        );

        if (listRes.ok) {
          const listData = (await listRes.json()) as any;
          const models: any[] = listData.models || [];

          // Sort models: prioritize flash / latest models supporting generateContent
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
