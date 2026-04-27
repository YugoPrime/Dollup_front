export type NavLink = {
  label: string;
  href: string;
};

export const NAV_LINKS: NavLink[] = [
  { label: "New Arrivals", href: "/shop?sort=new" },
  { label: "Dresses", href: "/shop?category=dresses" },
  { label: "Lingerie", href: "/shop?category=lingerie" },
  { label: "Beachwear", href: "/shop?category=beachwear" },
  { label: "Accessories", href: "/shop?category=accessories" },
  { label: "Sale", href: "/shop?sort=sale" },
];

export const FOOTER_SHOP = [
  { label: "All Products", href: "/shop" },
  { label: "Dresses", href: "/shop?category=dresses" },
  { label: "Lingerie", href: "/shop?category=lingerie" },
  { label: "Beachwear", href: "/shop?category=beachwear" },
  { label: "Accessories", href: "/shop?category=accessories" },
  { label: "Sale", href: "/shop?sort=sale" },
];

export const FOOTER_HELP = [
  { label: "Contact Us", href: "/contact" },
  { label: "Size Guide", href: "/size-guide" },
  { label: "FAQ", href: "/faq" },
  { label: "Shipping & Returns", href: "/faq#shipping" },
];

export const FOOTER_ABOUT = [
  { label: "Our Story", href: "/about" },
  { label: "Lookbook", href: "/lookbook" },
  { label: "Loyalty Programme", href: "/loyalty" },
  { label: "Wishlist", href: "/wishlist" },
];
