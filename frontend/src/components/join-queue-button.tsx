"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { api, getApiError, getString, isRecord } from "@/lib/api";
import { TurnstileChallenge } from "@/components/turnstile-challenge";

export function JoinQueueButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [challengeKey, setChallengeKey] = useState(0);
  const mountedAt = useRef(Date.now());

  async function joinQueue() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post<unknown>("/queue/join", {
        eventId,
        captchaToken: captchaToken || undefined,
        activity: { activeSeconds: Math.floor((Date.now() - mountedAt.current) / 1000), manualRefreshes: 0 },
      });
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
      setCaptchaToken("");
      setChallengeKey((key) => key + 1);
      setBusy(false);
    }
  }

  return (
    <div>
      <TurnstileChallenge key={challengeKey} action="join_queue" onToken={setCaptchaToken} />
      <button className="inline-flex items-center gap-2 rounded-[9px] bg-forest px-5 py-3 text-sm font-semibold text-white hover:bg-[#10553e] disabled:cursor-wait disabled:opacity-60" onClick={joinQueue} disabled={busy}>
        {busy ? <><LoaderCircle size={16} className="animate-spin" /> Joining queue…</> : <>Join the fair queue <ArrowRight size={16} /></>}
      </button>
      {error && <p role="alert" className="mt-3 max-w-sm text-xs leading-5 text-red-700">{error}</p>}
      {error.toLowerCase().includes("google sign-in") && <Link href={`/login?next=${encodeURIComponent(`/events/${eventId}`)}`} className="mt-2 inline-flex text-xs font-semibold text-forest underline">Sign in with Google</Link>}
    </div>
  );
}
