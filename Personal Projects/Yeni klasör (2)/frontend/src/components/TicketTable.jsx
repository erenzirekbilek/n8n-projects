import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import FeedbackModal from './FeedbackModal';

const INTENT_STYLES = {
  approve:         'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  revise:          'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  scenario_other:  'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  general_inquiry: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  parse_error:     'bg-red-50 text-red-700 ring-1 ring-red-200',
  unknown:         'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

const SENTIMENT_CONFIG = {
  positive: { icon: '↑', cls: 'text-emerald-600 bg-emerald-50' },
  neutral:  { icon: '→', cls: 'text-slate-500 bg-slate-100' },
  negative: { icon: '↓', cls: 'text-red-600 bg-red-50' },
};

export default function TicketTable({ tickets, loading, pagination, onPageChange, onRefresh }) {
  const navigate = useNavigate();
  const [feedbackTicket, setFeedbackTicket] = useState(null);

  const columns = [
    {
      accessorKey: 'ticket_id',
      header: 'Ticket',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
          #{getValue()}
        </span>
      ),
    },
    {
      accessorKey: 'comment_preview',
      header: 'Yorum',
      cell: ({ row }) => (
        <div
          className="text-sm text-slate-700 truncate max-w-[240px] cursor-pointer hover:text-blue-600 transition-colors"
          title={row.original.comment}
          onClick={() => navigate(`/tickets/${row.original.id}`)}
        >
          {row.original.comment_preview || row.original.comment}
        </div>
      ),
    },
    {
      accessorKey: 'intent',
      header: 'Intent',
      cell: ({ getValue }) => {
        const v = getValue();
        return (
          <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${INTENT_STYLES[v] || INTENT_STYLES.unknown}`}>
            {v}
          </span>
        );
      },
    },
    {
      accessorKey: 'target',
      header: 'Target',
      cell: ({ getValue }) => {
        const v = getValue();
        return v
          ? <span className="text-xs text-slate-600 font-medium">{v}</span>
          : <span className="text-slate-300">—</span>;
      },
    },
    {
      accessorKey: 'sentiment',
      header: 'Sentiment',
      cell: ({ getValue }) => {
        const v = getValue();
        const cfg = SENTIMENT_CONFIG[v];
        return cfg ? (
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${cfg.cls}`}>
            <span>{cfg.icon}</span>
            {v}
          </span>
        ) : <span className="text-slate-400 text-xs">{v || '—'}</span>;
      },
    },
    {
      accessorKey: 'confidence',
      header: 'Güven',
      cell: ({ getValue }) => {
        const v = getValue() || 0;
        const pct = (v * 100).toFixed(0);
        const color = v >= 0.8
          ? 'text-emerald-600'
          : v < 0.5
            ? 'text-red-500'
            : 'text-amber-500';
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${v >= 0.8 ? 'bg-emerald-400' : v < 0.5 ? 'bg-red-400' : 'bg-amber-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`font-mono text-xs font-semibold ${color}`}>{pct}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'human_feedback',
      header: 'Feedback',
      cell: ({ row }) => {
        const hasFeedback = !!row.original.human_feedback;
        return (
          <button
            onClick={() => setFeedbackTicket(row.original)}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors
              ${hasFeedback
                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                : 'text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-600'
              }`}
          >
            {hasFeedback ? '✓ Var' : '+ Ekle'}
          </button>
        );
      },
    },
    {
      accessorKey: 'reviewed_by',
      header: 'İnceleyen',
      cell: ({ getValue }) => {
        const v = getValue();
        return v
          ? <span className="text-xs text-slate-600">{v}</span>
          : <span className="text-slate-300 text-xs">—</span>;
      },
    },
  ];

  const table = useReactTable({
    data: tickets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className={`px-4 py-3.5 flex gap-4 ${i > 0 ? 'border-t border-slate-50' : ''}`}>
            <div className="h-4 w-14 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 flex-1 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                {table.getHeaderGroups()[0].headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap bg-slate-50/50"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-slate-50 last:border-0 hover:bg-blue-50/30 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/20' : ''}`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                      </svg>
                      <span className="text-sm">Kayıt bulunamadı</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">{pagination.total}</span> kayıt
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => onPageChange(pagination.page - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500
                           hover:bg-white hover:border-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-xs text-slate-600 px-2 font-medium">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => onPageChange(pagination.page + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500
                           hover:bg-white hover:border-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {feedbackTicket && (
        <FeedbackModal
          ticket={feedbackTicket}
          onClose={() => setFeedbackTicket(null)}
          onSaved={onRefresh}
        />
      )}
    </>
  );
}
