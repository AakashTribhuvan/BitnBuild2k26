"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Bot, CheckCircle2, CircleAlert, Clock3, LoaderCircle, Play, ShieldCheck, Users } from "lucide-react";
import { api, getApiError, isRecord } from "@/lib/api";

type SimulationRun = {
  id: string;
  event_name: string;
  status: "completed" | "incomplete";
  human_count: number;
  bot_count: number;
  human_admitted: number;
  bot_admitted: number;
  human_average_score: number;
  bot_average_score: number;
  maximum_batch_admitted: number;
  batch_count: number;
  request_count: number;
  request_errors: number;
  duration_seconds: number;
  seat_count: number;
  created_at: string;
};

function parseRun(value: unknown): SimulationRun {
  if (!isRecord(value)) throw new Error("The API returned a malformed simulation result.");
  const numeric = (key: string) => {
    const result = Number(value[key]);
    if (!Number.isFinite(result)) throw new Error(`Simulation result is missing ${key}.`);
    return result;
  };
  const id = typeof value.id === "string" ? value.id : "";
  const eventName = typeof value.event_name === "string" ? value.event_name : "";
  const createdAt = typeof value.created_at === "string" ? value.created_at : "";
  if (!id || !eventName || !createdAt) throw new Error("Simulation result is missing required labels.");
  return {
    id,
    event_name: eventName,
    status: value.status === "completed" ? "completed" : "incomplete",
    human_count: numeric("human_count"),
    bot_count: numeric("bot_count"),
    human_admitted: numeric("human_admitted"),
    bot_admitted: numeric("bot_admitted"),
    human_average_score: numeric("human_average_score"),
    bot_average_score: numeric("bot_average_score"),
    maximum_batch_admitted: numeric("maximum_batch_admitted"),
    batch_count: numeric("batch_count"),
    request_count: numeric("request_count"),
    request_errors: numeric("request_errors"),
    duration_seconds: numeric("duration_seconds"),
    seat_count: numeric("seat_count"),
    created_at: createdAt,
  };
}

function admissionRate(admitted: number, total: number) {
  return total ? Math.round(admitted / total * 100) : 0;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : date.toLocaleString();
}

