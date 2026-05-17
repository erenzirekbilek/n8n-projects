import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const DEFAULT_FILTERS = {
  page: 1,
  limit: 50,
  search: '',
  intent: '',
  sentiment: '',
  target: '',
  confidence_min: '',
  confidence_max: '',
  is_reviewed: '',
  exclude_parse_errors: false,
  sort_by: 'created_at',
  sort_order: 'DESC',
};

export function useTickets() {
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 0 });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== '' && v !== false && v !== null && v !== undefined) params[k] = v;
      });
      const { data } = await api.get('/api/tickets', { params });
      setTickets(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Tickets fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key === 'page' ? value : 1 }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return { tickets, pagination, filters, loading, updateFilter, resetFilters, refetch: fetchTickets };
}
