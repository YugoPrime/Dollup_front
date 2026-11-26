// Extra labels for the Meta / Google product feed (/feed/meta.xml).
//
// Meta image templates can print catalog fields on the ad image, including
// custom labels. The feed uses:
//   custom_label_1 = product code, e.g. "IS2523" (customers order by code in DMs)
//   custom_label_2 = sizes in stock for the card's colour, e.g. "S · M · L"
// custom_label_0 is already taken by the `new_arrival` flag.

// Variant SKUs look like "IS2523-M" or "IS1006-L-Black". The code is the
// "IS<digits>" prefix; a stray hyphen ("IS-2523") is tolerated.
const CODE_RE = /^IS-?(\d+)/i;

export function productCode(
  skus: ReadonlyArray<string | null | undefined>,
): string | null {
  for (const sku of skus) {
    const m = (sku ?? "").trim().match(CODE_RE);
    if (m) return `IS${m[1]}`;
  }
  return null;
}

export const SIZE_RANK: Record<string, number> = {
  xxs: 0,
  xs: 1,
  s: 2,
  "s/m": 3,
  m: 4,
  "m/l": 5,
  l: 6,
  "l/xl": 7,
  xl: 8,
  xxl: 9,
  "2xl": 9,
  xxxl: 10,
  "3xl": 10,
  "4xl": 11,
  "5xl": 12,
};

function sizeRank(size: string, index: number): number {
  const key = size.trim().toLowerCase();
  if (key in SIZE_RANK) return SIZE_RANK[key];
  if (/^\d+(\.\d+)?$/.test(key)) return 100 + Number(key);
  // Unknown labels ("Free Size", "OS") keep their original order, after the rest.
  return 1000 + index;
}

export type SizedVariant = {
  size?: string | null;
  color?: string | null;
  inStock: boolean;
};

// Sizes still in stock for one colour of a product, smallest first, joined
// with " · ". Variants without a colour option are all treated as one colour.
// Returns null when nothing of that colour is in stock.
export function sizesInStock(
  variants: ReadonlyArray<SizedVariant>,
  color: string | null | undefined,
): string | null {
  const wanted = (color ?? "").trim().toLowerCase();
  const seen = new Set<string>();
  const sizes: Array<{ size: string; rank: number }> = [];

  variants.forEach((v, index) => {
    if (!v.inStock) return;
    if ((v.color ?? "").trim().toLowerCase() !== wanted) return;
    const size = (v.size ?? "").trim();
    if (!size) return;
    const key = size.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    sizes.push({ size, rank: sizeRank(size, index) });
  });

  if (sizes.length === 0) return null;
  sizes.sort((a, b) => a.rank - b.rank);
  return sizes.map((s) => s.size).join(" · ");
}
