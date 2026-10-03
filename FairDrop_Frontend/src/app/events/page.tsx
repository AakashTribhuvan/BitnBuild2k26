import type { Metadata } from "next";
import { EventCatalog } from "@/components/event-catalog";

export const metadata: Metadata = { title: "Discover experiences" };

export default function EventsPage() {
  return (
    <main className="mx-auto min-h-[65vh] max-w-[1240px] px-5 py-12 lg:px-0">
      <p className="text-[11px] font-bold uppercase tracking-[.1em] text-forest">DISCOVER</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">A little something to look forward to.</h1>
      <EventCatalog fullPage />
    </main>
  );
}
