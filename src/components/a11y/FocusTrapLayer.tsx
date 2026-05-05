"use client";

import { FocusTrap } from "focus-trap-react";
import type { ReactNode } from "react";

export function FocusTrapLayer({
  ariaLabel,
  children,
  className,
  onDeactivate,
}: {
  ariaLabel: string;
  children: ReactNode;
  className: string;
  onDeactivate: () => void;
}) {
  return (
    <FocusTrap
      focusTrapOptions={{
        clickOutsideDeactivates: true,
        escapeDeactivates: true,
        fallbackFocus: () =>
          document.querySelector<HTMLElement>("[data-focus-trap-fallback]") ??
          document.body,
        onDeactivate,
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
