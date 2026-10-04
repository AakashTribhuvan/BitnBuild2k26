import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { FairDropEvent, formatPrice, seatLayoutLabels } from "@/lib/events";

export function EventCard({ event, compact = false }: { event: FairDropEvent; compact?: boolean }) {
  return (
    <Link href={`/events/${event.id}`} className={`card-hover group block overflow-hidden rounded-lg border border-[#e7e9ed] bg-white ${compact ? "" : "shadow-card"}`}>
      <div className={`relative ${compact ? "h-[118px] sm:h-[128px]" : "h-[174px]"}`}>
        <Image src={event.image} alt="" fill sizes={compact ? "(max-width: 640px) 48vw, 230px" : "(max-width: 640px) 92vw, (max-width: 1024px) 44vw, 290px"} className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        <div className="photo-overlay absolute inset-0" />
        <span className={`absolute left-2.5 top-2.5 rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${compact ? "bg-[#ed174c] text-white" : "bg-white/90 text-forest"}`}>{event.category}</span>
        {event.isPreview && <span className="absolute right-2.5 top-2.5 rounded-md bg-[#101820]/75 px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-white">Preview</span>}
        {!compact && <span className="absolute bottom-3 left-4 text-sm font-semibold text-white">{event.title}</span>}
      </div>
      <div className={compact ? "p-2.5 sm:p-3" : "p-4"}>
        {compact ? (
          <>
            <h3 className="truncate text-[12px] font-bold text-[#1c2637] sm:text-[13px]" title={event.title}>{event.title}</h3>
            <p className="mt-0.5 truncate text-[10px] text-[#6c7772]">{event.seatCapacity ? `${event.seatCapacity} seats` : "Capacity set by organizer"} · {seatLayoutLabels[event.seatLayout]} layout</p>
            <div className="mt-2 flex items-center gap-2 truncate text-[9px] text-[#6c7772]">
              <span className="flex min-w-0 items-center gap-1"><CalendarDays size={11} className="shrink-0" aria-hidden="true" />{event.date}</span>
              <span className="flex min-w-0 items-center gap-1"><MapPin size={11} className="shrink-0" aria-hidden="true" />{event.venue}</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-1">
              <span className="truncate text-[10px] font-bold text-[#1c2637]">{event.startingPrice ? <>{formatPrice(event.startingPrice)} <span className="font-normal text-[#6c7772]">onwards</span></> : <span className="font-medium text-[#6c7772]">Price at checkout</span>}</span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-[#ed174c] px-2 py-1 text-[9px] font-bold text-white">{event.isPreview ? "Preview" : "Details"} <ArrowRight size={10} /></span>
            </div>
          </>
        ) : (
          <>
            <p className="flex items-center gap-1.5 text-xs text-[#6c7772]"><MapPin size={13} aria-hidden="true" /> {event.venue}</p>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div><p className="text-[11px] text-[#6c7772]">{event.date}</p><p className="mt-1 text-sm font-bold">{event.startingPrice ? <>{formatPrice(event.startingPrice)} <span className="font-normal text-[#6c7772]">onwards</span></> : <span className="font-medium text-[#6c7772]">Price at checkout</span>}</p></div>
              <ArrowRight size={17} className="mb-1 text-[#ed174c]" aria-hidden="true" />
            </div>
          </>
        )}
      </div>
    </Link>
  );
}
