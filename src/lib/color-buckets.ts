// Canonical color name → display label. Variants in the catalog use messy
// spellings ("burgandy"/"burgundy", "Light Pink"/"lightpink"/"l.pink"); this
// table maps whatever the variant says into a single canonical bucket so the
// filter doesn't show 4 versions of pink. Returns null for colors we don't
// recognise (intentionally hidden from the filter to keep it tight).
export const COLOR_CANONICAL: Record<string, string> = {
  black: "black", white: "white", cream: "cream", ivory: "cream", off: "cream", "off white": "cream",
  red: "red", burgundy: "burgundy", burgandy: "burgundy", wine: "burgundy",
  pink: "pink", "light pink": "pink", "hot pink": "pink", fuchsia: "pink", rose: "pink",
  blush: "blush", nude: "nude", beige: "nude", sand: "nude", tan: "nude", camel: "nude",
  brown: "brown", chocolate: "brown", coffee: "brown",
  grey: "grey", gray: "grey", silver: "grey", charcoal: "grey",
  blue: "blue", navy: "navy", denim: "blue", "light blue": "blue", "sky blue": "blue", teal: "blue",
  green: "green", olive: "green", khaki: "green", mint: "green", emerald: "green",
  yellow: "yellow", mustard: "yellow", gold: "yellow",
  orange: "orange", coral: "coral", peach: "coral", salmon: "coral",
  purple: "purple", lavender: "purple", lilac: "purple", violet: "purple", mauve: "purple",
  multi: "multi", multicolor: "multi", multicolour: "multi", print: "multi", pattern: "multi",
};
export function canonicalColor(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  return COLOR_CANONICAL[key] ?? COLOR_CANONICAL[key.replace(/[-_\s]+/g, " ")] ?? null;
}
