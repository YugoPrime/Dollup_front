"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { HttpTypes } from "@medusajs/types";
import { clientSdk, MEDUSA_JWT_KEY } from "@/lib/cart-client";

export type Customer = HttpTypes.StoreCustomer;
export type AuthState = {
  status: "loading" | "ready";
  customer: Customer | null;
};

const EVENT = "dub:auth-change";

let state: AuthState = { status: "loading", customer: null };
let initStarted = false;

function publish(next: AuthState) {
  state = next;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT));
  }
}

function hasToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem(MEDUSA_JWT_KEY);
}

async function fetchCustomer(): Promise<Customer | null> {
  try {
    const { customer } = await clientSdk.store.customer.retrieve();
    return customer ?? null;
  } catch {
    return null;
  }
}

async function init() {
  if (initStarted) return;
  initStarted = true;
  if (!hasToken()) {
    publish({ status: "ready", customer: null });
    return;
  }
  const customer = await fetchCustomer();
  publish({ status: "ready", customer });
}

export async function login(email: string, password: string): Promise<Customer> {
  const result = await clientSdk.auth.login("customer", "emailpass", {
    email,
    password,
  });
  if (typeof result !== "string") {
    throw new Error("Multi-step authentication is not supported.");
  }
  const customer = await fetchCustomer();
  if (!customer) {
    throw new Error("Logged in, but customer profile could not be loaded.");
  }
  publish({ status: "ready", customer });
  return customer;
}

export async function register(args: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<Customer> {
  await clientSdk.auth.register("customer", "emailpass", {
    email: args.email,
    password: args.password,
  });
  const { customer } = await clientSdk.store.customer.create({
    email: args.email,
    first_name: args.firstName,
    last_name: args.lastName,
    phone: args.phone,
  });
  publish({ status: "ready", customer: customer ?? null });
  if (!customer) {
    throw new Error("Account created, but profile could not be loaded.");
  }
  return customer;
}

export async function logout(): Promise<void> {
  try {
    await clientSdk.auth.logout();
  } catch {
    // server-side logout failed — still wipe local state below
  }
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(MEDUSA_JWT_KEY);
  }
  publish({ status: "ready", customer: null });
}

export async function refreshCustomer(): Promise<Customer | null> {
  if (!hasToken()) {
    publish({ status: "ready", customer: null });
    return null;
  }
  const customer = await fetchCustomer();
  publish({ status: "ready", customer });
  return customer;
}

export async function updateCustomer(
  patch: HttpTypes.StoreUpdateCustomer,
): Promise<Customer> {
  const { customer } = await clientSdk.store.customer.update(patch);
  publish({ status: "ready", customer: customer ?? null });
  if (!customer) throw new Error("Customer update returned no profile.");
  return customer;
}

function subscribe(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(EVENT, handler);
  // Cross-tab sync: another tab logging out clears the token via storage event.
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

const SERVER_STATE: AuthState = { status: "loading", customer: null };
function getServerSnapshot(): AuthState {
  return SERVER_STATE;
}

export function useCustomer(): AuthState {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    getServerSnapshot,
  );
  useEffect(() => {
    init();
  }, []);
  return snapshot;
}
