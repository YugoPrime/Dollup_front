import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "a",
  "b",
  "br",
  "caption",
  "div",
  "em",
  "h2",
  "h3",
  "h4",
  "img",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
];

const ALLOWED_ATTR = [
  "alt",
  "colspan",
  "height",
  "href",
  "rel",
  "rowspan",
  "src",
  "target",
  "title",
  "width",
];

export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";

  return DOMPurify.sanitize(html, {
    ALLOWED_ATTR,
    ALLOWED_TAGS,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/(?!\/)|#)/i,
    FORBID_ATTR: ["class", "id", "style"],
    FORBID_TAGS: ["button", "embed", "form", "iframe", "input", "object", "script", "style"],
  });
}
