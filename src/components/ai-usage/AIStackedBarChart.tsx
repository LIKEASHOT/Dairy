import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AIDailyAggregate, AIModelAggregate } from '../../types';
import {
  computeNiceTicks,
  formatPercent,
  formatShortDate,
  formatTokens,
  formatUsd,
  getChineseWeekday,
  getModelKey,
  getProviderMeta,
} from '../../lib/aiUsageFormat';

interface AIStackedBarChartProps {
  dailyData: AIDailyAggregate[];
  modelBreakdown: AIModelAggregate[];
  modelColorMap: Map<string, string>;
  metric: 'cost' | 'tokens';
  onMetricChange: (metric: 'cost' | 'tokens') => void;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  hoveredDate: string | null;
  onHoverDate: (date: string | null) => void;
}

const CHART_HEIGHT = 250;
const PADDING = { top: 18, right: 16, bottom: 28, left: 54 };

export const AIStackedBarChart: React.FC<AIStackedBarChartProps> = ({
  dailyData,
  modelBreakdown,
  modelColorMap,
  metric,
  onMetricChange,
  selectedDate,
  onSelectDate,
  hoveredDate,
  onHoverDate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const [hoveredModelKey, setHoveredModelKey] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      const next = Math.max(320, Math.floor(el.clientWidth));
      setWidth(next);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const orderedModelKeys = useMemo(
    () => modelBreakdown.map((m) => getModelKey(m.provider, m.model)),
    [modelBreakdown]
  );

  const modelOrderIndex = useMemo(() => {
    const idx = new Map<string, number>();
    orderedModelKeys.forEach((k, i) => idx.set(k, i));
    return idx;
  }, [orderedModelKeys]);

  const maxDayValue = useMemo(() => {
    let max = 0;
    for (const d of dailyData) {
      const val = metric === 'cost' ? d.costUsd : d.totalTokens;
      if (val > max) max = val;
    }
    return max;
  }, [dailyData, metric]);

  const { niceMax, ticks } = useMemo(() => computeNiceTicks(maxDayValue, 4), [maxDayValue]);

  const plotW = Math.max(120, width - PADDING.left - PADDING.right);
  const plotH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const n = Math.max(1, dailyData.length);
  const slotW = plotW / n;
  const barW = Math.max(2, Math.min(28, slotW * 0.68));
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(4, Math.floor(plotW / 54))));

  const hoveredIndex = useMemo(() => {
    if (!hoveredDate) return -1;
    return dailyData.findIndex((d) => d.date === hoveredDate);
  }, [dailyData, hoveredDate]);

  const hoveredDay = hoveredIndex >= 0 ? dailyData[hoveredIndex] : null;

  const formatYAxis = (v: number) => {
    if (v === 0) return metric === 'cost' ? '$0' : '0';
    return metric === 'cost' ? (v < 1 ? `$${v.toFixed(2)}` : `$${Math.round(v * 10) / 10}`) : formatTokens(v);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8DFD1] p-4 shadow-2xs space-y-3">
      {/* Header & Metric Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[#38332B]">每日模型消耗堆叠分布</h3>
          <p className="text-[11px] text-[#A4A09A]">
            按模型分色堆叠展示每天消耗 · 点击柱体可下钻查看当日模型拆分
          </p>
        </div>

        <div className="flex items-center bg-[#F3EBDD]/70 p-0.5 rounded-xl border border-[#E8DFD1] text-xs font-medium">
          <button
            type="button"
            onClick={() => onMetricChange('cost')}
            className={`px-3 py-1 rounded-lg transition-all ${
              metric === 'cost'
                ? 'bg-white text-[#C97B63] shadow-2xs font-semibold'
                : 'text-[#847D72] hover:text-[#38332B]'
            }`}
          >
            花费 ($)
          </button>
          <button
            type="button"
            onClick={() => onMetricChange('tokens')}
            className={`px-3 py-1 rounded-lg transition-all ${
              metric === 'tokens'
                ? 'bg-white text-[#C97B63] shadow-2xs font-semibold'
                : 'text-[#847D72] hover:text-[#38332B]'
            }`}
          >
            Token (K/M)
          </button>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div ref={containerRef} className="relative w-full select-none">
        {dailyData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-xs text-[#A4A09A]">
            当前时间范围内暂无用量数据
          </div>
        ) : (
          <svg
            width={width}
            height={CHART_HEIGHT}
            viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
            className="block overflow-visible"
            onMouseLeave={() => onHoverDate(null)}
          >
            {/* Horizontal grid lines + Y axis labels */}
            {ticks.map((tickVal, idx) => {
              const y = PADDING.top + plotH - (tickVal / niceMax) * plotH;
              return (
                <g key={idx}>
                  <line
                    x1={PADDING.left}
                    y1={y}
                    x2={width - PADDING.right}
                    y2={y}
                    stroke={tickVal === 0 ? '#DFD4C3' : '#F0E9DF'}
                    strokeDasharray={tickVal === 0 ? undefined : '3 3'}
                    strokeWidth={1}
                  />
                  <text
                    x={PADDING.left - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize={10}
                    fill="#A4A09A"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  >
                    {formatYAxis(tickVal)}
                  </text>
                </g>
              );
            })}

            {/* Day columns */}
            {dailyData.map((day, idx) => {
              const xCenter = PADDING.left + (idx + 0.5) * slotW;
              const barX = xCenter - barW / 2;
              const isSelected = selectedDate === day.date;
              const isHovered = hoveredDate === day.date;

              // Sort models consistently so stacks have repeatable order
              const sortedModels = [...day.models].sort((a, b) => {
                const ia = modelOrderIndex.get(getModelKey(a.provider, a.model)) ?? 999;
                const ib = modelOrderIndex.get(getModelKey(b.provider, b.model)) ?? 999;
                return ia - ib;
              });

              let yCursor = PADDING.top + plotH;
              const segments: Array<{
                key: string;
                y: number;
                h: number;
                color: string;
                isTop: boolean;
              }> = [];

              for (let mIdx = 0; mIdx < sortedModels.length; mIdx++) {
                const m = sortedModels[mIdx];
                const mVal = metric === 'cost' ? m.costUsd : m.totalTokens;
                if (mVal <= 0) continue;
                const h = Math.max(1.5, (mVal / niceMax) * plotH);
                const segY = Math.max(PADDING.top, yCursor - h);
                const actualH = yCursor - segY;
                const mKey = getModelKey(m.provider, m.model);
                segments.push({
                  key: mKey,
                  y: segY,
                  h: actualH,
                  color: modelColorMap.get(mKey) || getProviderMeta(m.provider).color,
                  isTop: false,
                });
                yCursor = segY;
              }
              if (segments.length > 0) {
                segments[segments.length - 1].isTop = true;
              }

              const showXLabel = idx % labelEvery === 0 || idx === dailyData.length - 1;
              // Prevent final label colliding with previous label
              const skipPenultimate =
                idx !== dailyData.length - 1 &&
                dailyData.length - 1 - idx < Math.max(1, Math.floor(labelEvery * 0.6));

              return (
                <g
                  key={day.date}
                  className="cursor-pointer"
                  onMouseEnter={() => onHoverDate(day.date)}
                  onClick={() => onSelectDate(day.date)}
                >
                  {/* Column highlight / hit area */}
                  <rect
                    x={PADDING.left + idx * slotW}
                    y={PADDING.top}
                    width={slotW}
                    height={plotH}
                    rx={4}
                    fill={
                      isSelected
                        ? 'rgba(201, 123, 99, 0.12)'
                        : isHovered
                        ? 'rgba(243, 235, 221, 0.7)'
                        : 'transparent'
                    }
                  />

                  {isSelected && (
                    <line
                      x1={xCenter}
                      y1={PADDING.top}
                      x2={xCenter}
                      y2={PADDING.top + plotH}
                      stroke="#C97B63"
                      strokeOpacity={0.35}
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Stacked bar segments */}
                  {segments.map((seg) => {
                    const dimmed = hoveredModelKey !== null && hoveredModelKey !== seg.key;
                    return (
                      <rect
                        key={seg.key}
                        x={barX}
                        y={seg.y}
                        width={barW}
                        height={seg.h}
                        rx={seg.isTop && barW >= 5 ? Math.min(3, seg.h / 2) : 0}
                        fill={seg.color}
                        fillOpacity={dimmed ? 0.22 : isHovered || isSelected ? 1 : 0.9}
                        stroke={isSelected ? '#FFFFFF' : 'none'}
                        strokeWidth={isSelected && barW >= 6 ? 0.5 : 0}
                      />
                    );
                  })}

                  {/* X axis label */}
                  {showXLabel && !skipPenultimate && (
                    <text
                      x={xCenter}
                      y={CHART_HEIGHT - 8}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={isSelected ? 700 : 400}
                      fill={isSelected ? '#C97B63' : '#A4A09A'}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    >
                      {formatShortDate(day.date)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Floating Hover Tooltip */}
        {hoveredDay && hoveredIndex >= 0 && (
          <div
            className="pointer-events-none absolute top-2 z-20 w-64 rounded-xl border border-[#E8DFD1] bg-white/95 backdrop-blur-sm p-3 shadow-lg text-xs"
            style={{
              left:
                PADDING.left + (hoveredIndex + 0.5) * slotW > width * 0.55
                  ? Math.max(8, PADDING.left + (hoveredIndex + 0.5) * slotW - 268)
                  : Math.min(width - 264, PADDING.left + (hoveredIndex + 0.5) * slotW + 12),
            }}
          >
            <div className="flex items-center justify-between border-b border-[#F0E9DF] pb-1.5 mb-2">
              <span className="font-bold text-[#38332B] font-mono">
                {hoveredDay.date} <span className="text-[#A4A09A] font-sans font-normal">{getChineseWeekday(hoveredDay.date)}</span>
              </span>
              <span className="text-[10px] text-[#847D72]">{hoveredDay.requests.toLocaleString()} 次调用</span>
            </div>

            <div className="flex items-center justify-between mb-2 bg-[#FAF7F2] px-2 py-1.5 rounded-lg border border-[#F0E9DF]">
              <div>
                <div className="text-[10px] text-[#A4A09A]">全天总花费</div>
                <div className="font-bold text-[#C97B63] font-mono">{formatUsd(hoveredDay.costUsd)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#A4A09A]">全天总 Token</div>
                <div className="font-bold text-[#38332B] font-mono">{formatTokens(hoveredDay.totalTokens)}</div>
              </div>
            </div>

            {hoveredDay.models.length === 0 ? (
              <div className="text-[11px] text-[#A4A09A] py-1">当日无调用记录</div>
            ) : (
              <div className="space-y-1 max-h-40 overflow-hidden">
                {hoveredDay.models.slice(0, 6).map((m) => {
                  const key = getModelKey(m.provider, m.model);
                  const dotColor = modelColorMap.get(key) || getProviderMeta(m.provider).color;
                  return (
                    <div key={key} className="flex items-center justify-between text-[11px] gap-2">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: dotColor }}
                        />
                        <span className="truncate text-[#38332B] font-medium">{m.displayName}</span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0 font-mono text-[10px]">
                        <span className="text-[#847D72]">{formatTokens(m.totalTokens)}</span>
                        <span className="font-semibold text-[#38332B] w-14 text-right">
                          {m.costUsd > 0 ? formatUsd(m.costUsd) : m.unpricedCount > 0 ? '未定价' : '$0.00'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {hoveredDay.models.length > 6 && (
                  <div className="text-[10px] text-[#A4A09A] pt-0.5 text-right">
                    还有 {hoveredDay.models.length - 6} 个模型（点击可查看全部）
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Model Legend */}
      {modelBreakdown.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#F0E9DF]">
          {modelBreakdown.slice(0, 10).map((m) => {
            const key = getModelKey(m.provider, m.model);
            const color = modelColorMap.get(key) || getProviderMeta(m.provider).color;
            const isActive = hoveredModelKey === key;
            return (
              <button
                key={key}
                type="button"
                onMouseEnter={() => setHoveredModelKey(key)}
                onMouseLeave={() => setHoveredModelKey(null)}
                className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] border transition-all ${
                  isActive
                    ? 'bg-[#FAF0ED] border-[#C97B63] text-[#38332B] shadow-2xs'
                    : 'bg-[#FAF7F2] border-[#E8DFD1] text-[#58544E] hover:border-[#C97B63]/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="font-medium">{m.displayName}</span>
                <span className="text-[10px] text-[#A4A09A] font-mono">
                  {metric === 'cost' ? formatPercent(m.costShare) : formatPercent(m.tokenShare)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
