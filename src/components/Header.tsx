export default function Header() {
  return (
    <header className="w-full border-b-2 border-slate-950 bg-[#FAF7F2] sticky top-0 z-40">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <button className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer">
          <div className="w-9 h-9 border-2 border-slate-950 bg-[#FFCC00] flex items-center justify-center shadow-[2.5px_2.5px_0px_#111111] group-hover:-translate-y-0.5 transition-transform">
            <svg className="w-5 h-5 text-slate-950" fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2.5" viewBox="0 0 24 24">
              <rect height="16" width="16" x="4" y="4" />
              <path d="M4 10h16" />
              <path d="M10 20V10" />
            </svg>
          </div>
          <span className="font-black tracking-tight text-slate-950 text-base uppercase font-mono">
            Text2Pandas
          </span>
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-slate-950 bg-white text-[11px] font-bold font-mono uppercase text-slate-950 shadow-[2px_2px_0px_#111111]">
            <span className="w-2 h-2 bg-[#FFCC00] inline-block"></span>
            AI Powered
          </span>
        </div>
      </nav>
    </header>
  );
}