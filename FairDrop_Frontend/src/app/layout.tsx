import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FairDrop — Fair access to what matters",
    template: "%s — FairDrop",
  },
  description: "Discover live events, movies and journeys with fair queues, secure reservations and verified mock payments.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SiteHeader />
        {children}
        <footer className="mx-auto mt-20 max-w-[1240px] border-t border-[#e6eae6] px-5 py-7 text-xs text-[#6c7772] lg:px-0">
          <div className="flex flex-col justify-between gap-2 sm:flex-row">
            <span>FairDrop · A fairer way to book experiences.</span>
            <span>Mock payments only · No live payment provider connected</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
