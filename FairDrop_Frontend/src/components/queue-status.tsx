"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CircleHelp, Clock3, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { api, getApiError, getString, isRecord } from "@/lib/api";

type QueueStatusData = { status?: string; position?: number; message?: string };

export function QueueStatus({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [entryId, setEntryId] = useState("");
  const [queue, setQueue] = useState<QueueStatusData>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(`fairdrop:queue:${eventId}`) ?? "";
    setEntryId(new URLSearchParams(window.location.search).get("entry") ?? saved);
  }, [eventId]);

  const refresh = useCallback(async () => {
    if (!entryId) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get<unknown>("/queue/status", { params: { eventId } });
      if (!isRecord(data)) throw new Error("The API returned an unexpected queue status.");
      const positionValue = typeof data.position === "number" || typeof data.position === "string" ? Number(data.position) : Number.NaN;
      const waitingValue = typeof data.total_waiting === "number" || typeof data.total_waiting === "string" ? Number(data.total_waiting) : Number.NaN;
      const position = Number.isFinite(positionValue) ? positionValue : undefined;
      const totalWaiting = Number.isFinite(waitingValue) ? waitingValue : undefined;
      setQueue({
        status: getString(data.status),
        position,
        message: getString(data.message) ?? (totalWaiting === undefined ? undefined : `People still waiting: ${totalWaiting}`),
      });
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [entryId, eventId]);

  useEffect(() => {
    if (!entryId) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [entryId, refresh]);

  const admitted = queue?.status?.toLowerCase() === "admitted";
  const statusLabel = queue?.status ? queue.status.replaceAll("_", " ") : "Waiting for queue status";

  return (
    <main className="mx-auto min-h-[65vh] max-w-[780px] px-5 py-12">
      <section className="rounded-2xl border border-[#e6eae6] bg-white px-5 py-9 text-center shadow-card sm:px-10 sm:py-12">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#eef4f0] text-forest"><ShieldCheck size={22} /></span>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[.12em] text-forest">FAIRDROP WAITING ROOM</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{eventTitle}</h1>
        {!entryId ? (
          <div className="mx-auto mt-7 max-w-md rounded-xl border border-[#f2dfb9] bg-[#fcf7eb] p-4 text-left text-sm text-[#72500e]">
            <p className="font-semibold">No queue entry found on this device.</p>
            <p className="mt-1 text-xs leading-5">Join the waiting room from the event page while signed in. Your queue entry is assigned by the FairDrop API.</p>
            <Link className="mt-3 inline-flex font-semibold underline" href={`/events/${encodeURIComponent(eventId)}`}>Return to event</Link>
          </div>
        ) : (
          <>
            <p className="mx-auto mt-3 max-w-lg text-sm text-[#6c7772]">Keep this page open. Your place and admission status come from the server and refresh automatically.</p>
            <div className="mt-8 rounded-xl bg-[#f7f8f6] px-4 py-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6c7772]">Your queue status</p>
              <p aria-live="polite" className="mt-2 text-3xl font-bold capitalize tracking-tight text-ink">{statusLabel}</p>
              {typeof queue?.position === "number" && <p className="mt-2 text-sm text-[#6c7772]">Position {queue.position.toLocaleString()}</p>}
              {queue?.message && <p className="mt-2 text-xs text-[#6c7772]">{queue.message}</p>}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className={`queue-step ${queue ? "queue-step-done" : ""}`}><span>01</span> Waiting room</div>
              <div className={`queue-step ${queue?.position ? "queue-step-done" : ""}`}><span>02</span> Fair admission</div>
              <div className={`queue-step ${admitted ? "queue-step-done" : ""}`}><span>03</span> Seat selection</div>
            </div>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#dfe5e1] px-4 py-2.5 text-sm font-semibold hover:bg-[#f7f8f6] disabled:opacity-60">
                {loading ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />} Refresh status
              </button>
              {admitted && <Link href={`/events/${encodeURIComponent(eventId)}/seats`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white">Choose a seat <ArrowRight size={15} /></Link>}
            </div>
            {error && <p role="alert" className="mt-4 text-xs text-red-700">{error}</p>}
          </>
        )}
        <p className="mt-7 inline-flex items-center gap-1.5 text-[11px] text-[#6c7772]"><Clock3 size={13} /> Refreshing won&apos;t improve your place. <CircleHelp size={13} /></p>
      </section>
    </main>
  );
}
