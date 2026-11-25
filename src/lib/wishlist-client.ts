"use client";

// Local-first wishlist: stores product IDs in localStorage. Signed-in shoppers
// also get it saved on their account (components/wishlist/WishlistAuthSync).
//
// Every heart is also reported to the backend (POST /store/wishlist-events)
// under a random per-browser id, so the admin Restock report can count guest
// wishlists too. Reporting is fire-and-forget: the wishlist itself never
// waits on it or fails because of it.
import { useEffect, useSyncExternalStore } from "react";
import { clientSdk } from "@/lib/cart-client";

const KEY = "dub_wishlist";
const LINK_KEY = "dub_wishlist_linked_to";
const EVENT = "dub:wishlist-change";
/** Random id of this browser for wishlist counts. Not tied to a person. */
const ANON_KEY = "dub_wishlist_anon";
/** Who this browser's hearts were last reported for: a customer id or "guest". */
const SYNCED_KEY = "dub_wishlist_synced";
const SYNC_DELAY_MS = 1500;
/** The backend takes at most 200 product ids per event. */
const SIGNAL_CHUNK = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Cache the parsed snapshot so useSyncExternalStore sees a stable reference
// across renders — re-parsing on each call returns a new array, which would
// signal "changed" every time and trigger an infinite render loop (React #185).
let cachedRaw: string | null = null;
let cachedSnapshot: string[] = [];

function readRaw(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY) ?? "";
}

function read(): string[] {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  if (!raw) {
    cachedSnapshot = [];
    return cachedSnapshot;
  }
  try {
    const parsed = JSON.parse(raw);
    cachedSnapshot = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    cachedSnapshot = [];
  }
  return cachedSnapshot;
}

function write(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  // Bust the snapshot cache so the next read() returns the new array reference.
  cachedRaw = null;
  window.dispatchEvent(new CustomEvent(EVENT));
}

function newUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Older Safari: build a v4 UUID by hand.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function browserId(): string | null {
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id || !UUID_RE.test(id)) {
      id = newUuid();
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Reports hearts to the backend. Resolves false if any part didn't go through. */
function sendSignal(action: "add" | "remove", productIds: string[]): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  const anon = browserId();
  const ids = productIds.filter((id) => id.startsWith("prod_"));
  if (!anon || ids.length === 0) return Promise.resolve(true);
  const customer = getLinkedCustomerId();
  const calls: Promise<boolean>[] = [];
  for (let i = 0; i < ids.length; i += SIGNAL_CHUNK) {
    calls.push(
      clientSdk.client
        .fetch("/store/wishlist-events", {
          method: "POST",
          body: {
            anon_id: anon,
            customer_id: customer?.startsWith("cus_") ? customer : null,
            action,
            product_ids: ids.slice(i, i + SIGNAL_CHUNK),
          },
        })
        .then(() => true)
        .catch(() => false),
    );
  }
  return Promise.all(calls).then((ok) => ok.every(Boolean));
}

// Once per browser (and again whenever it signs in or out), report every heart
// already saved, so wishlists from before reporting existed get counted and a
// guest's hearts move to the customer who signs in. Debounced so a login's
// replaceWishlist + setLinkedCustomerId land first.
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSync() {
  if (typeof window === "undefined" || syncTimer) return;
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void syncSignals();
  }, SYNC_DELAY_MS);
}

async function syncSignals() {
  try {
    const owner = getLinkedCustomerId() ?? "guest";
    if (window.localStorage.getItem(SYNCED_KEY) === owner) return;
    if (await sendSignal("add", read())) {
      window.localStorage.setItem(SYNCED_KEY, owner);
    }
  } catch {
    // localStorage blocked: nothing to sync.
  }
}

export function getWishlist(): string[] {
  return read();
}

export function isInWishlist(id: string): boolean {
  return read().includes(id);
}

export function toggleWishlist(id: string): boolean {
  const cur = read();
  const adding = !cur.includes(id);
  const next = adding ? [...cur, id] : cur.filter((x) => x !== id);
  write(next);
  void sendSignal(adding ? "add" : "remove", [id]);
  return adding;
}

export function removeFromWishlist(id: string) {
  const had = read().includes(id);
  write(read().filter((x) => x !== id));
  if (had) void sendSignal("remove", [id]);
}

/**
 * Empties the wishlist on this browser. Logout calls it plainly: the hearts
 * stay counted (they are still on the account) and the account link goes.
 * The shopper's own "Clear" passes byShopper, which un-hearts them for the
 * counts too and keeps the link.
 */
export function clearWishlist(opts?: { byShopper?: boolean }) {
  if (opts?.byShopper) {
    void sendSignal("remove", read());
  } else if (typeof window !== "undefined") {
    window.localStorage.removeItem(LINK_KEY);
  }
  write([]);
}

export function getLinkedCustomerId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LINK_KEY);
}

export function setLinkedCustomerId(customerId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LINK_KEY, customerId);
  scheduleSync();
}

// Bulk-replace the wishlist (used by auth sync to merge server + local on login).
export function replaceWishlist(ids: string[]) {
  // Dedupe while preserving first-seen order.
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const id of ids) {
    if (typeof id === "string" && !seen.has(id)) {
      seen.add(id);
      deduped.push(id);
    }
  }
  write(deduped);
}

// Subscribe to wishlist changes — fires both on cross-tab `storage` events and
// our same-tab CustomEvent. Returns the current id list reactively.
function subscribe(callback: () => void) {
  scheduleSync();
  const handler = () => {
    scheduleSync();
    callback();
  };
  window.addEventListener("storage", handler);
  window.addEventListener(EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(EVENT, handler);
  };
}

const SERVER_SNAPSHOT: string[] = [];
function getServerSnapshot(): string[] {
  return SERVER_SNAPSHOT;
}

export function useWishlist(): string[] {
  return useSyncExternalStore(subscribe, () => read(), getServerSnapshot);
}

export function useIsInWishlist(id: string): boolean {
  const list = useWishlist();
  return list.includes(id);
}

// Hook variant for components that only need a count (e.g. header badge later).
export function useWishlistCount(): number {
  const list = useWishlist();
  // useEffect-no-op kept so React's exhaustive-deps stays quiet if callers add it.
  useEffect(() => {}, []);
  return list.length;
}
