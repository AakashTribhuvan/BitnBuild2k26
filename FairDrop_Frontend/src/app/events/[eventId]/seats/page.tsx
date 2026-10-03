import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeatSelection } from "@/components/seat-selection";
import { loadEvent } from "@/lib/events";

type SeatsPageProps = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: SeatsPageProps): Promise<Metadata> {
  const { eventId } = await params;
  return { title: `${(await loadEvent(eventId))?.title ?? "Event"} seats` };
}

export default async function SeatsPage({ params }: SeatsPageProps) {
  const { eventId } = await params;
  const event = await loadEvent(eventId);
  if (!event) notFound();
  return <SeatSelection eventId={event.id} eventTitle={event.title} />;
}
