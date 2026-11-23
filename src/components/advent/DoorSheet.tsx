"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Door } from "@/lib/advent";
import { trackAdventDoor } from "@/lib/analytics";
import { lockBodyScroll } from "@/lib/scroll-lock";

type Thumb = { title: string; thumbnail: string; href: string };

/** CSS-only wrapped gift, used for the adult-only door (no product imagery). */
function WrappedGift() {
  return (
    <div aria-hidden="true" className="relative mx-auto mt-5 h-28 w-28">
      <span className="absolute inset-x-0 bottom-0 top-8 rounded-xl bg-blush-200" />
      <span className="absolute inset-x-0 top-5 h-5 rounded-md bg-blush-100 shadow-sm" />
      <span className="absolute bottom-0 left-1/2 top-5 w-4 -translate-x-1/2 bg-coral-500" />
      <span className="absolute left-1/2 top-0 h-[22px] w-12 -translate-x-1/2">
        <i className="absolute left-0 top-0 h-5 w-5 -rotate-[20deg] rounded-[50%_0_50%_50%] border-4 border-coral-500" />
        <i className="absolute right-0 top-0 h-5 w-5 rotate-[20deg] rounded-[0_50%_50%_50%] border-4 border-coral-500" />
        <b className="absolute left-[18px] top-[7px] h-2.5 w-2.5 rounded-[3px] bg-coral-700" />
      </span>
      <span className="absolute -right-3 top-8 text-[12px] leading-none text-gold">★</span>
      <span className="absolute -left-3 bottom-6 text-[9px] leading-none text-gold">★</span>
    </div>
  );
}

export function DoorSheet({
  door,
  thumbs,
  onClose,
}: {
  door: Door;
  thumbs: Thumb[];
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const unlockScroll = lockBodyScroll();
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockScroll();
      opener?.focus();
    };
  }, []);

  const showGift = door.kind === "gift" && door.gift?.adultOnly;

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-ink/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advent-sheet-title"
        tabIndex={-1}
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-cream px-5 pb-6 pt-5 outline-none sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-xl text-ink hover:bg-blush-100"
        >
          <span aria-hidden="true">×</span>
        </button>

        <p className="pr-10 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">
          Door {door.day} · today only
        </p>
        <h2
          id="advent-sheet-title"
          className="mt-2 font-display text-[1.7rem] font-medium leading-[1.08] tracking-tight text-ink"
        >
          <em className="italic text-coral-700">{door.label}</em>
        </h2>
        <p className="mt-2 text-sm leading-snug text-ink-soft">{door.detail}</p>

        {showGift ? (
          <WrappedGift />
        ) : thumbs.length > 0 ? (
          <ul className="mt-4 grid grid-cols-3 gap-2">
            {thumbs.map((t) => (
              <li key={t.href + t.thumbnail}>
                <Link href={t.href} className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-blush-100">
                  <Image src={t.thumbnail} alt={t.title} fill sizes="120px" className="object-cover" />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <Link
          href={door.href}
          onClick={() => trackAdventDoor("cta", door.day)}
          className="mt-5 flex min-h-11 w-full items-center justify-center rounded-full bg-coral-500 px-5 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700"
        >
          Shop today&apos;s door
        </Link>
        <p className="mt-3 text-center text-xs text-ink-soft">Website orders only, not Instagram DMs.</p>
      </div>
    </div>,
    document.body,
  );
}
