import React, { useState } from 'react';
import { Dataset } from '../types';
import { Table, Layers, ChevronRight } from 'lucide-react';

interface DataSamplePreviewProps {
  dataset: Dataset;
  onOpenFullDataModal?: () => void;
}

export const DataSamplePreview: React.FC<DataSamplePreviewProps> = ({ dataset, onOpenFullDataModal }) => {
  const [activeTab, setActiveTab] = useState<'sample' | 'columns'>('sample');

  return (
    <div className="bg-white border-2 border-black shadow-brutal p-4 flex flex-col gap-3" data-purpose="data-sample-preview">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-black">
        <div className="flex items-center gap-2">
          <div className="flex border border-black text-[10px] font-mono">
            <button
              onClick={() => setActiveTab('sample')}
              className={`px-2 py-1 font-bold transition-colors ${
                activeTab === 'sample' ? 'bg-[#FFC700] text-black' : 'bg-white hover:bg-neutral-100 text-neutral-600'
              }`}
            >
              DỮ LIỆU MẪU (HEAD)
            </button>
            <button
              onClick={() => setActiveTab('columns')}
              className={`px-2 py-1 font-bold border-l border-black transition-colors ${
                activeTab === 'columns' ? 'bg-[#FFC700] text-black' : 'bg-white hover:bg-neutral-100 text-neutral-600'
              }`}
            >
              CỘT ({dataset.columns.length})
            </button>
          </div>
        </div>

        {onOpenFullDataModal && (
          <button
            onClick={onOpenFullDataModal}
            className="text-[11px] font-mono text-neutral-600 hover:text-black flex items-center gap-0.5 hover:underline"
          >
            <span>Toàn bộ</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {activeTab === 'sample' ? (
        <div className="overflow-x-auto border border-black max-h-[220px]">
          <table className="w-full text-left font-mono text-[10px] border-collapse bg-white">
            <thead className="bg-[#F0ECE4] border-b border-black text-black sticky top-0">
              <tr>
                <th className="p-1.5 border-r border-black font-bold">#</th>
                {dataset.columns.slice(0, 4).map((col) => (
                  <th key={col.name} className="p-1.5 border-r border-black font-bold whitespace-nowrap">
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataset.rows.slice(0, 5).map((row, idx) => (
                <tr key={idx} className="border-b border-neutral-200 hover:bg-[#FAF8F5]">
                  <td className="p-1.5 border-r border-black text-neutral-500 font-bold bg-[#FAF8F5]">
                    {idx}
                  </td>
                  {dataset.columns.slice(0, 4).map((col) => {
                    const val = row[col.name];
                    return (
                      <td key={col.name} className="p-1.5 border-r border-neutral-200 whitespace-nowrap truncate max-w-[120px]">
                        {typeof val === 'number' ? val.toFixed(3) : String(val ?? '')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
          {dataset.columns.map((col) => (
            <div
              key={col.name}
              className="flex items-center justify-between p-1.5 bg-[#FAF8F5] border border-neutral-300 text-[11px] font-mono"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-1.5 h-1.5 bg-black"></span>
                <span className="font-bold truncate">{col.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 shrink-0">
                <span className="px-1 border border-neutral-400 bg-white uppercase">
                  {col.type}
                </span>
                {col.mean !== undefined && (
                  <span>μ={col.mean}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 pt-1">
        <span>Hiển thị 5/{dataset.rowCount} dòng</span>
        <span className="text-emerald-700 font-bold">df.head(5)</span>
      </div>
    </div>
  );
};
