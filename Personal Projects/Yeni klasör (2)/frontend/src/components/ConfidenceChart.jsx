import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const COLORS = ['#059669', '#f59e0b', '#ef4444'];

export default function ConfidenceChart({ stats }) {
  if (!stats) return null;

  const high = Number(stats.high_confidence_count) || 0;
  const low  = Number(stats.low_confidence_count)  || 0;
  const mid  = Math.max(0, Number(stats.total_tickets) - high - low);

  const data = [
    { name: 'Yüksek', sub: '≥0.8', value: high },
    { name: 'Orta',   sub: '0.5–0.8', value: mid },
    { name: 'Düşük',  sub: '<0.5', value: low },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Güven Dağılımı</h3>
      <p className="text-xs text-slate-400 mb-4">AI sınıflandırma güven skorları</p>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            cursor={{ fill: '#f8fafc' }}
            formatter={(value, name, props) => [value, `${props.payload.name} (${props.payload.sub})`]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
