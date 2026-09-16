import { DatasetProfile } from '../types';

interface MetricsCardsProps {
  profile: DatasetProfile;
}

export default function MetricsCards({ profile }: MetricsCardsProps) {
  const numericCount = profile.columns.filter(c => c.dtype === 'number').length;
  const categoricalCount = profile.columns.filter(c => c.dtype === 'string' || c.dtype === 'date' || c.dtype === 'boolean').length;
  const totalNulls = profile.columns.reduce((sum, c) => sum + c.nullCount, 0);
  const totalCells = profile.rowCount * profile.columnCount;
  const avgNullPct = totalCells > 0 ? ((totalNulls / totalCells) * 100).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-purpose="quick-metrics-summary">
      {/* Metric 1: Total Records */}
      <div className="bg-white border-2 border-black p-4 shadow-brutal flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-600 mb-2 font-mono text-xs uppercase">
          <span>Tổng số bản ghi</span>
          <span className="w-2 h-2 bg-black"></span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight font-mono">{profile.rowCount.toLocaleString()}</span>
          <span className="text-xs text-neutral-500 font-mono">HÀNG HỢP LỆ</span>
        </div>
        <div className="mt-3 pt-2 border-t border-dashed border-neutral-300 text-[11px] font-mono text-neutral-500 line-clamp-2">
          {profile.inferredDescription || `Dataset chứa ${profile.columnCount} cột dữ liệu`}
        </div>
      </div>

      {/* Metric 2: Features / Columns */}
      <div className="bg-white border-2 border-black p-4 shadow-brutal flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-600 mb-2 font-mono text-xs uppercase">
          <span>Đặc trưng / Cột</span>
          <span className="w-2 h-2 bg-[#FFC700] border border-black"></span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight font-mono">{profile.columnCount}</span>
          <span className="text-xs text-neutral-500 font-mono">CỘT PHÂN TÍCH</span>
        </div>
        <div className="mt-3 pt-2 border-t border-dashed border-neutral-300 text-[11px] font-mono text-neutral-600 truncate">
          {numericCount} Cột Định lượng + {categoricalCount} Phân loại
        </div>
      </div>

      {/* Metric 3: Null Values */}
      <div className="bg-white border-2 border-black p-4 shadow-brutal flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-600 mb-2 font-mono text-xs uppercase">
          <span>Giá trị rỗng (Nulls)</span>
          <span className="w-2 h-2 bg-emerald-500 border border-black"></span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight font-mono text-emerald-700">{avgNullPct}%</span>
          <span className="text-xs text-neutral-500 font-mono">
            {Number(avgNullPct) === 0 ? 'TOÀN VẸN 100%' : 'CÓ DỮ LIỆU THIẾU'}
          </span>
        </div>
        <div className="mt-3 pt-2 border-t border-dashed border-neutral-300 text-[11px] font-mono text-neutral-600">
          {Number(avgNullPct) === 0 ? 'Không cần xử lý imputation hay điền khuyết' : 'Đã gắn nhãn các giá trị NaN cần xử lý'}
        </div>
      </div>

      {/* Metric 4: File Size & Schema */}
      <div className="bg-white border-2 border-black p-4 shadow-brutal flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-600 mb-2 font-mono text-xs uppercase">
          <span>Kích thước dữ liệu</span>
          <span className="w-2 h-2 bg-[#FFC700] border border-black"></span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight font-mono">{profile.fileSize}</span>
          <span className="text-xs text-neutral-500 font-mono">FILE SIZE</span>
        </div>
        <div className="mt-3 pt-2 border-t border-dashed border-neutral-300 text-[11px] font-mono text-neutral-600">
          Schema {profile.columnCount} cột • {numericCount} numeric + {categoricalCount} categorical
        </div>
      </div>
    </div>
  );
}
