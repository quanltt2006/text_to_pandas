import React, { useState, useMemo } from 'react';
import { Dataset } from '../types';
import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface FullDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
}

export const FullDataModal: React.FC<FullDataModalProps> = ({
  isOpen,
  onClose,
  dataset,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return dataset.rows;
    const term = searchTerm.toLowerCase();
    return dataset.rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(term))
    );
  }, [dataset.rows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const displayedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white border-2 border-black shadow-brutal-lg w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b-2 border-black bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[#FFC700] border border-black"></span>
            <h3 className="font-mono font-bold text-sm tracking-tight">
              BẢNG DỮ LIỆU ĐẦY ĐỦ // {dataset.filename}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-200 border border-black font-mono transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Stats bar */}
        <div className="p-4 border-b-2 border-black bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm kiếm dòng, giá trị..."
              className="w-full pl-9 pr-3 py-2 border-2 border-black text-xs font-mono bg-[#FAF8F5] focus:outline-none"
            />
          </div>
          <div className="text-xs font-mono text-neutral-600 self-end sm:self-center">
            Hiển thị <strong>{filteredRows.length}</strong> / {dataset.rowCount} bản ghi
          </div>
        </div>

        {/* Table View */}
        <div className="p-4 overflow-auto flex-1">
          <div className="border-2 border-black overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse bg-white">
              <thead className="bg-[#F0ECE4] border-b-2 border-black text-black sticky top-0">
                <tr>
                  <th className="p-2 border-r border-black font-bold">#</th>
                  {dataset.columns.map((col) => (
                    <th key={col.name} className="p-2 border-r border-black font-bold whitespace-nowrap">
                      {col.name}
                      <span className="block text-[9px] text-neutral-500 font-normal uppercase">
                        {col.type}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx;
                  return (
                    <tr key={idx} className="border-b border-neutral-200 hover:bg-[#FAF8F5]">
                      <td className="p-2 border-r border-black font-bold bg-[#FAF8F5] text-neutral-500">
                        {globalIdx}
                      </td>
                      {dataset.columns.map((col) => {
                        const val = row[col.name];
                        return (
                          <td key={col.name} className="p-2 border-r border-neutral-200 whitespace-nowrap">
                            {typeof val === 'number' ? val.toFixed(3) : String(val ?? '')}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t-2 border-black bg-[#FAF8F5] flex items-center justify-between">
          <div className="text-xs font-mono text-neutral-600">
            Trang {currentPage} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 border border-black bg-white disabled:opacity-40 hover:bg-neutral-100 font-mono text-xs flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trước</span>
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 border border-black bg-white disabled:opacity-40 hover:bg-neutral-100 font-mono text-xs flex items-center gap-1"
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
