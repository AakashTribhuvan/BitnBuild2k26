import React from 'react';

interface Seat {
  id: string;
  status: 'available' | 'held' | 'sold';
}

interface SeatGridProps {
  seats: Seat[];
  selectedSeat: string | null;
  onSeatClick: (id: string, status: string) => void;
}

export default function SeatGrid({ seats, selectedSeat, onSeatClick }: SeatGridProps) {
  // Assuming a grid of 20 rows x 25 cols = 500 seats
  // We'll just render them in a responsive grid
  
  const getSeatColor = (seat: Seat) => {
    if (selectedSeat === seat.id) return 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)] border-indigo-400 scale-110 z-10';
    if (seat.status === 'available') return 'bg-emerald-500/80 hover:bg-emerald-400 border-emerald-600 cursor-pointer';
    if (seat.status === 'held') return 'bg-yellow-500/50 border-yellow-600/50 cursor-not-allowed opacity-50';
    if (seat.status === 'sold') return 'bg-red-500/50 border-red-600/50 cursor-not-allowed opacity-30';
    return 'bg-gray-700';
  };

  return (
    <div className="flex justify-center">
      <div 
        className="grid gap-1 md:gap-2 p-4 bg-gray-950 rounded-xl border border-gray-800"
        style={{ gridTemplateColumns: 'repeat(25, minmax(0, 1fr))' }}
      >
        {seats.map((seat) => (
          <button
            key={seat.id}
            title={`${seat.id} - ${seat.status}`}
            onClick={() => onSeatClick(seat.id, seat.status)}
            disabled={seat.status !== 'available' && selectedSeat !== seat.id}
            className={`w-3 h-3 md:w-5 md:h-5 rounded-t-full rounded-b-sm border transition-all duration-200 ${getSeatColor(seat)}`}
          />
        ))}
      </div>
    </div>
  );
}
