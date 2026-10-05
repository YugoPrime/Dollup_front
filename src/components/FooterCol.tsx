"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Footer link group. On phones the three groups used to stack 18 single-column
 * links into ~1,600px of scroll; below `md` each group is a collapsed
 * accordion row instead. From `md` up it is the plain always-open list.
 */
export function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  return (
    <nav aria-label={title} className="border-b border-blush-300 md:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={listId}
        className="flex min-h-12 w-full items-center justify-between font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-ink md:hidden"
      >
        {title}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <h3 className="mb-2 hidden font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-ink md:block">
        {title}
      </h3>
      <ul
        id={listId}
        className={`${open ? "flex" : "hidden"} flex-col pb-2 md:flex md:pb-0`}
      >
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              prefetch={false}
              className="flex min-h-11 items-center font-sans text-[14px] text-ink-soft transition-colors hover:text-coral-500 md:min-h-8 md:text-[13px]"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
