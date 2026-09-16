import React from 'react';

interface FeatureDetailModalProps {
  feature: 'rag' | 'pandas' | 'sandbox' | null;
  onClose: () => void;
  onTrySample: () => void;
}

export const FeatureDetailModal: React.FC<FeatureDetailModalProps> = ({
  feature,
  onClose,
  onTrySample,
}) => {
  if (!feature) return null;

  const content = {
    rag: {
      title: 'SCHEMA-AWARE RAG (KIẾN TRÚC TRUY XUẤT NGỮ NGHĨA)',
      badge: 'RAG ENGINE V2.4',
      icon: '📐',
      description:
        'Tự động gắn thẻ ngữ cảnh, phân tích mối quan hệ phụ thuộc giữa các cột dữ liệu và lập bản đồ vector hóa cấu trúc schema.',
      points: [
        'Nhận diện tức thì kiểu dữ liệu thống kê: Temporal (Thời gian), Categorical (Định danh phân loại), Numeric (Số thực/Tiền tệ).',
        'Tạo lược đồ ngữ nghĩa (Semantic Data Dictionary) không cần cấu hình thủ công.',
        'Hạn chế triệt để hiện tượng Hallucination khi đặt câu hỏi truy vấn dữ liệu phức tạp.',
      ],
      code: `# Vector Schema Mapping Output
{
  "temporal": ["date"],
  "categorical": ["product_name", "status"],
  "numeric": ["revenue_vnd"],
  "confidence_score": 0.998
}`,
      cta: 'Trải Nghiệm Với Dữ Liệu Mẫu →',
    },
    pandas: {
      title: 'TEXT-TO-PANDAS AGENT (BIÊN DỊCH MÃ TỰ ĐỘNG)',
      badge: 'PYTHON 3.11 // PANDAS 2.2',
      icon: '</>',
      description:
        'Biên dịch ngôn ngữ tự nhiên thành mã Pandas tối ưu, tự phát hiện lỗi cú pháp và vẽ biểu đồ phân tích tức thời.',
      points: [
        'Hỗ trợ truy vấn bằng cả Tiếng Việt và Tiếng Anh (Top N, Tính tổng, Nhóm theo, Lọc điều kiện, Phân vị thống kê).',
        'Cung cấp mã nguồn Python có thể sao chép trực tiếp vào Jupyter Notebook hoặc production pipeline.',
        'Tự động đề xuất dạng biểu đồ phù hợp nhất với dữ liệu đầu ra.',
      ],
      code: `# Ví dụ truy vấn tự sinh:
df.groupby('product_name')['revenue_vnd'].sum().sort_values(ascending=False).head(5)`,
      cta: 'Thử Chạy Truy Vấn →',
    },
    sandbox: {
      title: 'EXECUTION SANDBOX (BẢO MẬT & CÔ LẬP DỮ LIỆU)',
      badge: 'SECURITY AIR-GAPPED',
      icon: '🛡️',
      description:
        'Môi trường tính toán và phân tích an toàn, bảo vệ dữ liệu nhạy cảm doanh nghiệp tuyệt đối.',
      points: [
        'Toàn bộ quá trình tính toán và phân tích được thực hiện cục bộ trên trình duyệt, không lưu trữ dữ liệu cá nhân ra máy chủ bên thứ ba.',
        'Kiểm soát tài nguyên bộ nhớ chặt chẽ, tối ưu cho file dữ liệu lên tới 100MB.',
        'Hỗ trợ xuất mã Python độc lập để chạy trong máy chủ nội bộ On-premise hoặc VPC doanh nghiệp.',
      ],
      code: `# Isolated Evaluation Context
Sandbox.enforce_memory_limit("512MB")
Sandbox.block_external_network_io()
DataPersistence: CLIENT_SIDE_EPHEMERAL`,
      cta: 'Khởi Chạy Ngay →',
    },
  }[feature];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="neo-box-lg bg-white w-full max-w-xl p-6 relative">
        <div className="flex items-center justify-between border-b-2 border-slate-950 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-950 bg-[#FFCC00] flex items-center justify-center font-mono font-black text-sm shadow-[2px_2px_0px_#111111]">
              {content.icon}
            </div>
            <div>
              <h3 className="font-mono font-black text-sm uppercase text-slate-950">
                {content.title}
              </h3>
              <span className="text-[10px] font-mono font-bold bg-[#FAF7F2] border border-slate-900 px-1.5 py-0.2 uppercase">
                {content.badge}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border-2 border-slate-950 bg-white hover:bg-[#E63B2E] hover:text-white flex items-center justify-center font-bold font-mono text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-700 font-medium mb-4 leading-relaxed">
          {content.description}
        </p>

        <div className="space-y-2 mb-5">
          {content.points.map((pt, i) => (
            <div key={i} className="flex items-start gap-2 text-xs font-mono text-slate-800">
              <span className="text-[#FFCC00] bg-slate-950 px-1 font-bold text-[10px] mt-0.5">
                ✓
              </span>
              <span>{pt}</span>
            </div>
          ))}
        </div>

        <div className="mb-5">
          <pre className="border-2 border-slate-950 bg-slate-950 text-amber-300 p-3 font-mono text-[11px] overflow-x-auto">
            <code>{content.code}</code>
          </pre>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-slate-950">
          <button
            onClick={onClose}
            className="neo-btn px-4 py-2 bg-white text-xs font-mono font-bold uppercase"
          >
            Đóng
          </button>
          <button
            onClick={() => {
              onClose();
              onTrySample();
            }}
            className="neo-btn px-5 py-2 bg-[#FFCC00] text-slate-950 text-xs font-mono font-bold uppercase"
          >
            {content.cta}
          </button>
        </div>
      </div>
    </div>
  );
};
