import type { Metadata } from "next";
import { WishlistClient } from "./WishlistClient";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your saved products at Doll Up Boutique.",
};

export default function WishlistPage() {
  return <WishlistClient />;
}
