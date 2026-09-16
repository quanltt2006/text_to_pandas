import React, { useState, useRef } from 'react';
import { Dataset } from '../types';
import { ALTERNATIVE_DATASETS } from '../data/sampleDatasets';
import { X, Check, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';

interface DatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDataset: Dataset;
  onSelectDataset: (dataset: Dataset) => void;
}

export const DatasetModal: React.FC<DatasetModalProps> = ({
  isOpen,
  onClose,
  currentDataset,
  onSelectDataset,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setUploadError('Vui lòng chọn tệp định dạng .csv');
      return;
    }
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setUploadError('Tệp CSV không có đủ dữ liệu (tối thiểu 1 dòng tiêu đề và 1 dòng dữ liệu).');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
        const rows: Record<string, string | number>[] = [];
        let totalNulls = 0;
        let totalCells = 0;

        for (let i = 1; i < Math.min(lines.length, 1000); i++) {
          const vals = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
          const rowObj: Record<string, string | number> = {};
          headers.forEach((h, colIdx) => {
            const rawVal = vals[colIdx] ?? '';
            totalCells++;
            if (rawVal === '' || rawVal.toLowerCase() === 'nan' || rawVal.toLowerCase() === 'null') {
              totalNulls++;
            }
            const num = Number(rawVal);
            rowObj[h] = isNaN(num) || rawVal === '' ? rawVal : num;
          });
          rows.push(rowObj);
        }

        const parsedColumns = headers.map((h) => {
          const sampleVal = rows[0]?.[h];
          const isNum = typeof sampleVal === 'number';
          return {
            name: h,
            type: (isNum ? 'float' : 'category') as 'float' | 'category',
            nullCount: 0,
          };
        });

        const newDataset: Dataset = {
          id: `custom_${Date.now()}`,
          filename: file.name,
          name: `Dữ liệu tải lên: ${file.name}`,
          rowCount: lines.length - 1,
          columnCount: headers.length,
          nullPercentage: totalCells > 0 ? (totalNulls / totalCells) * 100 : 0,
          avgCorrelation: 0.45,
          description: `Tập dữ liệu CSV tải lên bởi người dùng (${lines.length - 1} dòng, ${headers.length} cột)`,
          columns: parsedColumns,
          rows: rows.slice(0, 50),
        };

        onSelectDataset(newDataset);
        onClose();
      } catch {
        setUploadError('Lỗi đọc nội dung CSV. Vui lòng kiểm tra lại cấu trúc file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white border-2 border-black shadow-brutal-lg w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b-2 border-black bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[#FFC700] border border-black"></span>
            <h3 className="font-mono font-bold text-sm tracking-tight">ĐỔI TẬP DỮ LIỆU // CHỌN HOẶC TẢI LÊN CSV</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-200 border border-black font-mono transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-5">
          {/* Upload Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed border-black p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
              dragOver ? 'bg-[#FFC700]/20 border-solid' : 'bg-[#FAF8F5] hover:bg-[#F0ECE4]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <div className="w-10 h-10 bg-[#FFC700] border-2 border-black flex items-center justify-center shadow-brutal-sm">
              <Upload className="w-5 h-5 text-black" />
            </div>
            <p className="font-mono font-bold text-xs text-center">
              KÉO THẢ TỆP CSV VÀO ĐÂY HOẶC NHẤN ĐỂ DUYỆT TỆP
            </p>
            <span className="text-[10px] font-mono text-neutral-500">
              Hỗ trợ định dạng .csv (mã hóa UTF-8)
            </span>
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 p-2 bg-red-100 border border-red-500 text-red-700 text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Sample Datasets List */}
          <div className="flex flex-col gap-2">
            <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-neutral-600">
              HOẶC CHỌN TẬP DỮ LIỆU CÓ SẴN
            </h4>

            <div className="flex flex-col gap-3">
              {ALTERNATIVE_DATASETS.map((ds) => {
                const isSelected = currentDataset.id === ds.id;
                return (
                  <div
                    key={ds.id}
                    onClick={() => {
                      onSelectDataset(ds);
                      onClose();
                    }}
                    className={`p-3.5 border-2 border-black flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#FFC700] shadow-brutal-sm'
                        : 'bg-white hover:bg-[#FAF8F5] shadow-brutal-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-white border border-black flex items-center justify-center shrink-0 mt-0.5">
                        <FileSpreadsheet className="w-4 h-4 text-black" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs">{ds.name}</span>
                          <span className="text-[10px] font-mono bg-white px-1.5 py-0.2 border border-black">
                            {ds.filename}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-600 mt-1 line-clamp-1">{ds.description}</p>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-500 mt-1">
                          <span>{ds.rowCount} dòng</span>
                          <span>•</span>
                          <span>{ds.columnCount} cột</span>
                          <span>•</span>
                          <span>Null: {ds.nullPercentage}%</span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 bg-black text-white flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t-2 border-black bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-neutral-100 border-2 border-black font-mono text-xs font-bold shadow-brutal-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
            ĐÓNG
          </button>
        </div>
      </div>
    </div>
  );
};
