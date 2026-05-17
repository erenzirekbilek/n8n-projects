import { useState } from 'react';

export default function SearchBar({ value, onChange }) {
  const [input, setInput] = useState(value || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onChange(input.trim());
  };

  const handleClear = () => {
    setInput('');
    onChange('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ticket ID veya yorum ara..."
          className="w-full border border-slate-200 rounded-lg pl-9 pr-9 py-2.5 text-sm text-slate-800
                     bg-white placeholder-slate-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-colors"
        />
        {input && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
      >
        Ara
      </button>
    </form>
  );
}
