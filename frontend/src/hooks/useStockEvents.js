import { useEffect } from 'react';
import { getSocket } from '../services/socket';

// Pasang listener stock:updated & stock:low_alert di komponen manapun
// Contoh: useStockEvents({ onUpdated: (data) => setStok(...), onLowAlert: (data) => toast(...) })
export function useStockEvents({ onUpdated, onLowAlert } = {}) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (onUpdated) socket.on('stock:updated', onUpdated);
    if (onLowAlert) socket.on('stock:low_alert', onLowAlert);

    return () => {
      if (onUpdated) socket.off('stock:updated', onUpdated);
      if (onLowAlert) socket.off('stock:low_alert', onLowAlert);
    };
  }, [onUpdated, onLowAlert]);
}
