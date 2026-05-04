import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleCallbackClient } from "./GoogleCallbackClient";

export const metadata: Metadata = {
  title: "Signing you in…",
  robots: { index: false, follow: false },
};

export default function GoogleCallbackPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <p className="font-sans text-sm text-ink-muted">
            Signing you in…
          </p>
        }
      >
        <GoogleCallbackClient />
      </Suspense>
    </main>
  );
}
