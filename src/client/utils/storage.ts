export function saveEditToken(slug: string, token: string) {
  try {
    const raw = localStorage.getItem("jp_edit_tokens") || "{}";
    const tokens = JSON.parse(raw);
    tokens[slug] = token;
    localStorage.setItem("jp_edit_tokens", JSON.stringify(tokens));
  } catch (e) {
    console.error("Failed to save edit token:", e);
  }
}

export function getEditToken(slug: string): string | null {
  try {
    const raw = localStorage.getItem("jp_edit_tokens") || "{}";
    const tokens = JSON.parse(raw);
    return tokens[slug] || null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string) {
  localStorage.setItem("jp_auth_token", token);
}

export function getAuthToken(): string | null {
  return localStorage.getItem("jp_auth_token");
}

export function removeAuthToken() {
  localStorage.removeItem("jp_auth_token");
}
