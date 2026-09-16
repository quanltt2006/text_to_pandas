import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ColumnMeta, Dataset, QueryHistoryItem, WorkspaceSubTab } from '../types';
import { formatNumber, formatVND } from '../utils/csvParser';
import { executePandasQuery } from '../utils/pandasEngine';

interface WorkspaceViewProps {
  dataset: Dataset;
  onOpenUpload: () => void;
  onOpenSampleModal: () => void;
}

const PALETTE = ['#FFCC00', '#0B3BFF', '#E63B2E', '#111111', '#10B981', '#8B5CF6', '#F59E0B'];

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  dataset,
  onOpenUpload,
  onOpenSampleModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<WorkspaceSubTab>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>(dataset.columns[0]?.name || '');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedColumnFilter, setSelectedColumnFilter] = useState<string>('all');

  // Chart state
  const numericColumns = useMemo(
    () => dataset.columns.filter((c) => c.type === 'numeric'),
    [dataset]
  );
  const categoricalColumns = useMemo(
    () => dataset.columns.filter((c) => c.type === 'categorical' || c.type === 'temporal'),
    [dataset]
  );

  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [chartXCol, setChartXCol] = useState<string>(
    categoricalColumns[0]?.name || dataset.columns[0]?.name || ''
  );
  const [chartYCol, setChartYCol] = useState<string>(
    numericColumns[0]?.name || dataset.columns[1]?.name || ''
  );
  const [chartAgg, setChartAgg] = useState<'sum' | 'avg' | 'count'>('sum');

  // Text-to-Pandas state
  const [queryInput, setQueryInput] = useState('');
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>(() => {
    // Initial generated sample query
    return [executePandasQuery(dataset, 'Top 5 sản phẩm doanh thu cao nhất')];
  });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Filtered and sorted table data
  const filteredData = useMemo(() => {
    let list = dataset.data;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((row) =>
        Object.values(row).some((val) =>
          String(val ?? '').toLowerCase().includes(term)
        )
      );
    }

    if (sortColumn) {
      list = [...list].sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        const strA = String(valA ?? '');
        const strB = String(valB ?? '');
        return sortDirection === 'asc'
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      });
    }

    return list;
  }, [dataset.data, searchTerm, sortColumn, sortDirection]);

  // Paginated data
  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
  };

  // Aggregated Chart Data
  const chartData = useMemo(() => {
    if (!chartXCol) return [];
    const groups: Record<string, { sum: number; count: number }> = {};

    dataset.data.forEach((row) => {
      const xVal = String(row[chartXCol] || 'Chưa rõ');
      const yVal = Number(row[chartYCol]) || 0;

      if (!groups[xVal]) {
        groups[xVal] = { sum: 0, count: 0 };
      }
      groups[xVal].sum += yVal;
      groups[xVal].count += 1;
    });

    return Object.entries(groups)
      .map(([name, stat]) => ({
        name,
        value:
          chartAgg === 'sum'
            ? stat.sum
            : chartAgg === 'avg'
            ? Math.round((stat.sum / (stat.count || 1)) * 100) / 100
            : stat.count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [dataset.data, chartXCol, chartYCol, chartAgg]);

  // Execute Pandas agent query
  const handleRunQuery = (questionText?: string) => {
    const text = questionText || queryInput;
    if (!text.trim()) return;
    const result = executePandasQuery(dataset, text);
    setQueryHistory((prev) => [result, ...prev]);
    if (!questionText) setQueryInput('');
  };

  // Download CSV
  const handleExportCsv = () => {
    const headers = dataset.columns.map((c) => c.name).join(',');
    const rows = dataset.data.map((row) =>
      dataset.columns
        .map((c) => {
          const val = String(row[c.name] ?? '');
          return val.includes(',') ? `"${val}"` : val;
        })
        .join(',')
    );
    const blob = new Blob([headers + '\n' + rows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `export_${dataset.fileName}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download JSON
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(dataset.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${dataset.fileName.replace('.csv', '')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate runnable Python script
  const generatedPythonScript = `import pandas as pd
import matplotlib.pyplot as plt

# 1. Tải và cấu hình tập dữ liệu
file_path = "${dataset.fileName}"
df = pd.read_csv(file_path)

print("--- THÔNG TIN DATAFRAME ---")
print(df.info())
print("\\n--- 5 DÒNG ĐẦU TIÊN ---")
print(df.head())

print("\\n--- THỐNG KÊ MÔ TẢ ---")
print(df.describe(include='all'))

# 2. Xử lý mẫu Text-to-Pandas
# Nhóm theo cột danh mục chính và tính tổng
${
  categoricalColumns[0] && numericColumns[0]
    ? `top_analysis = (
    df.groupby('${categoricalColumns[0].name}')['${numericColumns[0].name}']
    .sum()
    .sort_values(ascending=False)
    .head(10)
)
print("\\n--- PHÂN TÍCH TỔNG HỢP ---")
print(top_analysis)

# 3. Trực quan hóa
top_analysis.plot(kind='bar', color='#FFCC00', edgecolor='#111111', linewidth=2)
plt.title("Biểu đồ phân tích Smart CSV Analyst")
plt.tight_layout()
plt.show()`
    : '# Khởi tạo phân tích đồ thị tùy biến'
}
`;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Bar / Dataset Overview Banner */}
      <div className="neo-box bg-white p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 border-2 border-slate-950 bg-[#FFCC00] flex items-center justify-center font-mono font-black text-xl shadow-[3px_3px_0px_#111111]">
            DF
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-slate-950 font-mono tracking-tight">
                {dataset.fileName}
              </h2>
              <span className="border border-slate-950 text-[10px] font-mono font-bold bg-[#FAF7F2] px-2 py-0.5 uppercase">
                {dataset.totalColumns} CỘT • {formatNumber(dataset.totalRows)} DÒNG
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-mono font-bold text-slate-700">
              <span className="bg-slate-100 border border-slate-900 px-2 py-0.5">
                📅 {dataset.schemaTypeCounts.temporal} Temporal
              </span>
              <span className="bg-slate-100 border border-slate-900 px-2 py-0.5">
                🏷️ {dataset.schemaTypeCounts.categorical} Categorical
              </span>
              <span className="bg-slate-100 border border-slate-900 px-2 py-0.5">
                🔢 {dataset.schemaTypeCounts.numeric} Numeric
              </span>
              {dataset.schemaTypeCounts.other > 0 && (
                <span className="bg-slate-100 border border-slate-900 px-2 py-0.5">
                  🆔 {dataset.schemaTypeCounts.other} Identifier
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="workspace-load-sample-btn"
            onClick={onOpenSampleModal}
            className="neo-btn px-3 py-1.5 bg-white text-xs font-mono font-bold uppercase text-slate-950 hover:bg-[#FAF7F2]"
          >
            Đổi Mẫu Dữ Liệu
          </button>
          <button
            id="workspace-upload-btn"
            onClick={onOpenUpload}
            className="neo-btn px-3 py-1.5 bg-[#FFCC00] text-xs font-mono font-bold uppercase text-slate-950"
          >
            + Tải CSV Khác
          </button>
          <button
            id="workspace-export-btn"
            onClick={handleExportCsv}
            className="neo-btn px-3 py-1.5 bg-slate-950 text-xs font-mono font-bold uppercase text-white hover:bg-slate-800"
          >
            Xuất CSV ↓
          </button>
        </div>
      </div>

      {/* Workspace Navigation Subtabs */}
      <div className="flex border-b-2 border-slate-950 gap-2 overflow-x-auto pb-0.5 font-mono text-xs font-bold uppercase">
        <button
          id="tab-btn-table"
          onClick={() => setActiveSubTab('table')}
          className={`px-4 py-2.5 border-2 border-slate-950 border-b-0 cursor-pointer transition-colors ${
            activeSubTab === 'table'
              ? 'bg-[#FFCC00] text-slate-950 shadow-[2px_-2px_0px_#111111]'
              : 'bg-white text-slate-700 hover:bg-[#FAF7F2]'
          }`}
        >
          📊 Bảng Dữ Liệu ({filteredData.length})
        </button>
        <button
          id="tab-btn-stats"
          onClick={() => setActiveSubTab('stats')}
          className={`px-4 py-2.5 border-2 border-slate-950 border-b-0 cursor-pointer transition-colors ${
            activeSubTab === 'stats'
              ? 'bg-[#FFCC00] text-slate-950 shadow-[2px_-2px_0px_#111111]'
              : 'bg-white text-slate-700 hover:bg-[#FAF7F2]'
          }`}
        >
          📈 Thống Kê Chi Tiết (df.describe)
        </button>
        <button
          id="tab-btn-charts"
          onClick={() => setActiveSubTab('charts')}
          className={`px-4 py-2.5 border-2 border-slate-950 border-b-0 cursor-pointer transition-colors ${
            activeSubTab === 'charts'
              ? 'bg-[#FFCC00] text-slate-950 shadow-[2px_-2px_0px_#111111]'
              : 'bg-white text-slate-700 hover:bg-[#FAF7F2]'
          }`}
        >
          📉 Trực Quan Hóa (Charts)
        </button>
        <button
          id="tab-btn-agent"
          onClick={() => setActiveSubTab('agent')}
          className={`px-4 py-2.5 border-2 border-slate-950 border-b-0 cursor-pointer transition-colors ${
            activeSubTab === 'agent'
              ? 'bg-[#FFCC00] text-slate-950 shadow-[2px_-2px_0px_#111111]'
              : 'bg-white text-slate-700 hover:bg-[#FAF7F2]'
          }`}
        >
          ⚡ Trợ Lý Text-to-Pandas
        </button>
        <button
          id="tab-btn-export"
          onClick={() => setActiveSubTab('export')}
          className={`px-4 py-2.5 border-2 border-slate-950 border-b-0 cursor-pointer transition-colors ${
            activeSubTab === 'export'
              ? 'bg-[#FFCC00] text-slate-950 shadow-[2px_-2px_0px_#111111]'
              : 'bg-white text-slate-700 hover:bg-[#FAF7F2]'
          }`}
        >
          💻 Xuất &amp; Python Script
        </button>
      </div>

      {/* SUB-TAB 1: DATA TABLE */}
      {activeSubTab === 'table' && (
        <div className="space-y-4">
          {/* Controls row */}
          <div className="neo-box bg-white p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-80 flex items-center border-2 border-slate-950 bg-[#FAF7F2] px-3 py-1.5">
              <span className="text-slate-500 mr-2 text-xs font-mono">🔍</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm kiếm dòng, giá trị..."
                className="w-full bg-transparent text-xs font-mono font-medium outline-none text-slate-950 placeholder-slate-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-xs font-mono font-bold text-slate-500 hover:text-slate-950 ml-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <span className="font-bold uppercase text-slate-700">Hiển thị:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border-2 border-slate-950 bg-white px-2 py-1 font-bold outline-none cursor-pointer"
              >
                <option value={10}>10 dòng</option>
                <option value={25}>25 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>

              <span className="text-slate-500">|</span>
              <span className="font-bold text-slate-900">
                Trang {currentPage} / {totalPages} ({filteredData.length} kết quả)
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="neo-box bg-white overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] relative">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="sticky top-0 bg-[#FAF7F2] z-10 shadow-sm border-b-2 border-slate-950">
                  <tr>
                    <th className="py-2.5 px-4 font-black uppercase text-slate-500 w-12 text-center border-r border-slate-300">
                      #
                    </th>
                    {dataset.columns.map((col) => {
                      const isSorted = sortColumn === col.name;
                      return (
                        <th
                          key={col.name}
                          onClick={() => handleSort(col.name)}
                          className={`py-2.5 px-4 font-black uppercase border-r border-slate-300 cursor-pointer select-none transition-colors hover:bg-amber-100 ${
                            isSorted ? 'bg-amber-100' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span>{col.name}</span>
                              <span className="ml-1 text-[9px] font-normal text-slate-500 lowercase">
                                ({col.type === 'numeric' ? '123' : col.type === 'temporal' ? 'date' : 'txt'})
                              </span>
                            </div>
                            <span className="font-bold text-slate-900">
                              {isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-200">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={dataset.columns.length + 1}
                        className="py-12 text-center text-slate-500 font-bold uppercase"
                      >
                        Không tìm thấy dữ liệu khớp với &quot;{searchTerm}&quot;
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((row, idx) => {
                      const absoluteIndex = (currentPage - 1) * rowsPerPage + idx + 1;
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-amber-50/60 transition-colors font-mono"
                        >
                          <td className="py-2 px-4 text-center text-slate-400 font-bold border-r border-slate-200">
                            {absoluteIndex}
                          </td>
                          {dataset.columns.map((col) => {
                            const val = row[col.name];
                            const isNumeric = col.type === 'numeric';
                            const isCurrency =
                              isNumeric &&
                              (col.name.toLowerCase().includes('vnd') ||
                                col.name.toLowerCase().includes('price') ||
                                col.name.toLowerCase().includes('salary') ||
                                col.name.toLowerCase().includes('revenue'));

                            return (
                              <td
                                key={col.name}
                                className={`py-2 px-4 border-r border-slate-200 ${
                                  isNumeric ? 'text-right font-bold' : ''
                                } ${
                                  col.type === 'identifier' ? 'font-bold text-slate-950' : 'text-slate-800'
                                }`}
                              >
                                {isCurrency && typeof val === 'number' ? (
                                  formatVND(val)
                                ) : typeof val === 'number' ? (
                                  formatNumber(val)
                                ) : col.name.toLowerCase().includes('status') ? (
                                  <span
                                    className={`border border-slate-950 inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase ${
                                      String(val).includes('HOÀN TẤT')
                                        ? 'bg-[#10B981]/20 text-[#10B981]'
                                        : String(val).includes('ĐANG')
                                        ? 'bg-[#FFCC00]/40 text-slate-950'
                                        : 'bg-white text-slate-700'
                                    }`}
                                  >
                                    {String(val ?? '')}
                                  </span>
                                ) : (
                                  String(val ?? '-')
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-4 py-3 bg-[#FAF7F2] border-t-2 border-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
              <span className="text-slate-700">
                Hiển thị dòng {(currentPage - 1) * rowsPerPage + 1} -{' '}
                {Math.min(currentPage * rowsPerPage, filteredData.length)} trên tổng số{' '}
                {filteredData.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="neo-btn px-3 py-1 bg-white disabled:opacity-40 disabled:pointer-events-none font-bold"
                >
                  ← Trước
                </button>
                <div className="px-3 py-1 border-2 border-slate-950 bg-white font-bold">
                  {currentPage} / {totalPages}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="neo-btn px-3 py-1 bg-white disabled:opacity-40 disabled:pointer-events-none font-bold"
                >
                  Sau →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SUMMARY STATISTICS (df.describe) */}
      {activeSubTab === 'stats' && (
        <div className="space-y-6">
          <div className="neo-box bg-white p-5">
            <h3 className="text-base font-black uppercase font-mono tracking-tight text-slate-950 mb-2">
              TỔNG HỢP KIỂU DỮ LIỆU &amp; SCHEMA INFERENCE
            </h3>
            <p className="text-xs text-slate-700 font-medium leading-relaxed mb-4">
              Hệ thống đã tự động trích xuất các thuộc tính thống kê, nhận diện phân phối giá trị và kiểm tra tính toàn vẹn (Null check) của từng cột dữ liệu.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataset.columns.map((col) => (
                <div
                  key={col.name}
                  className="neo-box-sm bg-[#FAF7F2] p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono font-black text-sm text-slate-950 break-all">
                        {col.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 border border-slate-950 uppercase ${
                          col.type === 'numeric'
                            ? 'bg-[#FFCC00]'
                            : col.type === 'temporal'
                            ? 'bg-blue-200'
                            : 'bg-white'
                        }`}
                      >
                        {col.type}
                      </span>
                    </div>

                    <div className="text-xs font-mono space-y-1 text-slate-700">
                      <div className="flex justify-between">
                        <span>Giá trị duy nhất:</span>
                        <span className="font-bold text-slate-950">{col.uniqueCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ô bị khuyết (Null):</span>
                        <span
                          className={`font-bold ${
                            col.nullCount > 0 ? 'text-[#E63B2E]' : 'text-slate-950'
                          }`}
                        >
                          {col.nullCount} ({Math.round((col.nullCount / dataset.totalRows) * 100)}%)
                        </span>
                      </div>

                      {col.type === 'numeric' && col.stats && (
                        <div className="pt-2 mt-2 border-t border-slate-300 space-y-1">
                          <div className="flex justify-between">
                            <span>Nhỏ nhất (Min):</span>
                            <span className="font-bold text-slate-950">
                              {col.stats.min?.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Lớn nhất (Max):</span>
                            <span className="font-bold text-slate-950">
                              {col.stats.max?.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Trung bình (Mean):</span>
                            <span className="font-bold text-slate-950">
                              {col.stats.mean?.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Độ lệch chuẩn (Std):</span>
                            <span className="font-bold text-slate-950">
                              {col.stats.stdDev?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}

                      {col.type === 'categorical' && col.stats?.topValue && (
                        <div className="pt-2 mt-2 border-t border-slate-300 space-y-1">
                          <div className="flex justify-between">
                            <span>Phổ biến nhất:</span>
                            <span className="font-bold text-slate-950 truncate max-w-[140px]">
                              {col.stats.topValue}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tần suất xuất hiện:</span>
                            <span className="font-bold text-slate-950">
                              {col.stats.topFreq} lần
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-300 text-[10px] font-mono text-slate-500 truncate">
                    Mẫu: {col.sampleValues.slice(0, 3).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CHARTS & VISUALIZATIONS */}
      {activeSubTab === 'charts' && (
        <div className="space-y-6">
          {/* Chart Controls Bar */}
          <div className="neo-box bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-base font-black uppercase font-mono tracking-tight text-slate-950">
                TRÌNH DỰNG ĐỒ THỊ NEO-BRUTALIST
              </h3>

              {/* Chart type picker */}
              <div className="flex items-center gap-1 font-mono text-xs font-bold uppercase">
                <button
                  onClick={() => setChartType('bar')}
                  className={`neo-btn px-3 py-1.5 ${
                    chartType === 'bar' ? 'bg-[#FFCC00]' : 'bg-white'
                  }`}
                >
                  Biểu Đồ Cột
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`neo-btn px-3 py-1.5 ${
                    chartType === 'line' ? 'bg-[#FFCC00]' : 'bg-white'
                  }`}
                >
                  Biểu Đồ Đường
                </button>
                <button
                  onClick={() => setChartType('pie')}
                  className={`neo-btn px-3 py-1.5 ${
                    chartType === 'pie' ? 'bg-[#FFCC00]' : 'bg-white'
                  }`}
                >
                  Biểu Đồ Tròn
                </button>
              </div>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t-2 border-slate-950 font-mono text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Trục X (Nhóm Phân Loại):
                </label>
                <select
                  value={chartXCol}
                  onChange={(e) => setChartXCol(e.target.value)}
                  className="w-full border-2 border-slate-950 bg-[#FAF7F2] p-2 font-bold outline-none"
                >
                  {dataset.columns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name} ({col.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Trục Y (Chỉ Số Số Học):
                </label>
                <select
                  value={chartYCol}
                  onChange={(e) => setChartYCol(e.target.value)}
                  className="w-full border-2 border-slate-950 bg-[#FAF7F2] p-2 font-bold outline-none"
                >
                  {numericColumns.length > 0 ? (
                    numericColumns.map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name}
                      </option>
                    ))
                  ) : (
                    <option value={dataset.columns[0]?.name}>
                      {dataset.columns[0]?.name}
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Phép Tính Tổng Hợp (Aggregation):
                </label>
                <select
                  value={chartAgg}
                  onChange={(e) => setChartAgg(e.target.value as any)}
                  className="w-full border-2 border-slate-950 bg-[#FAF7F2] p-2 font-bold outline-none"
                >
                  <option value="sum">Tổng (Sum)</option>
                  <option value="avg">Trung Bình (Average)</option>
                  <option value="count">Đếm Số Lượng (Count)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Chart Display Container */}
          <div className="neo-box-lg bg-white p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-slate-950 font-mono text-xs font-bold uppercase">
              <span className="text-slate-950">
                Phân tích: {chartAgg.toUpperCase()}({chartYCol}) theo {chartXCol}
              </span>
              <span className="text-slate-600">Top 15 hạng mục cao nhất</span>
            </div>

            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      angle={-25}
                      textAnchor="end"
                      height={70}
                      tick={{ fill: '#111111', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    />
                    <YAxis
                      tick={{ fill: '#111111', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      tickFormatter={(val) =>
                        val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val.toLocaleString()
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111111',
                        color: '#FFFFFF',
                        border: '2px solid #111111',
                        borderRadius: 0,
                        fontFamily: 'JetBrains Mono',
                        fontSize: 12,
                      }}
                      formatter={(val: any) => [
                        chartYCol.toLowerCase().includes('vnd') || chartYCol.toLowerCase().includes('revenue')
                          ? formatVND(Number(val))
                          : Number(val).toLocaleString(),
                        `${chartAgg.toUpperCase()}(${chartYCol})`,
                      ]}
                    />
                    <Bar dataKey="value" fill="#FFCC00" stroke="#111111" strokeWidth={2} />
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      angle={-25}
                      textAnchor="end"
                      height={70}
                      tick={{ fill: '#111111', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    />
                    <YAxis
                      tick={{ fill: '#111111', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      tickFormatter={(val) =>
                        val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val.toLocaleString()
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111111',
                        color: '#FFFFFF',
                        border: '2px solid #111111',
                        borderRadius: 0,
                        fontFamily: 'JetBrains Mono',
                      }}
                      formatter={(val: any) => [
                        chartYCol.toLowerCase().includes('vnd')
                          ? formatVND(Number(val))
                          : Number(val).toLocaleString(),
                        `${chartAgg.toUpperCase()}(${chartYCol})`,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#0B3BFF"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#FFCC00', stroke: '#111111', strokeWidth: 2 }}
                    />
                  </LineChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={140}
                      stroke="#111111"
                      strokeWidth={2}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111111',
                        color: '#FFFFFF',
                        border: '2px solid #111111',
                        borderRadius: 0,
                        fontFamily: 'JetBrains Mono',
                      }}
                      formatter={(val: any) => [
                        chartYCol.toLowerCase().includes('vnd')
                          ? formatVND(Number(val))
                          : Number(val).toLocaleString(),
                        `${chartAgg.toUpperCase()}(${chartYCol})`,
                      ]}
                    />
                    <Legend />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: TEXT-TO-PANDAS AGENT */}
      {activeSubTab === 'agent' && (
        <div className="space-y-6">
          {/* Query input card */}
          <div className="neo-box-lg bg-white p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 border-2 border-slate-950 bg-[#FFCC00] flex items-center justify-center font-mono font-bold shadow-[2px_2px_0px_#111111]">
                &lt;/&gt;
              </div>
              <div>
                <h3 className="text-lg font-black uppercase font-mono tracking-tight text-slate-950">
                  TEXT-TO-PANDAS AGENT INTERFACE
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Đặt câu hỏi bằng tiếng Việt hoặc tiếng Anh, Agent tự sinh mã Pandas tối ưu và trực quan hóa kết quả.
                </p>
              </div>
            </div>

            {/* Prompt Chips */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase text-slate-600">
                Gợi ý câu hỏi phổ biến:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  'Top 5 sản phẩm doanh thu cao nhất',
                  'Tổng doanh thu theo trạng thái đơn hàng',
                  'Xu hướng doanh thu theo ngày',
                  'Các đơn hàng giá trị trên 15 triệu',
                  'Tổng quan thống kê mô tả df.describe()',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setQueryInput(prompt);
                      handleRunQuery(prompt);
                    }}
                    className="neo-btn px-3 py-1 bg-[#FAF7F2] hover:bg-[#FFCC00] text-xs font-mono font-bold text-slate-950"
                  >
                    ⚡ {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunQuery();
              }}
              className="flex flex-col sm:flex-row gap-2 pt-2"
            >
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Nhập câu hỏi (Ví dụ: Sản phẩm nào có doanh thu cao nhất, phân bổ trạng thái...)"
                className="flex-1 border-2 border-slate-950 bg-[#FAF7F2] px-4 py-2.5 text-xs font-mono font-bold text-slate-950 outline-none focus:bg-white"
              />
              <button
                type="submit"
                className="neo-btn px-6 py-2.5 bg-[#FFCC00] font-mono font-bold text-xs uppercase tracking-wider text-slate-950"
              >
                Chạy Truy Vấn →
              </button>
            </form>
          </div>

          {/* Query Results Stream */}
          <div className="space-y-6">
            {queryHistory.map((item, index) => (
              <div key={item.id} className="neo-box bg-white p-6 space-y-4">
                <div className="flex items-center justify-between border-b-2 border-slate-950 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-[#FFCC00] border border-slate-950 inline-block"></span>
                    <h4 className="font-mono font-black text-sm uppercase text-slate-950">
                      Q: {item.question}
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {item.timestamp}
                  </span>
                </div>

                {/* Pandas Code Block */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase text-slate-700">
                    <span>Mã Pandas được biên dịch (Python 3.11):</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(item.pandasCode);
                        setCopiedIndex(index);
                        setTimeout(() => setCopiedIndex(null), 2000);
                      }}
                      className="neo-btn px-2 py-0.5 bg-[#FAF7F2] hover:bg-[#FFCC00] text-[10px]"
                    >
                      {copiedIndex === index ? '✓ Đã sao chép' : 'Sao chép mã'}
                    </button>
                  </div>
                  <pre className="border-2 border-slate-950 bg-slate-950 text-amber-300 p-4 font-mono text-xs overflow-x-auto selection:bg-amber-400 selection:text-slate-950">
                    <code>{item.pandasCode}</code>
                  </pre>
                </div>

                {/* Explanation */}
                <div className="p-3 bg-[#FAF7F2] border-l-4 border-slate-950 text-xs font-mono text-slate-800">
                  <span className="font-bold uppercase">Giải thích: </span>
                  {item.explanation}
                </div>

                {/* Result Table Preview */}
                {item.resultData && item.resultData.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono font-bold uppercase text-slate-700">
                      Kết quả thực thi (DataFrame Output):
                    </span>
                    <div className="border-2 border-slate-950 overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-100 border-b-2 border-slate-950">
                          <tr>
                            {Object.keys(item.resultData[0]).map((k) => (
                              <th key={k} className="py-2 px-3 font-black uppercase">
                                {k}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {item.resultData.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              {Object.entries(row).map(([k, v], cIdx) => (
                                <td key={cIdx} className="py-1.5 px-3">
                                  {typeof v === 'number' &&
                                  (k.includes('vnd') || k.includes('revenue') || k.includes('tong'))
                                    ? formatVND(v)
                                    : typeof v === 'number'
                                    ? formatNumber(v)
                                    : String(v)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: EXPORT & PYTHON CODE */}
      {activeSubTab === 'export' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Export Formats */}
          <div className="neo-box bg-white p-6 space-y-4">
            <h3 className="text-base font-black uppercase font-mono tracking-tight text-slate-950">
              XUẤT DỮ LIỆU ĐÃ LÀM SẠCH
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Tải xuống tập dữ liệu với cấu trúc chuẩn hóa, hỗ trợ nhập vào Excel, BigQuery, hoặc phần mềm BI của bạn.
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleExportCsv}
                className="w-full neo-btn p-4 bg-[#FFCC00] text-slate-950 flex items-center justify-between text-left font-mono"
              >
                <div>
                  <div className="font-black text-sm uppercase">Tải File .CSV (Chuẩn UTF-8)</div>
                  <div className="text-[11px] text-slate-800">
                    Phù hợp cho Excel, Google Sheets, Pandas, R
                  </div>
                </div>
                <span className="text-xl font-bold">↓</span>
              </button>

              <button
                onClick={handleExportJson}
                className="w-full neo-btn p-4 bg-white hover:bg-[#FAF7F2] text-slate-950 flex items-center justify-between text-left font-mono"
              >
                <div>
                  <div className="font-black text-sm uppercase">Tải File .JSON (Records Array)</div>
                  <div className="text-[11px] text-slate-600">
                    Phù hợp cho REST APIs, NoSQL và Web Apps
                  </div>
                </div>
                <span className="text-xl font-bold">↓</span>
              </button>
            </div>
          </div>

          {/* Copyable Python Script */}
          <div className="neo-box bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black uppercase font-mono tracking-tight text-slate-950">
                KỊCH BẢN PYTHON TỰ ĐỘNG HÓA
              </h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedPythonScript);
                  alert('Đã sao chép kịch bản Python!');
                }}
                className="neo-btn px-3 py-1 bg-[#FFCC00] font-mono font-bold text-xs uppercase"
              >
                Sao Chép Script
              </button>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Chạy trực tiếp trong Jupyter Notebook, Google Colab hoặc terminal máy chủ của bạn:
            </p>
            <pre className="border-2 border-slate-950 bg-slate-950 text-slate-100 p-4 font-mono text-xs overflow-x-auto max-h-[260px]">
              <code>{generatedPythonScript}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
