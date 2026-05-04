"use client";

import { useEffect, useRef } from "react";
import { useCustomer } from "@/lib/auth-client";
import {
  getWishlist,
  replaceWishlist,
  useWishlist,
} from "@/lib/wishlist-client";
import { clientSdk } from "@/lib/cart-client";

// Bridges the localStorage wishlist with the customer's server-side
// metadata.wishlist. Mounted once in the root layout. Renders nothing.
//
// Behaviour:
//   - On guest → logged-in transition: merges local + remote (deduped, local wins
//     order), writes to localStorage, pushes merged to server.
//   - While logged in: pushes local changes to server (debounced).
//   - On logout: leaves localStorage intact (so the user keeps their picks).
export function WishlistAuthSync() {
  const { status, customer } = useCustomer();
  const list = useWishlist();
  const mergedForRef = useRef<string | null>(null);
  const lastPushedRef = useRef<string>("");

  // Merge-on-login. Runs once per customer.id transition.
  useEffect(() => {
    if (status !== "ready") return;
    if (!customer) {
      mergedForRef.current = null;
      lastPushedRef.current = "";
      return;
    }
    if (mergedForRef.current === customer.id) return;
    mergedForRef.current = customer.id;

    const rawRemote = customer.metadata?.wishlist;
    const remote = Array.isArray(rawRemote)
      ? rawRemote.filter((x): x is string => typeof x === "string")
      : [];
    const local = getWishlist();
    const merged = Array.from(new Set([...local, ...remote]));

    replaceWishlist(merged);

    const remoteSerialized = JSON.stringify(remote);
    const mergedSerialized = JSON.stringify(merged);
    lastPushedRef.current = remoteSerialized;
    if (mergedSerialized !== remoteSerialized) {
      clientSdk.store.customer
        .update({ metadata: { ...customer.metadata, wishlist: merged } })
        .then(() => {
          lastPushedRef.current = mergedSerialized;
        })
        .catch(() => {
          // best-effort — local stays correct, server will catch up on next change
        });
    }
  }, [status, customer]);

  // Debounced push of subsequent local changes to the server.
  useEffect(() => {
    if (status !== "ready" || !customer) return;
    const serialized = JSON.stringify(list);
    if (serialized === lastPushedRef.current) return;
    const timer = setTimeout(() => {
      clientSdk.store.customer
        .update({ metadata: { ...customer.metadata, wishlist: list } })
        .then(() => {
          lastPushedRef.current = serialized;
        })
        .catch(() => {
          // ignore — next change will retry
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [list, status, customer]);

  return null;
}
