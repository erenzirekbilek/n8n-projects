import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function useStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/api/stats');
      setStats(data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
