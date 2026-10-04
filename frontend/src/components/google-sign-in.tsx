"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LoaderCircle, X } from "lucide-react";
import { api, getApiError, getString, isRecord } from "@/lib/api";
import { profileFromGoogleCredential, saveProfile } from "@/lib/session";

type GoogleCredentialResponse = { credential: string };
type GoogleIdentity = {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        context: "signin" | "signup";
        auto_select: false;
        button_auto_select: false;
        use_fedcm_for_button: false;
        callback(response: GoogleCredentialResponse): void;
      }): void;
      renderButton(parent: HTMLElement, options: {
        type: "standard";
        theme: "outline";
        size: "large";
        text: "continue_with" | "signup_with";
        shape: "rectangular";
        logo_alignment: "left";
        width: number;
      }): void;
    };
  };
};

declare global {
  interface Window { google?: GoogleIdentity }
}

export function GoogleSignIn({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const initialized = useRef(false);
  const fallbackStarted = useRef(false);
  const googleButton = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  async function continueWithDemo(reason: string) {
    if (fallbackStarted.current) return;
    fallbackStarted.current = true;
    setOpen(true);
    setAuthenticating(true);
    setError(`${reason} Starting a demo session…`);
    try {
      const { data } = await api.post<unknown>("/auth/demo");
      const token = isRecord(data) ? getString(data.token) : undefined;
      if (!token) throw new Error("The demo sign-in response did not include a FairDrop session token.");
      window.localStorage.setItem("fairdrop:access-token", token);
      saveProfile({ name: "Demo Account", isDemo: true });
      const returnTo = new URLSearchParams(window.location.search).get("next");
      router.push(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
      router.refresh();
    } catch (requestError) {
      fallbackStarted.current = false;
      setAuthenticating(false);
      setError(`${reason} Demo sign-in could not reach the FairDrop API: ${getApiError(requestError)}`);
    }
  }

  useEffect(() => {
    if (window.google?.accounts.id.renderButton) setReady(true);
  }, []);

  useEffect(() => {
    const buttonElement = googleButton.current;
    if (!ready || !clientId || !window.google || !buttonElement) return;
    try {
      if (!initialized.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          context: mode === "register" ? "signup" : "signin",
          auto_select: false,
          button_auto_select: false,
          use_fedcm_for_button: false,
          callback: (response) => {
            if (!response.credential) {
              void continueWithDemo("Google did not return a sign-in credential.");
              return;
            }
            setError("");
            setOpen(true);
            setAuthenticating(true);
            void api.post<unknown>("/auth/google", { credential: response.credential })
              .then(({ data }) => {
                const token = isRecord(data) ? getString(data.token) : undefined;
                if (!token) throw new Error("The sign-in response did not include a FairDrop session token.");
                window.localStorage.setItem("fairdrop:access-token", token);
                saveProfile(profileFromGoogleCredential(response.credential));
                const returnTo = new URLSearchParams(window.location.search).get("next");
                router.push(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
              })
              .catch((requestError: unknown) => {
                void continueWithDemo(`Google sign-in failed: ${getApiError(requestError)}.`);
              });
          },
        });
        initialized.current = true;
      }
      let lastWidth = 0;
      const renderButton = () => {
        const width = Math.floor(buttonElement.getBoundingClientRect().width);
        if (width < 120 || width === lastWidth) return;
        lastWidth = width;
        buttonElement.replaceChildren();
        window.google?.accounts.id.renderButton(buttonElement, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: mode === "register" ? "signup_with" : "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.min(400, width),
        });
      };
      renderButton();
      const resizeObserver = new ResizeObserver(renderButton);
      resizeObserver.observe(buttonElement);
      return () => resizeObserver.disconnect();
    } catch {
      setError("Google sign-in could not start. You can retry or continue with a demo account.");
    }
  }, [clientId, mode, ready, router]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !authenticating) setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [authenticating, open]);

  function focusEmailFallback() {
    document.getElementById("email-address")?.focus();
  }

  return (
    <div>
      {clientId ? (
        <>
          <Script
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
            onLoad={() => setReady(true)}
            onReady={() => setReady(true)}
            onError={() => setError("Google sign-in could not load. Click to retry or continue with a demo account.")}
          />
          <div
            ref={googleButton}
            className={`flex min-h-10 w-full justify-center ${authenticating ? "pointer-events-none opacity-60" : ""}`}
          />
          {!ready && <p className="text-center text-xs text-[#6c7772]">Loading Google sign-in…</p>}
        </>
      ) : (
        <p className="mb-2 text-center text-xs text-[#6c7772]">Google sign-in is not configured. Use the demo account or email sign-in.</p>
      )}
      {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-[#6c7772]">
        <button type="button" disabled={authenticating} onClick={() => { fallbackStarted.current = false; void continueWithDemo("Demo account selected."); }} className="font-semibold text-forest underline underline-offset-2 disabled:opacity-60">Continue with demo account</button>
        <span aria-hidden="true">·</span>
        <a href="#email-address" onClick={focusEmailFallback} className="font-semibold text-forest underline underline-offset-2">Use email and password</a>
      </div>
      {open && (
        <div
          className="auth-modal-backdrop fixed inset-0 z-[100] grid place-items-center bg-[#101820]/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !authenticating) setOpen(false); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="google-dialog-title" className="auth-modal-card w-full max-w-[420px] rounded-2xl border border-white/70 bg-white p-6 shadow-2xl sm:p-8">
            <button type="button" aria-label="Close Google sign-in" disabled={authenticating} onClick={() => setOpen(false)} className="float-right rounded-full p-2 text-[#7c858e] hover:bg-[#f2f4f3] disabled:opacity-50"><X size={18} /></button>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff0f3] text-[#ed174c]"><Check size={21} /></span>
            <h2 id="google-dialog-title" className="mt-5 text-xl font-bold tracking-tight">{authenticating ? "Verifying your sign-in" : "Continue securely with Google"}</h2>
            <p className="mt-2 text-sm leading-6 text-[#68727c]">{authenticating ? "FairDrop is confirming your identity and preparing your session." : "Choose your Google account to sign in without sharing your password with FairDrop."}</p>
            {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-800">{error}</p>}
            {authenticating ? (
              <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-[#f7f8f6] py-3 text-sm font-medium text-[#45515d]"><LoaderCircle size={16} className="animate-spin" /> Verifying with FairDrop</div>
            ) : (
              <p className="mt-6 rounded-lg bg-[#f7f8f6] px-4 py-3 text-center text-xs leading-5 text-[#45515d]">Google&apos;s secure account chooser will appear over this page. You won&apos;t be sent to a new tab.</p>
            )}
            <p className="mt-5 text-center text-[11px] text-[#8a939c]">Google is verified by FairDrop&apos;s API. If it fails, a separate demo session can be used.</p>
            <button type="button" disabled={authenticating} onClick={() => { fallbackStarted.current = false; void continueWithDemo("Demo account selected."); }} className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[#20c7c7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#17abab] disabled:opacity-60">Continue with demo account</button>
            <button type="button" onClick={() => { setOpen(false); focusEmailFallback(); }} className="mt-4 inline-flex w-full items-center justify-center gap-1 text-xs font-semibold text-forest hover:underline">Use email instead <ArrowRight size={13} /></button>
          </section>
        </div>
      )}
    </div>
  );
}
