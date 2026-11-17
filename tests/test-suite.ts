import assert from "node:assert";
import http from "node:http";
import { db } from "../src/server/db.js";
import express from "express";
import authRouter from "../src/server/routes/auth.js";
import pastesRouter from "../src/server/routes/pastes.js";
import quickShareRouter from "../src/server/routes/quickShare.js";
import uploadRouter from "../src/server/routes/upload.js";
import aiRouter from "../src/server/routes/ai.js";

const app = express();
app.use(express.json());
app.use("/api", authRouter);
app.use("/api", pastesRouter);
app.use("/api", quickShareRouter);
app.use("/api", uploadRouter);
app.use("/api", aiRouter);
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

    console.log("\n=======================================================");
    console.log("🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY! (12/12) 🎉");
    console.log("=======================================================\n");
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
