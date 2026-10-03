"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Search, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const navigation = [
  { label: "Discover", href: "/" },
  { label: "Live events", href: "/events" },
  { label: "Fair queue", href: "/#how-it-works" },
  { label: "How it works", href: "/#how-it-works" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const syncSession = () => setSignedIn(Boolean(window.localStorage.getItem("fairdrop:access-token")));
    syncSession();
    window.addEventListener("storage", syncSession);
    window.addEventListener("fairdrop:auth-change", syncSession);
    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("fairdrop:auth-change", syncSession);
    };
  }, []);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    window.location.href = query ? `/?q=${encodeURIComponent(query)}#discover` : "/#discover";
  }

  function signOut() {
    window.localStorage.removeItem("fairdrop:access-token");
    window.dispatchEvent(new Event("fairdrop:auth-change"));
    window.location.assign("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#e6eae6] bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[70px] max-w-[1320px] items-center gap-8 px-5 lg:px-10">
        <Link className="flex shrink-0 items-center gap-2.5 text-[20px] font-extrabold tracking-[-.7px]" href="/" aria-label="FairDrop home">
          <span className="grid h-[31px] w-[31px] place-items-center rounded-[9px] bg-forest text-[17px] text-white">F</span>
          FairDrop
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-6 text-[13px] text-[#66716c] lg:flex">
          {navigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("#")[0]) && item.href !== "/#how-it-works";
            return <Link className={`nav-link ${active ? "nav-link-active" : ""}`} href={item.href} key={item.href}>{item.label}</Link>;
          })}
        </nav>
        <form onSubmit={submitSearch} className="ml-auto hidden w-[225px] items-center gap-2 rounded-xl border border-[#e6eae6] bg-[#f8f9f7] px-3 py-2 text-[#6c7772] md:flex">
          <Search size={16} aria-hidden="true" />
          <input className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-[#858e89]" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find an experience" aria-label="Search experiences" />
        </form>
        {signedIn ? <button className="hidden items-center gap-1 text-[13px] font-semibold text-ink sm:flex" onClick={signOut}>Sign out</button> : <Link className="hidden items-center gap-1 text-[13px] font-semibold text-ink sm:flex" href="/login">Sign in <ArrowRight size={15} aria-hidden="true" /></Link>}
        <span className="hidden items-center gap-1.5 rounded-full bg-[#eef4f0] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[.06em] text-forest xl:flex"><ShieldCheck size={13} aria-hidden="true" /> Fair access</span>
      </div>
      <nav aria-label="Mobile navigation" className="flex gap-6 overflow-x-auto border-t border-[#f0f1ef] px-5 py-2.5 text-xs text-[#66716c] lg:hidden">
        {navigation.map((item) => <Link className={pathname === item.href ? "font-semibold text-forest" : ""} href={item.href} key={item.href}>{item.label}</Link>)}
        {signedIn ? <button className="font-semibold" onClick={signOut}>Sign out</button> : <Link className="font-semibold" href="/login">Sign in</Link>}
      </nav>
    </header>
  );
}
