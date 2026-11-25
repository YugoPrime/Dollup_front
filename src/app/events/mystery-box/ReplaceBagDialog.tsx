"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ShoppingBag } from "lucide-react";
import { FocusTrapLayer } from "@/components/a11y/FocusTrapLayer";
import { lockBodyScroll } from "@/lib/scroll-lock";

/**
 * Asked before a Mystery Box replaces a bag that already has pieces in it
 * (the box checks out as its own bag). Replaces the browser's confirm().
 *
 * Same layout as SalePopup and CartDrawer: portalled to <body> (the box
 * section sits under transformed ancestors, which would trap `fixed`), the
 * trap covers the whole screen and the backdrop is a button inside it, so a
 * tap on the dimmed page closes the dialog and never lands on the page.
 * Esc and a tap outside keep the bag; focus goes back to "Lock it in".
 */
export function ReplaceBagDialog({
  pieceCount,
  onConfirm,
  onCancel,
}: {
  pieceCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => lockBodyScroll(), []);

  const pieces = pieceCount === 1 ? "1 piece" : `${pieceCount} pieces`;

  return createPortal(
    <FocusTrapLayer
      ariaLabel="Swap your bag for the Mystery Box"
      onDeactivate={onCancel}
      // Focus the card itself, so neither button opens with a focus ring.
      initialFocus={() => document.querySelector<HTMLElement>(".mb-bag-dialog") ?? false}
      className="fixed inset-0 z-[120] flex items-center justify-center p-5"
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onCancel}
        className="sale-pop-backdrop fixed inset-0 cursor-default bg-ink/55"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mb-bag-title"
        aria-describedby="mb-bag-body"
        tabIndex={-1}
        // sale-pop: the same slow rise-in as the sale popup (globals.css).
        className="mb-bag-dialog sale-pop relative w-full max-w-[400px] rounded-2xl bg-cream-50 px-7 pb-6 pt-8 text-center text-ink shadow-2xl focus:outline-none md:px-9"
      >
        <span aria-hidden className="pointer-events-none absolute inset-[10px] rounded-xl border border-blush-400" />
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-blush-100 text-coral-500">
          <ShoppingBag className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="mt-4 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-500">
          Mystery Box
        </p>
        <h2 id="mb-bag-title" className="mt-2 font-display text-[28px] leading-[1.1] text-ink md:text-[32px]">
          Swap your bag for this box?
        </h2>
        <span aria-hidden className="mx-auto mt-4 block h-px w-14 bg-coral-300" />
        <p id="mb-bag-body" className="mt-4 font-sans text-[14px] leading-[1.55] text-ink-soft">
          The Mystery Box checks out on its own, so the {pieces} in your bag
          now will be taken out. Want them too? Order them first, then come
          back and spin again.
        </p>
        <button
          type="button"
          onClick={onConfirm}
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-coral-500 px-6 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700"
        >
          Swap for the box
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="mt-2 min-h-11 px-3 font-sans text-[12px] font-semibold text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Keep my bag
        </button>
      </div>
    </FocusTrapLayer>,
    document.body,
  );
}
