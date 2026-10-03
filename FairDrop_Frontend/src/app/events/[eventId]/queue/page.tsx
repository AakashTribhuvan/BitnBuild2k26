import type { Metadata } from "next";
import { loadEvent } from "@/lib/events";
import { QueueStatus } from "@/components/queue-status";

type QueuePageProps = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: QueuePageProps): Promise<Metadata> {
  const { eventId } = await params;
  return { title: `${(await loadEvent(eventId))?.title ?? "Event"} queue` };
}

export default async function QueuePage({ params }: QueuePageProps) {
  const { eventId } = await params;
  const event = await loadEvent(eventId);
  if (!event) return <main className="mx-auto max-w-3xl px-5 py-20"><h1 className="text-2xl font-bold">Event not found</h1><p className="mt-2 text-sm text-[#6c7772]">This event is not in the preview catalogue.</p></main>;
  return <QueueStatus eventId={eventId} eventTitle={event.title} />;
}
