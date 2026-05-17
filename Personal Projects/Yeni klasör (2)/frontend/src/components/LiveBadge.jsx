export default function LiveBadge({ connected, lastSync }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        ${connected
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-slate-700 text-slate-400 border border-slate-600'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
        {connected ? 'Canlı' : 'Bağlantı Yok'}
      </div>
      {lastSync && (
        <span className="text-slate-500 text-xs hidden lg:block">
          {lastSync.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}
