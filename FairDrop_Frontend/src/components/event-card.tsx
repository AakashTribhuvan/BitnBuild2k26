import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { FairDropEvent, formatPrice } from "@/lib/events";

export function EventCard({ event }: { event: FairDropEvent }) {
  return (
    <Link href={`/events/${event.id}`} className="card-hover overflow-hidden rounded-2xl border border-[#e6eae6] bg-white shadow-card">
      <div className="relative h-[174px]">
        <Image src={event.image} alt="" fill sizes="(max-width: 640px) 92vw, (max-width: 1024px) 44vw, 290px" className="object-cover" />
        <div className="photo-overlay absolute inset-0" />
        <span className="absolute bottom-3 left-4 text-sm font-semibold text-white">{event.title}</span>
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-forest">{event.category}</span>
      </div>
      <div className="p-4">
        <p className="flex items-center gap-1.5 text-xs text-[#6c7772]"><MapPin size={13} aria-hidden="true" /> {event.venue}</p>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div><p className="text-[11px] text-[#6c7772]">{event.date}</p><p className="mt-1 text-sm font-bold">{event.startingPrice ? <>{formatPrice(event.startingPrice)} <span className="font-normal text-[#6c7772]">onwards</span></> : <span className="font-medium text-[#6c7772]">Price at checkout</span>}</p></div>
          <ArrowUpRight size={17} className="mb-1 text-forest" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}
