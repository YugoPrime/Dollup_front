"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  return (
    <form action={formAction} className="mt-5 flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Password
        </span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          autoFocus
          required
          className="rounded-lg border border-blush-400 bg-cream px-3 py-2 text-base text-ink focus:border-coral-500 focus:outline-none"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-coral-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-coral-500 px-4 py-2.5 font-sans text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-coral-700 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
