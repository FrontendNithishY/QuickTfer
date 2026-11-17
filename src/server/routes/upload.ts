import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";

const router = Router();
const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
const uploadsDir = isVercel ? path.join("/tmp", "uploads") : path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "img-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    const mime = file.mimetype.toLowerCase();
    if (allowed.test(ext) && (allowed.test(mime) || mime.startsWith("image/"))) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."));
    }
  },
});

router.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file uploaded." });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size
  });
});

export default router;
