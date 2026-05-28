"use client";

import { useState } from "react";
import { PDP_COLOR_CHANGE_EVENT } from "./events";

type Props = {
  colors: string[];
  initialColor: string;
  onChange?: (color: string) => void;
};

export function PreorderColorSwatches({ colors, initialColor, onChange }: Props) {
  const [active, setActive] = useState(initialColor);

  const pick = (c: string) => {
    setActive(c);
    onChange?.(c);
    window.dispatchEvent(
      new CustomEvent(PDP_COLOR_CHANGE_EVENT, { detail: { value: c } }),
    );
  };

  if (colors.length <= 1) return null;

  return (
    <div className="space-y-2">
      <p className="text-[12px] font-medium text-ink">Color · <span className="text-ink-muted">{active}</span></p>
      <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-2">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === active}
            onClick={() => pick(c)}
            className={
              "rounded border px-3 py-1 text-[13px] transition " +
              (c === active
                ? "border-sage-700 bg-sage-700 text-cream"
                : "border-sage-200 text-ink hover:border-sage-400")
            }
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
