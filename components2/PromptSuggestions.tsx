import React from 'react';
import { QuerySuggestion } from '../types';
import { QUERY_SUGGESTIONS } from '../data/sampleDatasets';
import { Play, Sparkles } from 'lucide-react';

interface PromptSuggestionsProps {
  onSelectSuggestion: (suggestion: QuerySuggestion) => void;
  activeSuggestionId?: string;
}

export const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({
  onSelectSuggestion,
  activeSuggestionId,
}) => {
  return (
    <div className="bg-white border-2 border-black shadow-brutal p-5" data-purpose="prompt-suggestions">
      <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-black"></span>
          GỢI Ý CÂU HỎI TRUY VẤN
        </h3>
        <span className="text-[10px] font-mono text-neutral-500">NHẤN ĐỂ CHẠY</span>
      </div>

      <div className="flex flex-col gap-3">
        {QUERY_SUGGESTIONS.map((sug) => {
          const isActive = activeSuggestionId === sug.id;
          return (
            <button
              key={sug.id}
              onClick={() => onSelectSuggestion(sug)}
              type="button"
              className={`w-full text-left p-3 border-2 border-black font-mono transition-all text-xs flex flex-col gap-2 cursor-pointer group ${
                isActive
                  ? 'bg-[#FFC700] shadow-none translate-x-0.5 translate-y-0.5'
                  : 'bg-[#FAF8F5] hover:bg-[#F0ECE4] shadow-brutal-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-1.5 py-0.5 border border-black bg-white">
                  {sug.badge}
                </span>
                <span className="text-[10px] text-neutral-500 flex items-center gap-1 opacity-80 group-hover:opacity-100 group-hover:text-black">
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>Chạy ({sug.expectedTimeMs}ms)</span>
                </span>
              </div>
              <p className="text-xs text-neutral-900 leading-snug font-sans font-medium line-clamp-2">
                {sug.query}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-dashed border-neutral-300 flex items-center justify-between text-[11px] font-mono text-neutral-500">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[#FFC700] fill-[#FFC700]" />
          Tự động sinh mã Pandas 2.2
        </span>
        <span>4 Mẫu có sẵn</span>
      </div>
    </div>
  );
};
