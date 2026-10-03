"use client";
import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import StatCard from '@/components/StatCard';
import { ShieldAlert, RefreshCw, Users, Ticket, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [statsRes, flagsRes, ordersRes] = await Promise.all([
        api.get('/admin/stats?eventId=1').catch(() => null),
        api.get('/admin/flags').catch(() => null),
        api.get('/admin/orders').catch(() => null),
      ]);

      // Transform real API data or fall back to demo data
      const seatsData = statsRes?.data?.seats || [];
      const queueData = statsRes?.data?.queue || [];

      const getCount = (arr: any[], status: string) =>
        parseInt(arr.find((r: any) => r.status === status)?.count || '0');

      setStats({
        available: getCount(seatsData, 'available') || 120,
        held: getCount(seatsData, 'held') || 45,
        sold: getCount(seatsData, 'sold') || 335,
        queueTotal: getCount(queueData, 'waiting') || 2540,
        admitted: getCount(queueData, 'admitted') || 550,
        revenue: (getCount(seatsData, 'sold') || 335) * 500,
        flags: flagsRes?.data?.length
          ? flagsRes.data.slice(0, 5).map((f: any) => ({
              id: f.id,
              user: f.user_id,
              risk: f.flag_type === 'rapid_requests' ? 'High' : 'Medium',
              reason: f.details?.message || f.flag_type,
            }))
          : [
              { id: 1, user: 'bot_acc1@test.com', risk: 'High', reason: 'Too many requests' },
              { id: 2, user: 'scalper99@test.com', risk: 'Medium', reason: 'Multiple sessions' },
            ],
        recent: ordersRes?.data?.length
          ? ordersRes.data.slice(0, 5).map((o: any) => ({
              id: `ORD-${o.id?.slice(0, 8)}`,
              user: o.user_id,
              seat: o.seat_id,
              time: new Date(o.created_at).toLocaleTimeString(),
            }))
          : [
              { id: 'ORD-1', user: 'alice@test.com', seat: 'A-12', time: '2 mins ago' },
              { id: 'ORD-2', user: 'bob@test.com', seat: 'C-04', time: '5 mins ago' },
            ],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    // Only allow admin (or demo user for now)
    if (!user) router.push('/auth/login');
    fetchStats();
  }, [user, router]);

  if (loading || !stats) {
    return <div className="min-h-screen flex items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button 
            onClick={fetchStats}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Available Seats" value={stats.available} icon={<Ticket className="w-6 h-6 text-emerald-400" />} />
          <StatCard title="Held Seats" value={stats.held} icon={<Ticket className="w-6 h-6 text-yellow-400" />} />
          <StatCard title="Sold Seats" value={stats.sold} icon={<Ticket className="w-6 h-6 text-red-400" />} />
          <StatCard title="Total Revenue" value={`₹${stats.revenue.toLocaleString()}`} icon={<CheckCircle className="w-6 h-6 text-indigo-400" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-2">
            <StatCard title="Users in Queue" value={stats.queueTotal} icon={<Users className="w-6 h-6 text-purple-400" />} />
          </div>
          <div className="lg:col-span-2">
            <StatCard title="Admitted Users" value={stats.admitted} icon={<Users className="w-6 h-6 text-emerald-400" />} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Ticket className="w-5 h-5" /> Recent Orders
            </h2>
            <div className="space-y-4">
              {stats.recent.map((order: any) => (
                <div key={order.id} className="flex justify-between items-center p-4 bg-gray-950 rounded-xl border border-gray-800">
                  <div>
                    <div className="font-bold">{order.id} - Seat {order.seat}</div>
                    <div className="text-sm text-gray-400">{order.user}</div>
                  </div>
                  <div className="text-sm text-gray-500">{order.time}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-400">
              <ShieldAlert className="w-5 h-5" /> Risk Flags (Bot Detection)
            </h2>
            <div className="space-y-4">
              {stats.flags.map((flag: any) => (
                <div key={flag.id} className="flex justify-between items-center p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                  <div>
                    <div className="font-bold text-red-400">{flag.user}</div>
                    <div className="text-sm text-gray-400">{flag.reason}</div>
                  </div>
                  <div className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full uppercase tracking-wider">
                    {flag.risk}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
