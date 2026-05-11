import "server-only";
import { sanitizeRichText } from "./sanitize-html";

export type SplitDescription = {
  main: string;
  sizeChart: string | null;
};

// Importer embeds the size chart inside `description` as `<h3>Size Chart</h3>` followed
// by either a plain HTML table or a single `<img>` tag (see inventory-audit/scripts/import-medusa.ts).
// Splitting here so the PDP can show description and size chart in separate accordion sections.
export function splitProductDescription(
  description: string | null | undefined,
): SplitDescription {
  if (!description) return { main: "", sizeChart: null };
  const re = /<h3[^>]*>\s*Size Chart\s*<\/h3>/i;
  const match = re.exec(description);
  if (!match) {
    return { main: sanitizeRichText(cleanHtml(description)), sizeChart: null };
  }
  const main = sanitizeRichText(cleanHtml(description.slice(0, match.index)));
  const sizeChart = sanitizeRichText(
    cleanHtml(description.slice(match.index + match[0].length)),
  );
  return {
    main,
    sizeChart: sizeChart || null,
  };
}

// Strip the empty wrapping markup the importer leaves around the size chart
// (visible as a tall blank gap above the table). Peels off whitespace,
// &nbsp;, <br>, HTML comments, and any leading/trailing tag whose inner
// content reduces to nothing — including nested wrappers like
// <p><span>&nbsp;</span></p> or <p><strong><br></strong></p>.
const VOID_TAGS = new Set([
  "br", "hr", "img", "input", "meta", "link", "source", "track", "wbr", "area", "base", "col", "embed", "param",
]);

function isBlankHtml(s: string): boolean {
  const noComments = s.replace(/<!--[\s\S]*?-->/g, "");
  const noTags = noComments.replace(/<[^>]*>/g, "");
  const noEntities = noTags
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/&#8203;/g, " ")
    .replace(/&zwj;/gi, " ")
    .replace(/&zwnj;/gi, " ");
  return noEntities.trim() === "";
}

function cleanHtml(s: string): string {
  let out = s;
  const atomLeading = /^(?:\s|&nbsp;|&#160;|&#8203;|<br\s*\/?>|<!--[\s\S]*?-->)+/i;
  const atomTrailing = /(?:\s|&nbsp;|&#160;|&#8203;|<br\s*\/?>|<!--[\s\S]*?-->)+$/i;

  let prev = "";
  let iters = 0;
  while (prev !== out && iters < 50) {
    prev = out;
    iters++;
    out = out.replace(atomLeading, "").replace(atomTrailing, "");

    const leadMatch = /^<([a-z][a-z0-9]*)([^>]*)>([\s\S]*?)<\/\1\s*>/i.exec(out);
    if (leadMatch && !VOID_TAGS.has(leadMatch[1].toLowerCase()) && isBlankHtml(leadMatch[3])) {
      out = out.slice(leadMatch[0].length);
      continue;
    }

    const trailRe = /<([a-z][a-z0-9]*)([^>]*)>([\s\S]*?)<\/\1\s*>\s*$/i;
    const trailMatch = trailRe.exec(out);
    if (trailMatch && !VOID_TAGS.has(trailMatch[1].toLowerCase()) && isBlankHtml(trailMatch[3])) {
      out = out.slice(0, trailMatch.index);
    }
  }

  out = out.replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>");
  return out.trim();
}
