import Link from "next/link";
import { ChipRow } from "@/app/sale/ChipRow";
import {
  AFTER_DARK_GROUPS,
  AFTER_DARK_PATH,
  type AfterDarkGroup,
} from "@/lib/after-dark";

export type AfterDarkSortKey = "new" | "price-asc" | "price-desc";

// /after-dark URL keeping the sort and search; `group: null` is the All chip.
// "new" is the default sort, so it stays out of the URL.
export function afterDarkHref({
  group,
  sort,
  q,
}: {
  group: AfterDarkGroup | null;
  sort: AfterDarkSortKey;
  q?: string;
}): string {
  const p = new URLSearchParams();
  if (group) p.set("group", group);
  if (sort !== "new") p.set("sort", sort);
  if (q) p.set("q", q);
  const qs = p.toString();
  return qs ? `${AFTER_DARK_PATH}?${qs}` : AFTER_DARK_PATH;
}

function Chip({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`flex min-h-9 shrink-0 items-center rounded-full border px-4 py-2 font-sans text-[13px] font-medium transition-colors ${
        active
          ? "border-wine-800 bg-wine-800 text-champagne-100"
          : "border-blush-400 bg-white text-ink-soft hover:border-wine-800"
      }`}
    >
      {children}
    </Link>
  );
}

// Group pills under the hero: All, then only the groups that have a listed toy.
export function AfterDarkChips({
  active,
  groups,
  sort,
  q,
}: {
  active: AfterDarkGroup | null;
  groups: AfterDarkGroup[];
  sort: AfterDarkSortKey;
  q?: string;
}) {
  return (
    <ChipRow label="Filter After Dark">
      <Chip href={afterDarkHref({ group: null, sort, q })} active={active === null}>
        All
      </Chip>
      {AFTER_DARK_GROUPS.filter((g) => groups.includes(g.key)).map((g) => (
        <Chip key={g.key} href={afterDarkHref({ group: g.key, sort, q })} active={active === g.key}>
          {g.label}
        </Chip>
      ))}
    </ChipRow>
  );
}
