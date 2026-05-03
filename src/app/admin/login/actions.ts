"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
  createSessionToken,
} from "@/lib/admin-session";

export type LoginState = { error?: string };

const LOGIN_RATE_LIMIT_MS = 600;
let lastFailedAttemptAt = 0;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { error: "Admin password is not configured." };
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin/orders") || "/admin/orders";

  const now = Date.now();
  const since = now - lastFailedAttemptAt;
  if (since < LOGIN_RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, LOGIN_RATE_LIMIT_MS - since));
  }

  if (password !== expected) {
    lastFailedAttemptAt = Date.now();
    return { error: "Wrong password." };
  }

  const token = createSessionToken();
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, token, adminCookieOptions);

  const safeNext = next.startsWith("/admin") ? next : "/admin/orders";
  redirect(safeNext);
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/login");
}
