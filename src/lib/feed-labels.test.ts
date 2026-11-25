import { describe, expect, it } from "vitest";
import { productCode, sizesInStock } from "./feed-labels";

describe("productCode", () => {
  it("takes the IS<digits> prefix of a variant SKU", () => {
    expect(productCode(["IS2523-M"])).toBe("IS2523");
    expect(productCode(["IS1006-L-Black"])).toBe("IS1006");
    expect(productCode(["is2450"])).toBe("IS2450");
  });

  it("tolerates a hyphen after IS", () => {
    expect(productCode(["IS-2523-S"])).toBe("IS2523");
  });

  it("uses the first SKU that has a code", () => {
    expect(productCode([null, "", "ABC-1", "IS2499-S/M-Nude"])).toBe("IS2499");
  });

  it("is null when no SKU has a code", () => {
    expect(productCode([])).toBeNull();
    expect(productCode([null, undefined, "SKU-12"])).toBeNull();
  });
});

describe("sizesInStock", () => {
  const v = (size: string, color: string | null, inStock = true) => ({ size, color, inStock });

  it("lists in-stock sizes of the same colour, smallest first", () => {
    const variants = [v("XL", "Red"), v("S", "Red"), v("M", "Red", false), v("L", "Red"), v("S", "Black")];
    expect(sizesInStock(variants, "Red")).toBe("S · L · XL");
    expect(sizesInStock(variants, "black")).toBe("S");
  });

  it("treats products without a colour option as one colour", () => {
    expect(sizesInStock([v("M", null), v("S", null)], undefined)).toBe("S · M");
  });

  it("orders combined, plus and numeric sizes", () => {
    expect(sizesInStock([v("L/XL", null), v("S/M", null)], null)).toBe("S/M · L/XL");
    expect(sizesInStock([v("2XL", null), v("XS", null), v("4XL", null)], null)).toBe("XS · 2XL · 4XL");
    expect(sizesInStock([v("38", null), v("37", null)], null)).toBe("37 · 38");
  });

  it("keeps unknown labels like Free Size", () => {
    expect(sizesInStock([v("Free Size", "Nude")], "Nude")).toBe("Free Size");
  });

  it("drops duplicates and blank sizes", () => {
    expect(sizesInStock([v("M", null), v("m", null), v("", null)], null)).toBe("M");
  });

  it("is null when that colour has nothing in stock", () => {
    expect(sizesInStock([v("M", "Red", false)], "Red")).toBeNull();
    expect(sizesInStock([v("M", "Red")], "Blue")).toBeNull();
  });
});
