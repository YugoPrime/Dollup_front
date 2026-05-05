import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersListClient } from "./OrdersListClient";

export const metadata: Metadata = {
  title: "My orders",
  description: "Your full Doll Up Boutique order history.",
  robots: { index: false, follow: false },
};

export default function OrdersListPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[900px] px-4 py-12 md:px-8">
          <div className="h-8 w-40 animate-pulse rounded bg-blush-100" />
        </div>
      }
    >
      <OrdersListClient />
    </Suspense>
  );
}
