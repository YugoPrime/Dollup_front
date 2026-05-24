import { notFound } from "next/navigation";
import { getPreorderProduct } from "@/lib/preorder";
import { PreorderBadge } from "@/components/preorder/PreorderBadge";
import { PreorderEtaBadge } from "@/components/preorder/PreorderEtaBadge";
import { AddToPreorderCart } from "@/components/preorder/AddToPreorderCart";

export const revalidate = 60;

export default async function PreorderPDP({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const product = await getPreorderProduct(handle);
  if (!product) notFound();

  const price = product.variants[0]?.calculated_price?.calculated_amount ?? null;
  const depositPercent = 75;

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2">
      <div>
        {product.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.thumbnail}
            alt={product.title}
            className="w-full rounded bg-blush-50"
          />
        )}
      </div>
      <div>
        <PreorderBadge />
        <h1 className="mt-2 font-display text-2xl text-ink">
          {product.title}
        </h1>
        <PreorderEtaBadge />
        {price !== null && (
          <p className="mt-4 text-2xl font-semibold text-ink">
            Rs {(price / 100).toFixed(0)}
          </p>
        )}

        <div className="mt-6 rounded border border-blush-400 bg-blush-50 p-4 text-[13px] text-ink">
          <p className="font-semibold">How pre-order works</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>{depositPercent}% deposit via Juice reserves your piece.</li>
            <li>We order from SHEIN within 7 days.</li>
            <li>Ships ~15–20 days from order.</li>
            <li>Pay balance when ready for delivery/collection.</li>
          </ol>
          <p className="mt-3 font-semibold text-red-700">
            All pre-order sales are final. No cancellations or refunds once deposit is paid.
          </p>
        </div>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <AddToPreorderCart product={product as any} />
      </div>
    </main>
  );
}
