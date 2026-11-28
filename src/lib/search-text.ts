// Text matching for the /shop search box. Pure (no server imports) so it can
// be checked with `npx tsx src/lib/search-text.test.ts`.
//
// Three rules on top of plain substring matching:
// - Hyphens count as spaces on both sides, so "off-shoulder" finds
//   "Off Shoulder" and "long sleeve" finds "Long-Sleeve".
// - "long sleeve" / "short sleeve" in the query stay one phrase, so
//   "long sleeve dress" no longer finds sleeveless dresses that are long.
// - Dress-length words have synonyms: "short" also finds "mini", "long" also
//   finds "maxi" and "gown" (and "maxi" finds "long"). Length words ignore "long sleeve" / "short sleeve"
//   on the product, so a long-sleeved mini is not a long dress.

const SLEEVE_PHRASE = /\b(long|short)[\s-]+sleeve[sd]?\b/g;

// "short" covers mini and knee-length; "mini" means mini only.
const LENGTH_SYNONYMS: Record<string, string[]> = {
  short: ["short", "mini"],
  mini: ["mini"],
  long: ["long", "maxi", "gown", "floor length"],
  maxi: ["maxi", "long", "gown", "floor length"],
  midi: ["midi"],
};

/** Lowercase, hyphens and underscores to spaces, single spaces. */
export function normalizeSearchText(s: string): string {
  return s.toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Pull "long sleeve(s|d)" / "short sleeve(s|d)" out of a lowercase query.
 * Returns the phrases (as "long sleeve" / "short sleeve") and the rest.
 */
export function extractSleevePhrases(q: string): { phrases: string[]; rest: string } {
  const phrases: string[] = [];
  const rest = q.replace(SLEEVE_PHRASE, (_m, kind: string) => {
    phrases.push(`${kind} sleeve`);
    return " ";
  });
  return { phrases: [...new Set(phrases)], rest };
}

/** Query token as it is matched: hyphens become spaces ("v-neck" → "v neck"). */
export function normalizeSearchToken(token: string): string {
  return normalizeSearchText(token);
}

/** True when some field of the product (already normalized) holds the token. */
export function haystackHasToken(haystack: string[], token: string): boolean {
  const synonyms = LENGTH_SYNONYMS[token];
  if (synonyms) {
    return haystack.some((field) => {
      const withoutSleeves = field.replace(SLEEVE_PHRASE, " ");
      return synonyms.some((w) => withoutSleeves.includes(w));
    });
  }
  return haystack.some((field) => field.includes(token));
}
