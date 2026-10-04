"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, LockKeyhole, RefreshCw } from "lucide-react";
import { api, getApiError, getString, isRecord } from "@/lib/api";
import { FairDropEvent, SeatLayout, seatLayoutLabels } from "@/lib/events";
import { TurnstileChallenge } from "@/components/turnstile-challenge";

type Seat = { id: string; label: string; status: "available" | "held" | "sold"; section?: string; price?: number };

function normalizeSeats(data: unknown): Seat[] {
  const values = Array.isArray(data) ? data : isRecord(data) && Array.isArray(data.seats) ? data.seats : null;
  if (!values) throw new Error("The API returned seat data in an unsupported format.");
  return values.map((value): Seat => {
    if (!isRecord(value)) throw new Error("The API returned a malformed seat record.");
    const id = getString(value.id) ?? getString(value.seat_id);
    const rawStatus = getString(value.status)?.toLowerCase();
    if (!id || !rawStatus) throw new Error("A seat is missing its identifier or status.");
    if (rawStatus !== "available" && rawStatus !== "held" && rawStatus !== "sold") {
      throw new Error(`The API returned an unsupported seat status: ${rawStatus}.`);
    }
    const status = rawStatus;
    const price = typeof value.price === "number" ? value.price : undefined;
    const seatNumber = typeof value.seat_number === "number" ? String(value.seat_number) : getString(value.seat_number);
    return { id, label: getString(value.label) ?? seatNumber ?? id, status, section: getString(value.section), price };
  });
}

function seatRows(layout: SeatLayout, seats: Seat[]): Seat[][] {
  const rowSize: Record<SeatLayout, number> = {
    bus: 4,
    train: 4,
    cinema: 12,
    theatre: 12,
    stadium: 20,
    concert: 15,
  };
  const size = rowSize[layout];
  return Array.from({ length: Math.ceil(seats.length / size) }, (_, index) =>
    seats.slice(index * size, (index + 1) * size),
  );
}

function previewSeatLabel(index: number, layout: SeatLayout): string {
  if (layout === "bus" || layout === "train") {
    return `${Math.floor(index / 4) + 1}${String.fromCharCode(65 + (index % 4))}`;
  }
  if (layout === "stadium") {
    const position = index % 20;
    const section = position < 7 ? "W" : position < 13 ? "M" : "E";
    const seatNumber = position < 7 ? position + 1 : position < 13 ? position - 6 : position - 12;
    return `${section}${Math.floor(index / 20) + 1}-${seatNumber}`;
  }
  if (layout === "concert") {
    const position = index % 15;
    const section = position < 5 ? "L" : position < 10 ? "C" : "R";
    return `${section}${Math.floor(index / 15) + 1}-${(position % 5) + 1}`;
  }
  const seatsPerRow = 12;
  let rowNumber = Math.floor(index / seatsPerRow) + 1;
  let rowLabel = "";
  while (rowNumber > 0) {
    rowLabel = String.fromCharCode(65 + ((rowNumber - 1) % 26)) + rowLabel;
    rowNumber = Math.floor((rowNumber - 1) / 26);
  }
  return `${rowLabel}${(index % seatsPerRow) + 1}`;
}

