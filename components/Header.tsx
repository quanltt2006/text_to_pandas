import React from 'react';
import { ActiveTab, Dataset } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentDataset: Dataset | null;
  onOpenUpload: () => void;
  onOpenSampleModal: () => void;
  onOpenDocs: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentDataset,
  onOpenUpload,
  onOpenSampleModal,
  onOpenDocs,
}) => {
  return (
    <header className="w-full border-b-2 border-slate-950 bg-[#FAF7F2] sticky top-0 z-40">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Tabs */}
        <div className="flex items-center gap-6">
          <button
            id="nav-brand-btn"
            onClick={() => setActiveTab('landing')}
            className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer"
          >
            <div className="w-9 h-9 border-2 border-slate-950 bg-[#FFCC00] flex items-center justify-center shadow-[2.5px_2.5px_0px_#111111] group-hover:-translate-y-0.5 transition-transform">
              <svg
                className="w-5 h-5 text-slate-950"
                fill="none"
                stroke="currentColor"
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <rect height="16" width="16" x="4" y="4" />
                <path d="M4 10h16" />
                <path d="M10 20V10" />
              </svg>
            </div>
            <span className="font-black tracking-tight text-slate-950 text-base uppercase font-mono">
              SMART CSV ANALYST
            </span>
          </button>

          <div className="hidden md:flex items-center gap-1 pl-4 text-xs font-bold uppercase tracking-wider font-mono">
            <button
              id="nav-workspace-tab"
              onClick={() => setActiveTab('workspace')}
              className={`px-3 py-1.5 border-2 border-slate-950 transition-colors cursor-pointer ${
                activeTab === 'workspace'
                  ? 'bg-slate-950 text-white shadow-[2px_2px_0px_#111111]'
                  : 'bg-transparent text-slate-900 hover:bg-white'
              }`}
            >
              Workspace {currentDataset ? `(${currentDataset.totalRows})` : ''}
            </button>
            <button
              id="nav-docs-tab"
              onClick={onOpenDocs}
              className={`px-3 py-1.5 border-2 transition-colors cursor-pointer ${
                activeTab === 'docs'
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-transparent text-slate-900 hover:border-slate-950 hover:bg-white'
              }`}
            >
              Docs
            </button>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-4">
          <button
            id="nav-sample-data-btn"
            onClick={onOpenSampleModal}
            className="text-xs font-bold font-mono uppercase underline underline-offset-4 hover:text-[#0B3BFF] cursor-pointer"
          >
            Mẫu Dữ Liệu
          </button>
          <button
            id="nav-upload-csv-btn"
            onClick={onOpenUpload}
            type="button"
            className="neo-btn inline-flex items-center gap-2 px-4 py-1.5 bg-[#FFCC00] text-xs font-bold uppercase tracking-wider text-slate-950 cursor-pointer"
          >
            <span>+ Tải Lên CSV</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
