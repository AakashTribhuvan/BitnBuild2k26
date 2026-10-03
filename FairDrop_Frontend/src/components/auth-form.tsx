"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, LoaderCircle, ShieldCheck } from "lucide-react";
import { api, getApiError, getString, isRecord } from "@/lib/api";
import { GoogleSignIn } from "@/components/google-sign-in";

type Credentials = { email: string; password: string };

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Credentials>();

  async function onSubmit(credentials: Credentials) {
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const { data: authData } = await api.post<unknown>(endpoint, credentials);
      const { data } = mode === "register"
        ? await api.post<unknown>("/auth/login", credentials)
        : { data: authData };
      const token = isRecord(data) ? getString(data.token) ?? getString(data.access_token) : undefined;
      if (!token) throw new Error("Your account request completed, but the API did not return a FairDrop session token.");
      window.localStorage.setItem("fairdrop:access-token", token);
      window.dispatchEvent(new Event("fairdrop:auth-change"));
      const returnTo = new URLSearchParams(window.location.search).get("next");
      router.push(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
      router.refresh();
    } catch (requestError) {
      setError("root", { message: getApiError(requestError) });
    }
  }

  return (
    <section className="grid w-full max-w-[920px] overflow-hidden rounded-2xl border border-[#e6eae6] bg-white shadow-card md:grid-cols-[.9fr_1.1fr]">
      <div className="relative hidden min-h-[540px] flex-col justify-end overflow-hidden bg-[#163a2e] p-9 text-white md:flex">
        <div className="absolute inset-0 bg-gradient-to-t from-[#132d25] via-[#132d25]/45 to-transparent" />
        <div className="relative"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"><ShieldCheck size={22} /></span><h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight">Good to see you.<br />You&apos;re in good hands.</h1><p className="mt-3 text-sm leading-6 text-white/75">A fair place in line. A seat held just for you. A checkout with no surprises.</p></div>
      </div>
      <div className="p-6 sm:p-10">
        <Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-[#6c7772] hover:text-forest"><ArrowLeft size={14} /> Back to FairDrop</Link>
        <h2 className="mt-6 text-2xl font-bold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p className="mt-1 text-sm text-[#6c7772]">{mode === "login" ? "Sign in to join the queue and book fairly." : "One account for every fair shot."}</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold text-[#43534a]">Email address<input id="email-address" {...register("email", { required: "Enter your email address.", pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address." } })} type="email" autoComplete="email" className="mt-1.5 w-full rounded-lg border border-[#e1e6e2] px-3 py-2.5 text-sm outline-none focus:border-forest" placeholder="you@example.com" /></label>
          {errors.email && <p role="alert" className="-mt-3 text-xs text-red-700">{errors.email.message}</p>}
          <label className="block text-xs font-semibold text-[#43534a]">Password<input {...register("password", { required: "Enter your password.", minLength: { value: mode === "register" ? 8 : 1, message: "Use at least 8 characters." } })} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-1.5 w-full rounded-lg border border-[#e1e6e2] px-3 py-2.5 text-sm outline-none focus:border-forest" placeholder={mode === "register" ? "At least 8 characters" : "Your password"} /></label>
          {errors.password && <p role="alert" className="-mt-3 text-xs text-red-700">{errors.password.message}</p>}
          {errors.root && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{errors.root.message}</p>}
          <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10553e] disabled:opacity-60">{isSubmitting && <LoaderCircle size={15} className="animate-spin" />}{mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-[#929a95]"><span className="h-px flex-1 bg-[#e9ece9]" /> or continue with <span className="h-px flex-1 bg-[#e9ece9]" /></div>
        <GoogleSignIn />
        <p className="mt-5 text-center text-xs text-[#6c7772]">{mode === "login" ? "New to FairDrop?" : "Already have an account?"} <button className="font-semibold text-forest hover:underline" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create an account" : "Sign in"}</button></p>
        <p className="mt-5 text-center text-[10px] leading-4 text-[#8a938e]">Your password and Google identity are verified by the FairDrop API. Session tokens are issued server-side.</p>
      </div>
    </section>
  );
}
