import type { Metadata } from "next";
import { WishlistClient } from "./WishlistClient";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your saved products at Doll Up Boutique.",
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return <WishlistClient />;
}
