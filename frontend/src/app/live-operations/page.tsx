import type { Metadata } from "next";
import { LiveOperations } from "@/components/live-operations";

export const metadata: Metadata = { title: "Live backend operations" };

export default function LiveOperationsPage() {
  return <LiveOperations />;
}
