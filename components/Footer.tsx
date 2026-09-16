import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-4 border-t-2 border-slate-950 bg-[#FAF7F2] text-xs text-slate-900 font-mono mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-bold uppercase">
          <span>SMART CSV ANALYST</span>
          <span>•</span>
          <span className="text-slate-600">FORM FOLLOWS FUNCTION © 2025</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 font-bold uppercase">
            <span className="w-2.5 h-2.5 bg-[#111111] inline-block animate-pulse"></span>
            SYSTEM ONLINE
          </span>
          <span>•</span>
          <span className="text-slate-600">PYTHON 3.11 // PANDAS 2.2</span>
        </div>
      </div>
    </footer>
  );
};
