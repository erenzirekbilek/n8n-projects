import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  approve:         '#059669',
  revise:          '#d97706',
  scenario_other:  '#7c3aed',
  general_inquiry: '#2563eb',
};

export default function IntentChart({ stats }) {
  if (!stats) return null;

  const data = [
    { name: 'Approve',  value: Number(stats.intent_approve)   || 0, key: 'approve' },
    { name: 'Revise',   value: Number(stats.intent_revise)    || 0, key: 'revise' },
    { name: 'Scenario', value: Number(stats.intent_scenario)  || 0, key: 'scenario_other' },
    { name: 'Inquiry',  value: Number(stats.intent_inquiry)   || 0, key: 'general_inquiry' },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Intent Dağılımı</h3>
      <p className="text-xs text-slate-400 mb-4">Ticket niyetlerinin dağılımı</p>
      <ResponsiveContainer width="100%" height={190}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={68}
            innerRadius={30}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key] || '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
