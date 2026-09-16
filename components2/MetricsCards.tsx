import React from 'react';
import { Dataset } from '../types';

interface MetricsCardsProps {
  dataset: Dataset;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ dataset }) => {
  const numericCount = dataset.columns.filter((c) => c.type === 'float' || c.type === 'numeric' || c.type === 'int').length;
  const categoricalCount = dataset.columns.length - numericCount;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-purpose="quick-metrics-summary">
      {/* Metric 1: Total Records */}
      <div className="bg-white border-2 border-black p-4 shadow-brutal flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-600 mb-2 font-mono text-xs uppercase">
          <span>Tổng số bản ghi</span>
          <span className="w-2 h-2 bg-black"></span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight font-mono">{dataset.rowCount}</span>
          <span className="text-xs text-neutral-500 font-mono">HÀNG HỢP LỆ</span>
        </div>
        <div className="mt-3 pt-2 border-t border-dashed border-neutral-300 text-[11px] font-mono text-neutral-500">
          {dataset.description}
        </div>
      </div>

      {/* Metric 2: Features / Columns */}
      <div className="bg-white border-2 border-black p-4 shadow-brutal flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-600 mb-2 font-mono text-xs uppercase">
          <span>Đặc trưng / Cột số</span>
          <span className="w-2 h-2 bg-[#FFC700] border border-black"></span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight font-mono">{dataset.columnCount}</span>
          <span className="text-xs text-neutral-500 font-mono">CỘT PHÂN TÍCH</span>
        </div>
        <div className="mt-3 pt-2 border-t border-dashed border-neutral-300 text-[11px] font-mono text-neutral-600 truncate">
          {categoricalCount} Phân loại ({dataset.columns[0]?.name || 'ID'}) + {numericCount} Cột Định lượng
        </div>
      </div>

      {/* Metric 3: Null Values */}
      <div className="bg-white border-2 border-black p-4 shadow-brutal flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-600 mb-2 font-mono text-xs uppercase">
          <span>Giá trị rỗng (Nulls)</span>
          <span className="w-2 h-2 bg-emerald-500 border border-black"></span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight font-mono text-emerald-700">
            {dataset.nullPercentage.toFixed(1)}%
          </span>
          <span className="text-xs text-neutral-500 font-mono">
            {dataset.nullPercentage === 0 ? 'TOÀN VẸN 100%' : 'CÓ DỮ LIỆU THIẾU'}
          </span>
        </div>
        <div className="mt-3 pt-2 border-t border-dashed border-neutral-300 text-[11px] font-mono text-neutral-600">
          {dataset.nullPercentage === 0 ? 'Không cần xử lý imputation hay điền khuyết' : 'Đã gắn nhãn các giá trị NaN cần xử lý'}
        </div>
      </div>

      {/* Metric 4: Correlation / Model Metric */}
      <div className="bg-white border-2 border-black p-4 shadow-brutal flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-600 mb-2 font-mono text-xs uppercase">
          <span>Mô hình tương quan</span>
          <span className="w-2 h-2 bg-[#FFC700] border border-black"></span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight font-mono">{dataset.avgCorrelation.toFixed(2)}</span>
          <span className="text-xs text-neutral-500 font-mono">TRUNG BÌNH (μ)</span>
        </div>
        <div className="mt-3 pt-2 border-t border-dashed border-neutral-300 text-[11px] font-mono text-neutral-600">
          ElasticNet &amp; Tree Importance cân bằng
        </div>
      </div>
    </div>
  );
};
