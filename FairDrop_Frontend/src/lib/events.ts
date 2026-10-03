export type EventCategory = "Live music" | "Movies" | "Travel" | "Theatre" | "Sports";

export type FairDropEvent = {
  id: string;
  title: string;
  category: EventCategory;
  venue: string;
  date: string;
  image: string;
  description: string;
  startingPrice?: number;
};

export const events: FairDropEvent[] = [
  {
    id: "concert-001",
    title: "Neon Horizon — Live",
    category: "Live music",
    venue: "Mumbai Arena",
    date: "24 Oct 2026",
    image: "/images/concert.jpg",
    description: "A night of live music, made fair from the first place in line to the final seat.",
    startingPrice: 2500,
  },
  {
    id: "movie-001",
    title: "Dune: Part Two",
    category: "Movies",
    venue: "PVR Phoenix, Pune",
    date: "Today · 7:30 PM",
    image: "/images/cinema.jpg",
    description: "Settle in for a cinematic experience with a seat that is truly yours.",
    startingPrice: 450,
  },
  {
    id: "train-001",
    title: "Deccan Queen",
    category: "Travel",
    venue: "Pune → Mumbai",
    date: "Daily · 6:00 AM",
    image: "/images/train.jpg",
    description: "Book your next rail journey with a clear route, class and fare.",
    startingPrice: 740,
  },
  {
    id: "bus-001",
    title: "Coastline Sleeper",
    category: "Travel",
    venue: "Pune → Goa",
    date: "Daily · 10:00 PM",
    image: "/images/bus.jpg",
    description: "Find a comfortable seat for the overnight journey to the coast.",
    startingPrice: 1050,
  },
  {
    id: "show-001",
    title: "Hamilton — Mumbai",
    category: "Theatre",
    venue: "NCPA, Mumbai",
    date: "8 Nov 2026 · 7:00 PM",
    image: "/images/theatre.jpg",
    description: "An evening at the theatre, with fair access to every seat.",
    startingPrice: 1800,
  },
  {
    id: "sports-001",
    title: "India vs Australia",
    category: "Sports",
    venue: "Wankhede Stadium, Mumbai",
    date: "15 Nov 2026 · 7:00 PM",
    image: "/images/sports.jpg",
    description: "Be there for every moment of an international T20 under the lights.",
    startingPrice: 1200,
  },
];

export function getEvent(eventId: string): FairDropEvent | undefined {
  return events.find((event) => event.id === eventId);
}

export function normalizeApiEvent(value: unknown): FairDropEvent | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : undefined;
  const title = typeof row.name === "string" ? row.name : typeof row.title === "string" ? row.title : undefined;
  if (!id || !title) return undefined;

  const preview = events.find((event) => event.id === id)
    ?? events.find((event) => title.toLowerCase().includes(event.title.split(/[ —:]/)[0].toLowerCase()));
  const saleStart = typeof row.sale_start === "string" ? new Date(row.sale_start) : undefined;
  const date = typeof row.date === "string" ? row.date
    : saleStart && !Number.isNaN(saleStart.getTime())
      ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(saleStart)
      : "Sale dates to be announced";

  return {
    id,
    title,
    category: preview?.category ?? "Live music",
    venue: typeof row.venue === "string" ? row.venue : "Venue details to be announced",
    date,
    image: preview?.image ?? "/images/concert.jpg",
    description: preview?.description ?? "Event details will be announced by FairDrop.",
  };
}

export async function loadEvent(eventId: string): Promise<FairDropEvent | undefined> {
  const preview = getEvent(eventId);
  try {
    const baseUrl = process.env.FAIRDROP_INTERNAL_API_URL
      || process.env.NEXT_PUBLIC_API_URL
      || "http://localhost:4000";
    const response = await fetch(`${baseUrl}/events/${encodeURIComponent(eventId)}`, { cache: "no-store" });
    if (!response.ok) return preview;
    return normalizeApiEvent(await response.json()) ?? preview;
  } catch (error) {
    if (!preview) console.error("FairDrop event details are unavailable:", error);
    return preview;
  }
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}
