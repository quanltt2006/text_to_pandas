import React, { useRef, useState } from 'react';
import { formatVND } from '../utils/csvParser';

interface LandingViewProps {
  onLoadSample: () => void;
  onFileUpload: (file: File) => void;
  onOpenUrlImport: () => void;
  onOpenFeatureDetail: (feature: 'rag' | 'pandas' | 'sandbox') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onLoadSample,
  onFileUpload,
  onOpenUrlImport,
  onOpenFeatureDetail,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full flex flex-col items-center">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-8 space-y-4" data-purpose="hero-header">
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
          id="dropzone"
          data-purpose="file-dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full group cursor-pointer neo-box-lg p-8 sm:p-12 flex flex-col items-center justify-center text-center transition-all ${
            isDragging ? 'bg-[#FFCC00]/20 scale-[1.01]' : 'bg-white hover:bg-[#FAF7F2]'
          }`}
        >
          {/* Yellow Icon Box */}
          <div className="w-16 h-16 mb-5 neo-box bg-[#FFCC00] text-slate-950 flex items-center justify-center transition-transform group-hover:-translate-y-0.5">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              strokeLinecap="square"
              strokeLinejoin="miter"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
          </div>

          <h3 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight">
            KÉO THẢ FILE CSV VÀO ĐÂY
          </h3>
          <p className="text-sm text-slate-700 mt-2 font-medium uppercase">
            hoặc{' '}
            <span className="underline font-bold decoration-2 underline-offset-4 text-slate-950 hover:bg-[#FFCC00] px-1 transition-colors">
              Duyệt tập tin từ máy tính
            </span>
          </p>
          <p className="mt-4 text-xs font-mono text-slate-600 uppercase font-semibold">
            HỖ TRỢ ĐỊNH DẠNG .CSV, .TSV • TỐI ĐA 100MB
          </p>

          <div className="mt-6 pt-4 border-t-2 border-slate-900 w-full flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-bold uppercase text-slate-900 font-mono">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenUrlImport();
              }}
              className="inline-flex items-center gap-1.5 hover:underline decoration-2 cursor-pointer"
            >
              [ Dán URL Google Sheet / CSV ]
            </button>
            <span className="text-slate-400">/</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFeatureDetail('sandbox');
              }}
              className="inline-flex items-center gap-1.5 hover:underline decoration-2 cursor-pointer"
            >
              [ Kết nối Kho SQL / DB ]
            </button>
          </div>

          <input
            ref={fileInputRef}
            id="csv-file-input"
            type="file"
            accept=".csv, .tsv, text/csv, text/tab-separated-values"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Load Sample Data Button */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <span className="text-xs font-mono font-bold uppercase text-slate-700">Chưa có file?</span>
          <button
            id="btn-load-sample-hero"
            type="button"
            data-purpose="load-sample-data"
            onClick={onLoadSample}
            className="neo-btn inline-flex items-center gap-2 px-5 py-2 font-bold text-xs uppercase tracking-wider text-slate-950 bg-white hover:bg-[#FFCC00] cursor-pointer"
          >
            <span>⚡ Khởi Chạy Dữ Liệu Mẫu (Doanh Số 2024)</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Interactive Sample Preview Mini Data Grid */}
      <div
        id="sample-preview-card"
        onClick={onLoadSample}
        title="Nhấp để tải toàn bộ bảng vào Workspace"
        className="w-full max-w-3xl mx-auto mt-9 neo-box bg-white overflow-hidden cursor-pointer hover:shadow-[6px_6px_0px_#111111] transition-shadow group"
      >
        <div className="px-4 py-2 bg-[#FAF7F2] border-b-2 border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 bg-slate-950 border border-slate-900 group-hover:bg-[#FFCC00]"></div>
            <span className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
              preview_sample_retail_2024.csv
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="border border-slate-900 text-[10px] font-mono font-bold text-slate-950 bg-white px-2 py-0.5 uppercase">
              5 CỘT • 200 DÒNG
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-700 group-hover:underline">
              [Nhấp để phân tích ↗]
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-900 border-b-2 border-slate-900">
                <th className="py-2 px-4 font-black uppercase">order_id</th>
                <th className="py-2 px-4 font-black uppercase">date</th>
                <th className="py-2 px-4 font-black uppercase">product_name</th>
                <th className="py-2 px-4 font-black uppercase text-right">revenue_vnd</th>
                <th className="py-2 px-4 font-black uppercase text-center">status</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-200 text-slate-900 font-mono">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-bold text-slate-950">#VN-8901</td>
                <td className="py-2 px-4 text-slate-700">2024-11-01</td>
                <td className="py-2 px-4 font-sans font-bold text-slate-950">MacBook Pro M3 Max 36GB</td>
                <td className="py-2 px-4 text-right font-bold text-slate-950">{formatVND(68990000)}</td>
                <td className="py-2 px-4 text-center">
                  <span className="border border-slate-950 inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-white text-slate-950 uppercase">
                    Hoàn tất
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-bold text-slate-950">#VN-8902</td>
                <td className="py-2 px-4 text-slate-700">2024-11-02</td>
                <td className="py-2 px-4 font-sans font-bold text-slate-950">Màn hình Dell UltraSharp 27&quot;</td>
                <td className="py-2 px-4 text-right font-bold text-slate-950">{formatVND(14250000)}</td>
                <td className="py-2 px-4 text-center">
                  <span className="border border-slate-950 inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-white text-slate-950 uppercase">
                    Hoàn tất
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-bold text-slate-950">#VN-8903</td>
                <td className="py-2 px-4 text-slate-700">2024-11-03</td>
                <td className="py-2 px-4 font-sans font-bold text-slate-950">Bàn phím cơ Keychron Q1 Pro</td>
                <td className="py-2 px-4 text-right font-bold text-slate-950">{formatVND(4390000)}</td>
                <td className="py-2 px-4 text-center">
                  <span className="border border-slate-950 inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-[#FAF7F2] text-slate-950 uppercase">
                    Đang giao
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 bg-[#FAF7F2] border-t-2 border-slate-900 flex items-center justify-between text-xs font-mono text-slate-800">
          <span>Tự động nhận diện: 1 Temporal, 2 Categorical, 2 Numeric</span>
          <span className="font-bold">df.head(3)</span>
        </div>
      </div>

      {/* Feature Pillars (3 Columns - Modern Neo-Brutalist) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-10" data-purpose="core-features">
        {/* Card 1 */}
        <div
          id="feature-card-rag"
          onClick={() => onOpenFeatureDetail('rag')}
          className="neo-box bg-white p-6 flex flex-col justify-between group hover:bg-[#FAF7F2] transition-colors cursor-pointer"
        >
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

        {/* Card 2 */}
        <div
          id="feature-card-pandas"
          onClick={() => onOpenFeatureDetail('pandas')}
          className="neo-box bg-white p-6 flex flex-col justify-between group hover:bg-[#FAF7F2] transition-colors cursor-pointer"
        >
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
            <span className="underline decoration-2">Xem Prompt</span>
            <span className="font-bold">→</span>
          </div>
        </div>

        {/* Card 3 */}
        <div
          id="feature-card-sandbox"
          onClick={() => onOpenFeatureDetail('sandbox')}
          className="neo-box bg-white p-6 flex flex-col justify-between group hover:bg-[#FAF7F2] transition-colors cursor-pointer"
        >
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
            <span className="underline decoration-2">Bảo Mật</span>
            <span className="font-bold">→</span>
          </div>
        </div>
      </div>
    </div>
  );
};
