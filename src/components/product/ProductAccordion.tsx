"use client";

import { useState } from "react";

type Section = { key: string; title: string; body: React.ReactNode };

export function ProductAccordion({
  descriptionHtml,
  sizeChartHtml,
  preorderEtaCopy,
  freeShippingLabel,
}: {
  descriptionHtml: string;
  sizeChartHtml: string | null;
  preorderEtaCopy: string;
  freeShippingLabel: string;
}) {
  const sections: Section[] = [
    {
      key: "size",
      title: "Size Chart",
      body: sizeChartHtml ? (
        <div
          className="font-sans text-[13px] leading-[1.6] text-ink-soft [&_img]:mt-2 [&_img]:max-w-full [&_img]:rounded-lg [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-blush-300 [&_th]:bg-blush-100 [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-blush-300 [&_td]:p-2 [&_p:empty]:hidden [&_br+br]:hidden"
          dangerouslySetInnerHTML={{ __html: sizeChartHtml }}
        />
      ) : (
        <p className="font-sans text-[13px] leading-[1.6] text-ink-soft">
          True to size. If you&apos;re between sizes, message us on Instagram and we&apos;ll guide you.
        </p>
      ),
    },
    {
      key: "desc",
      title: "Description",
      body: descriptionHtml ? (
        <div
          className="prose-sm font-sans text-[13px] leading-[1.6] text-ink-soft [&_p]:mb-2 [&_strong]:text-ink [&_p:empty]:hidden"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      ) : (
        <p className="font-sans text-[13px] leading-[1.6] text-ink-soft">No description yet.</p>
      ),
    },
    {
      key: "materials",
      title: "Materials & care",
      body: <p className="font-sans text-[13px] leading-[1.6] text-ink-soft">Hand wash cold. Lay flat to dry. Do not bleach.</p>,
    },
    {
      key: "shipping",
      title: "Shipping",
      body: (
        <div className="font-sans text-[13px] leading-[1.6] text-ink-soft">
          <p>
            <strong className="text-ink">{preorderEtaCopy}</strong>
          </p>
          <p className="mt-1.5">
            Free delivery on orders {freeShippingLabel}+. Cash on delivery
            available island-wide.
          </p>
        </div>
      ),
    },
  ];

  const [open, setOpen] = useState<string>("size");

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
