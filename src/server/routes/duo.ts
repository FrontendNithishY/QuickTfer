import { Router, Response } from "express";
import { db } from "../db.js";
import { generateSlug, generateEditToken } from "../crypto.js";
import { nanoid } from "nanoid";

const router = Router();

// In-memory registry of active Server-Sent Events (SSE) connections per session PIN
const sseSubscribers = new Map<string, Set<Response>>();

function broadcastToPin(pin: string, eventData: any, excludeRes?: Response) {
  const clients = sseSubscribers.get(pin);
  if (!clients || clients.size === 0) return;

  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const client of clients) {
    if (excludeRes && client === excludeRes) continue;
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

// Generate unique 6-digit numeric PIN
function generateUniquePin(): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = db.prepare("SELECT id FROM duo_sessions WHERE pin = ? AND is_active = 1").get(pin);
    if (!existing) return pin;
  }
  return nanoid(6).toUpperCase();
}

/**
 * POST /api/duo/create
 * User A creates a new DuoPaste collaboration session.
 */
router.post("/duo/create", (req, res) => {
  try {
    const { title = "Untitled DuoPaste", content = "" } = req.body || {};
    const pin = generateUniquePin();
    const hostClientId = "host_" + nanoid(10);
    const now = Date.now();

    db.prepare(`
      INSERT INTO duo_sessions (
        pin, title, content, version, host_client_id, is_active, last_active_at, created_at
      ) VALUES (?, ?, ?, 1, ?, 1, ?, ?)
    `).run(pin, title.trim() || "Untitled DuoPaste", content, hostClientId, now, now);

    const session = db.prepare(`
      SELECT pin, title, content, version, host_client_id, guest_client_id, is_active, last_active_at, created_at
      FROM duo_sessions WHERE pin = ?
    `).get(pin) as any;

    res.status(201).json({
      success: true,
      pin,
      clientId: hostClientId,
      role: "host",
      session
    });
  } catch (err: any) {
    console.error("[DuoPaste] Error creating session:", err);
    res.status(500).json({ error: "Failed to create DuoPaste session." });
  }
});

/**
 * POST /api/duo/join
 * User B joins an existing DuoPaste session by PIN.
 */
router.post("/duo/join", (req, res) => {
  try {
    const { pin } = req.body || {};
    if (!pin) {
      return res.status(400).json({ error: "Collaboration PIN is required." });
    }

    const cleanPin = String(pin).trim().replace(/\s+/g, "");
    const session = db.prepare(`
      SELECT * FROM duo_sessions WHERE pin = ? AND is_active = 1
    `).get(cleanPin) as any;

    if (!session) {
      return res.status(404).json({ error: "DuoPaste session not found or expired. Please check the PIN." });
    }

    const guestClientId = "guest_" + nanoid(10);
    const now = Date.now();

    db.prepare(`
      UPDATE duo_sessions
      SET guest_client_id = ?, last_active_at = ?
      WHERE pin = ?
    `).run(guestClientId, now, cleanPin);

    const updatedSession = db.prepare(`
      SELECT pin, title, content, version, host_client_id, guest_client_id, is_active, last_active_at, created_at
      FROM duo_sessions WHERE pin = ?
    `).get(cleanPin) as any;

    // Broadcast collaborator joined event to host
    broadcastToPin(cleanPin, {
      type: "collaborator_joined",
      role: "guest",
      guestClientId,
      timestamp: now
    });

    res.json({
      success: true,
      pin: cleanPin,
      clientId: guestClientId,
      role: "guest",
      session: updatedSession
    });
  } catch (err: any) {
    console.error("[DuoPaste] Error joining session:", err);
    res.status(500).json({ error: "Failed to join DuoPaste session." });
  }
});

/**
 * GET /api/duo/:pin
 * Get current session state and collaborator presence.
 */
router.get("/duo/:pin", (req, res) => {
  try {
    const cleanPin = String(req.params.pin).trim().replace(/\s+/g, "");
    const session = db.prepare(`
      SELECT pin, title, content, version, host_client_id, guest_client_id, is_active, published_slug, last_active_at, created_at
      FROM duo_sessions WHERE pin = ?
    `).get(cleanPin) as any;

    if (!session || !session.is_active) {
      return res.status(404).json({ error: "DuoPaste session not found or expired." });
    }

    res.json({
      success: true,
      session
    });
  } catch (err: any) {
    console.error("[DuoPaste] Error fetching session:", err);
    res.status(500).json({ error: "Failed to fetch session." });
  }
});

/**
 * POST /api/duo/sync
 * Sync content and title updates between collaborators.
 */
