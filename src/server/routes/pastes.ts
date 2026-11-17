import { Router } from "express";
import { db } from "../db.js";
import {
  generateSlug,
  generateEditToken,
  encryptPaste,
  decryptPaste,
  hashPassword,
  comparePassword,
} from "../crypto.js";
import { verifyAuthToken } from "./auth.js";

const router = Router();

// Expiration time calculator helper
function calculateExpiresAt(expiration?: string): number | null {
  if (!expiration || expiration === "never") return null;
  const now = Date.now();
  switch (expiration) {
    case "10m": return now + 10 * 60 * 1000;
    case "1h": return now + 60 * 60 * 1000;
    case "1d": return now + 24 * 60 * 60 * 1000;
    case "1w": return now + 7 * 24 * 60 * 60 * 1000;
    case "1mo": return now + 30 * 24 * 60 * 60 * 1000;
    default: {
      const parsed = Number(expiration);
      if (!isNaN(parsed) && parsed > now) return parsed;
      return null;
    }
  }
}

// CREATE Paste
router.post("/pastes", (req, res) => {
  try {
    const {
      title,
      content,
      customSlug,
      password,
      expiration,
      burnAfterReading,
      visibility,
      showViewCount,
      allowComments,
      tags
    } = req.body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ error: "Paste content cannot be empty." });
    }

    // Resolve Slug
    let slug = "";
    if (customSlug && typeof customSlug === "string" && customSlug.trim().length > 0) {
      const cleanSlug = customSlug.trim().toLowerCase();
      if (!/^[a-z0-9_-]{3,50}$/.test(cleanSlug)) {
        return res.status(400).json({ error: "Custom URL must be 3-50 alphanumeric characters (or - and _)." });
      }
      const existing = db.prepare("SELECT id FROM pastes WHERE slug = ?").get(cleanSlug);
      if (existing) {
        return res.status(409).json({ error: "This custom URL is already taken. Please choose another." });
      }
      slug = cleanSlug;
    } else {
      let attempts = 0;
      do {
        slug = generateSlug(6);
        const check = db.prepare("SELECT id FROM pastes WHERE slug = ?").get(slug);
        if (!check) break;
        attempts++;
      } while (attempts < 10);
    }

    // Handle Encryption
    let storedContent = content;
    let isEncrypted = 0;
    let iv: string | null = null;
    let authTag: string | null = null;
    let salt: string | null = null;
    let passwordHash: string | null = null;

    if (password && typeof password === "string" && password.trim().length > 0) {
      isEncrypted = 1;
      const enc = encryptPaste(content, password.trim());
      storedContent = enc.encryptedContent;
      iv = enc.iv;
      authTag = enc.authTag;
      salt = enc.salt;
      passwordHash = hashPassword(password.trim());
    }

    const auth = verifyAuthToken(req.headers.authorization);
    const userId = auth ? auth.id : null;
    const editToken = generateEditToken();
    const expiresAt = calculateExpiresAt(expiration);
    const now = Date.now();

    const insertStmt = db.prepare(`
      INSERT INTO pastes (
        slug, title, content, is_encrypted, iv, auth_tag, salt, password_hash,
        visibility, expires_at, burn_after_reading, view_count, show_view_count,
        allow_comments, user_id, edit_token, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      slug,
      title?.trim() || "Untitled",
      storedContent,
      isEncrypted,
      iv,
      authTag,
      salt,
      passwordHash,
      visibility || "public",
      expiresAt,
      burnAfterReading ? 1 : 0,
      showViewCount === false ? 0 : 1,
      allowComments === false ? 0 : 1,
      userId,
      editToken,
      now,
      now
    );

    const pasteId = Number(result.lastInsertRowid);

    // Save tags
    if (Array.isArray(tags)) {
      const tagStmt = db.prepare("INSERT INTO tags (paste_id, tag) VALUES (?, ?)");
      for (const t of tags) {
        if (typeof t === "string" && t.trim().length > 0) {
          tagStmt.run(pasteId, t.trim().toLowerCase());
        }
      }
    }

    res.status(201).json({
      slug,
      title: title?.trim() || "Untitled",
      editToken,
      isEncrypted: !!isEncrypted,
      expiresAt,
      burnAfterReading: !!burnAfterReading,
      url: `/p/${slug}`
    });
  } catch (error: any) {
    console.error("[Pastes] Error creating paste:", error);
    res.status(500).json({ error: "Failed to create paste." });
  }
});

// GET Paste by Slug
router.get("/pastes/:slug", (req, res) => {
  try {
    const { slug } = req.params;
    const paste = db.prepare(`
      SELECT p.*, u.username as author_username
      FROM pastes p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.slug = ?
    `).get(slug) as any;

    if (!paste) {
      return res.status(404).json({ error: "Paste not found." });
    }

    // Check expiration
    if (paste.expires_at && paste.expires_at < Date.now()) {
      db.prepare("DELETE FROM pastes WHERE id = ?").run(paste.id);
      return res.status(410).json({ error: "This paste has expired and is no longer available." });
    }

    // Handle Burn-after-reading
    const isBurn = paste.burn_after_reading === 1;
    if (isBurn) {
      // If encrypted, we do NOT delete until decrypted, or delete upon initial fetch if unencrypted
      if (!paste.is_encrypted) {
        db.prepare("DELETE FROM pastes WHERE id = ?").run(paste.id);
      }
    } else {
      // Increment view count
      db.prepare("UPDATE pastes SET view_count = view_count + 1 WHERE id = ?").run(paste.id);
    }

    // Fetch tags
    const tagRows = db.prepare("SELECT tag FROM tags WHERE paste_id = ?").all(paste.id) as any[];
    const tags = tagRows.map(r => r.tag);

    // If Encrypted, do NOT send cipher content directly without password verification
    if (paste.is_encrypted) {
      return res.json({
        id: paste.id,
        slug: paste.slug,
        title: paste.title,
        isEncrypted: true,
        content: null,
        visibility: paste.visibility,
        expiresAt: paste.expires_at,
        burnAfterReading: !!paste.burn_after_reading,
        viewCount: paste.show_view_count ? paste.view_count + 1 : null,
        showViewCount: !!paste.show_view_count,
        allowComments: !!paste.allow_comments,
        authorName: paste.author_username || "Anonymous",
        createdAt: paste.created_at,
        updatedAt: paste.updated_at,
        tags
      });
    }

    res.json({
      id: paste.id,
      slug: paste.slug,
      title: paste.title,
      isEncrypted: false,
      content: paste.content,
      visibility: paste.visibility,
      expiresAt: paste.expires_at,
      burnAfterReading: !!paste.burn_after_reading,
      viewCount: paste.show_view_count ? paste.view_count + (isBurn ? 1 : 1) : null,
      showViewCount: !!paste.show_view_count,
      allowComments: !!paste.allow_comments,
      authorName: paste.author_username || "Anonymous",
      createdAt: paste.created_at,
      updatedAt: paste.updated_at,
      tags
    });
  } catch (error: any) {
    console.error("[Pastes] Error fetching paste:", error);
    res.status(500).json({ error: "Failed to fetch paste." });
  }
});

// UNLOCK Encrypted Paste
router.post("/pastes/:slug/unlock", (req, res) => {
  try {
    const { slug } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required." });
    }

    const paste = db.prepare("SELECT * FROM pastes WHERE slug = ?").get(slug) as any;
    if (!paste) {
      return res.status(404).json({ error: "Paste not found." });
    }

    if (!paste.is_encrypted) {
      return res.json({ content: paste.content });
    }

    // Verify Password Hash
    if (!paste.password_hash || !comparePassword(password, paste.password_hash)) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    // Decrypt AES-256-GCM
    const decrypted = decryptPaste(
      paste.content,
      password,
      paste.iv,
      paste.auth_tag,
      paste.salt
    );

    // If burn-after-reading, delete now that it has been viewed!
    if (paste.burn_after_reading === 1) {
      db.prepare("DELETE FROM pastes WHERE id = ?").run(paste.id);
    } else {
      db.prepare("UPDATE pastes SET view_count = view_count + 1 WHERE id = ?").run(paste.id);
    }

    res.json({
      content: decrypted,
      burnNotice: paste.burn_after_reading === 1 ? "This paste was configured to burn after reading and has now been permanently deleted." : null
    });
  } catch (error: any) {
    console.error("[Pastes] Unlock decryption error:", error);
    res.status(401).json({ error: "Failed to decrypt content with the provided password." });
  }
});

// RAW Plain-Text View
router.get("/pastes/:slug/raw", (req, res) => {
  try {
    const { slug } = req.params;
    const paste = db.prepare("SELECT content, is_encrypted, expires_at FROM pastes WHERE slug = ?").get(slug) as any;

    if (!paste) {
      return res.status(404).send("Paste not found.");
    }

    if (paste.expires_at && paste.expires_at < Date.now()) {
      return res.status(410).send("Paste has expired.");
    }

    if (paste.is_encrypted) {
      return res.status(403).send("This paste is encrypted. Please unlock it in the web interface with the password.");
    }

    // Strip HTML tags for clean raw text view if rich HTML was stored
    const textContent = paste.content.replace(/<br\s*[\/]?>/gi, "\n")
                                     .replace(/<\/p>/gi, "\n\n")
                                     .replace(/<[^>]+>/g, "");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(textContent.trim());
  } catch (error: any) {
    res.status(500).send("Server error.");
  }
});

// UPDATE Paste
router.put("/pastes/:slug", (req, res) => {
  try {
    const { slug } = req.params;
    const { title, content, visibility, allowComments, showViewCount, tags, editToken } = req.body;
    const paste = db.prepare("SELECT * FROM pastes WHERE slug = ?").get(slug) as any;

    if (!paste) {
      return res.status(404).json({ error: "Paste not found." });
    }

    // Check ownership: Either authenticated user is author OR edit_token matches
    const auth = verifyAuthToken(req.headers.authorization);
    const isOwner = auth && paste.user_id && auth.id === paste.user_id;
    const hasValidToken = editToken && paste.edit_token && editToken === paste.edit_token;

    if (!isOwner && !hasValidToken) {
      return res.status(403).json({ error: "You do not have permission to edit this paste." });
    }

    const updatedTitle = title !== undefined ? title.trim() : paste.title;
    const updatedContent = content !== undefined ? content : paste.content;
    const updatedVisibility = visibility !== undefined ? visibility : paste.visibility;
    const updatedAllowComments = allowComments !== undefined ? (allowComments ? 1 : 0) : paste.allow_comments;
    const updatedShowViewCount = showViewCount !== undefined ? (showViewCount ? 1 : 0) : paste.show_view_count;

    db.prepare(`
      UPDATE pastes
      SET title = ?, content = ?, visibility = ?, allow_comments = ?, show_view_count = ?, updated_at = ?
      WHERE id = ?
    `).run(updatedTitle, updatedContent, updatedVisibility, updatedAllowComments, updatedShowViewCount, Date.now(), paste.id);

    // Update tags if provided
    if (Array.isArray(tags)) {
      db.prepare("DELETE FROM tags WHERE paste_id = ?").run(paste.id);
      const tagStmt = db.prepare("INSERT INTO tags (paste_id, tag) VALUES (?, ?)");
      for (const t of tags) {
        if (typeof t === "string" && t.trim().length > 0) {
          tagStmt.run(paste.id, t.trim().toLowerCase());
        }
      }
    }

    res.json({ message: "Paste updated successfully." });
  } catch (error: any) {
    console.error("[Pastes] Error updating paste:", error);
    res.status(500).json({ error: "Failed to update paste." });
  }
});

// DELETE Paste
router.delete("/pastes/:slug", (req, res) => {
  try {
    const { slug } = req.params;
    const { editToken } = req.body || {};
    const tokenFromHeader = req.headers["x-edit-token"] as string;

    const paste = db.prepare("SELECT * FROM pastes WHERE slug = ?").get(slug) as any;
    if (!paste) {
      return res.status(404).json({ error: "Paste not found." });
    }

    const auth = verifyAuthToken(req.headers.authorization);
    const isOwner = auth && paste.user_id && auth.id === paste.user_id;
    const token = editToken || tokenFromHeader;
    const hasValidToken = token && paste.edit_token && token === paste.edit_token;

    if (!isOwner && !hasValidToken) {
      return res.status(403).json({ error: "You do not have permission to delete this paste." });
    }

    db.prepare("DELETE FROM pastes WHERE id = ?").run(paste.id);
    res.json({ message: "Paste deleted successfully." });
  } catch (error: any) {
    console.error("[Pastes] Error deleting paste:", error);
    res.status(500).json({ error: "Failed to delete paste." });
  }
});

// COMMENTS: Get & Post
router.get("/pastes/:slug/comments", (req, res) => {
  try {
    const { slug } = req.params;
    const paste = db.prepare("SELECT id FROM pastes WHERE slug = ?").get(slug) as any;
    if (!paste) return res.status(404).json({ error: "Paste not found" });

    const comments = db.prepare("SELECT id, author_name, content, created_at FROM comments WHERE paste_id = ? ORDER BY created_at ASC").all(paste.id);
    res.json({ comments });
  } catch {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/pastes/:slug/comments", (req, res) => {
  try {
    const { slug } = req.params;
    const { authorName, content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Comment text cannot be empty." });
    }

    const paste = db.prepare("SELECT id, allow_comments FROM pastes WHERE slug = ?").get(slug) as any;
    if (!paste) return res.status(404).json({ error: "Paste not found" });
    if (!paste.allow_comments) return res.status(403).json({ error: "Comments are disabled on this paste." });

    const name = authorName?.trim() || "Anonymous Reader";
    const result = db.prepare("INSERT INTO comments (paste_id, author_name, content, created_at) VALUES (?, ?, ?, ?)").run(
      paste.id,
      name,
      content.trim(),
      Date.now()
    );

    res.status(201).json({
      id: Number(result.lastInsertRowid),
      authorName: name,
      content: content.trim(),
      createdAt: Date.now()
    });
  } catch {
    res.status(500).json({ error: "Failed to post comment" });
  }
});

export default router;
