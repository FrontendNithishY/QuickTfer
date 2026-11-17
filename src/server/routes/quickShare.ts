import { Router } from "express";
import QRCode from "qrcode";
import { db } from "../db.js";
import { generateQuickCode } from "../crypto.js";

const router = Router();

// Generate or renew a 60-minute quick-share code + QR code
router.post("/pastes/:slug/quick-share", async (req, res) => {
  try {
    const { slug } = req.params;
    const paste = db.prepare("SELECT id, slug, title, is_encrypted, expires_at FROM pastes WHERE slug = ?").get(slug) as any;

    if (!paste) {
      return res.status(404).json({ error: "Paste not found" });
    }

    // Check if paste itself has expired
    if (paste.expires_at && paste.expires_at < Date.now()) {
      return res.status(410).json({ error: "Cannot create quick-share for an expired paste" });
    }

    // 60 minutes validity
    const ttlMs = 60 * 60 * 1000;
    const expiresAt = Date.now() + ttlMs;

    // Check for an existing valid quick-share for this paste
    const existing = db.prepare("SELECT id, code, expires_at FROM quick_shares WHERE paste_id = ? AND expires_at > ?").get(paste.id, Date.now()) as any;

    let code: string;
    let finalExpiresAt: number;

    if (existing) {
      code = existing.code;
      finalExpiresAt = existing.expires_at;
    } else {
      // Remove any old expired codes for this paste
      db.prepare("DELETE FROM quick_shares WHERE paste_id = ?").run(paste.id);

      // Generate a unique 6-digit code
      let attempts = 0;
      do {
        code = generateQuickCode();
        const check = db.prepare("SELECT id FROM quick_shares WHERE code = ?").get(code);
        if (!check) break;
        attempts++;
      } while (attempts < 10);

      db.prepare("INSERT INTO quick_shares (paste_id, code, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
        paste.id,
        code,
        expiresAt,
        Date.now()
      );
      finalExpiresAt = expiresAt;
    }

    const host = req.get("host") || "localhost:5173";
    const protocol = req.protocol;
    const pasteUrl = `${protocol}://${host}/p/${paste.slug}`;
    const quickAccessUrl = `${protocol}://${host}/quick/${code}`;

    // Generate high-resolution QR code
    const qrCodeDataUrl = await QRCode.toDataURL(quickAccessUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: "#0b589c",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });

    const remainingSeconds = Math.max(0, Math.floor((finalExpiresAt - Date.now()) / 1000));

    res.json({
      code,
      expiresAt: finalExpiresAt,
      remainingSeconds,
      pasteUrl,
      quickAccessUrl,
      qrCodeDataUrl,
      slug: paste.slug,
      title: paste.title,
    });
  } catch (error: any) {
    console.error("[QuickShare] Error generating code:", error);
    res.status(500).json({ error: "Failed to generate quick share code" });
  }
});

// Resolve a 6-digit quick-share code
router.get("/quick-share/:code", (req, res) => {
  try {
    const rawCode = req.params.code.replace(/[-\s]/g, ""); // Allow formatted codes like "482-195" or "482 195"
    const share = db.prepare(`
      SELECT qs.id, qs.code, qs.expires_at, p.slug, p.title, p.is_encrypted, p.expires_at as paste_expires_at
      FROM quick_shares qs
      JOIN pastes p ON qs.paste_id = p.id
      WHERE qs.code = ?
    `).get(rawCode) as any;

    if (!share) {
      return res.status(404).json({ error: "Invalid quick code or code not found" });
    }

    // Check if 60-min window expired
    if (share.expires_at < Date.now()) {
      db.prepare("DELETE FROM quick_shares WHERE id = ?").run(share.id);
      return res.status(410).json({ error: "This quick code has expired (60-minute limit exceeded)" });
    }

    // Check if underlying paste expired
    if (share.paste_expires_at && share.paste_expires_at < Date.now()) {
      return res.status(410).json({ error: "The linked paste has expired" });
    }

    const remainingSeconds = Math.max(0, Math.floor((share.expires_at - Date.now()) / 1000));

    res.json({
      slug: share.slug,
      title: share.title,
      isEncrypted: !!share.is_encrypted,
      remainingSeconds,
      expiresAt: share.expires_at,
    });
  } catch (error: any) {
    console.error("[QuickShare] Error resolving code:", error);
    res.status(500).json({ error: "Failed to resolve quick code" });
  }
});

export default router;
