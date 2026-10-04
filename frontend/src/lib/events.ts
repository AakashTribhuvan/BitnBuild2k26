export type EventCategory = "Live music" | "Movies" | "Travel" | "Theatre" | "Sports" | "Comedy" | "Family";
export type SeatLayout = "bus" | "train" | "cinema" | "theatre" | "stadium" | "concert";

export const seatLayoutLabels: Record<SeatLayout, string> = {
  bus: "Bus",
  train: "Train",
  cinema: "Cinema",
  theatre: "Theatre",
  stadium: "Stadium",
  concert: "Concert",
};

export type FairDropEvent = {
  id: string;
  title: string;
  category: EventCategory;
  venue: string;
  date: string;
  image: string;
  description: string;
  startingPrice?: number;
  seatLayout: SeatLayout;
  seatCapacity?: number;
  isPreview: boolean;
};

export const events: FairDropEvent[] = [
  {
    id: "concert-001",
    title: "Neon Horizon — Live",
    category: "Live music",
    venue: "Mumbai Arena",
    date: "24 Oct 2026 · 7:00 PM",
    image: "/images/concert.jpg",
    description: "A night of live music, made fair from the first place in line to the final seat.",
    startingPrice: 2500,
    seatLayout: "concert",
    seatCapacity: 500,
    isPreview: true,
  },
  {
    id: "movie-001",
    title: "Dune: Part Two",
    category: "Movies",
    venue: "PVR Phoenix, Pune",
    date: "18 Oct 2026 · 7:30 PM",
    image: "/images/cinema.jpg",
    description: "Settle in for a cinematic experience with a seat that is truly yours.",
    startingPrice: 450,
    seatLayout: "cinema",
    seatCapacity: 96,
    isPreview: true,
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
    seatLayout: "train",
    seatCapacity: 72,
    isPreview: true,
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
    seatLayout: "bus",
    seatCapacity: 40,
    isPreview: true,
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
    seatLayout: "theatre",
    seatCapacity: 144,
    isPreview: true,
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
    seatLayout: "stadium",
    seatCapacity: 240,
    isPreview: true,
  },
  {
    id: "concert-002",
    title: "Indie by the Bay",
    category: "Live music",
    venue: "Mahalaxmi Lawns, Pune",
    date: "31 Oct 2026 · 5:30 PM",
    image: "/images/concert.jpg",
    description: "An open-air evening of independent artists, food and good company.",
    startingPrice: 899,
    seatLayout: "concert",
    seatCapacity: 350,
    isPreview: true,
  },
  {
    id: "movie-002",
    title: "The Grand Premiere",
    category: "Movies",
    venue: "INOX Megaplex, Mumbai",
    date: "22 Oct 2026 · 8:15 PM",
    image: "/images/cinema.jpg",
    description: "A premiere-night cinema experience with a proper seat map.",
    startingPrice: 550,
    seatLayout: "cinema",
    seatCapacity: 96,
    isPreview: true,
  },
  {
    id: "bus-002",
    title: "Pune to Bengaluru Express",
    category: "Travel",
    venue: "Pune → Bengaluru",
    date: "Daily · 9:45 PM",
    image: "/images/bus.jpg",
    description: "Choose from a fixed coach layout and reserve the exact seat you want.",
    startingPrice: 1299,
    seatLayout: "bus",
    seatCapacity: 40,
    isPreview: true,
  },
  {
    id: "bus-003",
    title: "Konkan Coast Sleeper",
    category: "Travel",
    venue: "Mumbai → Ratnagiri",
    date: "Fri & Sat · 10:15 PM",
    image: "/images/bus.jpg",
    description: "A limited-capacity sleeper coach with clearly numbered berths.",
    startingPrice: 899,
    seatLayout: "bus",
    seatCapacity: 36,
    isPreview: true,
  },
  {
    id: "train-002",
    title: "Sahyadri Day Journey",
    category: "Travel",
    venue: "Mumbai → Nashik",
    date: "Daily · 8:20 AM",
    image: "/images/train.jpg",
    description: "Plan a relaxed day trip and choose a seat in a coach-style layout.",
    startingPrice: 560,
    seatLayout: "train",
    seatCapacity: 72,
    isPreview: true,
  },
  {
    id: "show-002",
    title: "The Winter Garden",
    category: "Theatre",
    venue: "Prithvi Theatre, Mumbai",
    date: "12 Nov 2026 · 6:30 PM",
    image: "/images/theatre.jpg",
    description: "An intimate new play in a small theatre with a distinctive seating plan.",
    startingPrice: 950,
    seatLayout: "theatre",
    seatCapacity: 108,
    isPreview: true,
  },
  {
    id: "show-003",
    title: "Laughing Matters",
    category: "Comedy",
    venue: "The Habitat, Mumbai",
    date: "14 Nov 2026 · 8:00 PM",
    image: "/images/theatre.jpg",
    description: "A close-up comedy night with limited rows and no mystery about your seat.",
    startingPrice: 699,
    seatLayout: "theatre",
    seatCapacity: 96,
    isPreview: true,
  },
  {
    id: "sports-002",
    title: "Mumbai City FC vs Goa",
    category: "Sports",
    venue: "Mumbai Football Arena",
    date: "21 Nov 2026 · 7:30 PM",
    image: "/images/sports.jpg",
    description: "Pick your section and take in the match from a stadium-style layout.",
    startingPrice: 650,
    seatLayout: "stadium",
    seatCapacity: 240,
    isPreview: true,
  },
  {
    id: "concert-003",
    title: "Symphony Under the Stars",
    category: "Live music",
    venue: "Bandra Fort Amphitheatre",
    date: "28 Nov 2026 · 6:00 PM",
    image: "/images/concert.jpg",
    description: "A live orchestral performance in a sweeping outdoor setting.",
    startingPrice: 1500,
    seatLayout: "stadium",
    seatCapacity: 240,
    isPreview: true,
  },
  {
    id: "movie-003",
    title: "Family Animation Festival",
    category: "Family",
    venue: "PVR Icon, Pune",
    date: "29 Nov 2026 · 11:00 AM",
    image: "/images/cinema.jpg",
    description: "A family-friendly big-screen morning with seats for your whole group.",
    startingPrice: 350,
    seatLayout: "cinema",
    seatCapacity: 96,
    isPreview: true,
  },
  {
    id: "train-003",
    title: "Konkan Coastline",
    category: "Travel",
    venue: "Mumbai → Goa",
    date: "Daily · 4:50 PM",
    image: "/images/train.jpg",
    description: "A scenic rail journey with a clear coach and seat selection preview.",
    startingPrice: 980,
    seatLayout: "train",
    seatCapacity: 72,
    isPreview: true,
  },
  {
    id: "concert-004",
    title: "City Lights Music Weekender",
    category: "Live music",
    venue: "Jio World Garden, Mumbai",
    date: "5 Dec 2026 · 4:00 PM",
    image: "/images/concert.jpg",
    description: "A full-day music gathering with a large standing and reserved area.",
    startingPrice: 3200,
    seatLayout: "concert",
    seatCapacity: 500,
    isPreview: true,
  },
];

