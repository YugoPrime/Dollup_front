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
    return (await res.json()) as DrawPayload;
  } catch {
    // The wall degrades to countdown + copy. It must never show an error.
    return EMPTY_PAYLOAD;
  } finally {
    clearTimeout(timeout);
  }
}
