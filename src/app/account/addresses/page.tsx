import type { Metadata } from "next";
import { AddressBookClient } from "./AddressBookClient";

export const metadata: Metadata = {
  title: "My addresses",
  description: "Manage saved shipping addresses on your Doll Up Boutique account.",
};

export default function AddressesPage() {
  return <AddressBookClient />;
}
