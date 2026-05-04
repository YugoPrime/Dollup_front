import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Doll Up Boutique account.",
};

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 md:py-16">
      <Suspense
        fallback={
          <div className="rounded-xl border border-blush-300 bg-white p-8" />
        }
      >
        <RegisterForm />
      </Suspense>
    </main>
  );
}
