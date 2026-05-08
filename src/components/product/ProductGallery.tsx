import type { HttpTypes } from "@medusajs/types";
import { ProductGalleryMobile } from "./ProductGalleryMobile";
import { ProductGalleryDesktop } from "./ProductGalleryDesktop";

export function ProductGallery({ product }: { product: HttpTypes.StoreProduct }) {
  const images = (product.images ?? []).map((i) => ({ url: i.url, alt: product.title }));
  if (!images.length && product.thumbnail) images.push({ url: product.thumbnail, alt: product.title });

  return (
    <>
      <div className="md:hidden">
        <ProductGalleryMobile images={images} alt={product.title} />
      </div>
      <div className="hidden md:block">
        <ProductGalleryDesktop images={images} alt={product.title} />
      </div>
    </>
  );
}
