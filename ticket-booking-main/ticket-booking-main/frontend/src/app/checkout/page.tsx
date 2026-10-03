"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { CreditCard, ShieldCheck } from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer';

// Inner component that uses useSearchParams — must be wrapped in Suspense
function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get('reservationId');
  const seatId = searchParams.get('seatId');
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'error' | 'info' | 'success'} | null>(null);
  
  // 10 mins hold expiry
  const [holdExpiry] = useState(() => new Date(Date.now() + 10 * 60 * 1000));

  useEffect(() => {
    if (!seatId || !reservationId) {
      router.push('/seats');
    }
  }, [seatId, reservationId, router]);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Create payment intent
      const intentRes = await api.post('/payments/create-intent', { reservationId });
      
      // Simulate successful payment (mock mode for demo)
      await api.post('/payments/mock-success', { 
        payment_intent_id: intentRes.data?.payment_intent_id || `pi_demo_${Date.now()}`,
      });
      
      setToast({ msg: 'Payment successful! Redirecting...', type: 'success' });
      setTimeout(() => router.push(`/confirmation?reservationId=${reservationId}`), 1500);
    } catch (err: any) {
      setToast({ msg: err.response?.data?.message || 'Payment failed. Please try again.', type: 'error' });
      setLoading(false);
    }
  };

  if (!seatId || !reservationId) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4 flex justify-center">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-3xl font-bold mb-8">Checkout</h2>
          
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
            <h3 className="text-xl font-bold mb-4 border-b border-gray-800 pb-4">Order Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold">The Eras Tour - Final Show</div>
                  <div className="text-sm text-gray-400">Seat {seatId}</div>
                </div>
                <div className="font-bold">₹500.00</div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                <div className="text-gray-400">Taxes & Fees</div>
                <div className="font-bold">₹50.00</div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-800 text-lg">
                <div className="font-bold">Total</div>
                <div className="font-bold text-indigo-400">₹550.00</div>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-4 text-amber-500">
            <ShieldCheck className="w-6 h-6 shrink-0" />
            <div className="text-sm">
              Your seat is reserved for <CountdownTimer targetDate={holdExpiry} onExpire={() => router.push('/seats')} />. 
              Complete checkout before the timer expires.
            </div>
          </div>
        </div>

        <div>
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" /> Payment Details
            </h3>
            
            <div className="space-y-4 mb-8">
              {/* Demo payment form */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Card Number</label>
                <input type="text" placeholder="**** **** **** ****" className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Expiry</label>
                  <input type="text" placeholder="MM/YY" className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">CVC</label>
                  <input type="text" placeholder="***" className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Name on Card</label>
                <input type="text" placeholder="John Doe" className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>

            <button 
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner /> : 'Pay ₹550.00'}
            </button>
            <p className="text-center text-xs text-gray-500 mt-4">
              🔒 Payments are simulated for this demo. Do not use real card info.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense boundary (required by Next.js 15 for useSearchParams)
export default function Checkout() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
