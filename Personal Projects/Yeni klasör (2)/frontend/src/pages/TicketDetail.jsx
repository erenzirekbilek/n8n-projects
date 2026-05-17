import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import FeedbackModal from '../components/FeedbackModal';

const INTENT_STYLES = {
  approve:         'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  revise:          'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  scenario_other:  'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  general_inquiry: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  parse_error:     'bg-red-50 text-red-700 ring-1 ring-red-200',
  unknown:         'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);

  const fetchTicket = async () => {
    try {
      const { data } = await api.get(`/api/tickets/${id}`);
      setTicket(data);
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTicket(); }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm">Yükleniyor…</span>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const confidence = (ticket.confidence || 0) * 100;
  const confidenceColor = confidence >= 80 ? 'text-emerald-600' : confidence < 50 ? 'text-red-500' : 'text-amber-500';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 h-14 px-5 flex items-center gap-4 sticky top-0 z-30 shadow-md">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Geri
        </button>
        <div className="w-px h-4 bg-slate-700" />
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm">
            Ticket <span className="font-mono text-blue-400">#{ticket.ticket_id}</span>
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Metadata badges + comment */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-wrap gap-2 mb-5">
            <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${INTENT_STYLES[ticket.intent] || INTENT_STYLES.unknown}`}>
              {ticket.intent}
            </span>
            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 ring-1 ring-slate-200">
              {ticket.sentiment}
            </span>
            <span className={`px-3 py-1 rounded-lg text-xs font-semibold bg-slate-50 ring-1 ring-slate-200 ${confidenceColor}`}>
              Güven: {confidence.toFixed(0)}%
            </span>
            {ticket.target && (
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                {ticket.target}
              </span>
            )}
          </div>

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Yorum</p>
          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{ticket.comment}</p>
        </div>

        {/* Human feedback */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Human Feedback</h2>
            <button
              onClick={() => setShowFeedback(true)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {ticket.human_feedback ? 'Düzenle' : '+ Ekle'}
            </button>
          </div>

          {ticket.human_feedback ? (
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
              <p className="text-sm text-slate-700 leading-relaxed">{ticket.human_feedback}</p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-center">
              <p className="text-sm text-slate-400 italic">Henüz feedback eklenmemiş</p>
            </div>
          )}

          {ticket.reviewed_by && (
            <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              İnceleyen: <span className="font-medium text-slate-500">{ticket.reviewed_by}</span>
            </p>
          )}
        </div>

        {/* Feedback history */}
        {ticket.feedback_history?.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Feedback Geçmişi</h2>
            <div className="space-y-3">
              {ticket.feedback_history.map((log) => (
                <div key={log.id} className="border-l-2 border-slate-200 pl-4 py-1">
                  <p className="text-xs font-medium text-slate-600">
                    {log.changed_by}
                    <span className="font-normal text-slate-400 ml-2">
                      {new Date(log.changed_at).toLocaleString('tr-TR')}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1 italic">"{log.new_feedback}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meta info */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Sistem Bilgisi</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            {[
              ['Oluşturulma', new Date(ticket.created_at).toLocaleString('tr-TR')],
              ['Son sync', new Date(ticket.synced_at).toLocaleString('tr-TR')],
              ['Sheets satır', ticket.sheets_row_index],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-400">{k}</dt>
                <dd className="text-xs text-slate-600 font-medium mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </main>

      {showFeedback && (
        <FeedbackModal ticket={ticket} onClose={() => setShowFeedback(false)} onSaved={fetchTicket} />
      )}
    </div>
  );
}
