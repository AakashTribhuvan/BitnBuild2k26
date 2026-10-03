"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CreditCard, LoaderCircle, ShieldCheck, Timer, TriangleAlert, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api, getApiError, getString, isRecord } from "@/lib/api";

type PaymentState = "loading" | "ready" | "intent" | "result" | "expired" | "missing" | "released";
type OrderData = Record<string, unknown>;
type ActiveReservation = { id: string; seatId: string; expiresAt: number };

function formatRemaining(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function MockCheckout() {
  const [reservationId, setReservationId] = useState("");
  const [reservation, setReservation] = useState<ActiveReservation>();
  const [paymentId, setPaymentId] = useState("");
  const [scanUrl, setScanUrl] = useState("");
  const [order, setOrder] = useState<OrderData>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState<PaymentState>("loading");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const clearSavedReservation = useCallback((id: string) => {
    if (window.localStorage.getItem("fairdrop:active-reservation") === id) {
      window.localStorage.removeItem("fairdrop:active-reservation");
    }
  }, []);

  const loadReservation = useCallback(async (id: string) => {
    setStatus("loading");
    setError("");
    try {
      const { data } = await api.get<unknown>(`/reservations/${encodeURIComponent(id)}`);
      if (!isRecord(data)) throw new Error("The API returned an unexpected reservation.");
      if (data.status === "confirmed") {
        setOrder(data);
        setReservation(undefined);
        setStatus("result");
        clearSavedReservation(id);
        return;
      }

      const seatId = getString(data.seat_id) ?? getString(data.seatId);
      const expiresAtValue = getString(data.expires_at) ?? getString(data.expiresAt);
      const expiresAt = expiresAtValue ? Date.parse(expiresAtValue) : Number.NaN;
      if (data.status !== "pending") {
        setReservation(undefined);
        setStatus(data.status === "expired" ? "expired" : "missing");
        clearSavedReservation(id);
        return;
      }
      if (!seatId || !Number.isFinite(expiresAt)) {
        throw new Error("The API reservation is missing its seat or expiry time.");
      }
      setReservation({ id, seatId, expiresAt });
      setStatus(expiresAt > Date.now() ? "ready" : "expired");
      if (expiresAt <= Date.now()) clearSavedReservation(id);
    } catch (requestError) {
      setReservation(undefined);
      setStatus("missing");
      setError(getApiError(requestError));
    }
  }, [clearSavedReservation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("reservationId") ?? window.localStorage.getItem("fairdrop:active-reservation") ?? "";
    setReservationId(id);
    if (id) {
      void loadReservation(id);
    } else {
      setStatus("missing");
    }
  }, [loadReservation]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!reservation || now < reservation.expiresAt || status === "result") return;
    setStatus("expired");
    setError("");
    clearSavedReservation(reservation.id);
  }, [clearSavedReservation, now, reservation, status]);

  const fetchOrder = useCallback(async (orderId: string) => {
    const { data } = await api.get<unknown>(`/reservations/${encodeURIComponent(orderId)}`);
    if (!isRecord(data)) throw new Error("The API did not return a valid order confirmation.");
    if (data.status !== "confirmed") throw new Error("Payment was accepted, but the reservation is not confirmed yet. Refresh its status before assuming the booking is complete.");
    setOrder(data);
    setReservation(undefined);
    setStatus("result");
    clearSavedReservation(orderId);
  }, [clearSavedReservation]);

  useEffect(() => {
    if (status !== "intent" || !reservationId) return;

    let active = true;
    let timer: number;
    const pollOrder = async () => {
      try {
        const { data } = await api.get<unknown>(`/reservations/${encodeURIComponent(reservationId)}`);
        if (!isRecord(data)) throw new Error("The API returned an unexpected reservation status.");
        if (data.status === "confirmed") {
          if (active) {
            setOrder(data);
            setReservation(undefined);
            setStatus("result");
            clearSavedReservation(reservationId);
          }
          return;
        }
      } catch (requestError) {
        if (active) setError(getApiError(requestError));
      }
      if (active) timer = window.setTimeout(() => void pollOrder(), 2000);
    };

    timer = window.setTimeout(() => void pollOrder(), 1500);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [clearSavedReservation, reservationId, status]);

  async function createIntent() {
    if (!reservationId || !reservation || reservation.expiresAt <= Date.now()) {
      setStatus("expired");
      setError("This seat hold has expired. Return to the event and choose an available seat again.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post<unknown>("/payments/create-intent", { reservationId });
      if (!isRecord(data)) throw new Error("The API returned an unexpected payment intent.");
      const id = getString(data.payment_intent_id) ?? getString(data.intent_id) ?? getString(data.id);
      const scanToken = getString(data.scan_token);
      if (!id || !scanToken) throw new Error("The API did not return the demo payment details.");
      setPaymentId(id);
      setScanUrl(new URL(`/demo-pay/${encodeURIComponent(scanToken)}`, window.location.origin).toString());
      setStatus("intent");
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function simulatePayment() {
    if (!paymentId || !reservation || reservation.expiresAt <= Date.now()) {
      setStatus("expired");
      setError("This seat hold has expired. Return to the event and choose an available seat again.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post<unknown>("/payments/mock-success", { payment_intent_id: paymentId });
      if (!isRecord(data) || data.success !== true) throw new Error("The API did not confirm the mock payment.");
      await fetchOrder(reservationId);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function releaseHold() {
    if (!reservation) return;
    setBusy(true);
    setError("");
    try {
      await api.delete(`/seats/hold/${encodeURIComponent(reservation.seatId)}`);
      clearSavedReservation(reservation.id);
      setReservation(undefined);
      setReservationId("");
      setPaymentId("");
      setStatus("released");
      setNotice("Your seat hold has been released.");
      window.history.replaceState(null, "", "/checkout");
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setBusy(false);
    }
  }

  const remaining = reservation ? reservation.expiresAt - now : 0;
  const expired = status === "expired" || (reservation !== undefined && remaining <= 0);

  return (
    <main className="mx-auto min-h-[65vh] max-w-[830px] px-5 py-12">
      <p className="text-[11px] font-bold uppercase tracking-[.1em] text-forest">CHECKOUT</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">One last step.</h1>
      <div className="mt-6 grid gap-5 md:grid-cols-[1fr_330px]">
        <section className="rounded-2xl border border-[#e6eae6] bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-start gap-3"><span className="mt-1 text-forest"><CreditCard size={20} /></span><div><h2 className="font-semibold">Mock payment</h2><p className="mt-1 text-xs leading-5 text-[#6c7772]">This is a safe demonstration. No real card details are collected, and no live payment provider is connected.</p></div></div>
          <div className="mt-6 rounded-xl border border-[#dfe8e1] bg-[#f3f7f3] p-4"><p className="flex items-center gap-2 text-xs font-semibold text-forest"><ShieldCheck size={15} /> FairDrop verifies every payment result</p><p className="mt-1.5 text-[11px] leading-5 text-[#607067]">The API owns reservation expiry, payment processing and final booking confirmation. The browser cannot mark an order paid.</p></div>

          {status === "loading" && <p className="mt-5 flex items-center gap-2 text-sm text-[#6c7772]"><LoaderCircle size={16} className="animate-spin" /> Checking your seat hold…</p>}
          {status === "missing" && <p className="mt-5 rounded-lg bg-[#fcf7eb] p-3 text-xs leading-5 text-[#72500e]">{reservationId ? "This reservation could not be loaded. Sign in with the account that selected the seat, then retry." : "No active reservation was found. Start from an admitted event and select a seat first."}</p>}
          {status === "released" && <p role="status" className="mt-5 rounded-lg bg-[#f3f7f3] p-3 text-xs leading-5 text-[#43534a]">{notice}</p>}
          {expired && <div role="status" className="mt-5 rounded-lg bg-[#fcf7eb] p-3 text-xs leading-5 text-[#72500e]"><p className="font-semibold">Your seat hold has expired.</p><p className="mt-1">The seat is no longer reserved. Return to the event to check availability and select again.</p></div>}
          {reservation && !expired && status !== "result" && (
            <div role="timer" aria-live="polite" className="mt-5 flex items-start gap-3 rounded-xl border border-[#eadfca] bg-[#fcf7eb] p-4">
              <Timer size={18} className="mt-0.5 shrink-0 text-[#967337]" />
              <div><p className="text-sm font-semibold text-[#72500e]">Seat held for <span className="font-mono">{formatRemaining(remaining)}</span></p><p className="mt-1 text-xs leading-5 text-[#72500e]">Complete checkout before the timer ends. The server controls the hold and releases it automatically at expiry.</p></div>
            </div>
          )}

          {reservation && status === "ready" && <button onClick={() => void createIntent()} disabled={busy || expired} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-3 text-sm font-semibold text-white hover:bg-[#10553e] disabled:opacity-60">{busy && <LoaderCircle size={15} className="animate-spin" />}Create mock payment intent</button>}
          {reservation && status === "intent" && <div className="mt-6">
            <p className="text-xs text-[#6c7772]">Demo payment reference <code className="text-ink">{paymentId}</code></p>
            <div className="mt-4 rounded-2xl border border-[#dce7df] bg-[#f7faf7] p-5 text-center">
              <p className="text-sm font-semibold text-ink">Scan to simulate UPI-style payment</p>
              <p className="mt-1 text-xs leading-5 text-[#6c7772]">Open your phone camera and scan this code. The demo booking will complete automatically when the page opens.</p>
              <div className="mx-auto mt-4 inline-flex rounded-xl bg-white p-3 shadow-sm"><QRCodeSVG value={scanUrl} size={208} level="M" includeMargin /></div>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-[#9a5a14]">Simulation only · no money moves</p>
              <p className="mt-1 text-[10px] leading-4 text-[#6c7772]">This is not a UPI payment request. It does not open a bank app or transfer money.</p>
            </div>
            <button onClick={() => void simulatePayment()} disabled={busy || expired} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-3 text-sm font-semibold text-white hover:bg-[#10553e] disabled:opacity-60">{busy ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={16} />}Complete demo payment on this device</button>
            <p className="mt-3 text-[10px] text-[#8a938e]">The checkout checks the reservation status while you scan. No real payment provider is connected.</p>
          </div>}
          {reservation && !expired && status !== "result" && <button onClick={() => void releaseHold()} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#e1e6e2] px-4 py-2.5 text-xs font-semibold text-[#43534a] hover:bg-[#f7f8f6] disabled:opacity-60">{busy ? <LoaderCircle size={14} className="animate-spin" /> : <XCircle size={14} />}Release seat and cancel checkout</button>}
          {order && <div role="status" className="mt-6 rounded-xl border border-[#cde4d4] bg-[#f0f7f2] p-5"><p className="flex items-center gap-2 font-semibold text-[#216943]"><CheckCircle2 size={18} /> Booking confirmed by FairDrop</p><pre className="mt-3 overflow-auto text-[11px] leading-5 text-[#43534a]">{JSON.stringify(order, null, 2)}</pre></div>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-800"><TriangleAlert className="mr-1 inline" size={14} />{error}</p>}
        </section>
        <aside className="h-fit rounded-2xl border border-[#e6eae6] bg-white p-6 shadow-card"><h2 className="font-semibold">Your reservation</h2><p className="mt-2 text-xs leading-5 text-[#6c7772]">The backend rechecks the active hold and price before creating this payment intent.</p><p className="mt-4 rounded-lg bg-[#f7f8f6] p-3 text-xs"><span className="text-[#6c7772]">Reservation reference</span><br /><code className="mt-1 inline-block break-all">{reservationId || "No active reservation"}</code></p>{reservation && <p className="mt-3 rounded-lg bg-[#f7f8f6] p-3 text-xs"><span className="text-[#6c7772]">Held seat</span><br /><code className="mt-1 inline-block break-all">{reservation.seatId}</code></p>}<p className="mt-4 text-[10px] leading-4 text-[#8a938e]">Never enter or share card numbers, CVVs or banking credentials on this mock screen.</p><Link href="/events" className="mt-5 inline-flex text-xs font-semibold text-forest hover:underline">Browse experiences</Link></aside>
      </div>
    </main>
  );
}
