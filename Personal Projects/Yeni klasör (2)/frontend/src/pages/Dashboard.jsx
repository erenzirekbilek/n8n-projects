import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KPICards        from '../components/KPICards';
import IntentChart     from '../components/IntentChart';
import SentimentChart  from '../components/SentimentChart';
import ConfidenceChart from '../components/ConfidenceChart';
import TicketTable     from '../components/TicketTable';
import SearchBar       from '../components/SearchBar';
import FilterPanel     from '../components/FilterPanel';
import LiveBadge       from '../components/LiveBadge';
import { useTickets }  from '../hooks/useTickets';
import { useStats }    from '../hooks/useStats';
import { useRealtime } from '../hooks/useRealtime';
import api from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { tickets, pagination, filters, loading, updateFilter, resetFilters, refetch } = useTickets();
  const { stats, refetch: refetchStats } = useStats();
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const handleSyncComplete = useCallback((data) => {
    setSyncStatus(data);
    setSyncing(false);
    refetch();
    refetchStats();
    setTimeout(() => setSyncStatus(null), 5000);
  }, [refetch, refetchStats]);

  const handleTicketsUpdated = useCallback(() => {
    refetch();
    refetchStats();
  }, [refetch, refetchStats]);

  const handleFeedbackUpdated = useCallback(() => {
    refetch();
    refetchStats();
  }, [refetch, refetchStats]);

  const { connected, lastSync } = useRealtime({
    onSyncComplete: handleSyncComplete,
    onTicketsUpdated: handleTicketsUpdated,
    onFeedbackUpdated: handleFeedbackUpdated,
  });

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await api.post('/api/sync');
    } catch (err) {
      setSyncing(false);
      alert('Sync başarısız: ' + (err.response?.data?.error || err.message));
    }
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky top header */}
      <header className="bg-slate-900 h-14 px-5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight hidden sm:block">
            Ticket Intelligence
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LiveBadge connected={connected} lastSync={lastSync} />

          <div className="w-px h-4 bg-slate-700" />

          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg
                       hover:bg-slate-600 transition-colors font-medium disabled:opacity-60"
          >
            <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">{syncing ? 'Syncing…' : 'Sync'}</span>
          </button>

          <div className="w-px h-4 bg-slate-700" />

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center">
              <span className="text-xs text-slate-200 font-medium">
                {(user.name || user.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            <span className="text-slate-300 text-xs hidden md:block">{user.name || user.email}</span>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate('/login');
            }}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors px-1"
            title="Çıkış yap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Sync notification banner */}
      {syncStatus && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-sm text-emerald-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Sync tamamlandı —{' '}
          <span className="font-semibold">{syncStatus.added} eklendi</span>,{' '}
          <span className="font-semibold">{syncStatus.updated} güncellendi</span>
        </div>
      )}

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Page title row */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Ticket analiz ve izleme paneli</p>
        </div>

        {/* KPI Cards */}
        <KPICards stats={stats} />

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <IntentChart stats={stats} />
          <SentimentChart stats={stats} />
          <ConfidenceChart stats={stats} />
        </div>

        {/* Filter + Table */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-52 shrink-0">
            <FilterPanel filters={filters} onFilter={updateFilter} onReset={resetFilters} />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <SearchBar value={filters.search} onChange={(v) => updateFilter('search', v)} />
            <TicketTable
              tickets={tickets}
              loading={loading}
              pagination={pagination}
              onPageChange={(p) => updateFilter('page', p)}
              onRefresh={refetch}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
