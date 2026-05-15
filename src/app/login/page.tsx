import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Doll Up Boutique account.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 md:py-16">
      <div
        role="status"
        className="mb-6 rounded-xl border border-coral-300 bg-blush-100 px-4 py-3 text-sm leading-relaxed text-ink"
      >
        <p className="font-medium">Doll Up just got a major refresh.</p>
        <p className="mt-1 text-ink-soft">
          If you had an account before our update, many older logins are no
          longer active. The easiest way back in is{" "}
          <span className="font-medium">signing in with Google</span>, or you
          can create a new account in seconds.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="rounded-xl border border-blush-300 bg-white p-8" />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
