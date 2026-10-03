"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Download, Calendar, MapPin, User as UserIcon, Ticket } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { api } from '@/lib/api';

type Reservation = {
  id: string;
  status: string;
  seat_id: string;
};

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get('reservationId');
  const { user } = useAuth();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!reservationId) {
      setError('No reservation was provided.');
      setLoading(false);
      return;
    }
    api.get(`/reservations/${reservationId}`).then((response) => {
      if (response.data.status !== 'confirmed') {
        setError('This reservation is not confirmed.');
        return;
      }
      setReservation(response.data);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }).catch((requestError) => {
      setError(requestError.response?.data?.error || 'Could not verify this reservation.');
    }).finally(() => setLoading(false));
  }, [reservationId]);

  if (loading) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><LoadingSpinner /></div>;
  }

  if (error || !reservation) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold">Reservation not confirmed</h1>
        <p className="text-gray-400">{error || 'The reservation could not be verified.'}</p>
        <Link href="/waiting-room" className="text-indigo-400 hover:text-indigo-300">Return to the waiting room</Link>
      </div>
    );
  }

  const orderId = reservation.id.toUpperCase();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* CSS Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none flex justify-center z-50">
           <div className="absolute top-10 text-4xl animate-bounce">🎉 Congratulations! 🎉</div>
        </div>
      )}

      <div className="max-w-2xl w-full bg-gray-900 border border-gray-800 rounded-3xl p-8 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-emerald-500/20 to-transparent"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-gray-400 mb-8">Your ticket is confirmed and ready.</p>

          <div className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-6 text-left relative overflow-hidden mb-8">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">The Eras Tour - Final Show</h3>
                <span className="text-xs font-mono bg-gray-800 text-gray-300 px-2 py-1 rounded">Order #{orderId}</span>
              </div>
              <div className="bg-indigo-600/20 text-indigo-400 p-3 rounded-xl border border-indigo-500/30">
                <Ticket className="w-6 h-6" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500 flex items-center gap-1 mb-1"><UserIcon className="w-3 h-3" /> Attendee</div>
                <div className="font-medium">{user?.email || 'Guest'}</div>
              </div>
              <div>
                <div className="text-gray-500 flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" /> Seat</div>
                <div className="font-bold text-emerald-400 text-lg">{reservation.seat_id}</div>
              </div>
              <div className="col-span-2">
                <div className="text-gray-500 flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> Date & Time</div>
                <div className="font-medium">Dec 31, 2024 • 8:00 PM IST</div>
              </div>
            </div>
            
            {/* Barcode mock */}
            <div className="mt-8 pt-6 border-t border-gray-800 border-dashed flex flex-col items-center">
              <div className="w-full max-w-xs h-16 bg-white/10 rounded flex items-center justify-between px-2 mb-2">
                {Array.from({length: 40}).map((_, i) => (
                  <div key={i} className="bg-white h-12" style={{ width: i % 3 === 0 ? '2px' : '4px', opacity: 0.5 + (i % 5) * 0.1 }}></div>
                ))}
              </div>
              <div className="font-mono text-xs tracking-widest text-gray-500">{orderId}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button 
              onClick={() => alert("Downloading ticket... (Demo)")}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Ticket
            </button>
            <Link 
              href="/"
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Confirmation() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}

