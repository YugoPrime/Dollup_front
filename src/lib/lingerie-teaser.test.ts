import { describe, expect, it } from "vitest";
import { isLingerieProduct } from "./lingerie-teaser";

describe("isLingerieProduct", () => {
  it("is true when any category is lingerie", () => {
    expect(isLingerieProduct([{ handle: "lingerie" }])).toBe(true);
    expect(isLingerieProduct([{ handle: "dresses" }, { handle: "lingerie" }])).toBe(true);
  });

  it("ignores case and trailing slashes in the handle", () => {
    expect(isLingerieProduct([{ handle: "Lingerie/" }])).toBe(true);
  });

  it("is false for other categories or no categories", () => {
    expect(isLingerieProduct([{ handle: "dresses" }])).toBe(false);
    expect(isLingerieProduct([])).toBe(false);
    expect(isLingerieProduct(null)).toBe(false);
    expect(isLingerieProduct(undefined)).toBe(false);
    expect(isLingerieProduct([{ handle: null }])).toBe(false);
  });
});
