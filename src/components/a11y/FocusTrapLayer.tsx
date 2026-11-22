"use client";

import { FocusTrap } from "focus-trap-react";
import { useLayoutEffect, useRef, type ReactNode } from "react";

export function FocusTrapLayer({
  ariaLabel,
  children,
  className,
  initialFocus,
  onDeactivate,
}: {
  ariaLabel: string;
  children: ReactNode;
  className: string;
  /** Element to focus on open. Default: the first tabbable element inside. */
  initialFocus?: () => HTMLElement | false;
  onDeactivate: () => void;
}) {
  // focus-trap-react calls `onDeactivate` from componentWillUnmount. Under
  // React Strict Mode (dev) every mount is immediately simulated-unmounted
  // and remounted, so a fresh dialog would call onDeactivate → onClose and
  // close itself before the shopper saw it. Track our own mounted state with
  // a layout effect (layout cleanups run parent-first, before the child's
  // componentWillUnmount) and only forward deactivations while mounted.
  const mountedRef = useRef(false);
  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <FocusTrap
      focusTrapOptions={{
        clickOutsideDeactivates: true,
        escapeDeactivates: true,
        initialFocus,
        fallbackFocus: () =>
          document.querySelector<HTMLElement>("[data-focus-trap-fallback]") ??
          document.body,
        onDeactivate: () => {
          if (mountedRef.current) onDeactivate();
        },
        returnFocusOnDeactivate: true,
      }}
    >
      <div
        aria-label={ariaLabel}
        className={className}
        data-focus-trap-fallback
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </div>
    </FocusTrap>
  );
}
