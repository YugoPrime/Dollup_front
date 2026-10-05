"use client";

import { useEffect, useRef, useState } from "react";

const MOBILE_MAX_WIDTH = 767; // below Tailwind `md`
const REVEAL_THRESHOLD = 24; // px of upward scroll before the header returns
const HIDE_AFTER = 160; // never hide inside the first screen

/**
 * Sticky header wrapper that slides out of the way while the shopper scrolls
 * down on a phone and comes back the moment they scroll up. The header plus
 * the bottom tab bar were taking 30% of a 390x844 viewport (34% on the PDP
 * with the sticky Add to Bag), so reclaiming the 72px logo row while reading
 * a grid or a product page is the single biggest space win on mobile.
 *
 * Implemented by animating `top` on the sticky element rather than a
 * transform: a transform would turn the header into the containing block for
 * every `position: fixed` descendant (mobile menu drawer, search overlay) and
 * pin them to the header instead of the viewport.
 */
export function HeaderShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  const ref = useRef<HTMLElement>(null);
  // Negative = header slid up by its own height; 0 = pinned at the top.
  // Measured inside the scroll handler so render never touches the ref.
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let lastY = window.scrollY;
    let upwardRun = 0;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;

      // Desktop keeps the header pinned; an open overlay (menu/search/cart)
      // locks body scroll, and we never want to move the header under it.
      if (
        window.innerWidth > MOBILE_MAX_WIDTH ||
        document.body.style.overflow === "hidden"
      ) {
        setOffset(0);
        upwardRun = 0;
        return;
      }

      if (delta > 0) {
        upwardRun = 0;
        if (y > HIDE_AFTER) setOffset(-(ref.current?.offsetHeight ?? 0));
      } else if (delta < 0) {
        upwardRun += -delta;
        if (upwardRun > REVEAL_THRESHOLD || y <= HIDE_AFTER) setOffset(0);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Keyboard users tabbing into the header must always be able to see it.
  const onFocusCapture = () => setOffset(0);

  return (
    <header
      ref={ref}
      className={className}
      data-hidden={offset < 0 ? "" : undefined}
      onFocusCapture={onFocusCapture}
      style={{
        top: offset,
        transition: "top 220ms ease",
      }}
    >
      {children}
    </header>
  );
}
