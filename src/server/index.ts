import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import authRouter from "./routes/auth.js";
import pastesRouter from "./routes/pastes.js";
import quickShareRouter from "./routes/quickShare.js";
import uploadRouter from "./routes/upload.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static uploads directory
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// API Routes
app.use("/api", authRouter);
app.use("/api", pastesRouter);
app.use("/api", quickShareRouter);
app.use("/api", uploadRouter);

// Raw paste direct route alias (e.g., http://localhost:3000/raw/:slug)
app.get("/raw/:slug", (req, res, next) => {
  req.url = `/pastes/${req.params.slug}/raw`;
  pastesRouter(req, res, next);
});

// Production Client serving
const clientDist = path.resolve(process.cwd(), "dist/client");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads") || req.path.startsWith("/raw")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "QuickTfer",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

app.listen(PORT, () => {
  console.log(`[QuickTfer Server] Running at http://localhost:${PORT}`);
  console.log(`[QuickTfer Server] Uploads served at http://localhost:${PORT}/uploads`);
});
