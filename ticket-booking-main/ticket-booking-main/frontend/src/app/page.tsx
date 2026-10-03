import Link from 'next/link';
import { Ticket, Clock, ShieldCheck, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 z-10">
          Fair Tickets for <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Real Fans</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 z-10">
          Beat the bots with our transparent queue system. 
          FairDrop ensures everyone gets an equal chance at attending their favorite events.
        </p>
        
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 w-full max-w-3xl z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-left">
            <h3 className="text-2xl font-bold text-white mb-2">The Eras Tour - Final Show</h3>
            <p className="text-gray-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Sale starts in 30 seconds
            </p>
            <p className="text-sm text-gray-500 mt-2">500 Seats Available • ₹500/ticket</p>
          </div>
          <Link 
            href="/waiting-room" 
            className="w-full md:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] whitespace-nowrap"
          >
            Join Waiting Room
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-950/50 border-t border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. Join the Queue</h3>
              <p className="text-gray-400">Register and enter the waiting room before the drop starts. Everyone gets a fair random spot.</p>
            </div>
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. Bot Protection</h3>
              <p className="text-gray-400">Our advanced systems verify you're a human, preventing scalpers from hoarding tickets.</p>
            </div>
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                <Ticket className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">3. Secure Your Seat</h3>
              <p className="text-gray-400">Once admitted, you have 10 minutes to select and purchase your tickets without stress.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
