import React, { useState } from 'react';
import { Dataset, ChatMessage } from '../types';
import { X, Copy, Check, Printer, Download } from 'lucide-react';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  messages: ChatMessage[];
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  dataset,
  messages,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const aiResponses = messages.filter((m) => m.role === 'assistant');

  const generateMarkdownReport = () => {
    return `# BÁO CÁO PHÂN TÍCH DỮ LIỆU // TEXT2PANDAS
Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}
Tệp dữ liệu: ${dataset.filename} (${dataset.name})

## 1. TỔNG QUAN TẬP DỮ LIỆU
- **Tổng số bản ghi:** ${dataset.rowCount} hàng
- **Số lượng đặc trưng:** ${dataset.columnCount} cột
- **Tỷ lệ giá trị rỗng (Nulls):** ${dataset.nullPercentage.toFixed(1)}%
- **Độ tương quan trung bình:** ${dataset.avgCorrelation.toFixed(2)}

## 2. CÁC PHÂN TÍCH ĐÃ THỰC HIỆN
${aiResponses
  .map(
    (resp, i) => `
### Truy vấn #${i + 1}
**Kết luận:**
${resp.content}

${resp.code ? `\`\`\`python\n${resp.code}\n\`\`\`` : ''}

${
  resp.executionOutput?.bars
    ? resp.executionOutput.bars
        .map((b) => `- ${b.label}: ${b.metric1Label}=${b.metric1Value} (Tỷ trọng: ${b.percentage}%)`)
        .join('\n')
    : ''
}

${resp.note ? `*${resp.note}*` : ''}
`
  )
  .join('\n---\n')}

---
*Báo cáo được khởi tạo tự động bởi Text2Pandas - Smart CSV Analyst Engine (Pandas 2.2)*
`;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdownReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const md = generateMarkdownReport();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_${dataset.id}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white border-2 border-black shadow-brutal-lg w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b-2 border-black bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[#FFC700] border border-black"></span>
            <h3 className="font-mono font-bold text-sm tracking-tight">XUẤT BÁO CÁO PHÂN TÍCH // EXPORT REPORT</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-200 border border-black font-mono transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4 font-mono text-xs">
          <div className="p-4 bg-[#FAF8F5] border-2 border-black">
            <div className="flex items-center justify-between border-b border-black pb-2 mb-3">
              <span className="font-bold uppercase text-sm">BẢNG XEM TRƯỚC BÁO CÁO MARKDOWN</span>
              <span className="text-[10px] text-neutral-500">FORMAT: MARKDOWN / UTF-8</span>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-neutral-800 text-[11px] leading-relaxed max-h-[360px] overflow-y-auto bg-white p-3 border border-neutral-300">
              {generateMarkdownReport()}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t-2 border-black bg-white flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-mono text-neutral-500">
            {aiResponses.length} mục phân tích trong báo cáo
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="px-3.5 py-1.5 bg-white hover:bg-neutral-100 border-2 border-black font-mono text-xs font-bold shadow-brutal-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'ĐÃ SAO CHÉP' : 'SAO CHÉP MARKDOWN'}</span>
            </button>
            <button
              onClick={handleDownloadFile}
              className="px-4 py-1.5 bg-[#FFC700] hover:bg-yellow-400 border-2 border-black font-mono text-xs font-bold shadow-brutal-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>TẢI TỆP .MD</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
