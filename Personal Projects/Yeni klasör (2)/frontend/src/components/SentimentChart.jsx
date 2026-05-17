import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const COLORS = { positive: '#059669', neutral: '#94a3b8', negative: '#dc2626' };

export default function SentimentChart({ stats }) {
  if (!stats) return null;

  const data = [
    { name: 'Pozitif', value: Number(stats.sentiment_positive) || 0, key: 'positive' },
    { name: 'Nötr',    value: Number(stats.sentiment_neutral)  || 0, key: 'neutral' },
    { name: 'Negatif', value: Number(stats.sentiment_negative) || 0, key: 'negative' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Sentiment Dağılımı</h3>
      <p className="text-xs text-slate-400 mb-4">Yorum ton analizi sonuçları</p>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            cursor={{ fill: '#f8fafc' }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
