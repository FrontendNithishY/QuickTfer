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

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\n--- CONTENT TO POLISH ---\n${content}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192
      }
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(geminiPayload)
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      const errMessage = data?.error?.message || "Failed to communicate with AI provider.";
      const isKeyError = response.status === 400 && (errMessage.includes("API_KEY") || errMessage.includes("key"));
      
      res.status(response.status).json({
        error: isKeyError ? "INVALID_API_KEY" : "AI_PROVIDER_ERROR",
        message: isKeyError ? "Invalid Gemini API key. Please check your key." : errMessage
      });
      return;
    }

    const candidate = data.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text;

    if (!rawText) {
      res.status(502).json({
        error: "NO_CONTENT_GENERATED",
        message: "The AI did not generate a response. Please try again."
      });
      return;
    }

    // Clean up any markdown code fence wrappers
    let polished = rawText.trim();
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
