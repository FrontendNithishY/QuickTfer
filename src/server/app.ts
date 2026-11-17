import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import authRouter from "./routes/auth.js";
import pastesRouter from "./routes/pastes.js";
import quickShareRouter from "./routes/quickShare.js";
import uploadRouter from "./routes/upload.js";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Uploads directory (uses /tmp on Vercel serverless environment)
const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
const uploadsDir = isVercel
  ? path.join("/tmp", "uploads")
  : path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// API Routes
app.use("/api", authRouter);
app.use("/api", pastesRouter);
app.use("/api", quickShareRouter);
app.use("/api", uploadRouter);

// Raw paste direct route alias (e.g., /raw/:slug)
app.get("/raw/:slug", (req, res, next) => {
  req.url = `/pastes/${req.params.slug}/raw`;
  pastesRouter(req, res, next);
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "QuickTrfr",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: Date.now(),
    environment: isVercel ? "vercel-serverless" : "standalone-node"
  });
});

export default app;
