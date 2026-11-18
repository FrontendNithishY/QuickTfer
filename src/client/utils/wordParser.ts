import JSZip from "jszip";
import * as mammoth from "mammoth";

/**
 * Split an HTML document into individual page chunks based on page break dividers.
 */
export function splitIntoPages(html: string): string[] {
  if (!html || !html.trim()) {
    return ["<p><br></p>"];
  }

  // Split by standardized page breaks or legacy hr tags
  const rawPages = html.split(/<hr[^>]*class="[^"]*word-page-break[^"]*"[^>]*>|<hr[^>]*data-page-break="true"[^>]*>|<div[^>]*class="[^"]*word-page-break[^"]*"[^>]*>[\s\S]*?<\/div>/gi);

  const cleaned = rawPages
    .map(p => p.trim())
    .filter((p, index) => p.length > 0 || index === 0);

  return cleaned.length > 0 ? cleaned : ["<p><br></p>"];
}

/**
 * Join individual page HTML chunks into a single document with explicit page breaks.
 */
export function joinPagesToHtml(pages: string[]): string {
  if (!pages || pages.length === 0) {
    return "<p><br></p>";
  }
  return pages.join('<hr class="word-page-break" data-page-break="true" />');
}

/**
 * High-fidelity Word (.docx) parser:
 * 1. Pre-processes the docx zip archive with JSZip to detect <w:lastRenderedPageBreak/> and
 *    convert them to explicit <w:br w:type="page"/> so Word's natural pagination boundaries are preserved.
 * 2. Uses mammoth with transformDocument to extract all paragraph alignments (center, right, justify, both).
 * 3. Preserves tables, headings, bold/italics, and font styling.
 * 4. Post-processes output HTML with permanent inline style="text-align: ..." attributes.
 */
export async function parseDocxBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    let bufferToParse: ArrayBuffer | Uint8Array = arrayBuffer;

    try {
      // 1. Inspect docx zip archive using JSZip to extract pagination and alignment metadata
      const zip = await JSZip.loadAsync(arrayBuffer);
      const documentXmlFile = zip.file("word/document.xml");

      if (documentXmlFile) {
        let docXml = await documentXmlFile.async("string");

        // Convert Word's natural pagination breaks (<w:lastRenderedPageBreak/>) into explicit breaks
        // so that multi-page documents are not combined into one single page.
        if (/<w:lastRenderedPageBreak\s*\/?>/i.test(docXml)) {
          docXml = docXml.replace(/<w:lastRenderedPageBreak\s*\/?>/gi, '<w:r><w:br w:type="page"/></w:r>');
          zip.file("word/document.xml", docXml);
          bufferToParse = await zip.generateAsync({ type: "uint8array" });
        }
      }
    } catch (zipErr) {
      console.warn("JSZip pre-processing warning:", zipErr);
      // Fallback to original buffer if zip inspection encounters unexpected format
      bufferToParse = arrayBuffer;
    }

    // 2. Configure Mammoth transforms & style mapping to preserve Word alignments and page breaks
    const options: any = {
      transformDocument: mammoth.transforms.paragraph((p: any) => {
        // Extract paragraph alignment from Word XML (<w:jc w:val="center|right|both|justify"/>)
        const align = p.alignment ? String(p.alignment).toLowerCase() : null;
        if (align === "center") {
          return Object.assign({}, p, { styleId: "Center", styleName: "Center" });
        }
        if (align === "right") {
          return Object.assign({}, p, { styleId: "Right", styleName: "Right" });
        }
        if (align === "both" || align === "justify") {
          return Object.assign({}, p, { styleId: "Justify", styleName: "Justify" });
        }
        return p;
      }),
      styleMap: [
        "p[style-name='Center'] => p.text-center:fresh",
        "p[style-name='Right'] => p.text-right:fresh",
        "p[style-name='Justify'] => p.text-justify:fresh",
        "p[style-name='Heading 1 Center'] => h1.text-center:fresh",
        "p[style-name='Heading 2 Center'] => h2.text-center:fresh",
        "p[style-name='Heading 3 Center'] => h3.text-center:fresh",
        "p[style-name='Heading 1 Right'] => h1.text-right:fresh",
        "p[style-name='Heading 2 Right'] => h2.text-right:fresh",
        "p[style-name='Heading 3 Right'] => h3.text-right:fresh",
        "br[type='page'] => hr.word-page-break:fresh",
        "table => table.word-table:fresh"
      ]
    };

    const inputOptions: any = { arrayBuffer: bufferToParse };
    if (typeof Buffer !== "undefined") {
      inputOptions.buffer = Buffer.isBuffer(bufferToParse)
        ? bufferToParse
        : Buffer.from(bufferToParse as any);
    }

    const result = await mammoth.convertToHtml(
      inputOptions,
      options
    );

    let html = result.value || "";

    // 3. Post-process to embed inline styles for 100% universal preservation
    html = html
      .replace(/<p class="text-center">/g, '<p style="text-align: center;">')
      .replace(/<p class="text-right">/g, '<p style="text-align: right;">')
      .replace(/<p class="text-justify">/g, '<p style="text-align: justify;">')
      .replace(/<h1 class="text-center">/g, '<h1 style="text-align: center;">')
      .replace(/<h2 class="text-center">/g, '<h2 style="text-align: center;">')
      .replace(/<h3 class="text-center">/g, '<h3 style="text-align: center;">')
      .replace(/<h1 class="text-right">/g, '<h1 style="text-align: right;">')
      .replace(/<h2 class="text-right">/g, '<h2 style="text-align: right;">')
      .replace(/<h3 class="text-right">/g, '<h3 style="text-align: right;">')
      .replace(/<hr class="word-page-break" ?\/?>/g, '<hr class="word-page-break" data-page-break="true" />');

    return html;
  } catch (err) {
    console.error("Docx parsing error:", err);
    throw err;
  }
}
