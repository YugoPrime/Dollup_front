import Link from "next/link";
import { PreorderBadge } from "./PreorderBadge";
import { PreorderEtaBadge } from "./PreorderEtaBadge";
import type { PreorderProduct } from "@/lib/preorder";

export function PreorderProductCard({ product }: { product: PreorderProduct }) {
  const price = product.variants[0]?.calculated_price?.calculated_amount ?? null;

  return (
    <Link
      href={`/preorder/products/${product.handle}`}
      className="group block overflow-hidden rounded-lg border border-sage-100 bg-white transition hover:border-sage-300 hover:shadow-sm"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-blush-50">
        {product.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.thumbnail}
            alt={product.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}
        <span className="absolute left-2 top-2">
          <PreorderBadge />
        </span>
      </div>

      <div className="space-y-1.5 px-3 py-3">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-ink">
          {product.title}
        </h3>
        {price !== null && (
          <p className="font-display text-base text-ink">
            Rs {(price / 100).toFixed(0)}
          </p>
        )}
        <PreorderEtaBadge />
      </div>
    </Link>
  );
}
