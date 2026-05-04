import type { Metadata } from "next";
import { AccountClient } from "./AccountClient";

export const metadata: Metadata = {
  title: "My account",
  description: "Your Doll Up Boutique account, orders, and saved addresses.",
};

export default function AccountPage() {
  return <AccountClient />;
}
