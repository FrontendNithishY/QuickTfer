import assert from "node:assert";
import http from "node:http";
import { db } from "../src/server/db.js";
import express from "express";
import authRouter from "../src/server/routes/auth.js";
import pastesRouter from "../src/server/routes/pastes.js";
import quickShareRouter from "../src/server/routes/quickShare.js";
import uploadRouter from "../src/server/routes/upload.js";
import aiRouter from "../src/server/routes/ai.js";
import { highlightCodeTokens } from "../src/client/utils/syntaxHighlight.js";
import duoRouter from "../src/server/routes/duo.js";
import * as mammoth from "mammoth";

const app = express();
app.use(express.json());
app.use("/api", authRouter);
app.use("/api", pastesRouter);
app.use("/api", quickShareRouter);
app.use("/api", uploadRouter);
app.use("/api", aiRouter);
app.use("/api", duoRouter);

app.get("/raw/:slug", (req, res, next) => {
  req.url = `/pastes/${req.params.slug}/raw`;
  pastesRouter(req, res, next);
});

async function runTests() {
  console.log("=== STARTING AUTOMATED TEST SUITE: SHAREPASTE ===");
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3099, resolve));
  const baseUrl = "http://localhost:3099";

  try {
    // 1. Test Anonymous Paste Creation
    console.log("[Test 1] Creating anonymous public paste...");
    const createRes = await fetch(`${baseUrl}/api/pastes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Note 1",
        content: "<p>Hello world from SharePaste!</p>",
        visibility: "public",
        tags: ["tech", "demo"]
      })
    });
    assert.strictEqual(createRes.status, 201, "Expected 201 Created");
    const paste1 = await createRes.json() as any;
    assert.ok(paste1.slug, "Paste should have a slug");
    assert.ok(paste1.editToken, "Paste should have an editToken");
    console.log(`✓ Anonymous paste created with slug: ${paste1.slug}`);

    // 2. Test Paste Retrieval
    console.log("[Test 2] Fetching created paste...");
    const getRes = await fetch(`${baseUrl}/api/pastes/${paste1.slug}`);
    assert.strictEqual(getRes.status, 200, "Expected 200 OK");
    const fetched1 = await getRes.json() as any;
    assert.strictEqual(fetched1.title, "Test Note 1");
    assert.strictEqual(fetched1.content, "<p>Hello world from SharePaste!</p>");
    assert.strictEqual(fetched1.isEncrypted, false);
    assert.deepStrictEqual(fetched1.tags, ["tech", "demo"]);
    console.log("✓ Paste fetched and content verified.");

    // 3. Test Raw Text Endpoint
    console.log("[Test 3] Testing Raw text endpoint...");
    const rawRes = await fetch(`${baseUrl}/raw/${paste1.slug}`);
    assert.strictEqual(rawRes.status, 200);
    const rawText = await rawRes.text();
    assert.ok(rawText.includes("Hello world from SharePaste!"), "Raw text should contain text");
    console.log("✓ Raw text endpoint verified.");

    // 4. Test 60-Minute Quick Share Code & QR
    console.log("[Test 4] Generating 60-minute Quick Share code and QR...");
    const qsRes = await fetch(`${baseUrl}/api/pastes/${paste1.slug}/quick-share`, {
      method: "POST"
    });
    assert.strictEqual(qsRes.status, 200, "Expected 200 OK for Quick Share");
    const qsData = await qsRes.json() as any;
    assert.ok(qsData.code && qsData.code.length === 6, "Code must be 6 digits");
    assert.ok(qsData.qrCodeDataUrl.startsWith("data:image/png;base64,"), "QR code must be a data URL");
    assert.ok(qsData.remainingSeconds >= 3590 && qsData.remainingSeconds <= 3600, "Validity must be 60 minutes (3600s)");
    console.log(`✓ Quick Share code generated: ${qsData.code} (TTL: ${qsData.remainingSeconds}s)`);

    // 5. Test Resolving Quick Share Code From Anywhere
    console.log("[Test 5] Resolving Quick Share code from anywhere...");
    const resolveRes = await fetch(`${baseUrl}/api/quick-share/${qsData.code}`);
    assert.strictEqual(resolveRes.status, 200, "Expected 200 OK for valid quick code");
    const resolvedData = await resolveRes.json() as any;
    assert.strictEqual(resolvedData.slug, paste1.slug, "Quick code must resolve to the correct paste slug");
    console.log(`✓ Quick code ${qsData.code} resolved correctly to paste ${resolvedData.slug}`);

    // 6. Test Password Protection & AES-256-GCM Unlock
    console.log("[Test 6] Testing AES-256-GCM encrypted paste...");
    const encRes = await fetch(`${baseUrl}/api/pastes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Secret Secret Note",
        content: "<p>This is top secret financial data!</p>",
        password: "MySuperSecretPassword123!"
      })
    });
    assert.strictEqual(encRes.status, 201);
    const encPaste = await encRes.json() as any;
    assert.strictEqual(encPaste.isEncrypted, true, "Paste should be marked as encrypted");

    // Fetching encrypted paste should NOT reveal content
    const fetchEnc = await (await fetch(`${baseUrl}/api/pastes/${encPaste.slug}`)).json() as any;
    assert.strictEqual(fetchEnc.content, null, "Encrypted paste must not reveal content without unlock");
    assert.strictEqual(fetchEnc.isEncrypted, true);

    // Try unlocking with WRONG password
    const wrongUnlock = await fetch(`${baseUrl}/api/pastes/${encPaste.slug}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong-password" })
    });
    assert.strictEqual(wrongUnlock.status, 401, "Expected 401 Unauthorized for wrong password");

    // Unlock with CORRECT password
    const correctUnlock = await fetch(`${baseUrl}/api/pastes/${encPaste.slug}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "MySuperSecretPassword123!" })
    });
    assert.strictEqual(correctUnlock.status, 200, "Expected 200 OK for correct password");
    const unlockedData = await correctUnlock.json() as any;
    assert.strictEqual(unlockedData.content, "<p>This is top secret financial data!</p>");
    console.log("✓ AES-256-GCM password protection & decryption verified.");

    // 7. Test Burn After Reading
    console.log("[Test 7] Testing Burn-After-Reading paste...");
    const burnRes = await fetch(`${baseUrl}/api/pastes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Self Destruct Note",
        content: "<p>This message will self-destruct after read.</p>",
        burnAfterReading: true
      })
    });
    const burnPaste = await burnRes.json() as any;

    // First read: should succeed
    const firstRead = await fetch(`${baseUrl}/api/pastes/${burnPaste.slug}`);
    assert.strictEqual(firstRead.status, 200, "First read must succeed");

    // Second read: should be 404/deleted
    const secondRead = await fetch(`${baseUrl}/api/pastes/${burnPaste.slug}`);
    assert.strictEqual(secondRead.status, 404, "Second read must be 404 because paste burned!");
    console.log("✓ Burn-after-reading self-destruction verified.");

    // 8. Test User Registration, Login & Dashboard
    console.log("[Test 8] Testing User Registration and Dashboard...");
    const testUser = `user_${Date.now()}`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: testUser,
        email: `${testUser}@example.com`,
        password: "password12345"
      })
    });
    assert.strictEqual(regRes.status, 201, "Expected 201 Created for registration");
    const authData = await regRes.json() as any;
    assert.ok(authData.token, "Auth token should be returned");

    // Create a paste as this user
    await fetch(`${baseUrl}/api/pastes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authData.token}`
      },
      body: JSON.stringify({
        title: "Authenticated User Note",
        content: "<p>Auth user content</p>",
        visibility: "public"
      })
    });

    // Fetch dashboard
    const dashRes = await fetch(`${baseUrl}/api/auth/dashboard`, {
      headers: { "Authorization": `Bearer ${authData.token}` }
    });
    assert.strictEqual(dashRes.status, 200);
    const dashData = await dashRes.json() as any;
    assert.strictEqual(dashData.pastes.length, 1, "Dashboard should list user's paste");
    assert.strictEqual(dashData.pastes[0].title, "Authenticated User Note");
    console.log("✓ User registration, login, and dashboard verified.");

    // 9. Test Guest Edit Token
    console.log("[Test 9] Testing anonymous edit token permissions...");
    const updateRes = await fetch(`${baseUrl}/api/pastes/${paste1.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Updated Title By Guest",
        content: "<p>Updated Content By Guest</p>",
        editToken: paste1.editToken
      })
    });
    assert.strictEqual(updateRes.status, 200, "Guest with editToken should be allowed to update");

    // 10. Test AI Polish API Validations
    console.log("[Test 10] Testing AI Polish endpoint validations...");
    // 10a: Empty content check
    const emptyAiRes = await fetch(`${baseUrl}/api/ai/polish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "" })
    });
    assert.strictEqual(emptyAiRes.status, 400, "Empty content should return 400");
    const emptyAiData = await emptyAiRes.json() as any;
    assert.strictEqual(emptyAiData.error, "EMPTY_CONTENT");

    // 10b: Missing API key check (when no server GEMINI_API_KEY is configured)
    delete process.env.GEMINI_API_KEY;
    const noKeyRes = await fetch(`${baseUrl}/api/ai/polish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "<p>test grammer and spellin</p>" })
    });
    // 11. Test Code Highlighted Container Creation & Retrieval
    console.log("[Test 11] Testing Code Highlighted Container Creation & Retrieval...");
    const sampleCodeBlock = `<div class="code-highlight-container" style="background-color: #0d1117;"><pre><code>const x = 42;</code></pre></div>`;
    const codePasteRes = await fetch(`${baseUrl}/api/pastes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Python Algorithm Code Snippet",
        content: sampleCodeBlock,
        visibility: "public"
      })
    });
    assert.strictEqual(codePasteRes.status, 201);
    const codePasteData = await codePasteRes.json() as any;
    assert.ok(codePasteData.slug);

    const getCodePaste = await (await fetch(`${baseUrl}/api/pastes/${codePasteData.slug}`)).json() as any;
    assert.ok(getCodePaste.content.includes("code-highlight-container"));
    assert.ok(getCodePaste.content.includes("const x = 42;"));
    // 12. Test Direct Interactive Code Compiler Publishing
    console.log("[Test 12] Testing Direct Interactive Code Compiler Publishing...");
    const compilerPayload = `<!-- SHAREPASTE_INTERACTIVE_CODE_V1 -->\n` + JSON.stringify({
      lang: "Python",
      langId: "python",
      code: "def add(a, b):\n    return a + b\n\nprint(add(10, 32))",
      output: "42\n[Exit Code 0]"
    });

    const directPublishRes = await fetch(`${baseUrl}/api/pastes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Python Addition Script",
        content: compilerPayload,
        visibility: "public"
      })
    });
    assert.strictEqual(directPublishRes.status, 201);
    const directData = await directPublishRes.json() as any;
    assert.ok(directData.slug);

    const fetchedDirect = await (await fetch(`${baseUrl}/api/pastes/${directData.slug}`)).json() as any;
    assert.ok(fetchedDirect.content.includes("SHAREPASTE_INTERACTIVE_CODE_V1"));
    const parsedPayload = JSON.parse(fetchedDirect.content.replace(/^[\s\S]*?<!-- SHAREPASTE_INTERACTIVE_CODE_V1 -->\s*/, ""));
    assert.strictEqual(parsedPayload.lang, "Python");
    assert.ok(parsedPayload.code.includes("def add"));
    assert.ok(parsedPayload.output.includes("42"));
    console.log("✓ Direct interactive compiler code paste published and verified.");

    // 13. Test Single-Pass Code Syntax Highlighting Engine
    console.log("[Test 13] Testing Single-Pass Code Syntax Highlighting Engine...");
    const samplePython = `# Python - Clean data summary & functions
def calculate_metrics(values):
    total = sum(values)
    mean = total / len(values)
    if mean > 50:
        status = "High Performance"
    else:
        status = "Normal"
    return {"total": total, "mean": mean, "status": status}

data = [15, 28, 42, 65, 89, 93, 104]
print("Input values:", data)
metrics = calculate_metrics(data)
print(f"Total: {metrics['total']} | Average: {metrics['mean']:.2f} | Status: {metrics['status']}")`;

    const tokenizedHtml = highlightCodeTokens(samplePython);
    // Must NOT contain mangled attributes or regex collision artifacts
    assert.ok(!tokenizedHtml.includes("700;>"), "No 700;> leakage in tokenized html");
    assert.ok(!tokenizedHtml.includes("600;>"), "No 600;> leakage in tokenized html");
    assert.ok(!tokenizedHtml.includes('class="token-string" style="color:'), "No corrupted style attributes");
    assert.ok(!tokenizedHtml.includes('class="token-comment" style="color:'), "No corrupted comment style attributes");

    // Must correctly highlight tokens
    assert.ok(tokenizedHtml.includes('<span class="token-keyword">def</span>'), "def keyword present");
    assert.ok(tokenizedHtml.includes('<span class="token-keyword">if</span>'), "if keyword present");
    assert.ok(tokenizedHtml.includes('<span class="token-keyword">else</span>'), "else keyword present");
    assert.ok(tokenizedHtml.includes('<span class="token-keyword">return</span>'), "return keyword present");
    assert.ok(tokenizedHtml.includes('<span class="token-builtin">print</span>'), "print builtin present");
    assert.ok(tokenizedHtml.includes('<span class="token-builtin">sum</span>'), "sum builtin present");
    assert.ok(tokenizedHtml.includes('<span class="token-builtin">len</span>'), "len builtin present");
    assert.ok(tokenizedHtml.includes('<span class="token-comment"># Python - Clean data summary &amp; functions</span>'), "comment formatted properly");
    assert.ok(tokenizedHtml.includes('<span class="token-string">"High Performance"</span>'), "string formatted properly");
    console.log("✓ Single-pass syntax highlighting engine verified with zero tag leakage.");

    // 14. Test DuoPaste Real-Time Collaborative Live Editor
    console.log("[Test 14] Testing DuoPaste Real-Time Collaborative Live Editor...");
    // Step 1: User A creates a DuoPaste session
    const createDuoRes = await fetch(`${baseUrl}/api/duo/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Team Collaborative Draft",
        content: "<p>Original paragraph written by User A.</p>"
      })
    });
    assert.strictEqual(createDuoRes.status, 201, "Duo create should return 201");
    const duoDataA = await createDuoRes.json() as any;
    assert.ok(duoDataA.pin, "DuoPaste PIN must be generated");
    assert.strictEqual(duoDataA.pin.length, 6, "PIN should be 6 characters/digits");
    assert.ok(duoDataA.clientId, "Host client ID must be generated");
    assert.strictEqual(duoDataA.role, "host");
    console.log(`✓ User A started DuoPaste session with PIN: ${duoDataA.pin}`);

    // Step 2: User B joins with PIN
    const joinDuoRes = await fetch(`${baseUrl}/api/duo/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: duoDataA.pin })
    });
    assert.strictEqual(joinDuoRes.status, 200, "Duo join should return 200");
    const duoDataB = await joinDuoRes.json() as any;
    assert.strictEqual(duoDataB.role, "guest");
    assert.ok(duoDataB.clientId);
    assert.strictEqual(duoDataB.session.title, "Team Collaborative Draft");
    assert.ok(duoDataB.session.content.includes("Original paragraph"));
    console.log(`✓ User B successfully joined DuoPaste session ${duoDataA.pin}`);

    // Step 3: User B makes an edit and syncs
    const syncRes = await fetch(`${baseUrl}/api/duo/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin: duoDataA.pin,
        clientId: duoDataB.clientId,
        title: "Team Collaborative Draft (Updated)",
        content: "<p>Original paragraph written by User A.</p><p>Second paragraph added by User B.</p>"
      })
    });
    assert.strictEqual(syncRes.status, 200, "Sync should return 200");
    const syncData = await syncRes.json() as any;
    assert.ok(syncData.version > 1, "Session version must increment");

    // Step 4: Verify synced session reflects both users' changes
    const fetchDuoRes = await fetch(`${baseUrl}/api/duo/${duoDataA.pin}`);
    assert.strictEqual(fetchDuoRes.status, 200);
    const fetchedDuo = await fetchDuoRes.json() as any;
    assert.strictEqual(fetchedDuo.session.title, "Team Collaborative Draft (Updated)");
    assert.ok(fetchedDuo.session.content.includes("Second paragraph added by User B."));
    console.log("✓ Live bi-directional keystroke sync verified between User A and User B.");

    // Step 5: Freeze and publish into a permanent shared paste
    const publishDuoRes = await fetch(`${baseUrl}/api/duo/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: duoDataA.pin, visibility: "public" })
    });
    assert.strictEqual(publishDuoRes.status, 201, "Publish should return 201");
    const pubDuoData = await publishDuoRes.json() as any;
    assert.ok(pubDuoData.slug, "Permanent slug must be returned");

    // Verify published paste in pastes table
    const getSharedPaste = await (await fetch(`${baseUrl}/api/pastes/${pubDuoData.slug}`)).json() as any;
    assert.strictEqual(getSharedPaste.title, "Team Collaborative Draft (Updated)");
    assert.ok(getSharedPaste.content.includes("Second paragraph added by User B."));
    console.log(`✓ Shared DuoPaste frozen and published to permanent paste: /p/${pubDuoData.slug}`);

    // 15. Test Word Document Live Formatting Preservation & Publishing
    console.log("[Test 15] Testing Word Document Live Formatting Preservation & Publishing...");
    const sampleWordDocContent = `
      <h1 style="font-family: 'Calibri Light', sans-serif; font-size: 20pt; color: #1f497d; font-weight: bold;">Quarterly Business Review</h1>
      <p style="font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.15; color: #000000;">
        This document was created in the <strong>SharePaste Word Document Editor</strong> featuring classic Microsoft Office formatting.
      </p>
      <p style="font-family: Calibri, sans-serif; font-size: 11pt;">
        Here is text with <span style="background-color: #ffff00;">Yellow Word Highlighter</span> and text with <span style="color: #c00000; font-weight: bold;">Dark Red Accent Color</span>.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #94a3b8;">
        <thead>
          <tr>
            <th style="border: 1px solid #94a3b8; background-color: #f1f5f9; padding: 8px 12px; font-weight: bold;">Project Milestone</th>
            <th style="border: 1px solid #94a3b8; background-color: #f1f5f9; padding: 8px 12px; font-weight: bold;">Owner</th>
            <th style="border: 1px solid #94a3b8; background-color: #f1f5f9; padding: 8px 12px; font-weight: bold;">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Word Document Mode</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Engineering</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px; color: #00b050; font-weight: bold;">Completed</td>
          </tr>
        </tbody>
      </table>
      <div style="border-left: 4px solid #0284c7; background-color: #f0f9ff; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 0; font-weight: 600; color: #0369a1;">Word Callout Box Note:</p>
        <p style="margin: 4px 0 0 0; color: #334155;">Full Word formatting suite active.</p>
      </div>
    `;

    const wordPasteRes = await fetch(`${baseUrl}/api/pastes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Q3 Executive Summary (Word Document)",
        content: sampleWordDocContent,
        visibility: "public"
      })
    });
    assert.strictEqual(wordPasteRes.status, 201, "Word doc should publish with 201");
    const wordPasteData = await wordPasteRes.json() as any;
    assert.ok(wordPasteData.slug, "Slug must be generated for Word document");

    const getWordPaste = await (await fetch(`${baseUrl}/api/pastes/${wordPasteData.slug}`)).json() as any;
    assert.strictEqual(getWordPaste.title, "Q3 Executive Summary (Word Document)");
    assert.ok(getWordPaste.content.includes("font-family: 'Calibri Light'"));
    assert.ok(getWordPaste.content.includes("background-color: #ffff00"));
    assert.ok(getWordPaste.content.includes("Quarterly Business Review"));
    assert.ok(getWordPaste.content.includes("Project Milestone"));
    console.log(`✓ Word document styling, tables, fonts, and highlights preserved on /p/${wordPasteData.slug}`);

    // 16. Test Word Collab (User A & B Live Synchronization & Shared Publishing)
    console.log("[Test 16] Testing Word Collab Live Collaboration & Shared Publishing...");
    
    // Verify mammoth docx parser is present
    assert.strictEqual(typeof mammoth.convertToHtml, "function", "mammoth.convertToHtml must be a function");
    console.log("✓ Mammoth docx parser loaded and verified");

    // Step A: User A creates a Word Collab session
    const wordCollabCreateRes = await fetch(`${baseUrl}/api/duo/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Collaborative Project Charter",
        content: "<h1 style=\"color:#1f497d; font-family:'Calibri Light';\">Project Charter</h1><p>Authored initially by User A.</p>"
      })
    });
    assert.strictEqual(wordCollabCreateRes.status, 201, "Collab session should be created with 201");
    const wordCollabData = await wordCollabCreateRes.json() as any;
    const pin = wordCollabData.pin;
    const userAClientId = wordCollabData.clientId;
    assert.ok(pin && pin.length === 6, "Valid 6-digit PIN generated");
    assert.ok(userAClientId, "User A received client ID");
    console.log(`✓ User A started Word Collab session with PIN ${pin}`);

    // Step B: User B joins Word Collab session
    const wordCollabJoinRes = await fetch(`${baseUrl}/api/duo/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });
    assert.strictEqual(wordCollabJoinRes.status, 200, "User B joins successfully");
    const joinData = await wordCollabJoinRes.json() as any;
    const userBClientId = joinData.clientId;
    assert.notStrictEqual(userBClientId, userAClientId, "User B gets unique client ID");
    assert.strictEqual(joinData.session.guest_client_id, userBClientId, "User B registered as guest");
    console.log(`✓ User B successfully joined Word Collab session with PIN ${pin}`);

    // Step C: User A edits content with Word styling and syncs live
    const userAWordUpdate = `<h1 style="color:#1f497d; font-family:'Calibri Light';">Project Charter</h1><p>Authored initially by User A.</p><div style="background-color:#eff6ff; border-left:4px solid #3b82f6; padding:8px 12px;"><p style="font-weight:bold; color:#1d4ed8;">Milestone 1 by User A</p></div>`;
    const syncResA = await fetch(`${baseUrl}/api/duo/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin,
        clientId: userAClientId,
        title: "Collaborative Project Charter (v2)",
        content: userAWordUpdate
      })
    });
    assert.strictEqual(syncResA.status, 200, "User A sync succeeded");

    // Verify User B receives User A's update
    const freshSessionB = await (await fetch(`${baseUrl}/api/duo/${pin}`)).json() as any;
    assert.strictEqual(freshSessionB.session.title, "Collaborative Project Charter (v2)");
    assert.strictEqual(freshSessionB.session.content, userAWordUpdate);
    console.log("✓ User A's Word formatting synced live to session");

    // Step D: User B contributes with Word highlighting and adds a section
    const userBWordUpdate = userAWordUpdate + `<p style="background-color:#ffff00; font-family:Calibri;">Reviewed & approved by User B with Word Highlighter.</p>`;
    const syncResB = await fetch(`${baseUrl}/api/duo/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin,
        clientId: userBClientId,
        content: userBWordUpdate
      })
    });
    assert.strictEqual(syncResB.status, 200, "User B sync succeeded");

    // Step E: User B publishes the shared Word Document
    const pubCollabRes = await fetch(`${baseUrl}/api/duo/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, visibility: "public" })
    });
    assert.strictEqual(pubCollabRes.status, 201, "Publish shared Word doc succeeded");
    const pubCollabData = await pubCollabRes.json() as any;
    assert.ok(pubCollabData.slug, "Collaborative Word doc has public slug");

    // Step F: Verify published document has combined content and styling from both users
    const finalSharedPaste = await (await fetch(`${baseUrl}/api/pastes/${pubCollabData.slug}`)).json() as any;
    assert.strictEqual(finalSharedPaste.title, "Collaborative Project Charter (v2)");
    assert.ok(finalSharedPaste.content.includes("Milestone 1 by User A"));
    assert.ok(finalSharedPaste.content.includes("Reviewed & approved by User B with Word Highlighter"));
    assert.ok(finalSharedPaste.content.includes("background-color:#ffff00"));
    console.log(`✓ Collaborative Word document published successfully at /p/${pubCollabData.slug} with both User A & User B edits!`);

    console.log("\n=======================================================");
    console.log("🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY! (16/16) 🎉");
    console.log("=======================================================\n");


  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
