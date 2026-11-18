import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import authRouter from "./routes/auth.js";
import pastesRouter from "./routes/pastes.js";
import quickShareRouter from "./routes/quickShare.js";
import uploadRouter from "./routes/upload.js";
import aiRouter from "./routes/ai.js";
import duoRouter from "./routes/duo.js";


export const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// Uploads directory (uses /tmp on Vercel serverless environment)
const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
const uploadsDir = isVercel
  ? path.join("/tmp", "uploads")
  : path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// SEO Robots and Sitemap Fallbacks
app.get("/robots.txt", (_req, res) => {
  res.type("text/plain; charset=utf-8");
  res.send(`User-agent: *
Disallow: /p/
Disallow: /paste/
Disallow: /api/
Disallow: /raw/
Disallow: /uploads/
Allow: /
Allow: /burn-after-reading
Allow: /encrypted-paste
Allow: /quick-code
Allow: /math-notes

Sitemap: https://sharepaste-app.vercel.app/sitemap.xml
`);
});

app.get("/sitemap.xml", (_req, res) => {
  res.type("application/xml; charset=utf-8");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://sharepaste-app.vercel.app/</loc>
    <lastmod>2026-11-17</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://sharepaste-app.vercel.app/burn-after-reading</loc>
    <lastmod>2026-11-17</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://sharepaste-app.vercel.app/encrypted-paste</loc>
    <lastmod>2026-11-17</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://sharepaste-app.vercel.app/quick-code</loc>
    <lastmod>2026-11-17</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://sharepaste-app.vercel.app/math-notes</loc>
    <lastmod>2026-11-17</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`);
});

// API Routes
app.use("/api", authRouter);
app.use("/api", pastesRouter);
app.use("/api", quickShareRouter);
app.use("/api", uploadRouter);
app.use("/api", aiRouter);
app.use("/api", duoRouter);


// Raw paste direct route alias (e.g., /raw/:slug)
app.get("/raw/:slug", (req, res, next) => {
  req.url = `/pastes/${req.params.slug}/raw`;
  pastesRouter(req, res, next);
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "SharePaste",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: Date.now(),
    environment: isVercel ? "vercel-serverless" : "standalone-node"
  });
});

export default app;
