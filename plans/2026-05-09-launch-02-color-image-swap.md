# Plan 02 — Color → image swap (Option A: variant-scoped images)

**Owner:** Frontend + Medusa data
**Priority:** P1 — UX win, ships post-launch ideally but achievable in 36h if data is ready
**Estimated effort:** 4–6 hours
**Repos touched:** `DUB-front`, `dollup-medusa` (Medusa data only — no backend code changes), inventory pipeline

## Context
On the PDP today, clicking a color swatch updates the variant selection but the gallery still shows the global `product.images` array. We want clicking color X to swap the gallery to images of that color. User explicitly chose **Option A** (Medusa-native variant-scoped images) over filename-convention parsing.

## Architecture decision
- Medusa v2 `ProductVariant` does NOT have a `images` relation by default. We use `variant.metadata.image_ids: string[]` to hold an ordered list of image IDs from the parent `product.images` array.
- Frontend filters `product.images` by `matchedVariant.metadata.image_ids` when a variant is selected; falls back to all product images if metadata absent (covers products with no color, or pre-migration products).

## Tasks

### Step 1 — Decide image-IDs schema and document
- File: `DUB-front/CLAUDE.md` — add a "Variant images" section explaining the convention.
- Schema: `variant.metadata.image_ids: string[]` — Medusa product image IDs (`product.images[i].id`) in display order.
- If absent or empty → frontend uses all `product.images`.

### Step 2 — Backfill variant.metadata.image_ids for existing products
- Script: `inventory-audit/scripts/backfill-variant-images.ts` (new)
- For each product:
  - Read `variants[]` and group by color option value.
  - Read `images[]` — assume current ordering already groups by color in your sheet pipeline. Confirm by sampling 5 products manually.
  - For each variant, derive `image_ids` from images whose filename or metadata matches the variant color (use the same regex/convention as `Sheet & image conventions` memory).
  - Update via Medusa Admin API: `POST /admin/products/:id/variants/:variant_id` with `{ metadata: { image_ids: [...] } }`.
- Run on staging Medusa first, sample-verify in admin UI, then run on prod.
- Idempotent: re-running should produce the same result. Add a `--dry-run` flag.

### Step 3 — Lift selection state out of `ProductBuy` into the page
- File: `DUB-front/src/app/products/[handle]/page.tsx`
- Reason: `ProductGallery` and `ProductBuy` both need to react to color selection. Lift to a small client-side container OR introduce a context.
- Recommended: create `DUB-front/src/components/product/ProductView.tsx` (client component) that owns `selected: Record<string, string>` and renders both `ProductGallery` and `ProductBuy` as children.
- Page becomes:
  ```tsx
  <ProductView
    product={product}
    freeShippingThreshold={freeShippingThreshold}
  />
  ```
- Move existing logic from `ProductBuy.tsx:33` (`useState selected`) up to `ProductView`.

### Step 4 — Plumb selected variant images into the gallery
- File: `DUB-front/src/components/product/ProductGallery.tsx`
- New prop: `images: { url, alt, id }[]` (computed by parent).
- Parent (`ProductView`) computes:
  ```tsx
  const visibleImages = useMemo(() => {
    const ids = matchedVariant?.metadata?.image_ids as string[] | undefined;
    if (!ids?.length) return product.images ?? [];
    const byId = new Map((product.images ?? []).map((img) => [img.id, img]));
    return ids.map((id) => byId.get(id)).filter(Boolean);
  }, [matchedVariant, product.images]);
  ```
- `ProductGallery`, `ProductGalleryDesktop`, `ProductGalleryMobile` all already accept `images` — wire it through.

### Step 5 — Reset gallery active index on color change
- In `ProductGalleryDesktop.tsx` and `ProductGalleryMobile.tsx`, reset `active` to `0` when the `images` array reference changes.
- Use `useEffect(() => setActive(0), [images])` — but to satisfy `react-hooks/set-state-in-effect`, prefer the during-render-change-detection pattern:
  ```tsx
  const [lastImagesRef, setLastImagesRef] = useState(images);
  if (lastImagesRef !== images) {
    setLastImagesRef(images);
    setActive(0);
  }
  ```

### Step 6 — Smoke test
- Pick 3 products with multiple colors (use IS2356 since user reported).
- Verify swatch click → gallery instantly swaps → main image is first of that color → thumbnails update.
- Verify products without `image_ids` metadata still render correctly (fallback path).
- Verify the lightbox opens with the correct subset of images.

## Verification checklist
- [ ] Sample 5 products with `metadata.image_ids` populated in Medusa admin
- [ ] PDP color swatch click swaps gallery in <100ms (no network call)
- [ ] Falls back to all product images when metadata missing
- [ ] Active index resets to 0 on color change
- [ ] Lightbox shows the color-filtered subset, not all images
- [ ] Mobile carousel scrolls back to first slide on color change
- [ ] Production build clean

## Out of scope
- Admin UI for editing `image_ids` per variant (manual JSON edit in admin for now; future plan in dollup-admin)
- Color → thumbnail in shop grid `ProductCard` (future enhancement)
