import { notFound } from "next/navigation";
import { computeDepositSplit, getPreorderProduct, type PreorderVariant } from "@/lib/preorder";
import { formatPrice } from "@/lib/format";
import { PreorderBadge } from "@/components/preorder/PreorderBadge";
import { PreorderEtaBadge } from "@/components/preorder/PreorderEtaBadge";
import { AddToPreorderCart } from "@/components/preorder/AddToPreorderCart";
import { PreorderGallery } from "@/components/preorder/PreorderGallery";
import { PreorderColorSwatches } from "@/components/preorder/PreorderColorSwatches";

export const revalidate = 60;

function colorOf(variant: PreorderVariant): string | null {
  const opt = variant.options?.find(
    (o) => o.option?.title === "Color" || o.option?.title === "color",
  );
  return opt?.value ?? null;
}

export default async function PreorderPDP({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const product = await getPreorderProduct(handle);
  if (!product) notFound();

  // Group variants by color so we can build the per-color image map. Each
  // color's first variant's metadata.image_urls is the source of truth (all
  // variants of the same color share the same image_urls).
  const colorImageMap: Record<string, string[]> = {};
  const colorOrder: string[] = [];
  for (const v of product.variants) {
    const c = colorOf(v) ?? "Default";
    if (!colorImageMap[c]) {
      colorOrder.push(c);
      const fromMeta = v.metadata?.image_urls;
      colorImageMap[c] =
        Array.isArray(fromMeta) && fromMeta.length > 0
          ? fromMeta
          : product.thumbnail
            ? [product.thumbnail]
            : [];
    }
  }
  const initialColor = colorOrder[0] ?? "Default";

  // calculated_amount is whole MUR rupees in this DB (NOT minor units) — same
  // value the cart shows. Do NOT divide by 100; an earlier /100 here showed
  // "Rs 10" for a Rs 1,040 dress once the source data was corrected.
  const priceMur =
    product.variants[0]?.calculated_price?.calculated_amount ?? null;
  const depositPercent = 75;
  const split =
    priceMur !== null
      ? computeDepositSplit(priceMur, depositPercent)
      : null;
  const depositAmount = split ? split.depositMur : null;
  const balanceAmount = split ? split.balanceMur : null;

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2">
      <PreorderGallery
        colorImageMap={colorImageMap}
        initialColor={initialColor}
        productTitle={product.title}
      />

      <div>
        <PreorderBadge />
        <h1 className="mt-3 font-display text-3xl leading-tight text-ink">
          {product.title}
        </h1>

        <div className="mt-3">
          <PreorderEtaBadge />
        </div>

        {priceMur !== null && (
          <div className="mt-5 flex items-baseline gap-3">
            <p className="font-display text-3xl text-ink">
              {formatPrice(priceMur, "MUR")}
            </p>
            <span className="text-[12px] text-ink-muted">all-in price</span>
          </div>
        )}

        {depositAmount !== null && balanceAmount !== null && (
          <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-lg border border-sage-200">
            <div className="border-r border-sage-200 bg-sage-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sage-700">
                Deposit now
              </p>
              <p className="mt-1 font-display text-xl text-ink">
                {formatPrice(depositAmount, "MUR")}
              </p>
              <p className="mt-1 text-[11px] text-ink-muted">via Juice transfer</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Balance on arrival
              </p>
              <p className="mt-1 font-display text-xl text-ink">
                {formatPrice(balanceAmount, "MUR")}
              </p>
              <p className="mt-1 text-[11px] text-ink-muted">cash, Juice or card</p>
            </div>
          </div>
        )}

        {colorOrder.length > 1 && (
          <div className="mt-6">
            <PreorderColorSwatches colors={colorOrder} initialColor={initialColor} />
          </div>
        )}

        <div className="mt-6 rounded-lg border border-sage-200 bg-sage-50 p-5 text-[13px] text-ink-soft">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage-700">
            How pre-order works
          </p>
          <ol className="mt-3 space-y-2">
            <li className="flex gap-3">
              <span className="font-display text-sage-300">01</span>
              <span>{depositPercent}% deposit via Juice reserves your piece.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-sage-300">02</span>
              <span>We order from SHEIN within 7 days.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-sage-300">03</span>
              <span>Ships ~15–20 days from order.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-sage-300">04</span>
              <span>Pay balance when ready for delivery or collection.</span>
            </li>
          </ol>
          <p className="mt-4 rounded border border-coral-300 bg-white px-3 py-2 text-[12px] font-semibold text-coral-700">
            All pre-order sales are final — no cancellations or refunds once deposit is paid.
          </p>
        </div>

        <div className="mt-6">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <AddToPreorderCart product={product as any} />
        </div>
      </div>
    </main>
  );
}
