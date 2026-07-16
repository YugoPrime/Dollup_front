/**
 * Server-side fetch for the anniversary draw wall.
 *
 * Hits the public Medusa store route, which has already masked every name —
 * this app never sees order PII and needs no admin credentials.
 */

export type DrawEntry = {
  id: string;
  name: string;
  isEntry: boolean;
  at: string;
};

export type DrawPayload = {
  entries: DrawEntry[];
  count: number;
  entryCount: number;
  winnerId: string | null;
};

export const EMPTY_PAYLOAD: DrawPayload = {
  entries: [],
  count: 0,
  entryCount: 0,
  winnerId: null,
};

function isValidEntry(e: unknown): e is DrawEntry {
  if (typeof e !== "object" || e === null) return false;
  const r = e as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.name === "string" &&
    typeof r.isEntry === "boolean" &&
    typeof r.at === "string"
  );
}

/**
 * The Medusa store route is a cross-service contract this app doesn't
 * control and doesn't enforce at the schema level. A 200 with valid JSON
 * but the wrong shape (entries: null, an entry missing id, etc.) must
 * never reach render — this page is required to never show an error.
 * Malformed individual entries are dropped; if the top-level shape itself
 * doesn't hold, the whole payload falls back to EMPTY_PAYLOAD.
 */
export function validateDrawPayload(data: unknown): DrawPayload {
  if (typeof data !== "object" || data === null) return EMPTY_PAYLOAD;
  const r = data as Record<string, unknown>;

  if (!Array.isArray(r.entries)) return EMPTY_PAYLOAD;
  if (typeof r.count !== "number") return EMPTY_PAYLOAD;
  if (typeof r.entryCount !== "number") return EMPTY_PAYLOAD;
  // winnerId is optional: treat an absent key the same as an explicit null
  // (no winner yet) rather than discarding the whole payload over it.
  if (r.winnerId !== undefined && typeof r.winnerId !== "string" && r.winnerId !== null) {
    return EMPTY_PAYLOAD;
  }

  return {
    entries: r.entries.filter(isValidEntry),
    count: r.count,
    entryCount: r.entryCount,
    winnerId: (r.winnerId as string | null | undefined) ?? null,
  };
}

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
const TIMEOUT_MS = 8_000;

export async function fetchDrawEntries(): Promise<DrawPayload> {
  if (!BACKEND || !PUBLISHABLE_KEY) return EMPTY_PAYLOAD;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BACKEND}/store/anniversary-draw/entries`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    if (!res.ok) return EMPTY_PAYLOAD;
    return validateDrawPayload(await res.json());
  } catch {
    // The wall degrades to countdown + copy. It must never show an error.
    return EMPTY_PAYLOAD;
  } finally {
    clearTimeout(timeout);
  }
}
