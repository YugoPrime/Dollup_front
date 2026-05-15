"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Modal loads only when the bubble is first opened — keeps initial page JS lean.
const FeedbackModal = dynamic(
  () => import("./FeedbackModal").then((m) => m.FeedbackModal),
  { ssr: false },
);

export function FeedbackBubble() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Stay out of the way during checkout and on admin routes.
  if (pathname.startsWith("/checkout") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Share feedback"
        aria-haspopup="dialog"
        className="fixed bottom-[84px] right-4 z-[90] flex h-12 w-12 items-center justify-center rounded-full bg-coral-500 text-white shadow-[0_6px_18px_rgba(229,96,74,0.45)] ring-2 ring-white transition hover:bg-coral-700 active:scale-95 md:bottom-6 md:right-6"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </button>

      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}
