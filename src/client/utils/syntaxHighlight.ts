/**
 * Robust single-pass syntax tokenizer for SharePaste code highlighting.
 *
 * IMPORTANT: This tokenizer operates in a single pass over the raw unescaped code.
 * It NEVER performs recursive or sequential string replacements on already-generated HTML,
 * preventing any token collisions, attribute mangling (e.g. 700;>, class=...), or corrupted tags.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Master token matcher regular expression
// Matches in order of precedence:
// Group 1: Python triple-quoted docstrings / strings ("""...""" or '''...''')
// Group 2: Comments (//..., #..., /*...*/, --...)
// Group 3: Strings ("...", '...', `...`)
// Group 4: Keywords & control flow (def, if, else, for, while, return, class, etc.)
// Group 5: Inbuilt functions & globals (print, len, sum, range, console, alert, etc.)
// Group 6: Numbers and boolean/null literals (True, False, None, 123, 45.67, etc.)
const TOKEN_MASTER_REGEX = new RegExp(
  [
    // 1. Triple quoted strings (Python docstrings)
    `("""[\\s\\S]*?"""|'''[\\s\\S]*?''')`,
    // 2. Comments (//, #, /* */, --)
    `(\\/\\/[^\\r\\n]*|#[^\\r\\n]*|\\/\\*[\\s\\S]*?\\*\\/|--[^\\r\\n]*)`,
    // 3. Regular strings ("...", '...', `...` with escaped character support)
    `("(?:\\\\.|[^"\\\\\\r\\n])*"|'(?:\\\\.|[^'\\\\\\r\\n])*'|\`(?:\`\`|\\\\.|[^\\\`])*?\`)`,
    // 4. Keywords & control flow
    `\\b(def|class|if|else|elif|for|while|return|function|const|let|var|import|from|export|async|await|try|except|finally|lambda|yield|pass|break|continue|in|is|not|and|or|type|interface|public|private|static|void|fn|package|struct|switch|case|default|new|throw|catch|with|as|del|assert|match)\\b`,
    // 5. Inbuilt functions & globals
    `\\b(print|len|sum|range|min|max|abs|round|enumerate|zip|map|filter|input|open|isinstance|int|float|str|list|dict|set|tuple|bool|super|console|log|info|warn|error|alert|prompt|confirm|setTimeout|setInterval|parseInt|parseFloat|Math|JSON)\\b`,
    // 6. Numbers & Booleans
    `\\b(True|False|None|true|false|null|undefined|\\d+(?:\\.\\d+)?)\\b`
  ].join("|"),
  "gm"
);

export function highlightCodeTokens(rawCode: string): string {
  if (!rawCode) return "";

  // Reset regex state
  TOKEN_MASTER_REGEX.lastIndex = 0;

  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_MASTER_REGEX.exec(rawCode)) !== null) {
    const matchIndex = match.index;

    // 1. Append unhighlighted raw text between matches (e.g. spaces, operators, identifiers)
    if (matchIndex > lastIndex) {
      result += escapeHtml(rawCode.slice(lastIndex, matchIndex));
    }

    const [
      ,
      tripleString,
      comment,
      regularString,
      keyword,
      builtin,
      numberOrBool
    ] = match;

    // 2. Wrap matched token in its appropriate CSS class
    if (tripleString) {
      result += `<span class="token-string">${escapeHtml(tripleString)}</span>`;
    } else if (comment) {
      result += `<span class="token-comment">${escapeHtml(comment)}</span>`;
    } else if (regularString) {
      result += `<span class="token-string">${escapeHtml(regularString)}</span>`;
    } else if (keyword) {
      result += `<span class="token-keyword">${escapeHtml(keyword)}</span>`;
    } else if (builtin) {
      result += `<span class="token-builtin">${escapeHtml(builtin)}</span>`;
    } else if (numberOrBool) {
      result += `<span class="token-number">${escapeHtml(numberOrBool)}</span>`;
    } else {
      result += escapeHtml(match[0]);
    }

    lastIndex = TOKEN_MASTER_REGEX.lastIndex;
  }

  // 3. Append any remaining code after the last token match
  if (lastIndex < rawCode.length) {
    result += escapeHtml(rawCode.slice(lastIndex));
  }

  return result;
}
