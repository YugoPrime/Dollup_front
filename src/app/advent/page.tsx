import type { Metadata } from "next";
import { AdventCalendar } from "@/components/advent/AdventCalendar";
import { adventNowMs, todaysDoor } from "@/lib/advent";
import {
  expandCategoryWithDescendants,
  getTagIdByValue,
  listCategories,
  listProducts,
} from "@/lib/products";
import { isAgeRestricted } from "@/lib/visibility";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "24 Days of Doll Up — Advent calendar",
  description:
    "A new treat behind every door, 1 to 24 December. Open today's door for a Doll Up offer on website orders.",
  alternates: { canonical: "/advent" },
};

type Thumb = { title: string; thumbnail: string; href: string };

function toThumbs(
  products: Awaited<ReturnType<typeof listProducts>>["products"],
  excludeIds: readonly string[] = [],
): Thumb[] {
  return products
    .filter((p) => p.thumbnail && p.handle && !isAgeRestricted(p) && !excludeIds.includes(p.id))
    .slice(0, 3)
    .map((p) => ({ title: p.title, thumbnail: p.thumbnail as string, href: `/products/${p.handle}` }));
}

async function loadThumbs(now: number): Promise<{ day: number; items: Thumb[] }> {
  const door = todaysDoor(now);
  if (!door) return { day: 0, items: [] };
  try {
    if (door.kind === "category" && door.categoryHandles) {
      const cats = await listCategories();
      const ids = new Set<string>();
      for (const h of door.categoryHandles) {
        const c = cats.find((x) => x.handle === h);
        if (c) expandCategoryWithDescendants(c.id, cats).forEach((id) => ids.add(id));
      }
      if (ids.size === 0) return { day: door.day, items: [] };
      const { products } = await listProducts({ category: [...ids], limit: 12 });
      // Products left out of the door must not be pictured under its offer.
      return { day: door.day, items: toThumbs(products, door.excludeProductIds) };
    }
    if (door.kind === "happy-hour") {
      const tagId = await getTagIdByValue("trending");
      if (!tagId) return { day: door.day, items: [] };
      const { products } = await listProducts({ tag: tagId, limit: 12 });
      return { day: door.day, items: toThumbs(products) };
    }
    if (door.kind === "gift" && door.gift && !door.gift.adultOnly && door.gift.thumbnail) {
      return {
        day: door.day,
        items: [{ title: door.gift.name, thumbnail: door.gift.thumbnail, href: door.href }],
      };
    }
  } catch {
    // A failed fetch must never break the calendar: render no thumbs.
  }
  return { day: door.day, items: [] };
}

export default async function AdventPage() {
  const now = adventNowMs();
  const thumbs = await loadThumbs(now);
  return <AdventCalendar initialNow={now} thumbs={thumbs} />;
}
