"use client";

import { useState } from "react";

type Section = { key: string; title: string; body: React.ReactNode };

// Importer embeds the size chart inside `description` as `<h3>Size Chart</h3>` followed
// by either a plain HTML table or a single `<img>` tag (see inventory-audit/scripts/import-medusa.ts).
// We split on that heading so the accordion can show the rest of the description in
// "Description" and the chart itself in "Size Chart".
function splitDescription(description: string | null | undefined): {
  main: string;
  sizeChart: string | null;
} {
  if (!description) return { main: "", sizeChart: null };
  const re = /<h3[^>]*>\s*Size Chart\s*<\/h3>/i;
  const match = re.exec(description);
  if (!match) return { main: cleanHtml(description), sizeChart: null };
  return {
    main: cleanHtml(description.slice(0, match.index)),
    sizeChart: cleanHtml(description.slice(match.index + match[0].length)),
  };
}

// Aggressively strip the empty wrapping markup the importer leaves around
// the size chart (visible as a tall blank gap above the table). Repeatedly
// peel off leading whitespace, &nbsp;, <br>, and empty <p>/<div> until we
// hit real content. Same for trailing.
function cleanHtml(s: string): string {
  let out = s;
  const leading = /^(?:\s|&nbsp;|<br\s*\/?>|<p[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>|<div[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/div>)+/i;
  const trailing = /(?:\s|&nbsp;|<br\s*\/?>|<p[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>|<div[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/div>)+$/i;
  let prev: string;
  do {
    prev = out;
    out = out.replace(leading, "").replace(trailing, "");
  } while (out !== prev);
  // Collapse runs of 3+ <br>s anywhere inside.
  out = out.replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>");
  return out.trim();
}

export function ProductAccordion({ description }: { description?: string | null }) {
  const { main, sizeChart } = splitDescription(description);

  const sections: Section[] = [
    {
      key: "size",
      title: "Size Chart",
      body: sizeChart ? (
        <div
          className="font-sans text-[13px] leading-[1.6] text-ink-soft [&_img]:mt-2 [&_img]:max-w-full [&_img]:rounded-lg [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-blush-300 [&_th]:bg-blush-100 [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-blush-300 [&_td]:p-2 [&_p:empty]:hidden [&_br+br]:hidden"
          dangerouslySetInnerHTML={{ __html: sizeChart }}
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
      body: main ? (
        <div
          className="prose-sm font-sans text-[13px] leading-[1.6] text-ink-soft [&_p]:mb-2 [&_strong]:text-ink [&_p:empty]:hidden"
          dangerouslySetInnerHTML={{ __html: main }}
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
            <strong className="text-ink">Confirm before noon</strong> to receive your order the next day across Mauritius.
          </p>
          <p className="mt-1.5">Free delivery on orders Rs 1,500+. Cash on delivery available island-wide.</p>
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
