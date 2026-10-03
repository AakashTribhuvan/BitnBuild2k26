"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle, RefreshCw, Shuffle, ShieldCheck } from "lucide-react";
import { api, getApiError, isRecord } from "@/lib/api";
import { events, FairDropEvent, normalizeApiEvent } from "@/lib/events";

type Resource = { data?: unknown; error?: string; loading: boolean };
type ResourceKey = "stats" | "reservations" | "risk";
type ResourceState = Record<ResourceKey, Resource>;

const emptyState: ResourceState = {
  stats: { loading: true },
  reservations: { loading: true },
  risk: { loading: true },
};

const endpoints: Record<ResourceKey, string> = {
  stats: "/admin/stats",
  reservations: "/admin/orders",
  risk: "/admin/flags",
};

const labels: Record<ResourceKey, string> = {
  stats: "Sale statistics",
  reservations: "Recent reservations",
  risk: "Risk flags",
};

export function AdminOperations() {
  const [resources, setResources] = useState<ResourceState>(emptyState);
  const [catalog, setCatalog] = useState<FairDropEvent[]>(events);
  const [eventId, setEventId] = useState("");
  const [shuffleError, setShuffleError] = useState("");
  const [shuffleMessage, setShuffleMessage] = useState("");
  const [shuffling, setShuffling] = useState(false);

  const refresh = useCallback(async () => {
    setResources({
      stats: { loading: true },
      reservations: { loading: true },
      risk: { loading: true },
    });
    if (eventId) {
      const { stats, ...otherEndpoints } = endpoints;
      const results = await Promise.allSettled([
        api.get<unknown>(stats, { params: { eventId } }).then(({ data }) => ["stats", data] as const),
        ...(["reservations", "risk"] as const).map(async (key) => [key, (await api.get<unknown>(otherEndpoints[key])).data] as const),
      ]);
      const updated: ResourceState = { stats: { loading: false }, reservations: { loading: false }, risk: { loading: false } };
      results.forEach((result, index) => {
        const key = (["stats", "reservations", "risk"] as const)[index];
        if (result.status === "fulfilled") updated[result.value[0]] = { loading: false, data: result.value[1] };
        else updated[key] = { loading: false, error: getApiError(result.reason) };
      });
      setResources(updated);
      return;
    }

    setResources({
      stats: { loading: false, error: "Select an event to load statistics." },
      reservations: { loading: true },
      risk: { loading: true },
    });
    const results = await Promise.allSettled(
      (["reservations", "risk"] as const).map(async (key) => [key, (await api.get<unknown>(endpoints[key])).data] as const),
    );
    const updated: ResourceState = { stats: { loading: false }, reservations: { loading: false }, risk: { loading: false } };
    results.forEach((result) => {
      if (result.status === "fulfilled") updated[result.value[0]] = { loading: false, data: result.value[1] };
      else {
        const key = (["reservations", "risk"] as const)[results.indexOf(result)];
        updated[key] = { loading: false, error: getApiError(result.reason) };
      }
    });
    setResources(updated);
  }, [eventId]);

  useEffect(() => {
    let active = true;
    api.get<unknown>("/events")
      .then(({ data }) => {
        if (!active || !Array.isArray(data)) return;
        const liveEvents = data.map(normalizeApiEvent).filter((event): event is FairDropEvent => event !== undefined);
        if (liveEvents.length) {
          setCatalog(liveEvents);
          setEventId(liveEvents[0].id);
        }
      })
      .catch(() => {
        if (active && events[0]) setEventId(events[0].id);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => { if (eventId) void refresh(); }, [eventId, refresh]);

  async function shuffleQueue() {
    if (!window.confirm("Shuffle the queue for this event? This changes the admission order.")) return;
    setShuffling(true);
    setShuffleError("");
    setShuffleMessage("");
    try {
      const { data } = await api.post<unknown>("/queue/shuffle", { eventId });
      setShuffleMessage(isRecord(data) && typeof data.count === "number" ? `Queue shuffled for ${data.count} waiting users.` : "The queue shuffle request was accepted by the API.");
      await refresh();
    } catch (requestError) {
      setShuffleError(getApiError(requestError));
    } finally {
      setShuffling(false);
    }
  }

  return (
    <main className="mx-auto min-h-[65vh] max-w-[1240px] px-5 py-10 lg:px-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[11px] font-bold uppercase tracking-[.1em] text-forest">ADMIN · OPERATIONS</p><h1 className="mt-2 text-3xl font-bold tracking-tight">FairDrop overview</h1><p className="mt-1 text-sm text-[#6c7772]">Live operational data is provided by the admin API.</p></div>
        <button onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-[#dfe5e1] px-3 py-2 text-xs font-semibold"><RefreshCw size={14} /> Refresh data</button>
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#eadfca] bg-[#fcf7eb] p-4 text-xs leading-5 text-[#72500e]"><AlertTriangle className="mt-0.5 shrink-0" size={16} /><p><strong>Admin routes are protected by the backend.</strong> This page never grants admin access based on browser state; sign in with an admin account and let the API verify your role.</p></div>
      <section className="mt-7 grid gap-4 md:grid-cols-3">
        {(Object.keys(endpoints) as ResourceKey[]).map((key) => <article key={key} className="rounded-2xl border border-[#e6eae6] bg-white p-5 shadow-card"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">{labels[key]}</h2>{resources[key].loading && <LoaderCircle size={15} className="animate-spin text-forest" />}</div>{resources[key].loading ? <p className="mt-4 text-xs text-[#6c7772]">Loading from API…</p> : resources[key].error ? <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-800">{resources[key].error}</div> : <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-[#f7f8f6] p-3 text-[10px] leading-5 text-[#43534a]">{JSON.stringify(resources[key].data, null, 2)}</pre>}</article>)}
      </section>
      <section className="mt-7 max-w-2xl rounded-2xl border border-[#e6eae6] bg-white p-6 shadow-card">
        <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eef4f0] text-forest"><Shuffle size={17} /></span><div><h2 className="text-sm font-semibold">Fair queue controls</h2><p className="text-xs text-[#6c7772]">Randomize the queue using the protected admin API.</p></div></div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor="shuffle-event">Event</label><select id="shuffle-event" className="min-w-0 flex-1 rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5 text-sm" value={eventId} onChange={(event) => setEventId(event.target.value)}>{catalog.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select><button onClick={() => void shuffleQueue()} disabled={shuffling || !eventId} className="inline-flex items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{shuffling ? <LoaderCircle size={15} className="animate-spin" /> : <Shuffle size={15} />}Shuffle queue</button></div>
        {shuffleMessage && <p role="status" className="mt-3 text-xs text-[#216943]">{shuffleMessage}</p>}
        {shuffleError && <p role="alert" className="mt-3 text-xs text-red-700">{shuffleError}</p>}
        <p className="mt-4 flex items-center gap-1.5 text-[10px] text-[#8a938e]"><ShieldCheck size={13} /> The backend enforces admin roles and records operational actions.</p>
      </section>
    </main>
  );
}
