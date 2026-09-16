import React from 'react';
import { SAMPLE_DATASETS, SampleDatasetDefinition } from '../data/sampleDatasets';

interface SampleDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDataset: (ds: SampleDatasetDefinition) => void;
}

export const SampleDataModal: React.FC<SampleDataModalProps> = ({
  isOpen,
  onClose,
  onSelectDataset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="neo-box-lg bg-white w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b-2 border-slate-950 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-950 bg-[#FFCC00] flex items-center justify-center font-mono font-black text-sm shadow-[2px_2px_0px_#111111]">
              ⚡
            </div>
            <h3 className="font-mono font-black text-lg uppercase text-slate-950">
              KHO DỮ LIỆU MẪU CHUẨN HÓA
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border-2 border-slate-950 bg-white hover:bg-[#E63B2E] hover:text-white flex items-center justify-center font-bold font-mono text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-700 font-medium mb-6">
          Chọn một trong các bộ dữ liệu chuẩn bên dưới để khởi chạy phân tích tức thì với các truy vấn và trực quan hóa mẫu.
        </p>

        <div className="space-y-4">
          {SAMPLE_DATASETS.map((ds) => (
            <div
              key={ds.id}
              className="neo-box bg-[#FAF7F2] p-5 hover:bg-amber-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-mono font-black text-sm uppercase text-slate-950">
                    {ds.name}
                  </h4>
                  <span className="border border-slate-950 text-[10px] font-mono font-bold bg-white px-2 py-0.5 uppercase">
                    {ds.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  {ds.description}
                </p>
                <div className="text-[10px] font-mono text-slate-500 font-bold">
                  File: {ds.fileName}
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectDataset(ds);
                  onClose();
                }}
                className="neo-btn px-4 py-2 bg-[#FFCC00] text-slate-950 text-xs font-mono font-bold uppercase whitespace-nowrap self-start sm:self-center"
              >
                Nạp Dữ Liệu →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
