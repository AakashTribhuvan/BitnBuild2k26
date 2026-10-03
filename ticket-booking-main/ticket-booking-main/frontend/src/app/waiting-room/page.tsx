"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import CountdownTimer from '@/components/CountdownTimer';
import QueueStatus from '@/components/QueueStatus';
import Toast from '@/components/Toast';
import { Users, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { loadActiveEventId } from '@/lib/event';

export default function WaitingRoom() {
  const [saleStarted, setSaleStarted] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [queueData, setQueueData] = useState<any>(null);
  const [toast, setToast] = useState<{msg: string, type: 'error' | 'info' | 'success'} | null>(null);
  const [targetDate] = useState(() => new Date(Date.now() + 10000)); // 10 seconds for demo
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    loadActiveEventId().then(setEventId).catch(() => {
      setToast({ msg: 'Could not load the active event', type: 'error' });
    });
  }, [user]);

  const joinQueue = async () => {
    try {
      if (!eventId) throw new Error('No active event is available');
      const res = await api.post('/queue/join', { eventId });
      setInQueue(true);
      setQueueData(res.data);
      setToast({ msg: 'Successfully joined the queue', type: 'success' });
    } catch (err: any) {
      setToast({ msg: err.response?.data?.error || err.message || 'Failed to join queue', type: 'error' });
    }
  };

  useEffect(() => {
    if (!inQueue) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/queue/status', { params: { eventId } });
        setQueueData(res.data);
        if (res.data.status === 'admitted') {
          clearInterval(interval);
          setToast({ msg: 'You are admitted! Redirecting...', type: 'success' });
          setTimeout(() => router.push('/seats'), 1500);
        }
      } catch (err) {
        console.error('Queue polling failed', err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [inQueue, router, eventId]);

  if (!user) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center py-20 px-4">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-2xl text-center">
        <h1 className="text-3xl font-bold mb-2">The Eras Tour - Waiting Room</h1>
        <p className="text-gray-400 mb-8">Do not refresh this page. Your position is secured automatically.</p>

        {!saleStarted && !inQueue ? (
          <div className="mb-8">
            <h2 className="text-xl mb-4 text-gray-300">Sale starts in</h2>
            <div className="text-5xl text-indigo-400 mb-8">
              <CountdownTimer targetDate={targetDate} onExpire={() => setSaleStarted(true)} />
            </div>
            <button 
              disabled={!eventId}
              className="bg-gray-800 text-gray-500 font-bold py-3 px-8 rounded-xl cursor-not-allowed"
            >
              Queue Opens Soon
            </button>
          </div>
        ) : !inQueue ? (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-emerald-400 mb-6">The queue is open!</h2>
            <button 
              onClick={joinQueue}
              disabled={!eventId}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] text-lg"
            >
              Join Queue Now
            </button>
          </div>
        ) : (
          <div className="mb-8">
            <QueueStatus position={Number(queueData?.position) || 0} total={Number(queueData?.total_waiting) || 500} status={queueData?.status} />
            
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 flex items-center gap-4">
                <Users className="w-8 h-8 text-indigo-400" />
                <div className="text-left">
                  <div className="text-sm text-gray-400">Users Waiting</div>
                  <div className="text-xl font-bold">{queueData?.total_waiting || 0}</div>
                </div>
              </div>
              <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 flex items-center gap-4">
                <Clock className="w-8 h-8 text-purple-400" />
                <div className="text-left">
                  <div className="text-sm text-gray-400">Est. Wait Time</div>
                  <div className="text-xl font-bold">~{Math.ceil((queueData?.position || 0) / 100)} min</div>
                </div>
              </div>
            </div>
            
            {queueData?.status === 'admitted' && (
              <button 
                onClick={() => router.push('/seats')}
                className="mt-8 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-8 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all animate-pulse"
              >
                You're In! Select Your Seats
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
