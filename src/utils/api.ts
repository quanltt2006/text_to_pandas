import { ChatMessage, ColumnProfile, DatasetProfile } from '../types';

// Dev: gọi /api -> Vite proxy tới localhost:8000
// Prod: đặt VITE_API_BASE=https://<backend>.onrender.com/api trên Render static site,
// nếu không đặt thì dùng cùng domain (/api) cho trường hợp deploy 1 service.
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

interface BackendColumnProfile {
  name: string;
  dtype: string;
  null_count: number;
  null_percent: number;
  unique_count: number;
  sample_values: string[];
  min?: unknown;
  max?: unknown;
  mean?: number | null;
  median?: number | null;
  description?: string | null;
}

interface BackendDatasetProfile {
  id: string;
  file_name: string;
  file_path: string;
  row_count: number;
  column_count: number;
  file_size: string;
  file_size_bytes: number;
  columns: BackendColumnProfile[];
  inferred_description?: string | null;
  created_at: string;
}

interface BackendChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  code?: string | null;
  table_data?: Record<string, unknown> | null;
  chart_data?: Record<string, unknown> | null;
  route_type?: 'rag' | 'code-gen' | 'general' | null;
  timestamp: string;
}

function mapColumn(col: BackendColumnProfile): ColumnProfile {
  return {
    name: col.name,
    dtype: (['string', 'number', 'date', 'boolean', 'mixed'] as const).includes(col.dtype as never)
      ? (col.dtype as ColumnProfile['dtype'])
      : 'string',
    nullCount: col.null_count,
    nullPercent: col.null_percent,
    uniqueCount: col.unique_count,
    sampleValues: col.sample_values ?? [],
    min: col.min as ColumnProfile['min'],
    max: col.max as ColumnProfile['max'],
    mean: col.mean ?? undefined,
    median: col.median ?? undefined,
    description: col.description ?? undefined,
  };
}

export function mapBackendProfile(profile: BackendDatasetProfile): DatasetProfile {
  return {
    id: profile.id,
    fileName: profile.file_name,
    rowCount: profile.row_count,
    columnCount: profile.column_count,
    fileSize: profile.file_size,
    columns: (profile.columns ?? []).map(mapColumn),
    inferredDescription: profile.inferred_description ?? undefined,
  };
}

function mapTableData(raw: Record<string, unknown>): { headers: string[]; rows: string[][] } | undefined {
  if (!raw) return undefined;
  const headers = raw.headers;
  const rows = raw.rows;
  if (!Array.isArray(headers) || !Array.isArray(rows)) return undefined;
  return {
    headers: headers.map(String),
    rows: rows.filter(r => Array.isArray(r)).map(r => (r as unknown[]).map(String)),
  };
}

function mapChartData(raw: Record<string, unknown>): ChatMessage['chartData'] {
  if (!raw) return undefined;
  const labels = raw.labels;
  const values = raw.values;
  const chartType = raw.chart_type ?? raw.chartType;
  if (!Array.isArray(labels) || !Array.isArray(values)) return undefined;
  const type = ['bar', 'line', 'pie'].includes(chartType as string) ? (chartType as 'bar' | 'line' | 'pie') : 'bar';
  return { labels: labels.map(String), values: values.map(Number), chartType: type };
}

function mapChatMessage(msg: BackendChatMessage): ChatMessage {
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    code: msg.code ?? undefined,
    tableData: msg.table_data ? mapTableData(msg.table_data as Record<string, unknown>) : undefined,
    chartData: msg.chart_data ? mapChartData(msg.chart_data as Record<string, unknown>) : undefined,
    timestamp: new Date(msg.timestamp),
    type: msg.route_type ?? undefined,
  };
}

export async function uploadCSV(file: File): Promise<{ datasetId: string; profile: DatasetProfile }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.message || 'Upload thất bại');
  }

  return {
    datasetId: data.dataset_id,
    profile: mapBackendProfile(data.profile),
  };
}

export async function sendChatQuestion(datasetId: string, question: string): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE}/chat/${datasetId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Chat thất bại');
  }

  return mapChatMessage(data.message);
}

export async function addColumnContexts(datasetId: string, columns: { name: string; user_description: string }[]): Promise<void> {
  const res = await fetch(`${API_BASE}/context/${datasetId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columns }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || 'Cập nhật context thất bại');
  }
}

export { mapChatMessage };
export type { BackendDatasetProfile, BackendChatMessage };