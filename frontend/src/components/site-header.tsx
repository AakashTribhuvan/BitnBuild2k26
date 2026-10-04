"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, BusFront, CalendarDays, Clapperboard, MapPin, Music2, Search, Ticket, Train, Trophy, Drama, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { clearProfile, FairDropProfile, readProfile } from "@/lib/session";

const navigation = [
  { label: "Movies", href: "/events?q=Movies", icon: Clapperboard },
  { label: "Events", href: "/events?q=Live%20music", icon: CalendarDays },
  { label: "Plays", href: "/events?q=Theatre", icon: Drama },
  { label: "Sports", href: "/events?q=Sports", icon: Trophy },
  { label: "Bus", href: "/events?q=bus", icon: BusFront },
  { label: "Train", href: "/events?q=train", icon: Train },
  { label: "Concerts", href: "/events?q=Live%20music", icon: Music2 },
];

export function SiteHeader() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<FairDropProfile>();
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const syncSession = () => {
      const hasSession = Boolean(window.localStorage.getItem("fairdrop:access-token"));
      setSignedIn(hasSession);
      setProfile(hasSession ? readProfile() : undefined);
      if (!hasSession) setProfileOpen(false);
    };
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
    clearProfile();
    window.dispatchEvent(new Event("fairdrop:auth-change"));
    router.push("/");
  }

  const profileInitial = (profile?.name ?? profile?.email ?? "F").trim().charAt(0).toUpperCase() || "F";

  return (
    <header className="sticky top-0 z-40 border-b border-[#e9ebef] bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[54px] max-w-[1320px] items-center gap-5 px-4 sm:px-5">
        <Link className="flex shrink-0 items-center gap-2 text-[20px] font-extrabold tracking-[-.7px]" href="/" aria-label="FairDrop home">
          <Ticket className="text-[#ed174c]" size={26} strokeWidth={2.8} />
          FairDrop
        </Link>
        <form onSubmit={submitSearch} className="ml-2 hidden max-w-[520px] flex-1 items-center gap-2 rounded-full border border-[#e7e9ed] bg-[#f8f9fb] px-3 py-1.5 text-[#6c7772] sm:flex">
          <Search size={16} aria-hidden="true" />
          <input className="w-full bg-transparent text-[12px] text-ink outline-none placeholder:text-[#858e89]" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search movies, live events, travel and more" aria-label="Search experiences" />
        </form>
        <div className="ml-auto hidden shrink-0 items-center gap-5 text-[12px] text-[#252c38] md:flex">
          <span className="flex items-center gap-1.5 font-semibold"><MapPin size={14} /> Pune</span>
          <Link href="/#how-it-works" className="hover:text-[#ed174c]">How it works</Link>
          <Link href="/events" className="hover:text-[#ed174c]">All experiences</Link>
          <Link href="/live-operations" target="_blank" rel="noreferrer" className="hover:text-[#ed174c]">Live backend</Link>
          <Link href="/simulations" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[#ed174c]"><Bot size={13} /> Simulations</Link>
        </div>
        {signedIn ? (
          <div className="relative ml-auto shrink-0 md:ml-0">
            <button
              type="button"
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
              className={`grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-[#e1e6e2] text-sm font-bold transition-shadow hover:ring-2 hover:ring-[#f5b4c2] ${profile?.isDemo ? "bg-[#20c7c7] text-white" : "bg-[#f2f4f3] text-[#47535f]"}`}
            >
              {profile?.isDemo ? "A" : profile?.picture ? <img src={profile.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : profile?.name || profile?.email ? profileInitial : <UserRound size={17} />}
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-[#e6eae6] bg-white p-3 shadow-xl">
                <div className="border-b border-[#edf0ed] px-2 pb-3">
                  <p className="truncate text-sm font-semibold text-[#1c2637]">{profile?.isDemo ? "Demo Account" : profile?.name ?? "FairDrop member"}</p>
                  {profile?.email && <p className="mt-0.5 truncate text-xs text-[#6c7772]">{profile.email}</p>}
                  {profile?.isDemo && <p className="mt-1 text-[11px] text-[#6c7772]">Demo session · no Google account linked</p>}
                </div>
                <button type="button" onClick={signOut} className="mt-2 w-full rounded-lg px-2 py-2 text-left text-sm font-medium text-[#34404b] hover:bg-[#f7f8f6]">Sign out</button>
              </div>
            )}
          </div>
        ) : <Link className="ml-auto shrink-0 rounded-md bg-[#ed174c] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#d51040] md:ml-0" href="/login">Sign in / Register <ArrowRight className="ml-1 inline" size={12} aria-hidden="true" /></Link>}
      </div>
      <nav aria-label="Browse categories" className="flex gap-6 overflow-x-auto border-t border-[#f0f1f3] px-4 text-[11px] text-[#343b47] sm:px-5">
        {navigation.map(({ icon: Icon, ...item }) => <Link className="nav-link" href={item.href} key={item.label}><Icon className="mr-1.5 sm:hidden" size={14} />{item.label}</Link>)}
      </nav>
    </header>
  );
}
