import { useState, useCallback, useEffect } from 'react';
import { DatasetProfile, ColumnContext, ChatMessage } from './types';
import { inferDatasetDescription } from './utils/csvParser';
import { addColumnContexts, sendChatQuestion } from './utils/api';
import { processQuestion } from './utils/mockAI';
import Header from './components/Header';
import LandingView from './components/LandingView';
import { v4 as uuidv4 } from 'uuid';
import TopNav from './components2/TopNav';
import MetricsCards from './components2/MetricsCards';
import DataSamplePreview from './components2/DataSamplePreview';
import PromptSuggestions from './components2/PromptSuggestions';
import ChatTerminal from './components2/ChatTerminal';
import ExportReportModal from './components2/ExportReportModal';
import Footer from './components2/Footer';

export default function App() {
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [columnContexts, setColumnContexts] = useState<ColumnContext[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [autoQuery, setAutoQuery] = useState<string | null>(null);

  const handleDataLoaded = useCallback((data: { datasetId: string; profile: DatasetProfile }) => {
    const description = inferDatasetDescription(data.profile);
    setDatasetId(data.datasetId);
    setProfile({ ...data.profile, id: data.datasetId, inferredDescription: data.profile.inferredDescription || description });
    setColumnContexts([]);
    setMessages([]);
    setAutoQuery(null);
  }, []);

  useEffect(() => {
    if (!datasetId || columnContexts.length === 0) return;
    addColumnContexts(datasetId, columnContexts.map(c => ({ name: c.name, user_description: c.userDescription })))
      .catch(() => {});
  }, [datasetId, columnContexts]);

  const handleReset = () => {
    setDatasetId(null);
    setProfile(null);
    setColumnContexts([]);
    setMessages([]);
  };

  const handleSubmitQuery = useCallback(async (query: string) => {
    if (!profile) return;
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsExecuting(true);

    try {
      let response: ChatMessage;
      if (datasetId) {
        try {
          response = await sendChatQuestion(datasetId, query);
        } catch {
          response = await processQuestion(query, profile);
        }
      } else {
        response = await processQuestion(query, profile);
      }
      setMessages(prev => [...prev, response]);
    } catch {
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: '❌ Có lỗi xảy ra khi xử lý câu hỏi. Vui lòng thử lại.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsExecuting(false);
    }
  }, [datasetId, profile]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
        <Header />
        <LandingView onDataLoaded={handleDataLoaded} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      <TopNav
        currentProfile={profile}
        onChangeDatasetClick={handleReset}
        onExportReportClick={() => setShowExport(true)}
      />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Quick Metrics Summary */}
        <MetricsCards profile={profile} />

        {/* Grid: Left schema/context + suggestions | Right chat terminal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <DataSamplePreview
              profile={profile}
              columnContexts={columnContexts}
              onContextUpdate={setColumnContexts}
            />
            <PromptSuggestions
              profile={profile}
              onSelectSuggestion={(q) => setAutoQuery(q)}
            />
          </div>

          {/* Right Column: Chat */}
          <ChatTerminal
            messages={messages}
            dataset={profile}
            columnContexts={columnContexts}
            onSubmitQuery={handleSubmitQuery}
            isExecuting={isExecuting}
            onResetChat={() => setMessages([])}
            autoQuery={autoQuery}
            onAutoQueryConsumed={() => setAutoQuery(null)}
          />
        </div>
      </main>

      <Footer />

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        profile={profile}
        messages={messages}
      />
    </div>
  );
}