import React, { useState } from 'react';

interface UrlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCsvText: (text: string, sourceName: string) => void;
}

export const UrlImportModal: React.FC<UrlImportModalProps> = ({
  isOpen,
  onClose,
  onImportCsvText,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'paste'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) {
      setErrorMsg('Vui lòng nhập đường link hợp lệ.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      let targetUrl = urlInput.trim();
      // If it's a Google Sheet link, convert to CSV export format
      if (targetUrl.includes('docs.google.com/spreadsheets')) {
        const matches = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (matches && matches[1]) {
          targetUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/export?format=csv`;
        }
      }

      const res = await fetch(targetUrl);
      if (!res.ok) {
        throw new Error(`Lỗi kết nối (${res.status}): Không thể tải file từ URL này.`);
      }
      const text = await res.text();
      if (!text || text.trim().length === 0) {
        throw new Error('Nội dung trả về trống.');
      }

      const inferredName = urlInput.split('/').pop()?.split('?')[0] || 'imported_online.csv';
      onImportCsvText(text, inferredName.endsWith('.csv') ? inferredName : `${inferredName}.csv`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tải CSV từ link này. Hãy đảm bảo link cho phép truy cập công khai (CORS/Public).');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Vui lòng dán nội dung CSV hoặc TSV.');
      return;
    }
    onImportCsvText(pastedText.trim(), 'pasted_data.csv');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="neo-box-lg bg-white w-full max-w-xl p-6 relative">
        <div className="flex items-center justify-between border-b-2 border-slate-950 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-950 bg-[#FFCC00] flex items-center justify-center font-mono font-black text-sm shadow-[2px_2px_0px_#111111]">
              🔗
            </div>
            <h3 className="font-mono font-black text-base uppercase text-slate-950">
              NHẬP DỮ LIỆU TỪ NGUỒN NGOÀI
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border-2 border-slate-950 bg-white hover:bg-[#E63B2E] hover:text-white flex items-center justify-center font-bold font-mono text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-slate-950 gap-2 font-mono text-xs font-bold uppercase mb-4">
          <button
            onClick={() => {
              setActiveTab('url');
              setErrorMsg('');
            }}
            className={`px-3 py-1.5 border-2 border-slate-950 border-b-0 cursor-pointer ${
              activeTab === 'url' ? 'bg-[#FFCC00] text-slate-950' : 'bg-white text-slate-700'
            }`}
          >
            Google Sheet / URL
          </button>
          <button
            onClick={() => {
              setActiveTab('paste');
              setErrorMsg('');
            }}
            className={`px-3 py-1.5 border-2 border-slate-950 border-b-0 cursor-pointer ${
              activeTab === 'paste' ? 'bg-[#FFCC00] text-slate-950' : 'bg-white text-slate-700'
            }`}
          >
            Dán Trực Tiếp (Raw CSV)
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 border-2 border-[#E63B2E] bg-red-50 text-[#E63B2E] text-xs font-mono font-bold">
            ⚠️ {errorMsg}
          </div>
        )}

        {activeTab === 'url' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-slate-800 mb-1.5">
                Nhập liên kết Google Sheet (Công khai) hoặc URL File .CSV:
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/... hoặc https://example.com/data.csv"
                className="w-full border-2 border-slate-950 bg-[#FAF7F2] p-2.5 font-mono text-xs text-slate-950 outline-none"
              />
            </div>
            <p className="text-[11px] font-mono text-slate-600">
              * Nếu dùng Google Sheet, đảm bảo bảng tính được chia sẻ ở chế độ &quot;Bất kỳ ai có liên kết đều có thể xem&quot;.
            </p>

            <button
              onClick={handleFetchUrl}
              disabled={loading}
              className="w-full neo-btn py-2.5 bg-[#FFCC00] font-mono font-bold text-xs uppercase text-slate-950 flex items-center justify-center gap-2"
            >
              {loading ? 'Đang Tải & Xử Lý...' : 'Nạp Dữ Liệu Từ URL →'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-slate-800 mb-1.5">
                Dán văn bản định dạng CSV hoặc TSV:
              </label>
              <textarea
                rows={7}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="col1,col2,col3&#10;val1,val2,val3&#10;..."
                className="w-full border-2 border-slate-950 bg-[#FAF7F2] p-3 font-mono text-xs text-slate-950 outline-none"
              />
            </div>

            <button
              onClick={handlePasteSubmit}
              className="w-full neo-btn py-2.5 bg-[#FFCC00] font-mono font-bold text-xs uppercase text-slate-950"
            >
              Phân Tích Dữ Liệu Này →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
