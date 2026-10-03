"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, LockKeyhole, RefreshCw } from "lucide-react";
import { api, getApiError, getString, isRecord } from "@/lib/api";

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

export function SeatSelection({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const router = useRouter();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);

  const loadSeats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get<unknown>("/seats", { params: { eventId } });
      setSeats(normalizeSeats(data));
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { void loadSeats(); }, [loadSeats]);

  async function holdSeat() {
    if (!selected) return;
    setHolding(true);
    setError("");
    try {
      const { data } = await api.post<unknown>("/seats/hold", { eventId, seatId: selected });
      if (!isRecord(data)) throw new Error("The API returned an unexpected reservation response.");
      const reservationId = getString(data.reservation_id) ?? getString(data.id);
      if (!reservationId) throw new Error("The API did not return a reservation ID. Please contact support before retrying.");
      window.localStorage.setItem("fairdrop:active-reservation", reservationId);
      router.push(`/checkout?reservationId=${encodeURIComponent(reservationId)}&seatId=${encodeURIComponent(selected)}`);
    } catch (requestError) {
      setError(getApiError(requestError));
      setHolding(false);
    }
  }

  return (
    <main className="mx-auto min-h-[65vh] max-w-[1060px] px-5 py-10">
      <p className="text-[11px] font-bold uppercase tracking-[.1em] text-forest">ADMITTED GUESTS</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Choose your seat</h1>
      <p className="mt-1 text-sm text-[#6c7772]">{eventTitle} · seat access and availability are verified by the API.</p>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_310px]">
        <section className="rounded-2xl border border-[#e6eae6] bg-white p-5 shadow-card sm:p-7">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Available seats</h2><button onClick={() => void loadSeats()} disabled={loading} className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest"><RefreshCw size={14} /> Refresh</button></div>
          <div className="mx-auto mb-7 mt-5 max-w-md rounded-full bg-[#eef2ef] py-2 text-center text-[10px] font-bold uppercase tracking-[.12em] text-[#7a8580]">Stage / front of venue</div>
          {loading ? <p className="flex items-center justify-center gap-2 py-14 text-sm text-[#6c7772]"><LoaderCircle className="animate-spin" size={16} /> Checking live inventory…</p> : error ? <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">Could not load seats.</p><p className="mt-1 text-xs">{error}</p><p className="mt-2 text-xs">You must be admitted to the fair queue before the API will provide seat access.</p><Link href={`/events/${encodeURIComponent(eventId)}/queue`} className="mt-3 inline-flex font-semibold underline">Check your queue</Link></div> : seats.length === 0 ? <p className="py-14 text-center text-sm text-[#6c7772]">No seats are currently listed. Refresh to check inventory again.</p> : (
            <div className="mx-auto grid max-w-lg grid-cols-5 gap-2.5 sm:grid-cols-8">
              {seats.map((seat) => <button key={seat.id} type="button" title={`${seat.label}${seat.section ? ` · ${seat.section}` : ""} · ${seat.status}`} aria-pressed={selected === seat.id} disabled={seat.status !== "available"} onClick={() => setSelected(selected === seat.id ? "" : seat.id)} className={`h-10 rounded-md border text-[10px] font-semibold transition-colors ${seat.status === "sold" ? "cursor-not-allowed border-[#e1e5e2] bg-[#ecefec] text-[#969e99]" : seat.status === "held" ? "cursor-not-allowed border-[#eadfca] bg-[#f8f1e4] text-[#967337]" : selected === seat.id ? "border-forest bg-forest text-white" : "border-[#d2e5d8] bg-[#eaf5ee] text-[#287650] hover:border-forest"}`}>{seat.label}</button>)}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-4 text-[11px] text-[#6c7772]"><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[#eaf5ee]" />Available</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[#f8f1e4]" />On hold</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[#ecefec]" />Unavailable</span></div>
        </section>
        <aside className="h-fit rounded-2xl border border-[#e6eae6] bg-white p-6 shadow-card">
          <h2 className="font-semibold">Your selection</h2><p className="mt-1 text-xs text-[#6c7772]">One seat at a time. Purchase limits are enforced by the API.</p>
          {selected ? <p className="mt-5 rounded-lg bg-[#f7f8f6] p-3 text-sm font-semibold">{selected} <span className="float-right text-xs font-normal text-[#6c7772]">Price confirmed at hold</span></p> : <p className="mt-5 rounded-lg bg-[#f7f8f6] p-3 text-xs text-[#6c7772]">Select an available seat to continue.</p>}
          <button onClick={holdSeat} disabled={!selected || holding || loading || Boolean(error)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-3 text-sm font-semibold text-white hover:bg-[#10553e] disabled:cursor-not-allowed disabled:opacity-50">{holding ? <LoaderCircle size={15} className="animate-spin" /> : <LockKeyhole size={15} />} Hold seat & continue</button>
          {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
          <p className="mt-3 text-[10px] leading-4 text-[#8a938e]">A temporary hold is created transactionally. The API confirms whether it succeeds.</p>
        </aside>
      </div>
    </main>
  );
}
