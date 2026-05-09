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
// (visible as a tall blank gap above the table). Repeatedly peel off leading
// whitespace, &nbsp;, <br>, and empty <p>/<div> until we hit real content.
function cleanHtml(s: string): string {
  let out = s;
  const leading =
    /^(?:\s|&nbsp;|<br\s*\/?>|<p[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>|<div[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/div>)+/i;
  const trailing =
    /(?:\s|&nbsp;|<br\s*\/?>|<p[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>|<div[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/div>)+$/i;
  let prev: string;
  do {
    prev = out;
    out = out.replace(leading, "").replace(trailing, "");
  } while (out !== prev);
  out = out.replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>");
  return out.trim();
}
