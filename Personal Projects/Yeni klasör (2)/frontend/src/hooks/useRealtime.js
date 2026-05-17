import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useRealtime({ onSyncComplete, onTicketsUpdated, onFeedbackUpdated } = {}) {
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || window.location.origin);
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('sync:complete', (data) => {
      setLastSync(new Date(data.timestamp));
      onSyncComplete?.(data);
    });

    if (onTicketsUpdated)  socket.on('tickets:updated', onTicketsUpdated);
    if (onFeedbackUpdated) socket.on('ticket:feedback_updated', onFeedbackUpdated);

    return () => socket.disconnect();
  }, []);

  return { connected, lastSync, socket: socketRef.current };
}
