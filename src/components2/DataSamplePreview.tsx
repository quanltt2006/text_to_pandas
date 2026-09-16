import { useState } from 'react';
import { DatasetProfile, ColumnContext } from '../types';
import { Check, X, Edit3, Table2 } from 'lucide-react';

interface DataSamplePreviewProps {
  profile: DatasetProfile;
  columnContexts: ColumnContext[];
  onContextUpdate: (contexts: ColumnContext[]) => void;
}

function dtypeBadge(dtype: string): string {
  switch (dtype) {
    case 'number': return 'bg-[#FFC700] text-black border-black';
    case 'string': return 'bg-white text-black border-black';
    case 'date': return 'bg-[#0B3BFF] text-white border-black';
    case 'boolean': return 'bg-emerald-500 text-white border-black';
    default: return 'bg-neutral-200 text-black border-black';
  }
}

export default function DataSamplePreview({ profile, columnContexts, onContextUpdate }: DataSamplePreviewProps) {
  const [activeTab, setActiveTab] = useState<'columns' | 'context'>('columns');
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (colName: string) => {
    const existing = columnContexts.find(c => c.name === colName);
    setEditValue(existing?.userDescription || '');
    setEditingCol(colName);
  };

  const saveEdit = () => {
    if (!editingCol) return;
    const updated = columnContexts.filter(c => c.name !== editingCol);
    if (editValue.trim()) {
      updated.push({ name: editingCol, userDescription: editValue.trim() });
    }
    onContextUpdate(updated);
    setEditingCol(null);
  };

  const cancelEdit = () => {
    setEditingCol(null);
    setEditValue('');
  };

  const contextCount = columnContexts.length;

  return (
    <div className="bg-white border-2 border-black shadow-brutal p-4 flex flex-col gap-3" data-purpose="data-sample-preview">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-black">
        <div className="flex items-center gap-2">
          <div className="flex border border-black text-[10px] font-mono">
            <button
              onClick={() => setActiveTab('columns')}
              className={`px-2 py-1 font-bold transition-colors ${
                activeTab === 'columns' ? 'bg-[#FFC700] text-black' : 'bg-white hover:bg-neutral-100 text-neutral-600'
              }`}
            >
              SCHEMA
            </button>
            <button
              onClick={() => setActiveTab('context')}
              className={`px-2 py-1 font-bold border-l border-black transition-colors ${
                activeTab === 'context' ? 'bg-[#FFC700] text-black' : 'bg-white hover:bg-neutral-100 text-neutral-600'
              }`}
            >
              CONTEXT ({contextCount})
            </button>
          </div>
        </div>
        <span className="text-[10px] font-mono text-neutral-500">{profile.columnCount} CỘT</span>
      </div>

      {activeTab === 'columns' ? (
        <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-1">
          {profile.columns.map((col) => (
            <div
              key={col.name}
              className="flex items-center justify-between gap-2 p-1.5 bg-[#FAF8F5] border border-neutral-300 text-[11px] font-mono"
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                <span className="w-1.5 h-1.5 bg-black shrink-0"></span>
                <span className="font-bold truncate">{col.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 shrink-0">
                <span className={`px-1 border uppercase ${dtypeBadge(col.dtype)}`}>{col.dtype}</span>
                {col.uniqueCount !== undefined && (
                  <span title="Giá trị unique">{col.uniqueCount} unique</span>
                )}
                {col.nullPercent !== undefined && col.nullPercent > 0 && (
                  <span title="Null percentage" className="text-red-600">{col.nullPercent}% null</span>
                )}
                {col.dtype === 'number' && col.mean !== undefined && (
                  <span>μ={typeof col.mean === 'number' ? col.mean.toFixed(2) : col.mean}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-1">
          {profile.columns.map((col) => {
            const ctx = columnContexts.find(c => c.name === col.name)?.userDescription;
            return (
              <div
                key={col.name}
                className="flex items-center justify-between gap-2 p-1.5 bg-[#FAF8F5] border border-neutral-300 text-[11px] font-mono"
              >
                <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                  <span className="font-bold truncate">{col.name}</span>
                  {editingCol === col.name ? (
                    <span className="flex items-center gap-1 flex-1 min-w-0">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Mô tả cột..."
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                        className="w-full min-w-0 px-1.5 py-0.5 border border-black text-[10px] font-mono bg-white focus:outline-none"
                      />
                      <button onClick={saveEdit} className="text-emerald-600 hover:text-emerald-800"><Check className="w-3 h-3" /></button>
                      <button onClick={cancelEdit} className="text-red-600 hover:text-red-800"><X className="w-3 h-3" /></button>
                    </span>
                  ) : (
                    <span className={`text-neutral-600 truncate flex-1 ${ctx ? '' : 'italic text-neutral-400'}`}>
                      {ctx || 'Chưa có mô tả'}
                    </span>
                  )}
                </div>
                {editingCol !== col.name && (
                  <button
                    onClick={() => startEdit(col.name)}
                    className="text-neutral-400 hover:text-black shrink-0 transition-colors"
                    title="Bổ sung context"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 pt-1 border-t border-dashed border-neutral-300">
        <span className="flex items-center gap-1.5">
          <Table2 className="w-3 h-3 text-[#FFC700]" />
          Schema đã embed vào Vector Store
        </span>
        <span className="font-bold">{profile.rowCount.toLocaleString()} dòng</span>
      </div>
    </div>
  );
}