import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Dataset } from '../types';
import { Send, Copy, Check, RotateCcw, Sparkles } from 'lucide-react';

interface ChatTerminalProps {
  messages: ChatMessage[];
  dataset: Dataset;
  onSubmitQuery: (query: string) => void;
  isExecuting: boolean;
  onResetChat: () => void;
}

export const ChatTerminal: React.FC<ChatTerminalProps> = ({
  messages,
  dataset,
  onSubmitQuery,
  isExecuting,
  onResetChat,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isExecuting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isExecuting) return;
    const query = inputValue.trim();
    setInputValue('');
    onSubmitQuery(query);
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => {
      setCopiedCodeId(null);
    }, 2000);
  };

  return (
    <section className="flex flex-col gap-4 lg:col-span-8" data-purpose="ai-analyst-chat-workspace">
      {/* Chat & Analysis Terminal Card */}
      <div className="bg-white border-2 border-black shadow-brutal flex flex-col h-[740px]">
        {/* Terminal Header */}
        <div className="px-5 py-3.5 border-b-2 border-black bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#FFC700] border-2 border-black flex items-center justify-center font-bold text-xs shadow-brutal-sm">
              AI
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono tracking-tight">AI ANALYST // PANDAS AGENT</h2>
              <p className="text-[10px] text-neutral-500 font-mono">
                MÔ HÌNH: TEXT-TO-PANDAS V2 (ZERO-DATA-LEAKAGE)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onResetChat}
              title="Đặt lại đoạn hội thoại"
              className="p-1 text-neutral-500 hover:text-black hover:bg-neutral-100 border border-transparent hover:border-black transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black animate-pulse"></span>
              <span className="text-xs font-mono font-bold">TRỰC TUYẾN</span>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-6" data-purpose="chat-messages-container">
          {messages.map((msg) => {
            if (msg.role === 'system') {
              return (
                <div key={msg.id} className="flex gap-3 max-w-[90%]">
                  <div className="w-6 h-6 bg-black text-white font-mono text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                    #
                  </div>
                  <div className="bg-[#FAF8F5] border-2 border-black p-3.5 shadow-brutal-sm">
                    <p className="text-xs text-black leading-relaxed font-sans">
                      <strong>Xin chào! Tôi là Trợ lý AI Phân Tích Dữ Liệu.</strong> {msg.content}
                    </p>
                  </div>
                </div>
              );
            }

            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex gap-3 max-w-[85%] self-end flex-row-reverse">
                  <div className="w-6 h-6 bg-[#FFC700] border-2 border-black font-mono text-xs flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-brutal-sm">
                    U
                  </div>
                  <div className="bg-[#FFC700] border-2 border-black p-3.5 shadow-brutal-sm text-right">
                    <p className="text-xs font-mono font-bold text-black leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            }

            // AI Assistant Response
            return (
              <div key={msg.id} className="flex gap-3 max-w-[98%]">
                <div className="w-6 h-6 bg-black text-white font-mono text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                  AI
                </div>
                <div className="bg-white border-2 border-black p-4 shadow-brutal-sm flex flex-col gap-3.5 w-full">
                  {/* Text Insight */}
                  <div className="text-xs text-neutral-900 leading-relaxed font-sans font-normal">
                    {msg.content}
                  </div>

                  {/* Executable Code Block */}
                  {msg.code && (
                    <div className="border-2 border-black bg-[#121212] text-neutral-100 p-3 font-mono text-xs">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2 text-[11px] text-neutral-400">
                        <span className="flex items-center gap-1.5 text-[#FFC700] font-bold">
                          <span className="w-2 h-2 bg-[#FFC700] inline-block"></span>
                          PYTHON / PANDAS KHỞI TẠO
                        </span>
                        <button
                          onClick={() => handleCopyCode(msg.id, msg.code!)}
                          type="button"
                          className="hover:text-white underline text-[10px] uppercase font-mono flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCodeId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">ĐÃ CHÉP</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>SAO CHÉP MÃ</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="overflow-x-auto leading-5 text-neutral-200 font-mono text-xs whitespace-pre">
                        <code>{msg.code}</code>
                      </pre>
                    </div>
                  )}

                  {/* Execution Output Data / Visual Bar */}
                  {msg.executionOutput && (
                    <div className="border-2 border-black bg-[#F0ECE4] p-3.5">
                      <div className="flex items-center justify-between mb-2 font-mono text-[11px] font-bold">
                        <span className="uppercase">KẾT QUẢ THỰC THI (EXECUTION OUTPUT):</span>
                        <span className="text-emerald-700 bg-white px-2 py-0.5 border border-black">
                          THỜI GIAN: {msg.executionOutput.executionTimeMs}ms
                        </span>
                      </div>

                      {/* Mini Data Output Bars */}
                      {msg.executionOutput.bars && msg.executionOutput.bars.length > 0 && (
                        <div className="flex flex-col gap-2.5 font-mono text-xs mt-2">
                          {msg.executionOutput.bars.map((bar, idx) => (
                            <div key={idx}>
                              <div className="flex justify-between text-[11px] mb-1 font-mono">
                                <span className="font-bold">{bar.label}</span>
                                <span className="font-bold text-black">
                                  {bar.metric1Label} = {bar.metric1Value}
                                  {bar.metric2Label !== undefined && bar.metric2Value !== undefined && (
                                    <> | {bar.metric2Label} = {bar.metric2Value}</>
                                  )}
                                </span>
                              </div>
                              <div className="w-full bg-white h-3 border border-black overflow-hidden">
                                <div
                                  className="bg-[#FFC700] h-full border-r border-black transition-all duration-500 ease-out"
                                  style={{ width: `${Math.min(100, Math.max(5, bar.percentage))}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Summary Table if present */}
                      {msg.executionOutput.summaryTable && (
                        <div className="overflow-x-auto border border-black bg-white mt-2">
                          <table className="w-full text-left font-mono text-[11px]">
                            <thead className="bg-[#E5E2DC] border-b border-black">
                              <tr>
                                {msg.executionOutput.summaryTable.headers.map((h, i) => (
                                  <th key={i} className="p-1.5 border-r border-black font-bold">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {msg.executionOutput.summaryTable.rows.map((r, ri) => (
                                <tr key={ri} className="border-b border-neutral-300 hover:bg-[#FAF8F5]">
                                  {r.map((c, ci) => (
                                    <td key={ci} className="p-1.5 border-r border-neutral-300">
                                      {typeof c === 'number' ? c.toFixed(3) : String(c)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {msg.executionOutput.rawText && (
                        <pre className="font-mono text-[11px] bg-white p-2 border border-black mt-2 overflow-x-auto">
                          {msg.executionOutput.rawText}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Interpretation Note */}
                  {msg.note && (
                    <p className="text-[11px] text-neutral-600 font-mono border-l-2 border-black pl-2 italic">
                      {msg.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator when executing */}
          {isExecuting && (
            <div className="flex gap-3 max-w-[90%]">
              <div className="w-6 h-6 bg-black text-white font-mono text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                AI
              </div>
              <div className="bg-[#FAF8F5] border-2 border-black p-3.5 shadow-brutal-sm flex items-center gap-3">
                <div className="w-3 h-3 bg-[#FFC700] border border-black animate-spin"></div>
                <span className="text-xs font-mono font-bold text-black">
                  Đang khởi tạo nhân Pandas Kernel &amp; biên dịch mã truy vấn...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Query Input Bar */}
        <div className="p-4 border-t-2 border-black bg-white" data-purpose="chat-input-controls">
          <form className="flex items-center gap-2" onSubmit={handleSubmit}>
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isExecuting}
                className="w-full border-2 border-black px-4 py-3 text-xs md:text-sm font-mono placeholder:text-neutral-500 focus:outline-none focus:ring-0 focus:border-black bg-[#FAF8F5] shadow-brutal-sm disabled:opacity-50"
                placeholder="Hỏi về dataset... (VD: Vẽ biểu đồ phân bố của biến anova_f theo nhóm)"
                type="text"
              />
            </div>
            {/* Send Button */}
            <button
              disabled={isExecuting || !inputValue.trim()}
              className="bg-[#FFC700] hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black px-5 py-3 font-mono font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
              title="Gửi câu hỏi"
              type="submit"
            >
              <span>CHẠY</span>
              <Send className="w-4 h-4 text-black" />
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] font-mono text-neutral-500">
            <span>
              Phím tắt: <kbd className="px-1.5 py-0.5 bg-neutral-200 border border-black text-[10px] font-bold">ENTER</kbd> để thực thi
            </span>
            <span>Bảo mật: Sandbox Python nội bộ độc lập</span>
          </div>
        </div>
      </div>
    </section>
  );
};