export function getEvent(eventId: string): FairDropEvent | undefined {
  return events.find((event) => event.id === eventId);
}

function inferLayout(value: Record<string, unknown>, title: string, preview?: FairDropEvent): SeatLayout {
  if (preview) return preview.seatLayout;
  const descriptor = `${title} ${typeof value.category === "string" ? value.category : ""} ${typeof value.type === "string" ? value.type : ""}`.toLowerCase();
  if (/bus|coach/.test(descriptor)) return "bus";
  if (/train|rail/.test(descriptor)) return "train";
  if (/movie|cinema|film/.test(descriptor)) return "cinema";
  if (/theatre|theater|play|comedy/.test(descriptor)) return "theatre";
  if (/stadium|football|cricket|sports|match/.test(descriptor)) return "stadium";
  return "concert";
}

function inferCategory(value: Record<string, unknown>, preview: FairDropEvent | undefined, layout: SeatLayout): EventCategory {
  if (preview) return preview.category;
  if (typeof value.category === "string") {
    const categories: EventCategory[] = ["Live music", "Movies", "Travel", "Theatre", "Sports", "Comedy", "Family"];
    const normalizedCategory = value.category.toLowerCase();
    const match = categories.find((category) => category.toLowerCase() === normalizedCategory);
    if (match) return match as EventCategory;
  }
  if (layout === "bus" || layout === "train") return "Travel";
  if (layout === "cinema") return "Movies";
  if (layout === "theatre") return "Theatre";
  if (layout === "stadium") return "Sports";
  return "Live music";
}

export function normalizeApiEvent(value: unknown): FairDropEvent | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : undefined;
  const title = typeof row.name === "string" ? row.name : typeof row.title === "string" ? row.title : undefined;
  if (!id || !title) return undefined;

  const preview = events.find((event) => event.id === id)
    ?? events.find((event) => title.toLowerCase().includes(event.title.split(/[ —:]/)[0].toLowerCase()));
  const seatLayout = inferLayout(row, title, preview);
  const saleStart = typeof row.sale_start === "string" ? new Date(row.sale_start) : undefined;
  const date = typeof row.date === "string" ? row.date
    : saleStart && !Number.isNaN(saleStart.getTime())
      ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(saleStart)
      : "Sale dates to be announced";

  return {
    id,
    title,
    category: inferCategory(row, preview, seatLayout),
    venue: typeof row.venue === "string" ? row.venue : preview?.venue ?? "Venue details to be announced",
    date,
    image: preview?.image ?? (seatLayout === "bus" ? "/images/bus.jpg" : seatLayout === "train" ? "/images/train.jpg" : seatLayout === "cinema" ? "/images/cinema.jpg" : seatLayout === "theatre" ? "/images/theatre.jpg" : seatLayout === "stadium" ? "/images/sports.jpg" : "/images/concert.jpg"),
    description: preview?.description ?? "Event details will be announced by FairDrop.",
    startingPrice: typeof row.starting_price === "number" ? row.starting_price : preview?.startingPrice,
    seatLayout,
    seatCapacity: typeof row.total_seats === "number" && row.total_seats > 0
      ? row.total_seats
      : undefined,
    isPreview: false,
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
