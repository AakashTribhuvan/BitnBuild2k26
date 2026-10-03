"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { api, getApiError, getString, isRecord } from "@/lib/api";

export function JoinQueueButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function joinQueue() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post<unknown>("/queue/join", { eventId });
      if (!isRecord(data)) throw new Error("The API response did not contain a queue entry.");
      const queueId = getString(data.queue_entry_id) ?? getString(data.entry_id) ?? getString(data.id);
      if (!queueId) throw new Error("The API accepted the request but did not return a queue entry ID.");
      window.sessionStorage.setItem(`fairdrop:queue:${eventId}`, queueId);
      router.push(`/events/${encodeURIComponent(eventId)}/queue?entry=${encodeURIComponent(queueId)}`);
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/events/${eventId}`)}`);
        return;
      }
      setError(getApiError(requestError));
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="inline-flex items-center gap-2 rounded-[9px] bg-forest px-5 py-3 text-sm font-semibold text-white hover:bg-[#10553e] disabled:cursor-wait disabled:opacity-60" onClick={joinQueue} disabled={busy}>
        {busy ? <><LoaderCircle size={16} className="animate-spin" /> Joining queue…</> : <>Join the fair queue <ArrowRight size={16} /></>}
      </button>
      {error && <p role="alert" className="mt-3 max-w-sm text-xs leading-5 text-red-700">{error}</p>}
    </div>
  );
}
