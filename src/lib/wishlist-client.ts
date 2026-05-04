"use client";

// Local-first wishlist: stores product IDs in localStorage. V2 (account-linked
// wishlist + admin "most wishlisted" dashboard) lives in the backlog and will
// hydrate from this list on first login.
import { useEffect, useSyncExternalStore } from "react";

const KEY = "dub_wishlist";
const EVENT = "dub:wishlist-change";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids));
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
