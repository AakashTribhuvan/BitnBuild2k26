"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { api, getApiError } from "@/lib/api";
import { events, FairDropEvent, normalizeApiEvent } from "@/lib/events";

export function EventCatalog({ fullPage = false }: { fullPage?: boolean }) {
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<FairDropEvent[]>(events);
  const [catalogMessage, setCatalogMessage] = useState("Preview listings · live availability is confirmed by the FairDrop API.");

  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
    let active = true;
    api.get<unknown>("/events")
      .then(({ data }) => {
        if (!active) return;
        if (!Array.isArray(data)) throw new Error("The events API returned an unexpected catalogue.");
        const liveEvents = data.map(normalizeApiEvent).filter((event): event is FairDropEvent => event !== undefined);
        setCatalog(liveEvents);
        setCatalogMessage(liveEvents.length ? "Live events · current listings from the FairDrop API." : "No events are currently available.");
      })
      .catch((error: unknown) => {
        if (active) setCatalogMessage(`${getApiError(error)} Showing preview listings.`);
      });
    return () => { active = false; };
  }, []);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return catalog;
    return catalog.filter((event) =>
      [event.title, event.category, event.venue, event.date].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [catalog, query]);

  return (
    <>
      {fullPage ? (
        <div className="mt-6 flex max-w-md items-center gap-2 rounded-xl border border-[#e6eae6] bg-white px-3 py-2 text-[#6c7772]">
          <Search size={16} aria-hidden="true" />
          <input className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-[#858e89]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events, places or categories" aria-label="Search events, places or categories" />
        </div>
      ) : null}
      <p className="mt-2 text-sm text-[#6c7772]">{catalogMessage}</p>
      {filteredEvents.length ? (
        <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${fullPage ? "mt-5 xl:grid-cols-4" : "mt-5 xl:grid-cols-4"}`}>
          {filteredEvents.map((event) => <EventCard event={event} key={event.id} />)}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-[#e6eae6] bg-white p-8 text-center text-sm text-[#6c7772]">No experiences match “{query}”. Try a different search.</p>
      )}
    </>
  );
}
