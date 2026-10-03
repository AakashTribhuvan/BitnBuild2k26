import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { JoinQueueButton } from "@/components/join-queue-button";
import { loadEvent, formatPrice } from "@/lib/events";

type EventPageProps = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { eventId } = await params;
  const event = await loadEvent(eventId);
  return { title: event?.title ?? "Experience" };
}

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const event = await loadEvent(eventId);
  if (!event) notFound();

  return (
    <main className="mx-auto min-h-[65vh] max-w-[1110px] px-5 py-10 lg:px-0">
      <Link href="/events" className="text-xs font-semibold text-forest hover:underline">← All experiences</Link>
      <div className="mt-5 grid overflow-hidden rounded-2xl border border-[#e6eae6] bg-white shadow-card lg:grid-cols-[1.2fr_.8fr]">
        <div role="img" aria-label={`${event.title} event photography`} className="relative min-h-[310px] bg-cover bg-center lg:min-h-[540px]" style={{ backgroundImage: `url("${event.image}")` }}>
          <div className="photo-overlay absolute inset-0" />
          <div className="absolute bottom-7 left-7 text-white sm:bottom-10 sm:left-10">
            <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">{event.category}</span>
            <h1 className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">{event.title}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85"><MapPin size={15} />{event.venue}</p>
          </div>
        </div>
        <section className="flex flex-col p-6 sm:p-9">
          <div className="flex items-center gap-2 text-xs font-semibold text-forest"><ShieldCheck size={17} /> FairDrop protected release</div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight">Good things are worth the wait.</h2>
          <p className="mt-2 text-sm leading-6 text-[#6c7772]">{event.description}</p>
          <div className="mt-6 grid gap-3 border-y border-[#edf0ed] py-5 text-sm">
            <p className="flex items-center gap-2 text-[#516059]"><CalendarDays size={16} className="text-forest" /> {event.date}</p>
            <p className="flex items-center gap-2 text-[#516059]"><MapPin size={16} className="text-forest" /> {event.venue}</p>
            <p className="flex items-center gap-2 text-[#516059]"><Clock3 size={16} className="text-forest" /> A fair queue opens ahead of high-demand sales</p>
          </div>
          <div className="mt-auto pt-6">
            <p className="mb-4 text-sm"><span className="text-xs text-[#6c7772]">Ticket price</span><br />{event.startingPrice ? <><strong className="text-xl">{formatPrice(event.startingPrice)}</strong><span className="text-xs text-[#6c7772]"> onwards · preview price</span></> : <strong className="text-sm">Confirmed when you select a seat</strong>}</p>
            <JoinQueueButton eventId={event.id} />
            <p className="mt-3 text-[11px] leading-5 text-[#6c7772]">Joining requires a signed-in account. Queue admission and final inventory are verified by the API.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