function SeatMap({
  layout,
  seats,
  selected,
  interactive,
  selectionLimit,
  onSelect,
}: {
  layout: SeatLayout;
  seats: Seat[];
  selected: string[];
  interactive: boolean;
  selectionLimit: number;
  onSelect: (id: string) => void;
}) {
  const rows = seatRows(layout, seats);
  const seatStyle = (seat: Seat) =>
    `grid h-8 min-w-0 place-items-center border text-[8px] font-semibold transition-colors sm:h-9 sm:text-[9px] ${
      seat.status === "sold"
        ? "cursor-not-allowed border-[#e1e5e2] bg-[#ecefec] text-[#969e99]"
        : seat.status === "held"
          ? "cursor-not-allowed border-[#eadfca] bg-[#f8f1e4] text-[#967337]"
          : selected.includes(seat.id)
            ? "border-forest bg-forest text-white"
            : selected.length >= selectionLimit
              ? "cursor-not-allowed border-[#d2e5d8] bg-[#eaf5ee] text-[#287650] opacity-60"
            : "border-[#d2e5d8] bg-[#eaf5ee] text-[#287650] hover:border-forest"
    }`;
  const seatButton = (seat: Seat) => (
    <button
      key={seat.id}
      type="button"
      title={`${seat.label}${seat.section ? ` · ${seat.section}` : ""} · ${interactive ? seat.status : "illustrative layout only"}`}
      aria-label={`${seat.label}${seat.section ? `, ${seat.section}` : ""}${interactive ? `, ${seat.status}` : ", illustrative seat"}`}
      aria-pressed={selected.includes(seat.id)}
      disabled={!interactive || seat.status !== "available" || (!selected.includes(seat.id) && selected.length >= selectionLimit)}
      onClick={() => onSelect(seat.id)}
      className={`${seatStyle(seat)} ${
        layout === "bus" ? "rounded-lg" : layout === "train" ? "rounded-md" : layout === "stadium" ? "rounded-t-lg" : "rounded"
      }`}
    >
      {seat.label}
    </button>
  );
  const renderRow = (row: Seat[], index: number) => {
    if (layout === "bus" || layout === "train") {
      return (
        <div key={index} className="grid grid-cols-[repeat(2,minmax(28px,1fr))_18px_repeat(2,minmax(28px,1fr))] items-center gap-1.5">
          {row.slice(0, 2).map(seatButton)}<span aria-hidden="true" className="text-center text-[8px] text-[#a4aba7]">{index + 1}</span>{row.slice(2).map(seatButton)}
        </div>
      );
    }
    if (layout === "cinema") {
      return (
        <div key={index} className="grid grid-cols-[repeat(6,minmax(22px,1fr))_24px_repeat(6,minmax(22px,1fr))] items-center gap-1.5">
          {row.slice(0, 6).map(seatButton)}<span aria-hidden="true" className="text-center text-[8px] font-medium text-[#a4aba7]">{index + 1}</span>{row.slice(6).map(seatButton)}
        </div>
      );
    }
    if (layout === "stadium") {
      return (
        <div key={index} className="grid grid-cols-[repeat(7,minmax(16px,1fr))_12px_repeat(6,minmax(16px,1fr))_12px_repeat(7,minmax(16px,1fr))] items-center gap-1">
          {row.slice(0, 7).map(seatButton)}<span aria-hidden="true" />{row.slice(7, 13).map(seatButton)}<span aria-hidden="true" />{row.slice(13).map(seatButton)}
        </div>
      );
    }
    if (layout === "concert") {
      return (
        <div key={index} className="grid grid-cols-[repeat(5,minmax(22px,1fr))_14px_repeat(5,minmax(22px,1fr))_14px_repeat(5,minmax(22px,1fr))] items-center gap-1.5">
          {row.slice(0, 5).map(seatButton)}<span aria-hidden="true" />{row.slice(5, 10).map(seatButton)}<span aria-hidden="true" />{row.slice(10).map(seatButton)}
        </div>
      );
    }
    const centerDistance = Math.abs(index - (rows.length - 1) / 2) / Math.max(1, (rows.length - 1) / 2);
    const outerWidth = 100 - centerDistance * 20;
    return (
      <div key={index} className="mx-auto flex items-center justify-center gap-1.5" style={{ width: `${outerWidth}%` }}>
        {row.map(seatButton)}
      </div>
    );
  };
  const marker = layout === "cinema" ? "SCREEN" : layout === "stadium" ? "PITCH / FIELD" : layout === "bus" ? "FRONT OF BUS" : layout === "train" ? "COACH FRONT" : layout === "theatre" ? "STAGE" : "STAGE";

  return (
    <div className="overflow-x-auto pb-2">
      <div className={`mx-auto min-w-fit space-y-2 ${layout === "cinema" ? "w-[540px]" : layout === "stadium" ? "w-[560px]" : layout === "concert" ? "w-[470px]" : layout === "bus" || layout === "train" ? "w-[270px]" : "w-full"}`}>
        <div className="mx-auto mb-6 max-w-md rounded-lg border border-[#e6eae6] bg-[#f5f7f5] py-2 text-center text-[9px] font-bold uppercase tracking-[.14em] text-[#7a8580]">{marker}</div>
        {layout === "stadium" && <div className="grid grid-cols-3 text-center text-[8px] font-bold uppercase tracking-wide text-[#89919c]"><span>West stand</span><span>Main stand</span><span>East stand</span></div>}
        {rows.map(renderRow)}
        {(layout === "bus" || layout === "train") && <p className="pt-1 text-center text-[8px] font-medium uppercase tracking-wider text-[#89919c]">{seatLayoutLabels[layout]} aisle</p>}
      </div>
    </div>
  );
}

