const INTENTS = ['', 'approve', 'revise', 'scenario_other', 'general_inquiry', 'parse_error', 'unknown'];
const SENTIMENTS = ['', 'positive', 'neutral', 'negative'];

const selectClass =
  'w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-700 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
  'transition-colors appearance-none cursor-pointer';

const inputClass =
  'w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-700 bg-white ' +
  'placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
  'transition-colors';

function FilterLabel({ children }) {
  return (
    <label className="block text-xs font-medium text-slate-500 mb-1.5">{children}</label>
  );
}

function SelectWrapper({ children }) {
  return (
    <div className="relative">
      {children}
      <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export default function FilterPanel({ filters, onFilter, onReset }) {
  const hasActiveFilters = filters.intent || filters.sentiment || filters.is_reviewed ||
    filters.confidence_min || filters.confidence_max || filters.exclude_parse_errors === 'true';

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Filtreler</span>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Temizle
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <FilterLabel>Intent</FilterLabel>
          <SelectWrapper>
            <select
              value={filters.intent}
              onChange={(e) => onFilter('intent', e.target.value)}
              className={selectClass}
            >
              {INTENTS.map(i => (
                <option key={i} value={i}>{i || 'Tümü'}</option>
              ))}
            </select>
          </SelectWrapper>
        </div>

        <div>
          <FilterLabel>Sentiment</FilterLabel>
          <SelectWrapper>
            <select
              value={filters.sentiment}
              onChange={(e) => onFilter('sentiment', e.target.value)}
              className={selectClass}
            >
              {SENTIMENTS.map(s => (
                <option key={s} value={s}>{s || 'Tümü'}</option>
              ))}
            </select>
          </SelectWrapper>
        </div>

        <div>
          <FilterLabel>İnceleme Durumu</FilterLabel>
          <SelectWrapper>
            <select
              value={filters.is_reviewed}
              onChange={(e) => onFilter('is_reviewed', e.target.value)}
              className={selectClass}
            >
              <option value="">Tümü</option>
              <option value="true">İncelendi</option>
              <option value="false">Bekliyor</option>
            </select>
          </SelectWrapper>
        </div>

        <div>
          <FilterLabel>Güven Aralığı</FilterLabel>
          <div className="flex gap-2">
            <input
              type="number" step="0.1" min="0" max="1" placeholder="Min"
              value={filters.confidence_min}
              onChange={(e) => onFilter('confidence_min', e.target.value)}
              className={inputClass}
            />
            <input
              type="number" step="0.1" min="0" max="1" placeholder="Max"
              value={filters.confidence_max}
              onChange={(e) => onFilter('confidence_max', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              id="exclude_parse"
              checked={filters.exclude_parse_errors === 'true'}
              onChange={(e) => onFilter('exclude_parse_errors', e.target.checked ? 'true' : false)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
          <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors select-none">
            Parse error'ları gizle
          </span>
        </label>
      </div>
    </div>
  );
}
