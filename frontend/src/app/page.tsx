import Link from "next/link";
import { ArrowRight, Check, Database, LockKeyhole, ShieldCheck, Shuffle, Ticket, Workflow } from "lucide-react";
import { EventCatalog } from "@/components/event-catalog";

const principles = [
  { icon: Shuffle, title: "Fair admission", copy: "Randomized queue order and automatic batch admission help absorb sudden demand." },
  { icon: LockKeyhole, title: "Inventory integrity", copy: "Transactional seat holds and automatic expiry prevent two customers claiming one seat." },
  { icon: Database, title: "Server-owned outcomes", copy: "Queue status, reservations and payment confirmation are decided by the API, not the browser." },
];
const apiFlow = [
  { number: "01", icon: Workflow, title: "Connect a sale", copy: "Your storefront calls the FairDrop API when a high-demand release opens." },
  { number: "02", icon: Shuffle, title: "Control admission", copy: "The waiting room organizes demand and releases eligible customers in batches." },
  { number: "03", icon: LockKeyhole, title: "Reserve atomically", copy: "Customers select from live inventory; the API creates expiring, transactional holds." },
  { number: "04", icon: Check, title: "Confirm server-side", copy: "Order state is updated only after the backend verifies the payment result." },
];

type HomePageProps = { searchParams: Promise<{ q?: string }> };

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q = "" } = await searchParams;
  return (
    <main>
      <section aria-label="FairDrop platform overview" className="mx-auto mt-3 grid max-w-[1320px] gap-3 px-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div role="img" aria-label="A crowd at a live concert" className="hero-banner relative flex min-h-[290px] items-center overflow-hidden rounded-lg bg-cover bg-center sm:min-h-[310px]" style={{ backgroundImage: 'url("/images/concert.jpg")' }}>
          <div className="hero-overlay absolute inset-0" />
          <div className="relative z-10 max-w-[570px] px-6 py-9 text-white sm:px-10">
            <span className="inline-flex rounded-md bg-[#ed174c] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">FAIRDROP · COMMERCE INFRASTRUCTURE</span>
            <h1 className="mt-3 text-[34px] font-extrabold leading-[1.05] tracking-[-1.5px] sm:text-[42px]">High-demand sales.<br />Fair by design.</h1>
            <p className="mt-2 max-w-[440px] text-sm leading-5 text-white/85">An API-first queue and reservation layer for ticketing, travel and any launch where demand can overwhelm supply.</p>
            <Link href="/events" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#ed174c] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#d51040]">Explore demo scenarios <ArrowRight size={15} /></Link>
          </div>
        </div>

        <aside className="promo-panel relative flex min-h-[190px] flex-col justify-center overflow-hidden rounded-lg bg-cover bg-center p-5 text-white lg:min-h-[310px]" style={{ backgroundImage: 'url("/images/train.jpg")' }}>
          <div className="absolute inset-0 bg-gradient-to-r from-[#071321]/95 via-[#071321]/80 to-[#071321]/50" />
          <div className="relative">
            <p className="flex items-center gap-1.5 text-sm font-extrabold"><Ticket className="text-[#ff315e]" size={16} /> ONE API · MANY USE CASES</p>
            <h2 className="mt-4 text-xl font-extrabold leading-tight">Queue once.<br />Book with confidence.</h2>
            <ul className="mt-3 space-y-2 text-[11px] text-white/90">
              <li className="flex items-center gap-2"><Shuffle size={13} /> Events & ticket drops</li>
              <li className="flex items-center gap-2"><Ticket size={13} /> Coach & rail booking</li>
              <li className="flex items-center gap-2"><LockKeyhole size={13} /> Atomic inventory holds</li>
              <li className="flex items-center gap-2"><ShieldCheck size={13} /> Server-verified outcomes</li>
            </ul>
            <Link href="/#how-it-works" className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/60 px-3.5 py-1.5 text-[11px] font-semibold hover:bg-white/10">Explore the API flow <ArrowRight size={13} /></Link>
          </div>
        </aside>
      </section>

      <section id="discover" className="mx-auto max-w-[1320px] px-4 pt-5 sm:px-5">
        <EventCatalog key={q} homePage initialQuery={q} />
      </section>

      <section id="how-it-works" className="mx-auto max-w-[1320px] px-4 pb-3 pt-12 sm:px-5">
        <div className="rounded-2xl border border-[#e6eae6] bg-white p-6 shadow-card sm:p-9">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[.1em] text-forest">THE BOOKING FRONTEND IS A DEMO CLIENT</p>
            <h2 className="mt-2 text-2xl font-bold leading-tight tracking-[-1px] sm:text-3xl">A queueing and allocation API for demand spikes.</h2>
            <p className="mt-3 text-sm leading-6 text-[#6c7772]">FairDrop is designed as a backend layer that ticketing platforms, travel operators and event producers can integrate with their own storefronts. This site demonstrates the customer journey; the API remains authoritative for queue admission, inventory and reservation state.</p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {apiFlow.map(({ number, icon: Icon, title, copy }) => <article key={number} className="rounded-xl border border-[#e6eae6] bg-[#fafbfa] p-4"><div className="flex items-center justify-between"><span className="text-xs font-bold tracking-wider text-[#a0a8a3]">{number}</span><Icon size={18} className="text-forest" /></div><h3 className="mt-4 text-sm font-bold">{title}</h3><p className="mt-2 text-xs leading-5 text-[#6c7772]">{copy}</p></article>)}
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {principles.map(({ icon: Icon, title, copy }) => <article key={title} className="flex gap-3 rounded-xl bg-[#f7f8fa] p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff0f3] text-forest"><Icon size={18} /></span><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-[#6c7772]">{copy}</p></div></article>)}
          </div>
          <p className="mt-5 text-[11px] leading-5 text-[#89919c]">Prototype note: checkout currently uses a clearly labelled mock payment flow. No live payment provider is connected.</p>
        </div>
      </section>

      <section className="mx-auto mb-8 mt-8 max-w-[1320px] px-4 sm:px-5">
        <div className="flex flex-col gap-4 rounded-xl border border-[#f2dbe1] bg-[#fff6f8] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3"><span className="mt-1 text-forest"><ShieldCheck size={21} /></span><div><h2 className="font-bold">Built to plug into your booking experience.</h2><p className="mt-1 max-w-[670px] text-sm text-[#52665b]">This reference storefront showcases the customer experience. The FairDrop API handles queue state, capacity controls, transactional holds and operational visibility.</p></div></div>
          <Link href="/admin" className="shrink-0 text-sm font-semibold text-forest hover:underline">Explore operations view <ArrowRight className="ml-1 inline" size={15} /></Link>
        </div>
      </section>
    </main>
  );
}
