"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BusFront, CalendarDays, Clapperboard, Drama, Music2, Search, Train, Trophy } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { api, getApiError } from "@/lib/api";
import { events, FairDropEvent, normalizeApiEvent } from "@/lib/events";

const categories = [
  { label: "Movies", query: "Movies", icon: Clapperboard, color: "text-[#f43f68] bg-[#fff0f3]" },
  { label: "Events", query: "Live music", icon: CalendarDays, color: "text-[#8039dc] bg-[#f4eefe]" },
  { label: "Plays", query: "Theatre", icon: Drama, color: "text-[#e98216] bg-[#fff4e5]" },
  { label: "Sports", query: "Sports", icon: Trophy, color: "text-[#1fa876] bg-[#eaf8f1]" },
  { label: "Concerts", query: "Live music", icon: Music2, color: "text-[#1688da] bg-[#eaf5ff]" },
  { label: "Bus seats", query: "bus", icon: BusFront, color: "text-[#8039dc] bg-[#f4eefe]" },
  { label: "Train seats", query: "train", icon: Train, color: "text-[#1688da] bg-[#eaf5ff]" },
];

export function EventCatalog({ fullPage = false, homePage = false, initialQuery = "" }: { fullPage?: boolean; homePage?: boolean; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [catalog, setCatalog] = useState<FairDropEvent[]>(events);
  const [catalogMessage, setCatalogMessage] = useState("Preview listings · live availability is confirmed by the FairDrop API.");

  useEffect(() => {
    let active = true;
    api.get<unknown>("/events")
      .then(({ data }) => {
        if (!active) return;
        if (!Array.isArray(data)) throw new Error("The events API returned an unexpected catalogue.");
        const liveEvents = data.map(normalizeApiEvent).filter((event): event is FairDropEvent => event !== undefined);
        const previewEvents = events.filter((preview) =>
          !liveEvents.some((live) =>
            live.id === preview.id || live.title.trim().toLowerCase() === preview.title.trim().toLowerCase(),
          ),
        );
        setCatalog([...liveEvents, ...previewEvents]);
        setCatalogMessage(liveEvents.length
          ? "Live API listings and clearly marked previews · live booking is only available for API events."
          : "No live events are listed right now · explore these clearly marked previews.");
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
      [event.title, event.category, event.venue, event.date, event.seatLayout].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [catalog, query]);

  if (homePage) {
    const featuredEvents = filteredEvents.slice(0, 4);
    const featuredIds = new Set(featuredEvents.map((event) => event.id));
    const collections = [
      { title: "Movies & theatre", description: "Find your row, your section and your view.", terms: ["Movies", "Theatre", "Comedy", "Family"] },
      { title: "Journeys worth taking", description: "Coach and train layouts sized for real vehicles.", terms: ["Travel"] },
      { title: "Live & in person", description: "From the front row to the stands.", terms: ["Live music", "Sports"] },
    ];
    return (
      <>
        <section aria-labelledby="featured-events-heading">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#89919c]">A good place to start</p>
              <h2 id="featured-events-heading" className="mt-1 text-xl font-bold tracking-tight text-[#1c2637]">Find your next plan</h2>
            </div>
            <Link href="/events" className="text-[11px] font-semibold text-[#ed174c] hover:underline">Browse all {filteredEvents.length} <span aria-hidden="true">→</span></Link>
          </div>
          <p className="mt-0.5 text-[10px] text-[#77808c]">{catalogMessage}</p>
          {featuredEvents.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {featuredEvents.map((event) => <EventCard compact event={event} key={event.id} />)}
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-[#e6eae6] bg-white p-8 text-center text-sm text-[#6c7772]">No experiences match “{query}”. Try a different search.</p>
          )}
        </section>

        <section aria-labelledby="categories-heading" className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="categories-heading" className="text-[16px] font-bold tracking-tight text-[#1c2637]">Explore by Category</h2>
            <Link href="/events" className="text-[11px] font-semibold text-[#ed174c] hover:underline">See All <span aria-hidden="true">→</span></Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {categories.map(({ label, query: categoryQuery, icon: Icon, color }) => (
              <Link href={`/events?q=${encodeURIComponent(categoryQuery)}`} key={label} className="group flex min-h-[68px] items-center gap-2.5 rounded-xl border border-[#e9ebef] bg-white px-3 text-[11px] font-semibold text-[#303949] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#f2a2b4] hover:shadow-card">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${color}`}><Icon size={18} /></span><span>{label}<span className="mt-0.5 block text-[9px] font-normal text-[#89919c]">{categoryQuery === "bus" || categoryQuery === "train" ? "Vehicle layouts" : "Browse tickets"}</span></span>
              </Link>
            ))}
          </div>
        </section>

        {collections.map(({ title, description, terms }) => {
          const collectionEvents = filteredEvents.filter(
            (event) => !featuredIds.has(event.id) && terms.includes(event.category),
          );
          if (collectionEvents.length === 0) return null;
          return (
            <section key={title} className="mt-8" aria-label={title}>
              <div className="flex items-end justify-between gap-3">
                <div><h2 className="text-lg font-bold tracking-tight text-[#1c2637]">{title}</h2><p className="mt-0.5 text-xs text-[#77808c]">{description}</p></div>
                <Link href={`/events?q=${encodeURIComponent(terms[0])}`} className="shrink-0 text-[11px] font-semibold text-[#ed174c] hover:underline">See all <span aria-hidden="true">→</span></Link>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {collectionEvents.map((event) => <EventCard compact event={event} key={event.id} />)}
              </div>
            </section>
          );
        })}
      </>
    );
  }

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
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEvents.map((event) => <EventCard event={event} key={event.id} />)}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-[#e6eae6] bg-white p-8 text-center text-sm text-[#6c7772]">No experiences match “{query}”. Try a different search.</p>
      )}
    </>
  );
}
