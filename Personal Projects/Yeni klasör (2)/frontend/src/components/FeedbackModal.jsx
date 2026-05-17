import { useState } from 'react';
import api from '../services/api';

export default function FeedbackModal({ ticket, onClose, onSaved }) {
  const [feedback, setFeedback] = useState(ticket.human_feedback || '');
  const [reviewer, setReviewer] = useState(ticket.reviewed_by || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/tickets/${ticket.id}/feedback`, {
        human_feedback: feedback,
        reviewed_by: reviewer,
      });
      onSaved();
      onClose();
    } catch (err) {
      alert('Kaydedilemedi: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Feedback Düzenle</h2>
            <p className="text-xs text-slate-400 mt-0.5">Ticket #{ticket.ticket_id}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Comment preview */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Orijinal Yorum</p>
            <p className="text-sm text-slate-700 leading-relaxed max-h-28 overflow-y-auto">
              {ticket.comment}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Feedback</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800
                         placeholder-slate-400 bg-white resize-none
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-colors"
              placeholder="Yorumunuzu yazın..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">İnceleyen</label>
            <input
              type="text"
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800
                         placeholder-slate-400 bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-colors"
              placeholder="Adınız Soyadınız"
            />
          </div>
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg
                       hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
          >
            {saving && (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
