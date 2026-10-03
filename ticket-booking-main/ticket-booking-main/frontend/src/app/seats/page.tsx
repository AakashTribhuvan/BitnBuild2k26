"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import SeatGrid from '@/components/SeatGrid';
import Toast from '@/components/Toast';
import { Clock } from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer';
import { getCurrentEventId } from '@/lib/event';

export default function Seats() {
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'error' | 'info' | 'success'} | null>(null);
  const router = useRouter();

  // 10 minute session timer
  const [sessionEnd] = useState(() => new Date(Date.now() + 10 * 60 * 1000));

  const fetchSeats = async (activeEventId: string) => {
    try {
      const res = await api.get('/seats', { params: { eventId: activeEventId } });
      setSeats(res.data);
    } catch (err: any) {
      setToast({ msg: err.response?.data?.error || 'Could not load seats', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const activeEventId = getCurrentEventId();
    setEventId(activeEventId);
    if (!activeEventId) {
      setLoading(false);
      return;
    }
    fetchSeats(activeEventId);
    const interval = setInterval(() => fetchSeats(activeEventId), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSeatClick = (seatId: string, status: string) => {
    if (status !== 'available') return;
    setSelectedSeat(prev => prev === seatId ? null : seatId);
  };

  const handleHoldSeat = async () => {
    if (!selectedSeat) return;
    setHolding(true);
    try {
      const result = await api.post('/seats/hold', { eventId, seatId: selectedSeat });
      setToast({ msg: 'Seat held successfully! Proceeding to checkout...', type: 'success' });
      setTimeout(() => router.push(`/checkout?reservationId=${result.data.id}&seatId=${selectedSeat}`), 1500);
    } catch (err: any) {
      setToast({ msg: err.response?.data?.error || 'Seat could not be held. It might be taken.', type: 'error' });
      if (eventId) fetchSeats(eventId);
    } finally {
      setHolding(false);
    }
  };

  if (loading) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">Loading seats...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 flex flex-col md:flex-row gap-8 max-w-7xl mx-auto">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex-1 bg-gray-900 rounded-2xl p-6 border border-gray-800 overflow-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Select Your Seat</h2>
        
        <div className="flex justify-center mb-10">
          <div className="w-3/4 h-12 bg-gradient-to-b from-indigo-500/20 to-transparent border-t-4 border-indigo-500 rounded-t-[50%] flex items-center justify-center">
            <span className="text-indigo-300 font-medium tracking-widest uppercase text-sm">Stage</span>
          </div>
        </div>

        <SeatGrid seats={seats} selectedSeat={selectedSeat} onSeatClick={handleSeatClick} />
        
        <div className="flex justify-center gap-6 mt-8">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-500"></div><span className="text-sm">Available</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-500"></div><span className="text-sm">Held</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-500"></div><span className="text-sm">Sold</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-indigo-500"></div><span className="text-sm">Selected</span></div>
        </div>
      </div>

      <div className="w-full md:w-80 flex flex-col gap-6">
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 text-center">
          <div className="text-gray-400 mb-2 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" /> Time Remaining
          </div>
          <div className="text-3xl text-red-400 mb-4">
            <CountdownTimer targetDate={sessionEnd} onExpire={() => router.push('/')} />
          </div>
          <p className="text-sm text-gray-500">Complete your selection before time expires.</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 flex-1">
          <h3 className="text-xl font-bold mb-4">Selection</h3>
          {selectedSeat ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-gray-950 p-4 rounded-xl border border-gray-800">
                <span className="text-gray-400">Seat</span>
                <span className="font-bold">{selectedSeat}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-950 p-4 rounded-xl border border-gray-800">
                <span className="text-gray-400">Price</span>
                <span className="font-bold">₹500</span>
              </div>
              
              <button
                onClick={handleHoldSeat}
                disabled={holding || !eventId}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                {holding ? 'Holding...' : 'Hold Seat & Continue'}
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-10">
              Click on an available seat to select it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
