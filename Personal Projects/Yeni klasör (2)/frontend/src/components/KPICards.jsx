const CARDS_CONFIG = [
  {
    label: 'Toplam Ticket',
    getValue: (s) => s.total_tickets,
    border: 'border-l-blue-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    valueColor: 'text-slate-900',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    label: 'İncelendi',
    getValue: (s) => `${s.reviewed_count} / ${s.total_tickets}`,
    border: 'border-l-emerald-500',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    valueColor: 'text-slate-900',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Bekleyen',
    getValue: (s) => s.pending_count,
    border: 'border-l-amber-500',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    valueColor: 'text-slate-900',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Ort. Güven',
    getValue: (s) => `${((s.avg_confidence || 0) * 100).toFixed(1)}%`,
    border: 'border-l-violet-500',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-500',
    valueColor: 'text-slate-900',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function KPICards({ stats }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 animate-pulse">
            <div className="h-3 w-20 bg-slate-200 rounded mb-4" />
            <div className="h-7 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS_CONFIG.map(({ label, getValue, border, iconBg, iconColor, valueColor, icon }) => (
        <div
          key={label}
          className={`bg-white rounded-xl border border-slate-100 shadow-sm p-5 border-l-4 ${border}`}
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{label}</p>
              <p className={`text-2xl font-bold mt-2 ${valueColor}`}>{getValue(stats)}</p>
            </div>
            <div className={`w-9 h-9 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0 ml-2`}>
              {icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
