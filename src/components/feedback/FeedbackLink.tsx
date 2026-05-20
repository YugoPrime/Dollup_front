"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// Modal loads only when the link is first opened — keeps initial page JS lean.
const FeedbackModal = dynamic(
  () => import("./FeedbackModal").then((m) => m.FeedbackModal),
  { ssr: false },
);

/**
 * Inline footer-style trigger that opens the feedback modal. Replaces the
 * floating FeedbackBubble — we want the page chrome quieter on PDP and the
 * feedback action to live in a predictable location.
 */
export function FeedbackLink({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={
          className ??
          "font-sans text-[11px] font-semibold uppercase tracking-wider text-coral-500 transition-colors hover:text-coral-700"
        }
      >
        Share feedback
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}
