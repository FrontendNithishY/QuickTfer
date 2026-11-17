import { Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db.js";
import { hashPassword, comparePassword } from "../crypto.js";

const router = Router();
export const JWT_SECRET = process.env.JWT_SECRET || "justpaste-secret-key-production-grade";

export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
}

export function verifyAuthToken(authHeader?: string): AuthUser | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return { id: payload.id, username: payload.username, email: payload.email };
  } catch {
    return null;
  }
}

// Register
router.post("/auth/register", (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !password || password.length < 6) {
      return res.status(400).json({ error: "Username and password (min 6 chars) are required." });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      return res.status(400).json({ error: "Username must be 3-24 characters (letters, numbers, underscore only)." });
    }

    const existingUser = db.prepare("SELECT id FROM users WHERE username = ? OR (email = ? AND email IS NOT NULL)").get(cleanUsername, email || "") as any;
    if (existingUser) {
      return res.status(409).json({ error: "Username or email is already taken." });
    }

    const passwordHash = hashPassword(password);
    const result = db.prepare(
      "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)"
    ).run(cleanUsername, email ? email.trim() : null, passwordHash, Date.now());

    const userId = Number(result.lastInsertRowid);
    const token = jwt.sign({ id: userId, username: cleanUsername, email: email || null }, JWT_SECRET, { expiresIn: "30d" });

    res.status(201).json({
      token,
      user: { id: userId, username: cleanUsername, email: email || null }
    });
  } catch (error: any) {
    console.error("[Auth] Register error:", error);
    res.status(500).json({ error: "Registration failed." });
  }
});

// Login
router.post("/auth/login", (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: "Username/email and password are required." });
    }

    const target = usernameOrEmail.trim().toLowerCase();
    const user = db.prepare("SELECT * FROM users WHERE username = ? OR email = ?").get(target, target) as any;

    if (!user || !comparePassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid username/email or password." });
    }

    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: "30d" });

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, bio: user.bio }
    });
  } catch (error: any) {
    console.error("[Auth] Login error:", error);
    res.status(500).json({ error: "Login failed." });
  }
});

// Current User Profile
router.get("/auth/me", (req, res) => {
  const auth = verifyAuthToken(req.headers.authorization);
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = db.prepare("SELECT id, username, email, bio, created_at FROM users WHERE id = ?").get(auth.id) as any;
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ user });
});

// User Dashboard Pastes
router.get("/auth/dashboard", (req, res) => {
  const auth = verifyAuthToken(req.headers.authorization);
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const pastes = db.prepare(`
    SELECT p.id, p.slug, p.title, p.visibility, p.is_encrypted, p.expires_at, p.burn_after_reading,
           p.view_count, p.show_view_count, p.created_at, p.updated_at,
           COUNT(c.id) as comment_count
    FROM pastes p
    LEFT JOIN comments c ON p.id = c.paste_id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all(auth.id) as any[];

  // Attach tags
  const pastesWithTags = pastes.map(paste => {
    const tags = db.prepare("SELECT tag FROM tags WHERE paste_id = ?").all(paste.id) as any[];
    return {
      ...paste,
      tags: tags.map(t => t.tag),
      isExpired: paste.expires_at ? paste.expires_at < Date.now() : false
    };
  });

  res.json({ pastes: pastesWithTags });
});

// Public Author Profile
router.get("/users/:username", (req, res) => {
  const username = req.params.username.trim().toLowerCase();
  const user = db.prepare("SELECT id, username, bio, created_at FROM users WHERE username = ?").get(username) as any;

  if (!user) {
    return res.status(404).json({ error: "User profile not found" });
  }

  // Only return public, non-expired pastes
  const now = Date.now();
  const pastes = db.prepare(`
    SELECT p.id, p.slug, p.title, p.is_encrypted, p.view_count, p.created_at
    FROM pastes p
    WHERE p.user_id = ? AND p.visibility = 'public' AND (p.expires_at IS NULL OR p.expires_at > ?)
    ORDER BY p.created_at DESC
  `).all(user.id, now) as any[];

  res.json({
    user: {
      username: user.username,
      bio: user.bio,
      createdAt: user.created_at,
      pasteCount: pastes.length
    },
    pastes
  });
});

export default router;
