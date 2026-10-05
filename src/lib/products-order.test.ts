import { describe, expect, it } from "vitest";
import { deprioritizeCategories } from "./products-order";

const p = (id: string, ...cats: string[]) => ({
  id,
  categories: cats.map((c) => ({ id: c })),
});

describe("deprioritizeCategories", () => {
  it("moves matching products to the end, preserving order on both sides", () => {
    const list = [p("a", "adult"), p("b", "dress"), p("c", "adult"), p("d", "bikini")];
    const out = deprioritizeCategories(list, ["adult"]);
    expect(out.map((x) => x.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("returns the same array when nothing matches or no ids given", () => {
    const list = [p("a", "dress"), p("b", "bikini")];
    expect(deprioritizeCategories(list, ["adult"])).toBe(list);
    expect(deprioritizeCategories(list, [])).toBe(list);
  });

  it("treats products without categories as non-matching", () => {
    const list = [p("a", "adult"), { id: "b", categories: null }];
    expect(deprioritizeCategories(list, ["adult"]).map((x) => x.id)).toEqual(["b", "a"]);
  });
});
