"use client";

import { useState } from "react";

const TABS = [
  { id: "description", label: "Description" },
  { id: "size-guide", label: "Size Guide" },
  { id: "reviews", label: "Reviews" },
] as const;

const SIZE_TABLE = [
  ["XS", "78–80", "60–62", "86–88"],
  ["S", "82–84", "64–66", "90–92"],
  ["M", "86–88", "68–70", "94–96"],
  ["L", "90–92", "72–74", "98–100"],
  ["XL", "94–96", "76–78", "102–104"],
];

const SAMPLE_REVIEWS = [
  { name: "Ana M.", stars: 5, text: "Fits true to size and the quality is amazing!" },
  { name: "Ria C.", stars: 5, text: "So comfortable and looks exactly like the photo." },
  { name: "Gab L.", stars: 4, text: "Beautiful piece, delivery was fast too." },
];

export function ProductTabs({ description }: { description: string | null }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("description");
  return (
    <div>
      <div className="mb-4 flex border-b border-blush-400">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 font-sans text-[13px] transition-colors ${
              tab === t.id
                ? "border-coral-500 font-semibold text-coral-500"
                : "border-transparent text-ink-muted hover:text-ink-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-[100px]">
        {tab === "description" && (
          <p className="font-sans text-sm leading-[1.75] text-ink-soft">
            {description || "Product description coming soon."}
          </p>
        )}
        {tab === "size-guide" && (
          <div>
            <p className="mb-3 font-sans text-sm leading-[1.75] text-ink-soft">
              Measurements are in centimetres. When in between sizes, we recommend sizing up.
            </p>
            <table className="mt-3 w-full border-collapse font-sans text-[13px]">
              <thead>
                <tr>
                  {["Size", "Bust", "Waist", "Hips"].map((h) => (
                    <th
                      key={h}
                      className="border-b border-blush-400 bg-blush-300 px-3 py-2 text-left font-semibold text-ink"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SIZE_TABLE.map((row) => (
                  <tr key={row[0]}>
                    {row.map((v, i) => (
                      <td
                        key={i}
                        className="border-b border-blush-100 px-3 py-1.5 text-ink-soft"
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "reviews" && (
          <div>
            {SAMPLE_REVIEWS.map((r, i) => (
              <div
                key={i}
                className="mb-3 border-b border-blush-100 pb-3 last:border-b-0"
              >
                <div className="mb-1 flex justify-between">
                  <span className="font-sans text-[13px] font-semibold text-ink">
                    {r.name}
                  </span>
                  <span className="text-[13px] text-coral-500">
                    {"★".repeat(r.stars)}
                  </span>
                </div>
                <p className="font-sans text-[13px] leading-relaxed text-ink-soft">
                  {r.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
