// Maps a raw variant color value (e.g. "Light Blue", "Royal Blue", "Burgandy")
// to a CSS background string. Used by PDP swatches (ProductBuy) and shop product
// card mini-dots (ProductCard). Keys are lowercased and trimmed at lookup time.
//
// Why granular here (Light Blue ≠ Royal Blue ≠ Navy) and coarse in
// ShopFilterSidebar (single "blue" bucket): PDP needs to let the shopper pick
// between actual variants; the shop filter is intentionally bucketed so the
// sidebar stays tight. Don't unify the two maps without thinking about that.
//
// Keep keys in sync with the catalog. List all distinct variant colors with:
//   curl …/store/products?fields=variants.options.value,variants.options.option.title
const COLOR_HEX: Record<string, string> = {
  // neutrals
  black: "#1c1010", white: "#ffffff", "off white": "#F5F1EA", ivory: "#FAF6F4",
  cream: "#FAF6F4", beige: "#E8C9B0", nude: "#E8C9B0", blush: "#F2DDD8",
  champagne: "#E6D8B7", tan: "#C69C6D", sand: "#D9C2A1", camel: "#B7895D",
  brown: "#5e4030", chocolate: "#4A2C20", coffee: "#5C3A2E", khaki: "#B5A26C",
  grey: "#8a7773", gray: "#8a7773", charcoal: "#3D3D3D", silver: "#BFC1C2",
  gold: "#C9A227", mustard: "#C9A227",
  // reds / pinks
  red: "#B8412C", burgundy: "#5C1F2A", burgandy: "#5C1F2A", wine: "#5C1F2A",
  pink: "#F8C4D4", "light pink": "#FBD7DE", "hot pink": "#E63A7A",
  fuchsia: "#C2185B", rose: "#E8909A", mauve: "#B07391",
  // oranges / yellows
  orange: "#F39C5B", apricot: "#F6B98B", peach: "#F8C4A0", salmon: "#F0876A",
  coral: "#E5604A", yellow: "#F4D03F",
  // greens
  green: "#3a5a40", olive: "#6B6B3A", mint: "#B6D7C1", emerald: "#2E7D5B",
  // blues — distinct on purpose
  blue: "#6FA8DC", "light blue": "#B9D8EF", "sky blue": "#87CEEB",
  "royal blue": "#2A4FB8", navy: "#1F2A44", denim: "#4A6FA5", teal: "#2E8B8B",
  // purples
  purple: "#7E5A9B", lavender: "#BFA8D6", lilac: "#C8A2C8", violet: "#7F4FB0",
};

const MULTI_GRADIENT =
  "conic-gradient(from 0deg,#E5604A,#F4D03F,#3a5a40,#6FA8DC,#7E5A9B,#E5604A)";

const COLOR_BG: Record<string, string> = {
  multi: MULTI_GRADIENT,
  multicolor: MULTI_GRADIENT,
  multicolour: MULTI_GRADIENT,
  print: MULTI_GRADIENT,
  pattern: MULTI_GRADIENT,
  leopard: "radial-gradient(#3a2818 1.2px, transparent 1.6px) #C69C6D",
  clear:
    "repeating-conic-gradient(#e5e5e5 0deg 90deg,#ffffff 90deg 180deg) 0 0 / 8px 8px",
};

const FALLBACK = "#8a7773";

export function colorNameToHex(name: string): string {
  const key = name.trim().toLowerCase();
  return COLOR_HEX[key] ?? COLOR_BG[key] ?? FALLBACK;
}