export function SimulationDashboard() {
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState("");
  const [settings, setSettings] = useState({
    humanUsers: 15,
    botUsers: 15,
    seatCount: 15,
    durationSeconds: 25,
    humanPollSeconds: 3,
    botPollSeconds: 0.5,
  });
  const [updatedAt, setUpdatedAt] = useState("");

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<unknown>("/queue/simulation-results");
      if (!isRecord(data) || !Array.isArray(data.runs)) {
        throw new Error("The API returned an unexpected simulation report.");
      }
      setRuns(data.runs.map(parseRun));
      setError("");
      setUpdatedAt(new Date().toISOString());
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const latest = runs[0];
  const humanRate = latest ? admissionRate(latest.human_admitted, latest.human_count) : 0;
  const botRate = latest ? admissionRate(latest.bot_admitted, latest.bot_count) : 0;
  const scoreGap = latest ? latest.human_average_score - latest.bot_average_score : 0;
  const invariantPassed = Boolean(latest && latest.maximum_batch_admitted <= 15 && latest.request_errors === 0);

  async function runSimulation() {
    setRunning(true);
    setError("");
    setRunMessage("");
    try {
      const { data } = await api.post<unknown>("/simulations/run", settings);
      if (!isRecord(data) || (data.status !== "completed" && data.status !== "incomplete")) {
        throw new Error("The API did not return a saved simulation report.");
      }
      setRunMessage(data.status === "completed"
        ? "The simulation finished and its aggregate report has been saved."
        : "The simulation ended early. Its incomplete report has been saved for review.");
      await refresh();
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto min-h-[70vh] max-w-[1180px] px-5 py-10 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-forest"><Activity size={14} /> Controlled traffic lab</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Human-like vs. scripted traffic</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6c7772]">Compare randomized queue admission for two synthetic request patterns. This page can run k6 against an isolated event on the local API and display the saved, aggregate-only results.</p>
        </div>
        <div className="rounded-xl border border-[#e6eae6] bg-white px-4 py-3 text-xs shadow-card">
          <p className="flex items-center gap-2 font-semibold text-[#216943]"><span className="h-2 w-2 rounded-full bg-[#35a66a]" /> Results feed</p>
          <p className="mt-1 text-[#6c7772]">{updatedAt ? `Updated ${formatDate(updatedAt)}` : "Connecting to FairDrop…"}</p>
        </div>
      </div>

      <section className="mt-7 rounded-2xl border border-[#e6eae6] bg-white p-5 shadow-card sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-[#7b8580]">Run a new local experiment</p><h2 className="mt-1 text-lg font-bold">Configure synthetic traffic</h2></div>
          <span className="rounded-full bg-[#f0f7f2] px-3 py-1.5 text-[10px] font-semibold text-[#216943]">Local API · max 50 users</span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-semibold text-[#43534a]">Human-like users
            <input type="number" min={1} max={50 - settings.botUsers} value={settings.humanUsers} onChange={(event) => setSettings((current) => ({ ...current, humanUsers: Math.min(50 - current.botUsers, Math.max(1, Number(event.target.value) || 1)) }))} className="mt-1.5 w-full rounded-lg border border-[#dfe5e1] px-3 py-2.5 font-normal text-ink" />
          </label>
          <label className="text-xs font-semibold text-[#43534a]">Scripted users
            <input type="number" min={0} max={50 - settings.humanUsers} value={settings.botUsers} onChange={(event) => setSettings((current) => ({ ...current, botUsers: Math.min(50 - current.humanUsers, Math.max(0, Number(event.target.value) || 0)) }))} className="mt-1.5 w-full rounded-lg border border-[#dfe5e1] px-3 py-2.5 font-normal text-ink" />
          </label>
          <label className="text-xs font-semibold text-[#43534a]">Test event seats
            <input type="number" min={1} max={50} value={settings.seatCount} onChange={(event) => setSettings((current) => ({ ...current, seatCount: Math.min(50, Math.max(1, Number(event.target.value) || 1)) }))} className="mt-1.5 w-full rounded-lg border border-[#dfe5e1] px-3 py-2.5 font-normal text-ink" />
          </label>
          <label className="text-xs font-semibold text-[#43534a]">Run duration
            <select value={settings.durationSeconds} onChange={(event) => setSettings((current) => ({ ...current, durationSeconds: Number(event.target.value) }))} className="mt-1.5 w-full rounded-lg border border-[#dfe5e1] px-3 py-2.5 font-normal text-ink">
              {[10, 15, 20, 25, 30, 35].map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds (max 35)</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#43534a]">Human-like polling
            <select value={settings.humanPollSeconds} onChange={(event) => setSettings((current) => ({ ...current, humanPollSeconds: Number(event.target.value) }))} className="mt-1.5 w-full rounded-lg border border-[#dfe5e1] px-3 py-2.5 font-normal text-ink">
              {[1, 2, 3, 5, 8].map((seconds) => <option key={seconds} value={seconds}>{seconds}s average</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#43534a]">Scripted polling
            <select value={settings.botPollSeconds} onChange={(event) => setSettings((current) => ({ ...current, botPollSeconds: Number(event.target.value) }))} className="mt-1.5 w-full rounded-lg border border-[#dfe5e1] px-3 py-2.5 font-normal text-ink">
              {[0.25, 0.5, 1, 2].map((seconds) => <option key={seconds} value={seconds}>{seconds}s interval</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f7f8f6] p-4">
          <p className="text-xs text-[#6c7772]">{settings.humanUsers + settings.botUsers} clients · isolated {settings.seatCount}-seat event · {settings.durationSeconds}s run</p>
          <button onClick={() => void runSimulation()} disabled={running} className="inline-flex items-center justify-center gap-2 rounded-lg bg-forest px-5 py-3 text-sm font-semibold text-white hover:bg-[#10553e] disabled:cursor-wait disabled:opacity-60">
            {running ? <LoaderCircle size={16} className="animate-spin" /> : <Play size={15} />}
            {running ? "Running local simulation…" : "Run simulation"}
          </button>
        </div>
        {runMessage && <p role="status" className="mt-3 rounded-lg bg-[#f0f7f2] p-3 text-xs text-[#216943]">{runMessage}</p>}
        <div className="mt-4 grid gap-3 text-xs leading-5 text-[#6c7772] sm:grid-cols-3">
          <p className="flex items-start gap-2"><Users size={15} className="mt-0.5 shrink-0 text-forest" />Human-like clients use slower, varied queue checks.</p>
          <p className="flex items-start gap-2"><Bot size={15} className="mt-0.5 shrink-0 text-[#a65b29]" />Scripted clients join and poll rapidly.</p>
          <p className="flex items-start gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-forest" />Each run uses temporary synthetic accounts and deletes its isolated event afterward.</p>
        </div>
        <p className="mt-4 rounded-lg bg-[#fcf7eb] p-3 text-[11px] leading-5 text-[#72500e]">Traffic stays inside this backend container. Limits are enforced by the API: one run at a time, at most 50 users, 50 seats and 35 seconds. This compares synthetic patterns; it cannot prove detection of real people or every bot.</p>
      </section>

      {error && <div role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><CircleAlert size={17} className="mt-0.5 shrink-0" />{error}</div>}
      {loading && <p className="mt-8 flex items-center gap-2 text-sm text-[#6c7772]"><LoaderCircle className="animate-spin" size={16} /> Loading saved runs…</p>}
      {!loading && !error && runs.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-[#cfd9d1] bg-white p-8 text-center">
          <Bot className="mx-auto text-forest" size={25} />
          <h2 className="mt-3 font-semibold">No simulations recorded yet</h2>
          <p className="mt-1 text-xs text-[#6c7772]">Use the controls above to start a bounded simulation. Aggregate results will appear here.</p>
        </div>
      )}

      {latest && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-[#7b8580]">Most recent k6 run</p><h2 className="mt-1 text-xl font-bold">{latest.event_name}</h2></div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${latest.status === "completed" ? "bg-[#eaf5ee] text-[#216943]" : "bg-[#fcf7eb] text-[#72500e]"}`}>
              {latest.status === "completed" ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
              {latest.status === "completed" ? "Run completed" : "Run incomplete"}
            </span>
          </div>

          <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Human-like admitted" value={`${latest.human_admitted} / ${latest.human_count}`} detail={`${humanRate}% of cohort`} />
            <Metric label="Scripted admitted" value={`${latest.bot_admitted} / ${latest.bot_count}`} detail={`${botRate}% of cohort`} />
            <Metric label="Average score gap" value={`${scoreGap > 0 ? "+" : ""}${scoreGap}`} detail={`${latest.human_average_score} human-like · ${latest.bot_average_score} scripted`} />
            <Metric label="Admission cap" value={`${latest.maximum_batch_admitted} / 15`} detail={`${latest.batch_count} batch${latest.batch_count === 1 ? "" : "es"} · ${latest.seat_count} test seats`} />
          </section>

          <section className="mt-4 rounded-2xl border border-[#e6eae6] bg-white p-5 shadow-card sm:p-6">
            <h3 className="text-sm font-bold">Observed admission rates</h3>
            <RateBar label="Human-like pattern" percent={humanRate} color="bg-forest" admitted={latest.human_admitted} total={latest.human_count} />
            <RateBar label="Scripted pattern" percent={botRate} color="bg-[#c67543]" admitted={latest.bot_admitted} total={latest.bot_count} />
            <div className={`mt-5 flex items-start gap-2 rounded-lg p-3 text-xs leading-5 ${invariantPassed ? "bg-[#f0f7f2] text-[#216943]" : "bg-[#fcf7eb] text-[#72500e]"}`}>
              {invariantPassed ? <CheckCircle2 className="mt-0.5 shrink-0" size={15} /> : <CircleAlert className="mt-0.5 shrink-0" size={15} />}
              <span>{invariantPassed ? "Observed API traffic had no request errors, and no batch exceeded 15 admission passes." : "Review this run: requests failed or the observed batch cap needs investigation."} A weighted lottery can admit scripted clients; cohort percentages vary from run to run.</span>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-[#e6eae6] bg-white shadow-card">
            <div className="border-b border-[#edf0ed] px-5 py-4"><h3 className="text-sm font-bold">Recent runs</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-[#fafbfa] text-[#7b8580]"><tr><th className="px-5 py-3 font-semibold">Completed at</th><th className="px-3 py-3 font-semibold">Human-like</th><th className="px-3 py-3 font-semibold">Scripted</th><th className="px-3 py-3 font-semibold">Avg scores</th><th className="px-3 py-3 font-semibold">Max / batch</th><th className="px-3 py-3 font-semibold">Requests</th><th className="px-5 py-3 font-semibold">Duration</th></tr></thead>
                <tbody>{runs.map((run) => (
                  <tr key={run.id} className="border-t border-[#f0f2f0]">
                    <td className="px-5 py-3 text-[#6c7772]">{formatDate(run.created_at)}</td>
                    <td className="px-3 py-3 font-semibold">{run.human_admitted}/{run.human_count}</td>
                    <td className="px-3 py-3 font-semibold">{run.bot_admitted}/{run.bot_count}</td>
                    <td className="px-3 py-3">{run.human_average_score} / {run.bot_average_score}</td>
                    <td className="px-3 py-3">{run.maximum_batch_admitted} / 15</td>
                    <td className="px-3 py-3">{run.request_count.toLocaleString()} <span className="text-[#7b8580]">({run.request_errors} errors)</span></td>
                    <td className="px-5 py-3">{run.duration_seconds}s</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <p className="flex items-center gap-2 border-t border-[#edf0ed] px-5 py-3 text-[10px] text-[#7b8580]"><Clock3 size={13} /> Reports are aggregate-only. Synthetic user accounts, queue entries and the isolated test event are deleted at the end of each run.</p>
          </section>
        </>
      )}
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="rounded-xl border border-[#e6eae6] bg-white p-4 shadow-card"><p className="text-[10px] font-bold uppercase tracking-wide text-[#7b8580]">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-[10px] leading-4 text-[#6c7772]">{detail}</p></article>;
}

function RateBar({ label, percent, color, admitted, total }: { label: string; percent: number; color: string; admitted: number; total: number }) {
  return (
    <div className="mt-5">
      <div className="flex justify-between gap-3 text-xs"><span className="font-medium">{label}</span><span className="text-[#6c7772]">{admitted}/{total} · {percent}%</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf0ed]"><div className={`h-full rounded-full ${color} transition-[width]`} style={{ width: `${Math.min(100, percent)}%` }} /></div>
    </div>
  );
}
