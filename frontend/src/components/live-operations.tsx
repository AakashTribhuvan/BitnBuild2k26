"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, CheckCircle2, CircleAlert, Clock3, LoaderCircle, ShieldCheck } from "lucide-react";
import { api, getApiError, getString, isRecord } from "@/lib/api";

type Batch = {
  candidate_count: number;
  admitted_count: number;
  average_human_score: number;
  admitted_average_human_score: number;
  available_seats: number;
  created_at: string;
};

type Overview = {
  event: { id: string; name: string; totalSeats: number };
  counts: {
    waiting: number;
    active_grants: number;
    available_seats: number;
    held_seats: number;
    sold_seats: number;
    risk_flags: number;
  };
  configuration: {
    batchSize: number;
    batchIntervalSeconds: number;
    grantSeconds: number;
    googleRequired: boolean;
    turnstileConfigured: boolean;
    turnstileRequired: boolean;
    scoringIsHeuristic: boolean;
  };
  recentBatches: Batch[];
};

function numberFrom(record: Record<string, unknown>, key: string) {
  const value = Number(record[key]);
  if (!Number.isFinite(value)) throw new Error(`Operations data is missing ${key}.`);
  return value;
}

function parseOverview(value: unknown): Overview {
  if (!isRecord(value) || !isRecord(value.event) || !isRecord(value.counts) || !isRecord(value.configuration) || !Array.isArray(value.recentBatches)) {
    throw new Error("The FairDrop API returned an unexpected operations snapshot.");
  }
  const eventId = getString(value.event.id);
  const eventName = getString(value.event.name);
  if (!eventId || !eventName) throw new Error("The operations snapshot is missing its active event.");
  const config = value.configuration;
  return {
    event: { id: eventId, name: eventName, totalSeats: numberFrom(value.event, "totalSeats") },
    counts: {
      waiting: numberFrom(value.counts, "waiting"),
      active_grants: numberFrom(value.counts, "active_grants"),
      available_seats: numberFrom(value.counts, "available_seats"),
      held_seats: numberFrom(value.counts, "held_seats"),
      sold_seats: numberFrom(value.counts, "sold_seats"),
      risk_flags: numberFrom(value.counts, "risk_flags"),
    },
    configuration: {
      batchSize: numberFrom(config, "batchSize"),
      batchIntervalSeconds: numberFrom(config, "batchIntervalSeconds"),
      grantSeconds: numberFrom(config, "grantSeconds"),
      googleRequired: config.googleRequired === true,
      turnstileConfigured: config.turnstileConfigured === true,
      turnstileRequired: config.turnstileRequired === true,
      scoringIsHeuristic: config.scoringIsHeuristic === true,
    },
    recentBatches: value.recentBatches.map((item): Batch => {
      if (!isRecord(item)) throw new Error("The operations snapshot contains a malformed admission batch.");
      const createdAt = getString(item.created_at);
      if (!createdAt) throw new Error("An admission batch is missing its timestamp.");
      return {
        candidate_count: numberFrom(item, "candidate_count"),
        admitted_count: numberFrom(item, "admitted_count"),
        average_human_score: numberFrom(item, "average_human_score"),
        admitted_average_human_score: numberFrom(item, "admitted_average_human_score"),
        available_seats: numberFrom(item, "available_seats"),
        created_at: createdAt,
      };
    }),
  };
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function LiveOperations() {
  const [overview, setOverview] = useState<Overview>();
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    let active = true;
    let timer: number;
    const refresh = async () => {
      try {
        const { data } = await api.get<unknown>("/queue/overview");
        const snapshot = parseOverview(data);
        if (active) {
          setOverview(snapshot);
          setError("");
          setUpdatedAt(new Date().toISOString());
        }
      } catch (requestError) {
        if (active) setError(getApiError(requestError));
      }
      if (active) timer = window.setTimeout(() => void refresh(), 5000);
    };
    void refresh();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const c = overview?.counts;
  const config = overview?.configuration;
  const interval = config?.batchIntervalSeconds ?? 10;
  const secondsToNext = interval - (Math.floor(now / 1000) % interval);
  const occupied = c ? c.held_seats + c.sold_seats : 0;
  const inventoryPercentage = overview ? Math.min(100, occupied / Math.max(1, overview.event.totalSeats) * 100) : 0;

  return (
    <main className="mx-auto min-h-[70vh] max-w-[1180px] px-5 py-10 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-forest"><Activity size={14} /> FairDrop control room</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Live backend operations</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6c7772]">A privacy-safe view of queue admission, inventory and system policy. This page exposes aggregates only—never account identifiers, individual behavior signals, or raw browser cookies. Cookies can contain authentication secrets and are not collected for this dashboard.</p>
        </div>
        <div className="rounded-xl border border-[#e6eae6] bg-white px-4 py-3 text-xs shadow-card">
          <p className="flex items-center gap-2 font-semibold text-[#216943]"><span className="h-2 w-2 rounded-full bg-[#35a66a]" /> Live API snapshot</p>
          <p className="mt-1 text-[#6c7772]">{updatedAt ? `Updated ${formatTime(updatedAt)}` : "Connecting to FairDrop…"}</p>
        </div>
      </div>

      {error && <div role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><CircleAlert size={17} className="mt-0.5 shrink-0" />{error}</div>}
      {!overview && !error && <p className="mt-10 flex items-center gap-2 text-sm text-[#6c7772]"><LoaderCircle size={17} className="animate-spin" /> Loading live operations…</p>}

      {overview && c && config && (
        <>
          <section className="mt-8 rounded-2xl border border-[#e6eae6] bg-white p-5 shadow-card sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#7b8580]">Active sale</p><h2 className="mt-1 text-xl font-bold">{overview.event.name}</h2></div>
              <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/health`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline">API health <ArrowUpRight size={14} /></a>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Waiting room" value={c.waiting} detail="No tickets held while waiting" />
              <Metric label="Active admission passes" value={c.active_grants} detail={`Expires after ${Math.round(config.grantSeconds / 60)} min; one booking group per pass`} />
              <Metric label="Available seats" value={c.available_seats} detail={`${overview.event.totalSeats} total capacity`} />
              <Metric label="Sold / held" value={`${c.sold_seats} / ${c.held_seats}`} detail="Payment and hold state from PostgreSQL" />
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-[11px] text-[#6c7772]"><span>Inventory committed</span><span>{occupied} / {overview.event.totalSeats}</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf0ed]"><div className="h-full rounded-full bg-forest transition-[width]" style={{ width: `${inventoryPercentage}%` }} /></div>
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
            <div className="rounded-2xl border border-[#e6eae6] bg-white p-5 shadow-card sm:p-6">
              <p className="flex items-center gap-2 text-sm font-bold"><Clock3 size={16} className="text-forest" /> Admission control</p>
              <div className="mt-4 rounded-xl bg-[#f7f8f6] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#7b8580]">Next batch in</p>
                <p className="mt-1 font-mono text-3xl font-bold tracking-tight">{String(secondsToNext).padStart(2, "0")}<span className="ml-1 text-sm font-semibold text-[#6c7772]">sec</span></p>
                <p className="mt-2 text-xs leading-5 text-[#6c7772]">At most <strong>{config.batchSize}</strong> passes every <strong>{config.batchIntervalSeconds} seconds</strong>, and never more passes than available seats.</p>
              </div>
              <div className="mt-4 space-y-3 text-xs">
                <Policy label="Google identity" value={config.googleRequired ? "Required to join" : "Optional"} ok={config.googleRequired} />
                <Policy label="Cloudflare Turnstile" value={!config.turnstileConfigured ? config.turnstileRequired ? "Required; missing keys (blocked)" : "Not configured" : config.turnstileRequired ? "Configured and enforced" : "Configured; optional"} ok={config.turnstileConfigured && config.turnstileRequired} />
                <Policy label="Human-likelihood score" value="Heuristic signals; weighted lottery" ok />
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#fcf7eb] p-3 text-[10px] leading-4 text-[#72500e]"><ShieldCheck size={14} className="mt-0.5 shrink-0" /> Scores are coarse and forgeable signals—not proof of identity or bot activity. The selection remains randomized, and a low score is not a ban.</div>
            </div>

            <div className="rounded-2xl border border-[#e6eae6] bg-white p-5 shadow-card sm:p-6">
              <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">Recent admission batches</p><span className="text-[10px] text-[#7b8580]">Latest 10 · public aggregates</span></div>
              {overview.recentBatches.length === 0 ? (
                <p className="mt-5 rounded-xl bg-[#f7f8f6] p-4 text-xs leading-5 text-[#6c7772]">No waiting candidates have been processed yet. When people join the waiting room, batch results will appear here.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[490px] text-left text-[11px]">
                    <thead className="border-b border-[#edf0ed] text-[#7b8580]"><tr><th className="pb-2 font-semibold">Time</th><th className="pb-2 font-semibold">Admitted</th><th className="pb-2 font-semibold">Pool avg.</th><th className="pb-2 font-semibold">Selected avg.</th><th className="pb-2 font-semibold">Beyond passes</th></tr></thead>
                    <tbody>{overview.recentBatches.map((batch, index) => (
                      <tr key={`${batch.created_at}-${index}`} className="border-b border-[#f0f2f0] last:border-0">
                        <td className="py-3 text-[#6c7772]">{formatTime(batch.created_at)}</td>
                        <td className="py-3 font-semibold">{batch.admitted_count} / {batch.candidate_count}</td>
                        <td className="py-3">{batch.average_human_score}/100</td>
                        <td className="py-3">{batch.admitted_average_human_score}/100</td>
                        <td className="py-3">{batch.available_seats}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              <p className="mt-4 text-[10px] leading-4 text-[#7b8580]">Selection uses score-weighted random sampling without replacement. A higher score changes odds; it does not guarantee admission.</p>
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-[#e6eae6] bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 size={16} className="text-forest" /> What happens behind the storefront</div>
            <div className="mt-4 grid gap-3 text-xs sm:grid-cols-4">
              <FlowStep number="01" title="Join waiting room" copy="Google identity is checked. CAPTCHA is verified when configured and required." />
              <FlowStep number="02" title="Weighted batch" copy={`Every ${config.batchIntervalSeconds}s, up to ${config.batchSize} candidates receive expiring passes.`} />
              <FlowStep number="03" title="Transactional hold" copy="A pass is single-use; the API locks inventory and creates a timed reservation." />
              <FlowStep number="04" title="Verified mock payment" copy="The payment simulation updates the seat and reservation in one server transaction." />
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return <div className="rounded-xl border border-[#edf0ed] p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#7b8580]">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-[10px] leading-4 text-[#7b8580]">{detail}</p></div>;
}

function Policy({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <p className="flex items-center justify-between gap-3"><span className="text-[#6c7772]">{label}</span><span className={`font-semibold ${ok ? "text-[#216943]" : "text-[#8a5b20]"}`}>{value}</span></p>;
}

function FlowStep({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <div className="rounded-xl bg-[#f7f8f6] p-4"><p className="text-[10px] font-bold text-forest">{number}</p><p className="mt-2 font-semibold">{title}</p><p className="mt-1 leading-5 text-[#6c7772]">{copy}</p></div>;
}
