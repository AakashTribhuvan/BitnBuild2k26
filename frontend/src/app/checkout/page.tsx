import type { Metadata } from "next";
import { MockCheckout } from "@/components/mock-checkout";

export const metadata: Metadata = { title: "Secure mock checkout" };

export default function CheckoutPage() {
  return <MockCheckout />;
}
