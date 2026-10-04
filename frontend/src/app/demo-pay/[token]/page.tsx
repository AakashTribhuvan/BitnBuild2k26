"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { api, getApiError, isRecord } from "@/lib/api";

type ScanStatus = "processing" | "confirmed" | "failed";

export default function DemoPaymentScanPage({ params }: { params: Promise<{ token: string }> }) {
  const [status, setStatus] = useState<ScanStatus>("processing");
  const [message, setMessage] = useState("Completing your clearly labeled FairDrop payment simulation…");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let active = true;

    async function completeDemoPayment() {
      try {
        const { token } = await params;
        const { data } = await api.post<unknown>(`/payments/mock-scan/${encodeURIComponent(token)}`);
        if (!isRecord(data) || data.success !== true || data.simulated !== true) {
          throw new Error("FairDrop did not confirm the demo payment.");
        }
        if (active) {
          setStatus("confirmed");
          setMessage("The demo booking is confirmed. No money was transferred.");
        }
      } catch (requestError) {
        if (active) {
          setStatus("failed");
          setMessage(getApiError(requestError));
        }
      }
    }

    void completeDemoPayment();
    return () => {
      active = false;
    };
  }, [params]);

  return (
    <main className="mx-auto flex min-h-[75vh] max-w-xl items-center px-5 py-12">
      <section className="w-full rounded-2xl border border-[#e6eae6] bg-white p-7 text-center shadow-card sm:p-10">
        <p className="text-[11px] font-bold uppercase tracking-[.1em] text-forest">FAIRDROP · PAYMENT SIMULATION</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">UPI-style demo checkout</h1>
        <div className="mt-6 rounded-xl border border-[#f0dfc6] bg-[#fff9ef] p-4 text-left text-sm leading-6 text-[#72500e]">
          This is a simulation only. It is not connected to UPI, a bank, or a payment provider. No money is requested or transferred.
        </div>
        <div role="status" aria-live="polite" className="mt-7">
          {status === "processing" && <LoaderCircle size={30} className="mx-auto animate-spin text-forest" />}
          {status === "confirmed" && <CheckCircle2 size={34} className="mx-auto text-[#216943]" />}
          {status === "failed" && <TriangleAlert size={32} className="mx-auto text-[#a33b32]" />}
          <p className="mt-3 text-sm font-semibold text-ink">
            {status === "processing" ? "Processing demo payment" : status === "confirmed" ? "Demo payment complete" : "Could not complete the simulation"}
          </p>
          <p className="mt-2 break-words text-xs leading-5 text-[#6c7772]">{message}</p>
        </div>
        <Link href="/" className="mt-7 inline-flex rounded-lg bg-forest px-5 py-3 text-sm font-semibold text-white hover:bg-[#10553e]">
          Return to FairDrop
        </Link>
        <p className="mt-5 text-[10px] leading-4 text-[#8a938e]">Your checkout device will update after FairDrop verifies the reservation.</p>
      </section>
    </main>
  );
}
