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
        {/* Accounts on this site start May 2026: old-website logins were never
            migrated, and Google sign-in is switched off, so don't point here. */}
        <p className="font-medium">Shopped with us before our May 2026 refresh?</p>
        <p className="mt-1 text-ink-soft">
          Logins from the old website didn&apos;t carry over, so fill in the
          form below to create a new account. Already made one here? Sign in
          instead.
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
