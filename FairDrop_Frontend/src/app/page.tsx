import Link from "next/link";
import { ArrowRight, CircleDollarSign, LockKeyhole, ShieldCheck, Shuffle } from "lucide-react";
import { EventCatalog } from "@/components/event-catalog";

const principles = [
  { icon: Shuffle, title: "A fair place in line", copy: "Eligible fans are randomized at sale time. Refreshing faster won't move anyone forward." },
  { icon: LockKeyhole, title: "Seats held securely", copy: "Transactional reservations and automatic expiry protect real-time seat availability." },
  { icon: CircleDollarSign, title: "A clear mock checkout", copy: "Try the payment flow safely. No real card details and no live payment provider." },
];

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto mt-7 grid min-h-[386px] max-w-[1320px] overflow-hidden rounded-[22px] bg-[#163a2e] lg:grid-cols-[1.05fr_.95fr]">
        <div className="relative flex flex-col justify-center px-7 py-12 text-white sm:px-12 lg:px-14">
          <div className="hero-overlay absolute inset-0" />
          <div className="relative z-10">
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#d9f0e4]">A better way to get in</span>
            <h1 className="mt-5 text-[46px] font-extrabold leading-[1.02] tracking-[-2.6px] sm:text-[58px]">Good tickets.<br />Fair chances.</h1>
            <p className="mt-4 max-w-[470px] text-[15px] text-[#d1ded6]">Discover a calmer, fairer way to book the moments everyone wants to be part of.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/events" className="inline-flex items-center gap-2 rounded-[9px] bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10553e]">Explore experiences <ArrowRight size={16} /></Link>
              <Link href="/#how-it-works" className="rounded-[9px] border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15">How FairDrop works</Link>
            </div>
          </div>
        </div>
        <div role="img" aria-label="Fans enjoying a live concert" className="relative min-h-[255px] bg-cover bg-center lg:min-h-full" style={{ backgroundImage: 'url("/images/concert.jpg")' }}>
          <div className="photo-overlay absolute inset-0" />
          <div className="absolute bottom-7 left-7 right-7 text-white sm:bottom-10 sm:left-10">
            <p className="text-xl font-bold tracking-tight">Access, made fair.</p>
            <p className="mt-1 max-w-[330px] text-xs text-white/85">Randomized entry · secure seat holds · verified mock payments</p>
          </div>
        </div>
      </section>

      <section id="discover" className="mx-auto max-w-[1240px] px-5 pt-14 lg:px-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[11px] font-bold uppercase tracking-[.1em] text-forest">MADE FOR YOUR NEXT BIG MOMENT</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Find your next experience</h2></div>
          <Link href="/events" className="text-sm font-semibold text-forest hover:underline">All experiences <ArrowRight className="ml-1 inline" size={15} /></Link>
        </div>
        <EventCatalog />
      </section>

      <section id="how-it-works" className="mx-auto max-w-[1240px] px-5 pb-3 pt-16 lg:px-0">
        <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div><p className="text-[11px] font-bold uppercase tracking-[.1em] text-forest">BUILT FOR THE MOMENTS THAT MATTER</p><h2 className="mt-2 text-3xl font-bold leading-tight tracking-[-1px]">Fair by design.<br />Clear at every step.</h2><p className="mt-3 max-w-[410px] text-sm text-[#6c7772]">FairDrop puts a thoughtful experience around high-demand booking—and gives the server the final say on access, seats and payment.</p></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {principles.map(({ icon: Icon, title, copy }) => <article key={title} className="rounded-2xl border border-[#e6eae6] bg-white p-5 shadow-card"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eef4f0] text-forest"><Icon size={18} /></span><h3 className="mt-4 text-sm font-bold">{title}</h3><p className="mt-2 text-xs leading-5 text-[#6c7772]">{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section className="mx-auto mb-8 mt-12 max-w-[1240px] px-5 lg:px-0">
        <div className="flex flex-col gap-4 rounded-2xl border border-[#dfe8e1] bg-[#f0f6f1] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-3"><span className="mt-1 text-forest"><ShieldCheck size={21} /></span><div><h2 className="font-bold">Your place is yours.</h2><p className="mt-1 max-w-[670px] text-sm text-[#52665b]">Queue order, seat inventory, reservation limits and payment confirmation are all verified by the backend—not by the browser.</p></div></div>
          <Link href="/admin" className="shrink-0 text-sm font-semibold text-forest hover:underline">Operations overview <ArrowRight className="ml-1 inline" size={15} /></Link>
        </div>
      </section>
    </main>
  );
}
