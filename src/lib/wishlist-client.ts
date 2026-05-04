"use client";

// Local-first wishlist: stores product IDs in localStorage. V2 (account-linked
// wishlist + admin "most wishlisted" dashboard) lives in the backlog and will
// hydrate from this list on first login.
import { useEffect, useSyncExternalStore } from "react";

const KEY = "dub_wishlist";
const EVENT = "dub:wishlist-change";

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

export function getWishlist(): string[] {
  return read();
}

export function isInWishlist(id: string): boolean {
  return read().includes(id);
}

export function toggleWishlist(id: string): boolean {
  const cur = read();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  write(next);
  return next.includes(id);
}

export function removeFromWishlist(id: string) {
  write(read().filter((x) => x !== id));
}

export function clearWishlist() {
  write([]);
}

// Subscribe to wishlist changes — fires both on cross-tab `storage` events and
// our same-tab CustomEvent. Returns the current id list reactively.
function subscribe(callback: () => void) {
  const handler = () => callback();
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
