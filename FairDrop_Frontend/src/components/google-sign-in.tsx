"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getApiError, getString, isRecord } from "@/lib/api";

type GoogleCredentialResponse = { credential: string };
type GoogleIdentity = {
  accounts: {
    id: {
      initialize(options: { client_id: string; callback(response: GoogleCredentialResponse): void }): void;
      renderButton(element: HTMLElement, options: { theme: string; size: string; shape: string; width: number }): void;
    };
  };
};

declare global {
  interface Window { google?: GoogleIdentity }
}

export function GoogleSignIn() {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!ready || !clientId || !buttonRef.current || !window.google) return;
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (!response.credential) {
            setError("Google did not return a sign-in credential. Use email and password instead, or try again.");
            return;
          }
          void api.post<unknown>("/auth/google", { credential: response.credential })
            .then(({ data }) => {
              const token = isRecord(data) ? getString(data.token) : undefined;
              if (!token) throw new Error("The sign-in response did not include a FairDrop session token.");
              window.localStorage.setItem("fairdrop:access-token", token);
              window.dispatchEvent(new Event("fairdrop:auth-change"));
              const returnTo = new URLSearchParams(window.location.search).get("next");
              router.push(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
            })
            .catch((requestError: unknown) => setError(getApiError(requestError)));
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, { theme: "outline", size: "large", shape: "rectangular", width: 320 });
    } catch {
      setError("Google sign-in could not start. Use email and password instead, or try again.");
    }
  }, [clientId, ready, router]);

  function focusEmailFallback() {
    document.getElementById("email-address")?.focus();
  }

  if (!clientId) {
    return (
      <div className="rounded-lg bg-[#f7f8f6] p-3 text-center text-xs text-[#6c7772]">
        <p>Google sign-in isn&apos;t configured. Continue with email and password.</p>
        <a href="#email-address" onClick={focusEmailFallback} className="mt-2 inline-block font-semibold text-forest underline underline-offset-2">Use email and password</a>
      </div>
    );
  }

  return (
    <div>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
        onError={() => setError("Google sign-in could not load. Use email and password instead, or try again.")}
      />
      <div ref={buttonRef} className="flex min-h-[42px] justify-center" />
      {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      <p className="mt-2 text-center text-xs text-[#6c7772]">
        Google not working?{" "}
        <a href="#email-address" onClick={focusEmailFallback} className="font-semibold text-forest underline underline-offset-2">Use email and password instead</a>
      </p>
    </div>
  );
}
