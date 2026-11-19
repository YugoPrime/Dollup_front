import { PREVIEW_KEY, PREVIEW_PARAM, parsePreviewParam, parseStored, previewNowMs, type StoredPreview } from "@/lib/advent-preview";

// Browser-only reader for the advent preview. Everything is lazy (called from
// snapshot functions, never at import) and wrapped in try/catch: the page must
// work with storage blocked, so an in-memory copy backs the storage.
let memory: StoredPreview | null = null;
let handledSearch: string | null = null;

function applyUrl(): void {
  const search = window.location.search;
  if (search === handledSearch) return;
  handledSearch = search;
  let param;
  try {
    param = parsePreviewParam(new URLSearchParams(search).get(PREVIEW_PARAM));
  } catch {
    return;
  }
  if (!param) return;
  if (param.kind === "off") {
    memory = null;
    try {
      window.sessionStorage.removeItem(PREVIEW_KEY);
    } catch {}
    return;
  }
  memory = { iso: param.iso, setAt: Date.now() };
  try {
    window.sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(memory));
  } catch {}
}

function current(): StoredPreview | null {
  if (typeof window === "undefined") return null;
  applyUrl();
  if (memory) return memory;
  try {
    return parseStored(window.sessionStorage.getItem(PREVIEW_KEY));
  } catch {
    return null;
  }
}

/** Preview "now" in ms, or null when no preview is active (and always on the server). */
export function readPreviewNow(): number | null {
  const p = current();
  return p ? previewNowMs(p, Date.now()) : null;
}

export function isAdventPreview(): boolean {
  return current() !== null;
}
