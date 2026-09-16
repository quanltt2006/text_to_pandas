import React from 'react';
import { Dataset } from '../types';
import { Upload, Printer } from 'lucide-react';

interface TopNavProps {
  currentDataset: Dataset;
  onChangeDatasetClick: () => void;
  onExportReportClick: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentDataset,
  onChangeDatasetClick,
  onExportReportClick,
}) => {
  return (
    <header className="border-b-2 border-black bg-white sticky top-0 z-40 px-4 md:px-8 py-3" data-purpose="top-navigation">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Active File Identifier */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2 group cursor-pointer" title="TEXT2PANDAS Workspace">
            {/* Geometric Bauhaus Logo Icon */}
            <div className="w-8 h-8 bg-[#FFC700] border-2 border-black flex items-center justify-center font-bold text-sm shadow-brutal-sm group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-none transition-all">
              <svg className="w-4 h-4 text-black stroke-current" fill="none" strokeLinecap="square" strokeWidth="2.5" viewBox="0 0 24 24">
                <rect height="18" width="18" x="3" y="3"></rect>
                <line x1="3" x2="21" y1="9" y2="9"></line>
                <line x1="9" x2="9" y1="21" y2="9"></line>
              </svg>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold tracking-tight text-base font-mono">TEXT2PANDAS</span>
              <span className="text-[10px] tracking-widest text-neutral-600 uppercase font-mono">WORKSPACE // 2025</span>
            </div>
          </div>

          <div className="hidden sm:block h-6 w-0.5 bg-black"></div>

          {/* Active Dataset Info Badge */}
          <button
            onClick={onChangeDatasetClick}
            type="button"
            title="Nhấn để đổi dữ liệu"
            className="flex items-center gap-2 bg-[#F0ECE4] hover:bg-[#E5E2DC] px-3 py-1 border border-black text-xs font-mono transition-colors text-left"
          >
            <span className="inline-block w-2 h-2 bg-[#FFC700] border border-black"></span>
            <span className="font-bold truncate max-w-[180px] sm:max-w-[260px]">{currentDataset.filename}</span>
            <span className="text-neutral-500">|</span>
            <span>{currentDataset.rowCount} DÒNG</span>
            <span className="text-neutral-500">•</span>
            <span>{currentDataset.columnCount} CỘT</span>
          </button>
        </div>

        {/* Action Buttons and System Status */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Kernel Status Indicator */}
          <div className="hidden lg:flex items-center gap-2 border border-black bg-white px-3 py-1.5 text-xs font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black animate-pulse"></span>
            <span className="font-bold">KERNEL: PANDAS 2.2</span>
          </div>

          {/* Action: Change Dataset */}
          <button
            id="change-dataset-btn"
            onClick={onChangeDatasetClick}
            className="px-3.5 py-1.5 bg-white hover:bg-neutral-100 border-2 border-black font-mono text-xs font-bold shadow-brutal-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
            type="button"
          >
            <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>ĐỔI TẬP DỮ LIỆU</span>
          </button>

          {/* Action: Export Report */}
          <button
            id="export-report-btn"
            onClick={onExportReportClick}
            className="px-4 py-1.5 bg-[#FFC700] hover:bg-yellow-400 border-2 border-black font-mono text-xs font-bold shadow-brutal-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
            type="button"
          >
            <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>XUẤT BÁO CÁO</span>
          </button>
        </div>
      </div>
    </header>
  );
};
