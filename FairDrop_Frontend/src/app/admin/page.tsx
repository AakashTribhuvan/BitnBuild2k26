import type { Metadata } from "next";
import { AdminOperations } from "@/components/admin-operations";

export const metadata: Metadata = { title: "Operations" };

export default function AdminPage() {
  return <AdminOperations />;
}
