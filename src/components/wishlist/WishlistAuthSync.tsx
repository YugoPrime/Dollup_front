"use client";

import { useEffect, useRef } from "react";
import { useCustomer } from "@/lib/auth-client";
import {
  getLinkedCustomerId,
  getWishlist,
  replaceWishlist,
  setLinkedCustomerId,
  useWishlist,
} from "@/lib/wishlist-client";
import { clientSdk } from "@/lib/cart-client";

// Bridges the localStorage wishlist with the customer's server-side
// metadata.wishlist. Mounted once in the root layout. Renders nothing.
//
// Behaviour:
//   - First login from a fresh device (no link, guest had built up a wishlist):
//     merges local + remote (deduped) so signup-after-browsing is preserved.
//   - Login when localStorage was last linked to a different customer.id:
//     REPLACES local with remote — prevents the previous user's picks from
//     polluting the new user's account on shared browsers.
//   - Same customer re-logs: merges local + remote (no-op for already-synced
//     items, picks up any offline additions).
//   - While logged in: pushes local changes to server (debounced).
//   - On logout: lib/auth-client clears the wishlist + link.
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
    const linkedTo = getLinkedCustomerId();
    const isDifferentUser = linkedTo !== null && linkedTo !== customer.id;
    const next = isDifferentUser
      ? remote
      : Array.from(new Set([...local, ...remote]));

    replaceWishlist(next);
    setLinkedCustomerId(customer.id);

    const remoteSerialized = JSON.stringify(remote);
    const nextSerialized = JSON.stringify(next);
    lastPushedRef.current = remoteSerialized;
    if (nextSerialized !== remoteSerialized) {
      clientSdk.store.customer
        .update({ metadata: { ...customer.metadata, wishlist: next } })
        .then(() => {
          lastPushedRef.current = nextSerialized;
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
