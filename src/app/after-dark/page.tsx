import Link from "next/link";
import type { Metadata } from "next";
import { AfterDarkCard } from "@/components/after-dark/AfterDarkCard";
import { AfterDarkChips, type AfterDarkSortKey } from "@/components/after-dark/AfterDarkChips";
import { AfterDarkGate } from "@/components/after-dark/AfterDarkGate";
import { AfterDarkHero } from "@/components/after-dark/AfterDarkHero";
import { AfterDarkSort } from "@/components/after-dark/AfterDarkSort";
import {
  AFTER_DARK_DESCRIPTION,
  AFTER_DARK_PATH,
  availableGroups,
  filterByGroup,
  newPiecesCount,
  parseGroupParam,
} from "@/lib/after-dark";
import { listProducts } from "@/lib/products";
import { parseToyFacts } from "@/lib/toy-facts";

export const revalidate = 300;

// No product name or image in the head: the child openGraph/twitter objects
// replace the root layout's (shallow merge), which carry the default og image.
export const metadata: Metadata = {
  title: "After Dark",
  description: AFTER_DARK_DESCRIPTION,
  robots: { index: false, follow: false, nocache: true },
  openGraph: { title: "After Dark", description: AFTER_DARK_DESCRIPTION },
  twitter: { card: "summary", title: "After Dark", description: AFTER_DARK_DESCRIPTION },
};

type Param = string | string[] | undefined;
type SearchParams = Promise<{ group?: Param; sort?: Param; q?: Param }>;

const first = (v: Param) => (Array.isArray(v) ? v[0] : v);

function parseSort(v: string | undefined): AfterDarkSortKey {
  return v === "price-asc" || v === "price-desc" ? v : "new";
}

type ListResult = Awaited<ReturnType<typeof listProducts>>;
const EMPTY = { products: [] as ListResult["products"], count: 0 };

// Server-only, once per render: pieces created in the last 30 days.
function countNewPieces(products: ListResult["products"]): number {
  return newPiecesCount(products, Date.now());
}

export default async function AfterDarkPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const group = parseGroupParam(first(sp.group));
  const sort = parseSort(first(sp.sort));
  const q = first(sp.q)?.trim() || undefined;
  const sortPrice = sort === "price-asc" ? "asc" : sort === "price-desc" ? "desc" : undefined;

  const load = (query?: string) =>
    listProducts({
      afterDark: "only",
      q: query,
      order: sort === "new" ? "-created_at" : undefined,
      sortPrice,
      limit: 300,
    }).catch((err) => {
      console.error("After Dark load failed:", err);
      return EMPTY;
    });
  // The "new pieces" pill counts all of After Dark, not just the search results.
  const [res, all] = await Promise.all([load(q), q ? load() : null]);
  const products = res.products;

  const items = products.map((product) => {
    const facts = parseToyFacts(product.metadata);
    return { product, facts, groups: facts?.groups ?? [] };
  });
  const shown = filterByGroup(items, group);
  const n = shown.length;

  return (
    <div>
      <AfterDarkGate />
      <AfterDarkHero newCount={countNewPieces((all ?? res).products)} />

      <div className="mx-auto max-w-[1280px] px-4 pb-10 pt-4 md:px-8 md:pb-14 md:pt-6">
        <AfterDarkChips active={group} groups={availableGroups(items)} sort={sort} q={q} />

        {q && (
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-display text-[20px] leading-tight text-ink md:text-[24px]">
              Results for “{q}”
            </p>
            <Link
              href={AFTER_DARK_PATH}
              className="font-sans text-[13px] font-medium text-wine-800 underline underline-offset-2"
            >
              Clear search
            </Link>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="font-sans text-[12px] text-ink-muted md:text-[13px]">
            {n} {n === 1 ? "piece" : "pieces"}
          </p>
          <AfterDarkSort value={sort} />
        </div>

        {n > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2.5 md:mt-4 md:grid-cols-4 md:gap-4">
            {shown.map(({ product, facts }, i) => (
              <AfterDarkCard key={product.id} product={product} facts={facts} imagePriority={i < 2} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <p className="font-display text-[20px] text-ink">Nothing here right now</p>
            <Link
              href={AFTER_DARK_PATH}
              className="mt-5 inline-flex min-h-11 items-center rounded-full bg-wine-800 px-6 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-champagne-100 transition-colors hover:bg-wine-700"
            >
              See all of After Dark
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
