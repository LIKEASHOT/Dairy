import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AIDailyAggregate } from '../../types';
import {
  buildMonotoneSvgPath,
  computeNiceTicks,
  formatPercent,
  formatShortDate,
  formatTokens,
  formatUsd,
  getChineseWeekday,
} from '../../lib/aiUsageFormat';

interface AITrendLineChartProps {
  dailyData: AIDailyAggregate[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  hoveredDate: string | null;
  onHoverDate: (date: string | null) => void;
}

type SeriesMode = 'both' | 'cost' | 'tokens';

const CHART_HEIGHT = 230;
const PADDING = { top: 28, right: 56, bottom: 28, left: 54 };

export const AITrendLineChart: React.FC<AITrendLineChartProps> = ({
  dailyData,
  selectedDate,
  onSelectDate,
  hoveredDate,
  onHoverDate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const [mode, setMode] = useState<SeriesMode>('both');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => setWidth(Math.max(320, Math.floor(el.clientWidth)));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const showCost = mode === 'both' || mode === 'cost';
  const showTokens = mode === 'both' || mode === 'tokens';

  const { maxCost, maxTokens, peakCostIdx, peakTokensIdx } = useMemo(() => {
    let mCost = 0;
    let mTokens = 0;
    let pCostIdx = -1;
    let pTokensIdx = -1;

    dailyData.forEach((d, idx) => {
      if (d.costUsd > mCost) {
        mCost = d.costUsd;
        pCostIdx = idx;
      }
      if (d.totalTokens > mTokens) {
        mTokens = d.totalTokens;
        pTokensIdx = idx;
      }
    });

    return { maxCost: mCost, maxTokens: mTokens, peakCostIdx: pCostIdx, peakTokensIdx: pTokensIdx };
  }, [dailyData]);

  const costAxis = useMemo(() => computeNiceTicks(maxCost, 4), [maxCost]);
  const tokenAxis = useMemo(() => computeNiceTicks(maxTokens, 4), [maxTokens]);

  const rightPad = showTokens ? PADDING.right : 20;
  const leftPad = showCost ? PADDING.left : 56;
  const plotW = Math.max(120, width - leftPad - rightPad);
  const plotH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const bottomY = PADDING.top + plotH;
  const n = dailyData.length;

  const xForIdx = (idx: number) => {
    if (n <= 1) return leftPad + plotW / 2;
    return leftPad + (idx / (n - 1)) * plotW;
  };

  const costPoints = useMemo(
    () =>
      dailyData.map((d, i) => ({
        x: xForIdx(i),
        y: PADDING.top + plotH - (d.costUsd / costAxis.niceMax) * plotH,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dailyData, costAxis.niceMax, leftPad, plotW, plotH]
  );

  const tokenPoints = useMemo(
    () =>
      dailyData.map((d, i) => ({
        x: xForIdx(i),
        y: PADDING.top + plotH - (d.totalTokens / tokenAxis.niceMax) * plotH,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dailyData, tokenAxis.niceMax, leftPad, plotW, plotH]
  );

  const costLinePath = useMemo(
    () => buildMonotoneSvgPath(costPoints, PADDING.top, bottomY),
    [costPoints, bottomY]
  );

  const costAreaPath = useMemo(() => {
    if (costPoints.length === 0) return '';
    if (costPoints.length === 1) return '';
    return `${costLinePath} L ${costPoints[costPoints.length - 1].x.toFixed(2)} ${bottomY} L ${costPoints[0].x.toFixed(2)} ${bottomY} Z`;
  }, [costLinePath, costPoints, bottomY]);

  const tokenLinePath = useMemo(
    () => buildMonotoneSvgPath(tokenPoints, PADDING.top, bottomY),
    [tokenPoints, bottomY]
  );

  const tokenAreaPath = useMemo(() => {
    if (tokenPoints.length <= 1) return '';
    return `${tokenLinePath} L ${tokenPoints[tokenPoints.length - 1].x.toFixed(2)} ${bottomY} L ${tokenPoints[0].x.toFixed(2)} ${bottomY} Z`;
  }, [tokenLinePath, tokenPoints, bottomY]);

  const hoveredIndex = useMemo(() => {
    if (!hoveredDate) return -1;
    return dailyData.findIndex((d) => d.date === hoveredDate);
  }, [dailyData, hoveredDate]);

  const hoveredDay = hoveredIndex >= 0 ? dailyData[hoveredIndex] : null;
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(4, Math.floor(plotW / 58))));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    if (n === 1) {
      onHoverDate(dailyData[0].date);
      return;
    }
    const clamped = Math.max(0, Math.min(plotW, relX - leftPad));
    const idx = Math.round((clamped / plotW) * (n - 1));
    if (dailyData[idx]) {
      onHoverDate(dailyData[idx].date);
    }
  };

  const renderPeakTag = (
    idx: number,
    points: Array<{ x: number; y: number }>,
    label: string,
    fill: string,
    yOffset = -12
  ) => {
    if (idx < 0 || !points[idx]) return null;
    const pt = points[idx];
    const nearRight = pt.x > width - rightPad - 95;
    const nearLeft = pt.x < leftPad + 95;
    const anchor = nearRight ? 'end' : nearLeft ? 'start' : 'middle';
    const textX = nearRight ? pt.x - 4 : nearLeft ? pt.x + 4 : pt.x;
    const labelY = Math.max(12, pt.y + yOffset);
    return (
      <g className="pointer-events-none">
        <circle cx={pt.x} cy={pt.y} r={4.5} fill="#FFFFFF" stroke={fill} strokeWidth={2.5} />
        <text
          x={textX}
          y={labelY}
          textAnchor={anchor}
          fontSize={10}
          fontWeight={700}
          fill={fill}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          {label}
        </text>
      </g>
    );
  };

  const formatCostTick = (v: number) => (v === 0 ? '$0' : v < 1 ? `$${v.toFixed(2)}` : `$${Math.round(v * 10) / 10}`);
  const formatTokenTick = (v: number) => (v === 0 ? '0' : formatTokens(v));

  return (
    <div className="bg-white rounded-2xl border border-[#E8DFD1] p-4 shadow-2xs space-y-3">
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <div>
            <h3 className="text-sm font-bold text-[#38332B]">每日总量趋势走势</h3>
            <p className="text-[11px] text-[#A4A09A]">
              全天总花费与总 Token 变化曲线 · 自动标注区间峰值日期
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center space-x-3 mr-2 text-[11px]">
            {showCost && (
              <span className="flex items-center space-x-1 text-[#A45842] font-medium">
                <span className="w-3 h-0.5 bg-[#C97B63] rounded-full inline-block" />
                <span>日花费 ($)</span>
              </span>
            )}
            {showTokens && (
              <span className="flex items-center space-x-1 text-[#5C6B50] font-medium">
                <span className="w-3 h-0.5 bg-[#6E8B5E] rounded-full inline-block" />
                <span>日 Token</span>
              </span>
            )}
          </div>

          <div className="flex items-center bg-[#F3EBDD]/70 p-0.5 rounded-xl border border-[#E8DFD1] text-xs font-medium">
            {(
              [
                { id: 'both', label: '双轴对比' },
                { id: 'cost', label: '花费' },
                { id: 'tokens', label: 'Token' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMode(opt.id)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  mode === opt.id
                    ? 'bg-white text-[#C97B63] shadow-2xs font-semibold'
                    : 'text-[#847D72] hover:text-[#38332B]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Line Chart */}
      <div ref={containerRef} className="relative w-full select-none">
        {dailyData.length === 0 ? (
          <div className="h-[230px] flex items-center justify-center text-xs text-[#A4A09A]">
            当前时间范围内暂无趋势数据
          </div>
        ) : (
          <svg
            width={width}
            height={CHART_HEIGHT}
            viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
            className="block overflow-visible cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => onHoverDate(null)}
            onClick={() => hoveredDay && onSelectDate(hoveredDay.date)}
          >
            <defs>
              <linearGradient id="diaryCostAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C97B63" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#C97B63" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="diaryTokenAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6E8B5E" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#6E8B5E" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            {/* Grid Lines + Left Axis + Right Axis */}
            {costAxis.ticks.map((cTick, idx) => {
              const y = bottomY - (cTick / costAxis.niceMax) * plotH;
              const tTick = tokenAxis.ticks[idx] ?? 0;
              return (
                <g key={idx}>
                  <line
                    x1={leftPad}
                    y1={y}
                    x2={leftPad + plotW}
                    y2={y}
                    stroke={idx === 0 ? '#DFD4C3' : '#F0E9DF'}
                    strokeDasharray={idx === 0 ? undefined : '3 3'}
                    strokeWidth={1}
                  />
                  {showCost && (
                    <text
                      x={leftPad - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fontSize={10}
                      fill="#C97B63"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    >
                      {formatCostTick(cTick)}
                    </text>
                  )}
                  {showTokens && (
                    <text
                      x={mode === 'tokens' ? leftPad - 8 : leftPad + plotW + 8}
                      y={y + 3.5}
                      textAnchor={mode === 'tokens' ? 'end' : 'start'}
                      fontSize={10}
                      fill="#6E8B5E"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    >
                      {formatTokenTick(tTick)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Area fills */}
            {showCost && costAreaPath && <path d={costAreaPath} fill="url(#diaryCostAreaGrad)" />}
            {mode === 'tokens' && tokenAreaPath && (
              <path d={tokenAreaPath} fill="url(#diaryTokenAreaGrad)" />
            )}

            {/* Selected day guide */}
            {selectedDate && (() => {
              const sIdx = dailyData.findIndex((d) => d.date === selectedDate);
              if (sIdx < 0) return null;
              const sx = xForIdx(sIdx);
              return (
                <line
                  x1={sx}
                  y1={PADDING.top}
                  x2={sx}
                  y2={bottomY}
                  stroke="#C97B63"
                  strokeOpacity={0.3}
                  strokeDasharray="3 3"
                />
              );
            })()}

            {/* Hover crosshair */}
            {hoveredIndex >= 0 && (
              <line
                x1={xForIdx(hoveredIndex)}
                y1={PADDING.top}
                x2={xForIdx(hoveredIndex)}
                y2={bottomY}
                stroke="#847D72"
                strokeOpacity={0.5}
                strokeWidth={1}
              />
            )}

            {/* Token line */}
            {showTokens && tokenLinePath && (
              <path
                d={tokenLinePath}
                fill="none"
                stroke="#6E8B5E"
                strokeWidth={2}
                strokeDasharray={mode === 'both' ? '4 2' : undefined}
                strokeLinecap="round"
              />
            )}

            {/* Cost line */}
            {showCost && costLinePath && (
              <path
                d={costLinePath}
                fill="none"
                stroke="#C97B63"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            )}

            {/* Peak markers */}
            {showCost &&
              peakCostIdx >= 0 &&
              maxCost > 0 &&
              renderPeakTag(
                peakCostIdx,
                costPoints,
                `峰值 ${formatUsd(dailyData[peakCostIdx].costUsd)} (${formatShortDate(dailyData[peakCostIdx].date)})`,
                '#B85A3B',
                -10
              )}
            {showTokens &&
              peakTokensIdx >= 0 &&
              maxTokens > 0 &&
              // 避免与同一天的花费峰值文字重叠：若同一天且双轴显示，向下偏移一点
              renderPeakTag(
                peakTokensIdx,
                tokenPoints,
                `峰值 ${formatTokens(dailyData[peakTokensIdx].totalTokens)} (${formatShortDate(dailyData[peakTokensIdx].date)})`,
                '#5C6B50',
                showCost && peakTokensIdx === peakCostIdx ? 16 : -10
              )}

            {/* Hovered dots */}
            {hoveredIndex >= 0 && (
              <g className="pointer-events-none">
                {showCost && costPoints[hoveredIndex] && (
                  <circle
                    cx={costPoints[hoveredIndex].x}
                    cy={costPoints[hoveredIndex].y}
                    r={4.5}
                    fill="#C97B63"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                )}
                {showTokens && tokenPoints[hoveredIndex] && (
                  <circle
                    cx={tokenPoints[hoveredIndex].x}
                    cy={tokenPoints[hoveredIndex].y}
                    r={4}
                    fill="#6E8B5E"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                )}
              </g>
            )}

            {/* X axis labels */}
            {dailyData.map((d, idx) => {
              const show = idx % labelEvery === 0 || idx === n - 1;
              const skipPenultimate =
                idx !== n - 1 && n - 1 - idx < Math.max(1, Math.floor(labelEvery * 0.6));
              if (!show || skipPenultimate) return null;
              return (
                <text
                  key={d.date}
                  x={xForIdx(idx)}
                  y={CHART_HEIGHT - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={selectedDate === d.date ? 700 : 400}
                  fill={selectedDate === d.date ? '#C97B63' : '#A4A09A'}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {formatShortDate(d.date)}
                </text>
              );
            })}
          </svg>
        )}

        {/* Trend Hover Tooltip */}
        {hoveredDay && hoveredIndex >= 0 && (() => {
          const hx = xForIdx(hoveredIndex);
          const denom = hoveredDay.inputTokens + hoveredDay.cacheReadTokens + hoveredDay.cacheWriteTokens;
          const hitRate = denom > 0 ? hoveredDay.cacheReadTokens / denom : 0;
          return (
            <div
              className="pointer-events-none absolute top-3 z-20 w-56 rounded-xl border border-[#E8DFD1] bg-white/95 backdrop-blur-sm p-2.5 shadow-lg text-xs space-y-1.5"
              style={{
                left: hx > width * 0.55 ? Math.max(8, hx - 236) : Math.min(width - 232, hx + 12),
              }}
            >
              <div className="flex items-center justify-between border-b border-[#F0E9DF] pb-1">
                <span className="font-bold text-[#38332B] font-mono">
                  {hoveredDay.date}{' '}
                  <span className="text-[#A4A09A] font-sans font-normal">
                    {getChineseWeekday(hoveredDay.date)}
                  </span>
                </span>
                <span className="text-[10px] text-[#847D72]">{hoveredDay.requests.toLocaleString()} 次</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 font-mono">
                <div className="bg-[#FAF0ED]/70 px-2 py-1 rounded-lg">
                  <div className="text-[9px] font-sans text-[#A45842]">日花费</div>
                  <div className="font-bold text-[#C97B63]">{formatUsd(hoveredDay.costUsd)}</div>
                </div>
                <div className="bg-[#F2F5F0] px-2 py-1 rounded-lg">
                  <div className="text-[9px] font-sans text-[#5C6B50]">日 Token</div>
                  <div className="font-bold text-[#5C6B50]">{formatTokens(hoveredDay.totalTokens)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#847D72] pt-0.5">
                <span>
                  缓存命中 <strong className="text-[#38332B] font-mono">{formatPercent(hitRate)}</strong>
                </span>
                {hoveredDay.savingsUsd > 0 && (
                  <span className="text-[#5C6B50] font-mono">省 {formatUsd(hoveredDay.savingsUsd)}</span>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
