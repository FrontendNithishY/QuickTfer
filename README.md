# QuickTrfr ⚡

> **Fast Paste & Transfer Anywhere** — A production-grade, modern content publishing, sharing, and transfer platform equipped with rich text WYSIWYG editing, document & media embeds, AES-256-GCM password encryption, flexible expiration, custom short URLs, user accounts, and an exclusive **60-Minute Quick Code & QR Sharing** engine.

Live Website: **[https://quicktrfr.vercel.app](https://quicktrfr.vercel.app)**

---

## ✨ Key Features

### 1. ⚡ 60-Minute Quick Share Code & QR ("Share Anywhere")
- **Pairing Code**: Generates a temporary 6-digit access code (e.g., `849 201`) alongside a high-resolution scannable QR code.
- **Universal Access**: Anyone on mobile or desktop can type the 6-digit code in the top navigation bar or scan the QR code to open the note instantly without searching or typing URLs.
- **Auto-Expiration**: Each quick-share session has a strict 60-minute time-to-live (TTL) with an active countdown display.

### 2. 📝 Full WYSIWYG Rich Text Editor
- **Typography**: Headings (H1, H2, H3, Paragraph), Bold, Italic, Underline, Strikethrough, Code snippets, Blockquotes, and Horizontal dividers.
- **Lists & Tables**: Bullet lists, numbered lists, and interactive table generation.
- **Embeds**: YouTube video embeds, LaTeX math equations (via KaTeX), and text color formatting.
- **Media**: Drag-and-drop & clipboard image pasting, stored locally with instant preview.
- **Document Import**: Load raw text or markdown from `.txt` and `.md` files directly into the editor canvas.
- **Live Statistics**: Real-time word count, character count, and estimated reading time.

### 3. 🔐 Security & Publishing Controls
- **AES-256-GCM Encryption**: Password-protected notes are securely encrypted on the server with PBKDF2 key derivation and random salts. Decryption is only possible with the correct passphrase.
- **Flexible Expiration**: Never, 10 Minutes, 1 Hour, 1 Day, 1 Week, 1 Month, or custom date/time.
- **Burn After Reading**: Option to automatically self-destruct the note permanently after a single read.
- **Visibility**: Public (searchable), Unlisted (link-only), or Private (account-only).
- **Custom URLs**: Choose custom vanity slugs (e.g. `quicktrfr/my-custom-note`) or use clean auto-generated slugs.
- **View Counter & Comments Toggle**: Configure whether view counts and reader discussions are enabled.

### 4. 🚀 Reading & Export Experience
- Clean, minimal reading interface with author badge, view count, and publication date.
- **One-Click Exports**:
  - Save as PDF (print-optimized)
  - Plain text (`.txt`)
  - Web page (`.html`)
  - Raw plain-text endpoint (`/raw/:slug`)
- **Forking / Cloning**: Duplicate any note directly into the editor to build a derivative version.
- **Guest Editing**: Anonymous authors receive a secret `edit_token` stored in browser storage to edit or delete notes later without signing in.

### 5. 👤 User Accounts & Dashboard
- Register & Login with secure password hashing (`bcrypt`) and JWT sessions.
- **My Pastes Dashboard**: Centralized management panel to view all personal notes, track views, filter by tags, and delete/edit articles.
- **Public Profile**: Shareable author page (`/u/:username`) displaying public notes and profile bio.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, TypeScript, Native SQLite (`node:sqlite` in WAL mode)
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons
- **Security & Math**: AES-256-GCM, Bcrypt, JWT, KaTeX, QRCode
- **Zero Native Build Dependencies**: Powered by Node 22+ native SQLite with zero Python/C++ compiler requirements.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v22+ or v26+
- npm v10+

### Installation & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/FrontendNithishY/QuickTfer.git
   cd QuickTfer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development environment (Client + Server concurrently):
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. Or run production build:
   ```bash
   npm run build
   npm start
   ```
   Server runs at [http://localhost:3000](http://localhost:3000).

---

## 🧪 Testing

The repository includes a comprehensive automated test suite verifying all 10 core backend flows (anonymous publishing, AES-256-GCM encryption/unlock, 60-min Quick Share code & QR generation, burn-after-reading destruction, raw endpoints, and auth):

```bash
npm test
```

---

## 📄 License

MIT License. Built with ❤️.
