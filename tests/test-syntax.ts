import assert from "node:assert";
import { highlightCodeTokens } from "../src/client/utils/syntaxHighlight.js";

const userCode = `# Python - Clean data summary & functions
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

console.log("Testing highlightCodeTokens with user code...");
const highlighted = highlightCodeTokens(userCode);
console.log("--- HIGHLIGHTED OUTPUT ---");
console.log(highlighted);
console.log("--------------------------");

// 1. Verify NO corrupted tags like 700;> or 600;> exist
assert.ok(!highlighted.includes("700;>"), "Highlighted output must not contain 700;>");
assert.ok(!highlighted.includes("600;>"), "Highlighted output must not contain 600;>");
assert.ok(!highlighted.includes('class="token-string" style="color:'), "Must not have mangled style attributes");
assert.ok(!highlighted.includes('class="token-comment" style="color:'), "Must not have mangled style attributes");

// 2. Verify def, if, else, return are properly wrapped in token-keyword
assert.ok(highlighted.includes('<span class="token-keyword">def</span>'), "def must be keyword");
assert.ok(highlighted.includes('<span class="token-keyword">if</span>'), "if must be keyword");
assert.ok(highlighted.includes('<span class="token-keyword">else</span>'), "else must be keyword");
assert.ok(highlighted.includes('<span class="token-keyword">return</span>'), "return must be keyword");

// 3. Verify builtins: sum, len, print are properly wrapped in token-builtin
assert.ok(highlighted.includes('<span class="token-builtin">sum</span>'), "sum must be builtin");
assert.ok(highlighted.includes('<span class="token-builtin">len</span>'), "len must be builtin");
assert.ok(highlighted.includes('<span class="token-builtin">print</span>'), "print must be builtin");

// 4. Verify comments: # Python - Clean data summary & functions
assert.ok(highlighted.includes('<span class="token-comment"># Python - Clean data summary &amp; functions</span>'), "comment must be wrapped");

// 5. Verify strings: "High Performance", "Normal"
assert.ok(highlighted.includes('<span class="token-string">&quot;High Performance&quot;</span>') || highlighted.includes('<span class="token-string">"High Performance"</span>'), "strings must be wrapped");

console.log("✓ ALL PYTHON SYNTAX HIGHLIGHTING CHECKS PASSED PERFECTLY!");

// Test JavaScript / TypeScript
const jsCode = `// Fetch data and calculate sum
const calculateTotal = (items: number[]): number => {
  return items.reduce((acc, curr) => acc + curr, 0);
};
console.log("Result:", calculateTotal([10, 20, 30]));`;

const jsHighlighted = highlightCodeTokens(jsCode);
assert.ok(jsHighlighted.includes('<span class="token-keyword">const</span>'), "const keyword");
assert.ok(jsHighlighted.includes('<span class="token-keyword">return</span>'), "return keyword");
assert.ok(jsHighlighted.includes('<span class="token-builtin">console</span>'), "console builtin");
assert.ok(jsHighlighted.includes('<span class="token-comment">// Fetch data and calculate sum</span>'), "comment");
assert.ok(!jsHighlighted.includes("700;>"), "No corrupted tags in JS");
console.log("✓ ALL JS/TS SYNTAX HIGHLIGHTING CHECKS PASSED PERFECTLY!");

// Test C++ / Rust
const cppCode = `// C++ demo
#include <iostream>
int main() {
    int total = 100;
    if (total > 50) {
        std::cout << "Valid" << std::endl;
    }
    return 0;
}`;

const cppHighlighted = highlightCodeTokens(cppCode);
assert.ok(cppHighlighted.includes('<span class="token-keyword">if</span>'), "if keyword");
assert.ok(cppHighlighted.includes('<span class="token-keyword">return</span>'), "return keyword");
assert.ok(cppHighlighted.includes('<span class="token-number">100</span>'), "number");
assert.ok(!cppHighlighted.includes("700;>"), "No corrupted tags in C++");
console.log("✓ ALL C++ SYNTAX HIGHLIGHTING CHECKS PASSED PERFECTLY!");

