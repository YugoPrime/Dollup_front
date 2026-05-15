import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Doll Up Boutique account.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 md:py-16">
      <div
        role="status"
        className="mb-6 rounded-xl border border-coral-300 bg-blush-100 px-4 py-3 text-sm leading-relaxed text-ink"
      >
        <p className="font-medium">Doll Up just got a major refresh.</p>
        <p className="mt-1 text-ink-soft">
          If you shopped with us before our update, your old account may no
          longer be active. The easiest way to get going again is{" "}
          <span className="font-medium">signing in with Google</span>, or
          finish the form below to create a new account.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="rounded-xl border border-blush-300 bg-white p-8" />
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
