import { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose }: { message: string, type?: 'info' | 'error' | 'success', onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    info: 'bg-blue-500',
    error: 'bg-red-500',
    success: 'bg-emerald-500'
  };

  return (
    <div className={`fixed bottom-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-up`}>
      {message}
    </div>
  );
}
