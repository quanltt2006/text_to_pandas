import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t-2 border-black bg-white py-3 px-4 md:px-8 mt-auto" data-purpose="page-footer">
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#FFC700] border border-black"></span>
          <span className="font-bold">SMART CSV ANALYST</span>
          <span className="text-neutral-400">•</span>
          <span>FORM FOLLOWS FUNCTION © 2025</span>
        </div>
        <div className="flex items-center gap-4 text-neutral-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 inline-block border border-black"></span>
            <span>SYSTEM ONLINE</span>
          </span>
          <span>//</span>
          <span>PYTHON 3.11</span>
          <span>//</span>
          <span>PANDAS 2.2</span>
        </div>
      </div>
    </footer>
  );
};
