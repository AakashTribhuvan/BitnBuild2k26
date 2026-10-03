"use client";
import { useState, useEffect } from 'react';

export default function CountdownTimer({ targetDate, onExpire }: { targetDate: Date, onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance <= 0) {
        clearInterval(timer);
        setTimeLeft(prev => ({ ...prev, expired: true }));
        if (onExpire) onExpire();
        return;
      }

      setTimeLeft({
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
        expired: false
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  if (timeLeft.expired) {
    return <span className="font-mono font-bold text-red-500">00:00:00</span>;
  }

  const format = (n: number) => n.toString().padStart(2, '0');

  return (
    <span className="font-mono font-bold tracking-wider">
      {format(timeLeft.hours)}:{format(timeLeft.minutes)}:{format(timeLeft.seconds)}
    </span>
  );
}
