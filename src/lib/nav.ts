export type NavLink = {
  label: string;
  href: string;
  badge?: "hot";
  children?: { label: string; href: string }[];
};

export const NAV_LINKS: NavLink[] = [
  { label: "New Arrivals", href: "/shop?sort=new" },
  {
    label: "Outfit",
    href: "/shop?category=clothing",
    children: [
      { label: "Dresses", href: "/shop?category=dresses" },
      { label: "Two-Pieces Set", href: "/shop?category=two-piece-outfits" },
      { label: "Jumpsuits", href: "/shop?category=jumpsuits" },
      { label: "Top", href: "/shop?category=tops" },
      { label: "Bottom", href: "/shop?category=bottoms" },
      { label: "Winter", href: "/shop?category=winter" },
    ],
  },
  { label: "Lingerie", href: "/shop?category=lingerie" },
  { label: "Intimates", href: "/shop?category=intimates", badge: "hot" },
  { label: "Beachwear", href: "/shop?category=beachwear" },
  { label: "Accessories", href: "/shop?category=accessories" },
  { label: "Sale", href: "/shop?on_sale=1" },
];

export const FOOTER_SHOP = [
  { label: "All Products", href: "/shop" },
  { label: "Dresses", href: "/shop?category=dresses" },
  { label: "Lingerie", href: "/shop?category=lingerie" },
  { label: "Intimates", href: "/shop?category=intimates" },
  { label: "Beachwear", href: "/shop?category=beachwear" },
  { label: "Accessories", href: "/shop?category=accessories" },
  { label: "Sale", href: "/shop?on_sale=1" },
];

export const FOOTER_HELP = [
  { label: "Track Order", href: "/track-order" },
  { label: "Contact Us", href: "/contact" },
  { label: "Size Guide", href: "/size-guide" },
  { label: "FAQ", href: "/faq" },
  { label: "Shipping", href: "/shipping" },
  { label: "Returns", href: "/returns" },
];

export const FOOTER_ABOUT = [
  { label: "Our Story", href: "/about" },
  { label: "Lookbook", href: "/lookbook" },
  { label: "Events & Giveaways", href: "/events" },
  { label: "Loyalty Programme", href: "/loyalty" },
  { label: "Wishlist", href: "/wishlist" },
];

export const FOOTER_LEGAL = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie preferences", href: "/privacy/cookies" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Returns Policy", href: "/returns" },
];

// Pulls the `category` query-string slug out of `/shop?category=<handle>` hrefs.
// Returns null for non-category links (e.g. `?sort=new`, `?on_sale=1`) so the
// stock-filter leaves them alone.
function categoryHandleFromHref(href: string): string | null {
  const queryStart = href.indexOf("?");
  if (queryStart === -1) return null;
  const params = new URLSearchParams(href.slice(queryStart + 1));
  return params.get("category");
}

// Drops nav entries whose target category has no in-stock products. Non-category
// links (New Arrivals, Sale) pass through. A parent stays when any of its
// children remain, even if the parent's own category is empty.
export function filterNavLinksByStockedHandles(
  links: NavLink[],
  stocked: Set<string>,
): NavLink[] {
  const out: NavLink[] = [];
  for (const link of links) {
    const ownHandle = categoryHandleFromHref(link.href);
    const ownHasStock = ownHandle == null || stocked.has(ownHandle);
    const filteredChildren = link.children
      ? link.children.filter((c) => {
          const h = categoryHandleFromHref(c.href);
          return h == null || stocked.has(h);
        })
      : undefined;
    const hasChildrenLeft = !!filteredChildren && filteredChildren.length > 0;
    if (!ownHasStock && !hasChildrenLeft) continue;
    out.push(
      filteredChildren !== undefined
        ? { ...link, children: filteredChildren }
        : link,
    );
  }
  return out;
}

