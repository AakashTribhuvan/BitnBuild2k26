import React from 'react';

interface QueueStatusProps {
  position: number;
  total: number;
  status: string;
}

export default function QueueStatus({ position, total, status }: QueueStatusProps) {
  const progress = Math.max(0, Math.min(100, 100 - (position / total) * 100));

  return (
    <div className="bg-gray-950 rounded-2xl p-6 border border-gray-800 relative overflow-hidden">
      <div className="absolute inset-0 bg-indigo-500/5 blur-3xl"></div>
      <div className="relative z-10">
        <h3 className="text-xl font-bold mb-4 text-center">Your Queue Position</h3>
        
        <div className="text-6xl font-black text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
          {status === 'admitted' ? 'Admitted' : position > 0 ? position.toLocaleString() : '--'}
        </div>

        <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
            style={{ width: `${status === 'admitted' ? 100 : progress}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>Back of queue</span>
          <span>Admitted</span>
        </div>
      </div>
    </div>
  );
}
