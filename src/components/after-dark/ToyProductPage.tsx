import Link from "next/link";
import { Suspense } from "react";
import type { HttpTypes } from "@medusajs/types";
import { Banknote, MessageCircle, Package } from "lucide-react";
import { AfterDarkCard } from "@/components/after-dark/AfterDarkCard";
import { AfterDarkGate } from "@/components/after-dark/AfterDarkGate";
import {
  ToyBuyPanel,
  ToyInfoRow,
  ToySectionHeading,
  type ToyVariantView,
} from "@/components/after-dark/ToyBuyPanel";
import {
  AFTER_DARK_GROUPS,
  AFTER_DARK_PATH,
  afterDarkCode,
  askPrivatelyUrl,
  rankRelatedToys,
  visibleToyOptions,
  type AfterDarkGroup,
} from "@/lib/after-dark";
import { getDisplayPrice } from "@/lib/format";
import { splitProductDescription } from "@/lib/product-description";
import { listProducts } from "@/lib/products";
import { parseToyFacts } from "@/lib/toy-facts";

const ICON = { size: 18, strokeWidth: 1.4, "aria-hidden": true } as const;

function toVariantView(v: HttpTypes.StoreProductVariant): ToyVariantView {
  const values: Record<string, string> = {};
  for (const o of v.options ?? []) {
    // Same key as ToyOptionView.id: the option id, else the lowercased title.
    const key = o.option_id || (o.option?.title ?? "").toLowerCase();
    if (key) values[key] = o.value?.trim() ?? "";
  }
  return {
    id: v.id,
    values,
    buyable: !v.manage_inventory || (v.inventory_quantity ?? 0) > 0,
    amount: getDisplayPrice({ variants: [v] }).amount,
  };
}

// The After Dark product page (spec §3, mockup afterdark-toy-page phones 2–3).
export function ToyProductPage({ product }: { product: HttpTypes.StoreProduct }) {
  const code = afterDarkCode(product);
  const facts = parseToyFacts(product.metadata);
  const groups = facts?.groups ?? [];
  const firstGroup = AFTER_DARK_GROUPS.find((g) => g.key === groups[0]);

  const images = (product.images ?? []).map((i) => i.url).filter((u): u is string => !!u);
  if (images.length === 0 && product.thumbnail) images.push(product.thumbnail);

  return (
    <div data-after-dark-surface="light">
      <AfterDarkGate />

      <nav aria-label="After Dark" data-after-dark-surface="wine" className="after-dark-hero-bg">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 md:px-8">
          <Link
            href={AFTER_DARK_PATH}
            className="inline-flex min-h-10 items-center font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-champagne-gold transition-colors duration-300 hover:text-champagne-50"
          >
            <span aria-hidden="true" className="mr-1.5 text-[14px] leading-none">‹</span>
            After Dark
          </Link>
          {firstGroup ? (
            <Link
              href={`${AFTER_DARK_PATH}?group=${firstGroup.key}`}
              className="inline-flex min-h-10 items-center font-sans text-[11px] font-medium uppercase tracking-[0.08em] text-champagne-200 transition-colors duration-300 hover:text-champagne-50"
            >
              {firstGroup.label}
            </Link>
          ) : null}
        </div>
      </nav>

      <ToyBuyPanel
        productId={product.id}
        title={product.title ?? ""}
        code={code}
        images={images}
        options={visibleToyOptions(product.options ?? [])}
        variants={(product.variants ?? []).map(toVariantView)}
        currency={getDisplayPrice(product).currency}
        facts={facts}
        descriptionHtml={splitProductDescription(product.description).main}
      >
        <section aria-labelledby="toy-delivery-title" className="mt-7">
          <ToySectionHeading id="toy-delivery-title">Delivery &amp; payment</ToySectionHeading>
          <ul className="mt-1">
            <ToyInfoRow icon={<Banknote {...ICON} />} title="Cash on delivery" sub="Island-wide" />
            <ToyInfoRow
              icon={<Package {...ICON} />}
              title="Discreet delivery"
              sub="Plain parcel, no product name on the outside"
            />
          </ul>
        </section>

        <a
          href={askPrivatelyUrl(code)}
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-full border border-wine-800 px-5 font-sans text-[13px] font-bold text-wine-800 transition-colors duration-300 hover:bg-wine-800 hover:text-champagne-100"
        >
          <MessageCircle size={16} strokeWidth={1.6} aria-hidden />
          Ask us privately about {code}
        </a>
      </ToyBuyPanel>

      <Suspense fallback={null}>
        <MoreFromAfterDark currentId={product.id} currentGroups={groups} />
      </Suspense>

      {/* Room for the fixed Add to bag pill on mobile. */}
      <div
        aria-hidden="true"
        className="md:hidden"
        style={{ height: "calc(6rem + env(safe-area-inset-bottom))" }}
      />
    </div>
  );
}

async function MoreFromAfterDark({
  currentId,
  currentGroups,
}: {
  currentId: string;
  currentGroups: AfterDarkGroup[];
}) {
  // "only" = toys, never clothes; listProducts already drops sold-out and
  // unlisted products.
  const res = await listProducts({ afterDark: "only", limit: 40, order: "-created_at" }).catch(
    (err) => {
      console.error("More from After Dark failed:", err);
      return null;
    },
  );
  if (!res) return null;
  const items = res.products.map((product) => {
    const facts = parseToyFacts(product.metadata);
    return { id: product.id, groups: facts?.groups ?? [], product, facts };
  });
  const picks = rankRelatedToys(currentId, currentGroups, items, 4);
  if (picks.length === 0) return null;

  return (
    <section
      aria-labelledby="more-after-dark-title"
      className="mx-auto max-w-[1280px] px-4 pb-6 pt-10 md:px-8 md:pb-14 md:pt-16"
    >
      <ToySectionHeading id="more-after-dark-title">More from After Dark</ToySectionHeading>
      <div className="mt-3 grid grid-cols-2 gap-2.5 md:mt-4 md:grid-cols-4 md:gap-4">
        {picks.map(({ product, facts }) => (
          <AfterDarkCard key={product.id} product={product} facts={facts} />
        ))}
      </div>
    </section>
  );
}
