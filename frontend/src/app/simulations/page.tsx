import type { Metadata } from "next";
import { SimulationDashboard } from "@/components/simulation-dashboard";

export const metadata: Metadata = { title: "Traffic simulations" };

export default function SimulationsPage() {
  return <SimulationDashboard />;
}
