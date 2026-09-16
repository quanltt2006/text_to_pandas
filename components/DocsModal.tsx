import React from 'react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSample: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose, onLoadSample }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="neo-box-lg bg-white w-full max-w-3xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto font-mono">
        <div className="flex items-center justify-between border-b-2 border-slate-950 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border-2 border-slate-950 bg-[#FFCC00] flex items-center justify-center font-mono font-black text-base shadow-[2.5px_2.5px_0px_#111111]">
              📖
            </div>
            <div>
              <h3 className="font-mono font-black text-lg uppercase text-slate-950">
                TÀI LIỆU HƯỚNG DẪN SMART CSV ANALYST
              </h3>
              <p className="text-[11px] text-slate-600">
                Kiến trúc Bauhaus Neo-Brutalist &amp; Engine Phân Tích Pandas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border-2 border-slate-950 bg-white hover:bg-[#E63B2E] hover:text-white flex items-center justify-center font-bold font-mono text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 text-xs text-slate-800">
          {/* Section 1 */}
          <div className="space-y-2">
            <h4 className="font-black text-sm uppercase text-slate-950 border-b border-slate-300 pb-1">
              1. Triết lý Thiết kế: Bauhaus Neo-Brutalist
            </h4>
            <p className="leading-relaxed font-sans text-slate-700">
              Ứng dụng áp dụng nguyên tắc <strong>&quot;Form Follows Function&quot;</strong> (Hình thức tuân theo công năng) của phong cách kiến trúc Bauhaus. Không có gradient mờ nhạt hay viền cong hào nhoáng, mọi yếu tố đều có viền đậm 2–3px dứt khoát, độ tương phản cao và màu sắc rõ ràng:
            </p>
            <ul className="list-disc pl-5 space-y-1 font-mono text-slate-700">
              <li>Màu nền: Giấy ấm thủ công <code>#F5F0E8</code> kết hợp lưới điểm Bauhaus.</li>
              <li>Màu điểm nhấn: Vàng Bauhaus <code>#FFCC00</code>, Xanh cobalt <code>#0B3BFF</code>, Đỏ cảnh báo <code>#E63B2E</code>.</li>
              <li>Bóng khối cứng (Solid Offset Shadow): <code>4px 4px 0px #111111</code>.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h4 className="font-black text-sm uppercase text-slate-950 border-b border-slate-300 pb-1">
              2. Định dạng Tệp Được Hỗ Trợ
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-slate-900 bg-[#FAF7F2] p-3">
                <span className="font-bold text-slate-950 block">File CSV (.csv)</span>
                <span className="text-[11px] text-slate-600">Phân tách bằng dấu phẩy, hỗ trợ chuỗi có dấu ngoặc kép.</span>
              </div>
              <div className="border border-slate-900 bg-[#FAF7F2] p-3">
                <span className="font-bold text-slate-950 block">File TSV (.tsv)</span>
                <span className="text-[11px] text-slate-600">Phân tách bằng tab, tự động nhận diện delimiter.</span>
              </div>
              <div className="border border-slate-900 bg-[#FAF7F2] p-3">
                <span className="font-bold text-slate-950 block">Google Sheets</span>
                <span className="text-[11px] text-slate-600">Hỗ trợ dán link chia sẻ công khai để trích xuất CSV trực tiếp.</span>
              </div>
              <div className="border border-slate-900 bg-[#FAF7F2] p-3">
                <span className="font-bold text-slate-950 block">Kích Thước Tối Đa</span>
                <span className="text-[11px] text-slate-600">Tối ưu cho tập dữ liệu lên đến 100MB xử lý cục bộ trên trình duyệt.</span>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h4 className="font-black text-sm uppercase text-slate-950 border-b border-slate-300 pb-1">
              3. Phím Tắt &amp; Thao Tác Nhanh
            </h4>
            <div className="space-y-1.5 font-mono">
              <div className="flex justify-between border-b border-dashed border-slate-300 py-1">
                <span>Kéo thả file vào Dropzone</span>
                <span className="font-bold text-slate-950">Tải tệp tức thì</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-slate-300 py-1">
                <span>Nhấp tiêu đề cột bảng</span>
                <span className="font-bold text-slate-950">Sắp xếp Tăng / Giảm</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-slate-300 py-1">
                <span>Nhấp xem thẻ Prompt mẫu</span>
                <span className="font-bold text-slate-950">Tự động sinh mã Pandas &amp; vẽ biểu đồ</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t-2 border-slate-950 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onLoadSample();
            }}
            className="neo-btn px-4 py-2 bg-[#FFCC00] text-slate-950 text-xs font-mono font-bold uppercase"
          >
            ⚡ Khởi Chạy Bộ Dữ Liệu Mẫu
          </button>
          <button
            onClick={onClose}
            className="neo-btn px-4 py-2 bg-white text-xs font-mono font-bold uppercase text-slate-950"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
