import express from "express";
import app from "./app.js";
import path from "node:path";
import fs from "node:fs";

const PORT = process.env.PORT || 3000;

// Serve Vite production build when running locally as standalone server
const clientDist = path.resolve(process.cwd(), "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/uploads") ||
      req.path.startsWith("/raw") ||
      req.path === "/robots.txt" ||
      req.path === "/sitemap.xml" ||
      req.path === "/og-image.png"
    ) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[SharePaste Server] Running at http://localhost:${PORT}`);
  console.log(`[SharePaste Server] Client directory checked: ${clientDist}`);
});
