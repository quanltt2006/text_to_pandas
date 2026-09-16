import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { Table2, BarChart3, PieChart as PieIcon } from 'lucide-react';

interface ExecutiveResultProps {
  tableData?: { headers: string[]; rows: string[][] };
  chartData?: { labels: string[]; values: number[]; chartType: 'bar' | 'line' | 'pie' };
  type?: 'rag' | 'code-gen' | 'general';
}

const COLORS = ['#FFC700', '#0B3BFF', '#E63B2E', '#111111', '#10B981', '#8B5CF6', '#F59E0B'];

export default function ExecutiveResult({ tableData, chartData, type }: ExecutiveResultProps) {
  if (!tableData && !chartData) return null;

  const chartDataFormatted = chartData?.labels.map((label, i) => ({
    name: label,
    value: chartData.values[i],
  })) || [];

  return (
    <div className="border-2 border-black bg-[#F0ECE4] p-3.5 flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1 font-mono text-[11px] font-bold uppercase">
        <span>KẾT QUẢ THỰC THI (EXECUTION OUTPUT):</span>
        <span className="text-emerald-700 bg-white px-2 py-0.5 border border-black">
          {type === 'code-gen' ? 'PANDAS KERNEL OK' : 'RAG RETRIEVAL OK'}
        </span>
      </div>

      {tableData && (
        <div className="overflow-x-auto border border-black bg-white">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="bg-[#E5E2DC] border-b border-black">
              <tr>
                {tableData.headers.map((h, i) => (
                  <th key={i} className="p-1.5 border-r border-black font-bold uppercase text-[10px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.rows.slice(0, 8).map((r, ri) => (
                <tr key={ri} className="border-b border-neutral-300 hover:bg-[#FAF8F5]">
                  {r.map((c, ci) => (
                    <td key={ci} className="p-1.5 border-r border-neutral-300">
                      {String(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {chartData && (
        <div className="border border-black bg-white p-2">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase mb-1">
            <span className="flex items-center gap-1 font-bold">
              {chartData.chartType === 'pie' ? (
                <PieIcon className="w-3 h-3" />
              ) : chartData.chartType === 'line' ? (
                <BarChart3 className="w-3 h-3" />
              ) : (
                <BarChart3 className="w-3 h-3" />
              )}
              Biểu đồ {chartData.chartType}
            </span>
            <span className="flex items-center gap-1 text-neutral-500">
              <Table2 className="w-3 h-3" /> {chartData.labels.length} nhóm
            </span>
          </div>
          <div className="h-40 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartData.chartType === 'bar' ? (
                <BarChart data={chartDataFormatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                  <XAxis dataKey="name" tick={{ fill: '#111', fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis tick={{ fill: '#111', fontSize: 10, fontFamily: 'monospace' }} />
                  <Tooltip
                    contentStyle={{ background: '#111', border: '2px solid #111', borderRadius: 0, fontFamily: 'monospace', fontSize: 11, color: '#fff' }}
                    cursor={{ fill: 'rgba(255,199,0,0.15)' }}
                  />
                  <Bar dataKey="value" fill="#FFC700" stroke="#111" strokeWidth={1} />
                </BarChart>
              ) : chartData.chartType === 'line' ? (
                <LineChart data={chartDataFormatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                  <XAxis dataKey="name" tick={{ fill: '#111', fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis tick={{ fill: '#111', fontSize: 10, fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ background: '#111', border: '2px solid #111', borderRadius: 0, fontFamily: 'monospace', fontSize: 11, color: '#fff' }} />
                  <Line type="monotone" dataKey="value" stroke="#0B3BFF" strokeWidth={3} dot={{ r: 4, fill: '#FFC700', stroke: '#111', strokeWidth: 1 }} />
                </LineChart>
              ) : (
                <PieChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <Pie
                    data={chartDataFormatted}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    dataKey="value"
                    nameKey="name"
                    stroke="#111"
                    strokeWidth={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={10}
                  >
                    {chartDataFormatted.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111', border: '2px solid #111', borderRadius: 0, fontFamily: 'monospace', fontSize: 11, color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}