export function SeatSelection({ event }: { event: FairDropEvent }) {
  const { id: eventId, title: eventTitle, seatLayout, seatCapacity, isPreview } = event;
  const router = useRouter();
  const [seats, setSeats] = useState<Seat[]>(() => isPreview
    ? Array.from({ length: seatCapacity ?? 0 }, (_, index) => ({
      id: `preview-${index + 1}`,
      label: previewSeatLabel(index, seatLayout),
      status: "available" as const,
    }))
    : []);
  const [selected, setSelected] = useState<string[]>([]);
  const [purchaseLimit, setPurchaseLimit] = useState(2);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!isPreview);
  const [holding, setHolding] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [challengeKey, setChallengeKey] = useState(0);

  const loadSeats = useCallback(async () => {
    if (isPreview) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get<unknown>("/seats", { params: { eventId } });
      setSeats(normalizeSeats(data));
      if (isRecord(data) && typeof data.purchaseLimit === "number" && Number.isInteger(data.purchaseLimit) && data.purchaseLimit > 0) {
        setPurchaseLimit(data.purchaseLimit);
      }
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [eventId, isPreview]);

  useEffect(() => { void loadSeats(); }, [loadSeats]);

  async function holdSeat() {
    if (!selected.length) return;
    setHolding(true);
    setError("");
    try {
      const { data } = await api.post<unknown>("/seats/hold", {
        eventId,
        seatIds: selected,
        captchaToken: captchaToken || undefined,
      });
      if (!isRecord(data)) throw new Error("The API returned an unexpected reservation response.");
      const values = Array.isArray(data.reservations) ? data.reservations : [];
      const reservationIds = values.map((value) => isRecord(value) ? getString(value.id) ?? getString(value.reservation_id) : undefined);
      if (!reservationIds.length || reservationIds.some((id) => !id)) {
        throw new Error("The API did not return all reservation IDs. Please contact support before retrying.");
      }
      const ids = reservationIds as string[];
      window.localStorage.setItem("fairdrop:active-reservation", ids[0]);
      window.localStorage.setItem("fairdrop:active-reservations", JSON.stringify(ids));
      router.push(`/checkout?reservationId=${encodeURIComponent(ids[0])}&reservationIds=${encodeURIComponent(ids.join(","))}`);
    } catch (requestError) {
      setError(getApiError(requestError));
      setCaptchaToken("");
      setChallengeKey((key) => key + 1);
      setHolding(false);
    }
  }

  return (
    <main className="mx-auto min-h-[65vh] max-w-[1060px] px-5 py-10">
      <p className="text-[11px] font-bold uppercase tracking-[.1em] text-forest">{isPreview ? "ILLUSTRATIVE PREVIEW" : "ADMITTED GUESTS"}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{isPreview ? "Explore the seat layout" : "Choose your seat"}</h1>
      <p className="mt-1 text-sm text-[#6c7772]">{eventTitle} · {seatCapacity ? `${seatCapacity} seats` : "Live seat inventory"} · {seatLayoutLabels[seatLayout]} layout</p>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_310px]">
        <section className="rounded-2xl border border-[#e6eae6] bg-white p-5 shadow-card sm:p-7">
          <div className="flex items-center justify-between"><h2 className="font-semibold">{isPreview ? "Illustrative seat plan" : "Live seat inventory"}</h2>{!isPreview && <button onClick={() => void loadSeats()} disabled={loading} className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest"><RefreshCw size={14} /> Refresh</button>}</div>
          {isPreview && <p className="mt-1 text-xs text-[#6c7772]">A sample layout only. Seats and availability are not live.</p>}
          {loading ? <p className="flex items-center justify-center gap-2 py-14 text-sm text-[#6c7772]"><LoaderCircle className="animate-spin" size={16} /> Checking live inventory…</p> : error ? <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">Could not load seats.</p><p className="mt-1 text-xs">{error}</p><p className="mt-2 text-xs">You must be admitted to the fair queue before the API will provide seat access.</p><Link href={`/events/${encodeURIComponent(eventId)}/queue`} className="mt-3 inline-flex font-semibold underline">Check your queue</Link></div> : seats.length === 0 ? <p className="py-14 text-center text-sm text-[#6c7772]">No seats are currently listed. Refresh to check inventory again.</p> : <div className="mt-5 rounded-xl bg-[#fafbfa] px-3 py-5 sm:px-5"><SeatMap layout={seatLayout} seats={seats} selected={selected} interactive={!isPreview} selectionLimit={purchaseLimit} onSelect={(id) => setSelected((current) => current.includes(id) ? current.filter((seatId) => seatId !== id) : [...current, id])} /></div>}
          {!isPreview && <div className="mt-6 flex flex-wrap gap-4 text-[11px] text-[#6c7772]"><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[#eaf5ee]" />Available</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[#f8f1e4]" />On hold</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[#ecefec]" />Unavailable</span></div>}
        </section>
        <aside className="h-fit rounded-2xl border border-[#e6eae6] bg-white p-6 shadow-card">
          <h2 className="font-semibold">{isPreview ? "Preview only" : "Your selection"}</h2><p className="mt-1 text-xs text-[#6c7772]">{isPreview ? "This listing is not connected to live booking yet." : "One seat at a time. Purchase limits are enforced by the API."}</p>
          {isPreview ? <p className="mt-5 rounded-lg bg-[#f7f8f6] p-3 text-xs leading-5 text-[#6c7772]">The seat plan shows the intended layout and approximate capacity. No seat can be held or purchased here.</p> : <>
          {selected.length ? <p className="mt-5 rounded-lg bg-[#f7f8f6] p-3 text-sm font-semibold">{selected.map((id) => seats.find((seat) => seat.id === id)?.label ?? id).join(", ")} <span className="mt-1 block text-xs font-normal text-[#6c7772]">{selected.length} of {purchaseLimit} seats · ₹{selected.length * 550} total · price confirmed at hold</span></p> : <p className="mt-5 rounded-lg bg-[#f7f8f6] p-3 text-xs text-[#6c7772]">Select up to {purchaseLimit} available seats.</p>}
          {selected.length > 0 && <TurnstileChallenge key={challengeKey} action="seat_hold" onToken={setCaptchaToken} />}
          <button onClick={holdSeat} disabled={!selected.length || holding || loading || Boolean(error)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-3 text-sm font-semibold text-white hover:bg-[#10553e] disabled:cursor-not-allowed disabled:opacity-50">{holding ? <LoaderCircle size={15} className="animate-spin" /> : <LockKeyhole size={15} />}Hold {selected.length || ""} seat{selected.length === 1 ? "" : "s"} & continue</button>
          {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
          <p className="mt-3 text-[10px] leading-4 text-[#8a938e]">A temporary hold is created transactionally. The API confirms whether it succeeds.</p>
          </>}
        </aside>
      </div>
    </main>
  );
}
