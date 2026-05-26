"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const FocusTrapLayer = dynamic(
  () => import("@/components/a11y/FocusTrapLayer").then((m) => m.FocusTrapLayer),
  { ssr: false, loading: () => null },
);

const SEARCH_HINTS = [
  "Red dress",
  "Dress in size S",
  "IS2123",
  "Bikini set",
  "Lingerie",
];

function useAnimatedHint(active: boolean): string {
  const [text, setText] = useState("");
  const idxRef = useRef(0);
  const charRef = useRef(0);
  const phaseRef = useRef<"typing" | "holding" | "erasing">("typing");

  useEffect(() => {
    if (!active) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setText(SEARCH_HINTS[0]);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const phrase = SEARCH_HINTS[idxRef.current];
      if (phaseRef.current === "typing") {
        if (charRef.current < phrase.length) {
          charRef.current++;
          setText(phrase.slice(0, charRef.current));
          timer = setTimeout(tick, 65);
        } else {
          phaseRef.current = "holding";
          timer = setTimeout(tick, 1400);
        }
      } else if (phaseRef.current === "holding") {
        phaseRef.current = "erasing";
        timer = setTimeout(tick, 50);
      } else {
        if (charRef.current > 0) {
          charRef.current--;
          setText(phrase.slice(0, charRef.current));
          timer = setTimeout(tick, 30);
        } else {
          idxRef.current = (idxRef.current + 1) % SEARCH_HINTS.length;
          phaseRef.current = "typing";
          timer = setTimeout(tick, 200);
        }
      }
    };
    timer = setTimeout(tick, 800);
    return () => clearTimeout(timer);
  }, [active]);

  return text;
}

const QUICK_LINKS = [
  { label: "Dresses", href: "/shop?category=dresses" },
  { label: "Lingerie", href: "/shop?category=lingerie" },
  { label: "Beachwear", href: "/shop?category=beachwear" },
  { label: "Intimates", href: "/shop?category=intimates" },
  { label: "Sale", href: "/shop?on_sale=1" },
];

export function HeaderSearchMobileOverlay() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const animatedHint = useAnimatedHint(open && q === "");
  const placeholder = q ? "Search dresses, lingerie, accessories…" : animatedHint || "Search…";

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/shop?q=${encodeURIComponent(term)}`);
  };

  const onPickQuick = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search products"
        className="flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-blush-100 md:hidden"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>

      {open ? (
        <FocusTrapLayer
          ariaLabel="Search"
          className="fixed inset-0 z-[110] bg-cream md:hidden"
          onDeactivate={() => setOpen(false)}
        >
          <div className="flex h-full flex-col">
            <form
              onSubmit={onSearch}
              className="flex items-center gap-2 border-b border-blush-200 px-3 py-3"
              style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close search"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink hover:bg-blush-100"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
              <div className="flex flex-1 items-center gap-2 rounded-full border border-blush-300 bg-white px-4 py-2 focus-within:border-coral-500 focus-within:ring-2 focus-within:ring-coral-500/20">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8a7773"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  ref={inputRef}
                  aria-label="Search products"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  placeholder={placeholder}
                  className="flex-1 bg-transparent font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted"
                />
                {q ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQ("");
                      inputRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-ink-muted transition hover:bg-blush-100 hover:text-ink"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                ) : null}
              </div>
            </form>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Browse
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_LINKS.map((l) => (
                  <button
                    key={l.href}
                    type="button"
                    onClick={() => onPickQuick(l.href)}
                    className="rounded-full border border-blush-300 bg-white px-4 py-2 font-sans text-[13px] font-medium text-ink transition hover:bg-blush-100"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </FocusTrapLayer>
      ) : null}
    </>
  );
}