router.post("/duo/sync", (req, res) => {
  try {
    const { pin, clientId, title, content, version } = req.body || {};
    if (!pin) {
      return res.status(400).json({ error: "PIN is required." });
    }

    const cleanPin = String(pin).trim().replace(/\s+/g, "");
    const now = Date.now();

    // Increment version and save content (preserving existing title/content if omitted)
    const titleVal = title !== undefined ? title : null;
    const contentVal = content !== undefined ? content : null;

    db.prepare(`
      UPDATE duo_sessions
      SET title = COALESCE(?, title), content = COALESCE(?, content), version = version + 1, last_active_at = ?
      WHERE pin = ?
    `).run(titleVal, contentVal, now, cleanPin);

    const updated = db.prepare(`
      SELECT pin, title, content, version, host_client_id, guest_client_id, last_active_at
      FROM duo_sessions WHERE pin = ?
    `).get(cleanPin) as any;

    // Broadcast instant update to the other collaborator via SSE
    broadcastToPin(cleanPin, {
      type: "sync",
      senderId: clientId,
      version: updated.version,
      title: updated.title,
      content: updated.content,
      timestamp: now
    });

    res.json({
      success: true,
      version: updated.version
    });
  } catch (err: any) {
    console.error("[DuoPaste] Error syncing session:", err);
    res.status(500).json({ error: "Failed to sync changes." });
  }
});

/**
 * GET /api/duo/stream/:pin
 * Real-time Server-Sent Events (SSE) channel for near-zero latency synchronization.
 */
router.get("/duo/stream/:pin", (req, res) => {
  const cleanPin = String(req.params.pin).trim().replace(/\s+/g, "");
  const clientId = String(req.query.clientId || "");

  // Setup SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  });

  if (!sseSubscribers.has(cleanPin)) {
    sseSubscribers.set(cleanPin, new Set());
  }
  const clientSet = sseSubscribers.get(cleanPin)!;
  clientSet.add(res);

  // Send initial handshake
  res.write(`data: ${JSON.stringify({ type: "connected", pin: cleanPin, clientId, clientsCount: clientSet.size })}\n\n`);

  // Inform other connected users about presence
  broadcastToPin(cleanPin, {
    type: "presence",
    clientId,
    clientsCount: clientSet.size
  }, res);

  // Heartbeat ping every 15s to keep connection alive
  const pingInterval = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      clearInterval(pingInterval);
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(pingInterval);
    clientSet.delete(res);
    if (clientSet.size === 0) {
      sseSubscribers.delete(cleanPin);
    } else {
      broadcastToPin(cleanPin, {
        type: "presence",
        clientsCount: clientSet.size
      });
    }
  });
});

/**
 * POST /api/duo/publish
 * Freeze and save the collaborative DuoPaste into a permanent SharePaste record.
 */
router.post("/duo/publish", (req, res) => {
  try {
    const { pin, visibility = "public" } = req.body || {};
    if (!pin) {
      return res.status(400).json({ error: "PIN is required." });
    }

    const cleanPin = String(pin).trim().replace(/\s+/g, "");
    const session = db.prepare(`
      SELECT * FROM duo_sessions WHERE pin = ? AND is_active = 1
    `).get(cleanPin) as any;

    if (!session) {
      return res.status(404).json({ error: "DuoPaste session not found." });
    }

    const slug = generateSlug();
    const editToken = generateEditToken();
    const now = Date.now();

    // Create permanent paste
    db.prepare(`
      INSERT INTO pastes (
        slug, title, content, is_encrypted, visibility,
        expires_at, burn_after_reading, view_count,
        show_view_count, allow_comments, edit_token,
        created_at, updated_at
      ) VALUES (?, ?, ?, 0, ?, NULL, 0, 0, 1, 1, ?, ?, ?)
    `).run(slug, session.title || "Untitled DuoPaste", session.content, visibility, editToken, now, now);

    // Update duo session with published slug
    db.prepare(`
      UPDATE duo_sessions
      SET published_slug = ?
      WHERE pin = ?
    `).run(slug, cleanPin);

    // Broadcast publish event to all participants so both redirect to the published paste
    broadcastToPin(cleanPin, {
      type: "published",
      slug,
      url: `/p/${slug}`
    });

    res.status(201).json({
      success: true,
      slug,
      url: `/p/${slug}`,
      editToken
    });
  } catch (err: any) {
    console.error("[DuoPaste] Error publishing session:", err);
    res.status(500).json({ error: "Failed to publish shared paste." });
  }
});

export default router;
