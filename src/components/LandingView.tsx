import { useCallback, useRef, useState } from 'react';
import { uploadCSV } from '../utils/api';
import { DatasetProfile } from '../types';

interface Props {
  onDataLoaded: (dataset: { datasetId: string; profile: DatasetProfile }) => void;
}

export default function LandingView({ onDataLoaded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Vui lòng chọn file CSV');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File quá lớn (>50MB). MVP hỗ trợ tối đa 50MB.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const result = await uploadCSV(file);
      onDataLoaded(result);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Lỗi khi upload file CSV. Kiểm tra backend đã chạy chưa?'
      );
    } finally {
      setIsLoading(false);
    }
  }, [onDataLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const loadSampleData = useCallback(() => {
    const headers = 'id,name,category,price,quantity,rating,city,date';
    const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Sports'];
    const cities = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];
    const names = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E', 'Widget X', 'Gadget Y', 'Item Z'];

    const rows = Array.from({ length: 200 }, (_, i) => {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      const name = names[Math.floor(Math.random() * names.length)];
      const price = (Math.random() * 1000 + 10).toFixed(2);
      const quantity = Math.floor(Math.random() * 500);
      const rating = (Math.random() * 4 + 1).toFixed(1);
      const date = `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
      return `${i + 1},${name},${cat},${price},${quantity},${rating},${city},${date}`;
    });

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const file = new File([blob], 'sample_sales_data.csv', { type: 'text/csv' });
    handleFile(file);
  }, [handleFile]);

  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full flex flex-col items-center">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-8 space-y-4">
        <h1 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tight leading-none uppercase">
          <span className="bg-[#FFCC00] px-3 py-1 inline-block border-2 border-slate-950 shadow-[3px_3px_0px_#111111] mb-2">
            TẢI LÊN &amp; PHÂN TÍCH
          </span>
          <br />
          DỮ LIỆU CSV TỨC THÌ
        </h1>
        <p className="text-slate-800 text-sm sm:text-base font-medium max-w-xl mx-auto leading-relaxed pt-2">
          Tự động trích xuất schema, suy luận kiểu dữ liệu thống kê và khởi tạo môi trường thực thi Pandas cô lập.
        </p>
      </div>

      {/* Upload Card Container */}
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={handleDrop}
          className={`w-full group cursor-pointer neo-box-lg p-8 sm:p-12 flex flex-col items-center justify-center text-center transition-all ${
            isDragging ? 'bg-[#FFCC00]/20 scale-[1.01]' : 'bg-white hover:bg-[#FAF7F2]'
          }`}
        >
          <div className="w-16 h-16 mb-5 neo-box bg-[#FFCC00] text-slate-950 flex items-center justify-center transition-transform group-hover:-translate-y-0.5">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
          </div>

          <h3 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight">
            {isLoading ? 'Đang PHÂN TÍCH...' : 'KÉO THẢ FILE CSV VÀO ĐÂY'}
          </h3>
          <p className="text-sm text-slate-700 mt-2 font-medium uppercase">
            hoặc{' '}
            <span className="underline font-bold decoration-2 underline-offset-4 text-slate-950 hover:bg-[#FFCC00] px-1 transition-colors">
              Duyệt tập tin từ máy tính
            </span>
          </p>
          <p className="mt-4 text-xs font-mono text-slate-600 uppercase font-semibold">
            HỖ TRỢ ĐỊNH DẠNG .CSV • TỐI ĐA 50MB
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, text/csv"
            className="hidden"
            onChange={handleFileChange}
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="mt-4 w-full neo-box bg-white p-4 text-center">
            <p className="text-xs font-mono font-bold uppercase text-red-600">⚠ {error}</p>
          </div>
        )}

        {/* Load Sample Data Button */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <span className="text-xs font-mono font-bold uppercase text-slate-700">Chưa có file?</span>
          <button
            type="button"
            onClick={loadSampleData}
            disabled={isLoading}
            className="neo-btn inline-flex items-center gap-2 px-5 py-2 font-bold text-xs uppercase tracking-wider text-slate-950 bg-white hover:bg-[#FFCC00] cursor-pointer disabled:opacity-50"
          >
            <span>⚡ Khởi Chạy Dữ Liệu Mẫu (200 Rows)</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
        <div className="neo-box bg-white p-6 flex flex-col justify-between group hover:bg-[#FAF7F2] transition-colors">
          <div className="space-y-3">
            <div className="w-10 h-10 border-2 border-slate-950 bg-white flex items-center justify-center text-slate-950 mb-3 shadow-[2px_2px_0px_#111111] group-hover:bg-[#FFCC00] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <h2 className="text-base font-black text-slate-950 uppercase tracking-tight">SCHEMA-AWARE RAG</h2>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Tự động gắn thẻ ngữ cảnh, phân tích cấu trúc giữa các cột dữ liệu và truy xuất ngữ nghĩa siêu tốc.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t-2 border-slate-900 flex items-center justify-between text-xs font-bold uppercase text-slate-950 font-mono">
            <span className="underline decoration-2">Khám phá</span>
            <span className="font-bold">→</span>
          </div>
        </div>

        <div className="neo-box bg-white p-6 flex flex-col justify-between group hover:bg-[#FAF7F2] transition-colors">
          <div className="space-y-3">
            <div className="w-10 h-10 border-2 border-slate-950 bg-white flex items-center justify-center text-slate-950 mb-3 shadow-[2px_2px_0px_#111111] group-hover:bg-[#FFCC00] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="m18 16 4-4-4-4" />
                <path d="m6 8-4 4 4 4" />
                <path d="m14.5 4-5 16" />
              </svg>
            </div>
            <h2 className="text-base font-black text-slate-950 uppercase tracking-tight">TEXT-TO-PANDAS AGENT</h2>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Biên dịch ngôn ngữ tự nhiên thành mã Pandas tối ưu, tự phát hiện lỗi cú pháp và vẽ biểu đồ phân tích tức thời.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t-2 border-slate-900 flex items-center justify-between text-xs font-bold uppercase text-slate-950 font-mono">
            <span className="underline decoration-2">Sinh code</span>
            <span className="font-bold">→</span>
          </div>
        </div>

        <div className="neo-box bg-white p-6 flex flex-col justify-between group hover:bg-[#FAF7F2] transition-colors">
          <div className="space-y-3">
            <div className="w-10 h-10 border-2 border-slate-950 bg-white flex items-center justify-center text-slate-950 mb-3 shadow-[2px_2px_0px_#111111] group-hover:bg-[#FFCC00] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-base font-black text-slate-950 uppercase tracking-tight">EXECUTION SANDBOX</h2>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Không gian thực thi Python cô lập, chặn rò rỉ dữ liệu nhạy cảm và kiểm soát nghiêm ngặt tài nguyên bộ nhớ.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t-2 border-slate-900 flex items-center justify-between text-xs font-bold uppercase text-slate-950 font-mono">
            <span className="underline decoration-2">Bảo mật</span>
            <span className="font-bold">→</span>
          </div>
        </div>
      </div>
    </div>
  );
}