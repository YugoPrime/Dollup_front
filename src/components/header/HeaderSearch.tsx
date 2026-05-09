"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
    // Honor prefers-reduced-motion: show a single static hint, no typing loop.
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

export function HeaderSearchDesktop() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const animatedHint = useAnimatedHint(!focused && q === "");
  const placeholder = focused || q ? "Search dresses, lingerie, accessories…" : animatedHint || "Search…";

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <form
      onSubmit={onSearch}
      className="hidden max-w-[320px] flex-1 items-center gap-2 rounded-full border border-blush-300 bg-blush-100 px-4 py-2 focus-within:border-coral-500 focus-within:ring-2 focus-within:ring-coral-500/20 md:flex"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a7773" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        aria-label="Search products"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        type="text"
        placeholder={placeholder}
        className="flex-1 bg-transparent font-sans text-sm text-ink outline-none placeholder:text-ink-muted"
      />
    </form>
  );
}

export function HeaderSearchMobile() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const animatedHint = useAnimatedHint(!focused && q === "");
  const placeholder = focused || q ? "Search dresses, lingerie, accessories…" : animatedHint || "Search…";

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <form
      onSubmit={onSearch}
      className="flex items-center gap-2 border-t border-blush-100 bg-cream px-4 py-2 focus-within:ring-2 focus-within:ring-inset focus-within:ring-coral-500/20 md:hidden"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a7773" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        aria-label="Search products"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        type="text"
        placeholder={placeholder}
        className="flex-1 bg-transparent font-sans text-[13px] text-ink outline-none placeholder:text-ink-muted"
      />
    </form>
  );
}
