"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, Ticket, TriangleAlert } from "lucide-react";
import { api, getApiError, getString, isRecord } from "@/lib/api";

type Confirmation = {
  eventName: string;
  seatNumbers: string[];
  amount: string;
  paymentStatus: string;
};

export function BookingConfirmation({ reservationId }: { reservationId: string }) {
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data } = await api.get<unknown>(`/reservations/${encodeURIComponent(reservationId)}`);
        if (!isRecord(data)) throw new Error("The API returned an unexpected reservation confirmation.");
        if (data.status !== "confirmed") throw new Error("This reservation has not been confirmed by the FairDrop API.");
        const eventName = getString(data.event_name);
        const bookedSeats = Array.isArray(data.booked_seats) ? data.booked_seats.filter(isRecord) : [];
        const seatNumbers = bookedSeats
          .map((seat) => seat.seat_number === undefined || seat.seat_number === null ? "" : String(seat.seat_number))
          .filter(Boolean);
        const fallbackSeat = data.seat_number === undefined || data.seat_number === null ? "" : String(data.seat_number);
        if (!eventName || (!seatNumbers.length && !fallbackSeat)) throw new Error("The confirmed reservation is missing event or seat details.");
        if (active) {
          setConfirmation({
            eventName,
            seatNumbers: seatNumbers.length ? seatNumbers : [fallbackSeat],
            amount: data.amount === undefined || data.amount === null ? "—" : String(data.amount),
            paymentStatus: getString(data.payment_status) ?? "succeeded",
          });
        }
      } catch (requestError) {
        if (active) setError(getApiError(requestError));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [reservationId]);

  return (
    <main className="mx-auto min-h-[65vh] max-w-[760px] px-5 py-14">
      <section className="rounded-2xl border border-[#e6eae6] bg-white px-6 py-10 text-center shadow-card sm:px-12">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-12 text-sm text-[#6c7772]"><LoaderCircle className="animate-spin" size={18} /> Verifying your booking with FairDrop…</p>
        ) : error ? (
          <>
            <TriangleAlert className="mx-auto text-[#a15c10]" size={30} />
            <h1 className="mt-4 text-2xl font-bold">We couldn&apos;t verify this booking</h1>
            <p role="alert" className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#6c7772]">{error}</p>
            <Link href="/checkout" className="mt-6 inline-flex rounded-lg bg-forest px-5 py-3 text-sm font-semibold text-white">Return to checkout</Link>
          </>
        ) : confirmation ? (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#eaf5ee] text-[#287650]"><CheckCircle2 size={30} /></span>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-forest">BOOKING CONFIRMED BY FAIRDROP</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">You&apos;re all set.</h1>
            <p className="mt-2 text-sm text-[#6c7772]">{confirmation.eventName}</p>
            <div className="mx-auto mt-7 max-w-md rounded-xl border border-[#e6eae6] bg-[#fafbfa] p-5 text-left">
              <p className="flex items-center gap-2 text-sm font-semibold"><Ticket size={16} className="text-forest" /> Your booking</p>
              <dl className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between gap-4"><dt className="text-[#6c7772]">{confirmation.seatNumbers.length === 1 ? "Seat" : "Seats"}</dt><dd className="max-w-[220px] text-right font-semibold">{confirmation.seatNumbers.join(", ")}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[#6c7772]">Reservation</dt><dd className="max-w-[220px] break-all text-right font-mono">{reservationId}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[#6c7772]">Payment</dt><dd className="font-semibold capitalize">{confirmation.paymentStatus}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[#6c7772]">Amount</dt><dd className="font-semibold">₹{confirmation.amount}</dd></div>
              </dl>
            </div>
            <p className="mt-5 text-[11px] leading-5 text-[#7b8580]">This demo booking is confirmed by the FairDrop backend. No money was transferred.</p>
            <Link href="/events" className="mt-6 inline-flex rounded-lg bg-forest px-5 py-3 text-sm font-semibold text-white">Explore more experiences</Link>
          </>
        ) : null}
      </section>
    </main>
  );
}
