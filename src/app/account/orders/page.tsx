import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersListClient } from "./OrdersListClient";

export const metadata: Metadata = {
  title: "My orders",
  description: "Your full Doll Up Boutique order history.",
};

export default function OrdersListPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-[900px] px-4 py-12 md:px-8">
          <div className="h-8 w-40 animate-pulse rounded bg-blush-100" />
        </main>
      }
    >
      <OrdersListClient />
    </Suspense>
  );
}
