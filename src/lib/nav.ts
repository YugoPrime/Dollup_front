export type NavLink = {
  label: string;
  href: string;
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
      { label: "Winter", href: "/shop?tag=winter" },
    ],
  },
  { label: "Lingerie", href: "/shop?category=lingerie" },
  { label: "Beachwear", href: "/shop?category=beachwear" },
  { label: "Accessories", href: "/shop?category=accessories" },
  { label: "Sale", href: "/shop?on_sale=1" },
];

export const FOOTER_SHOP = [
  { label: "All Products", href: "/shop" },
  { label: "Dresses", href: "/shop?category=dresses" },
  { label: "Lingerie", href: "/shop?category=lingerie" },
  { label: "Beachwear", href: "/shop?category=beachwear" },
  { label: "Accessories", href: "/shop?category=accessories" },
  { label: "Sale", href: "/shop?on_sale=1" },
];

export const FOOTER_HELP = [
  { label: "Track Order", href: "/track-order" },
  { label: "Contact Us", href: "/contact" },
  { label: "Size Guide", href: "/size-guide" },
  { label: "FAQ", href: "/faq" },
  { label: "Shipping", href: "/faq#shipping" },
];

export const FOOTER_ABOUT = [
  { label: "Our Story", href: "/about" },
  { label: "Lookbook", href: "/lookbook" },
  { label: "Events & Giveaways", href: "/events" },
  { label: "Loyalty Programme", href: "/loyalty" },
  { label: "Wishlist", href: "/wishlist" },
];
