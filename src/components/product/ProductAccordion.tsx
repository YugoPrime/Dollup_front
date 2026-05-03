"use client";

import { useState } from "react";

type Section = { key: string; title: string; body: React.ReactNode };

export function ProductAccordion({ description }: { description?: string | null }) {
  const sections: Section[] = [
    {
      key: "desc",
      title: "Description",
      body: <p className="font-sans text-[13px] leading-[1.6] text-ink-soft">{description || "No description yet."}</p>,
    },
    {
      key: "materials",
      title: "Materials & care",
      body: <p className="font-sans text-[13px] leading-[1.6] text-ink-soft">Hand wash cold. Lay flat to dry. Do not bleach.</p>,
    },
    {
      key: "size",
      title: "Size & fit",
      body: <p className="font-sans text-[13px] leading-[1.6] text-ink-soft">True to size. Model is 5&apos;7&quot; wearing size S.</p>,
    },
    {
      key: "shipping",
      title: "Shipping & returns",
      body: <p className="font-sans text-[13px] leading-[1.6] text-ink-soft">Free shipping on Rs 999+. 7-day easy returns. COD available across Mauritius.</p>,
    },
  ];

  const [open, setOpen] = useState<string>("desc");

  return (
    <div className="border-t border-blush-100">
      {sections.map((s) => {
        const isOpen = open === s.key;
        return (
          <div key={s.key} className="border-b border-blush-100">
            <button
              onClick={() => setOpen(isOpen ? "" : s.key)}
              className="flex w-full items-center justify-between py-4 font-sans text-[12px] font-bold uppercase tracking-[0.1em] text-ink"
            >
              <span>{s.title}</span>
              <span className={`text-coral-500 text-[18px] transition-transform ${isOpen ? "rotate-45" : ""}`}>+</span>
            </button>
            {isOpen && <div className="pb-4">{s.body}</div>}
          </div>
        );
      })}
    </div>
  );
}
