import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  BarChart3,
  RefreshCw,
  DollarSign,
  Cpu,
  Zap,
  Database,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { AIUsageQueryParams, AIUsageQueryResult } from '../types';
import { Storage } from '../services/storage';
import { formatBeijingDateTime, getBeijingNow, getMonthIdentifier } from '../lib/dateUtils';
import {
  buildModelColorMap,
  formatPercent,
  formatTokens,
  formatUsd,
  getChineseWeekday,
  getModelKey,
  getProviderMeta,
} from '../lib/aiUsageFormat';
import { AIStackedBarChart } from './ai-usage/AIStackedBarChart';
import { AITrendLineChart } from './ai-usage/AITrendLineChart';

interface AIUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RangePreset = 7 | 14 | 30 | 90 | 'month';

function getMonthBounds(monthStr: string): { startDate: string; endDate: string } {
  const [y, m] = monthStr.split('-').map(Number);
  if (!y || !m) {
    const now = getBeijingNow();
    const ym = getMonthIdentifier(now);
    return getMonthBounds(ym);
  }
  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  return {
    startDate: `${y}-${mm}-01`,
    endDate: `${y}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
}

export const AIUsageModal: React.FC<AIUsageModalProps> = ({ isOpen, onClose }) => {
  const [preset, setPreset] = useState<RangePreset>(30);
  const [customMonth, setCustomMonth] = useState<string>(() => getMonthIdentifier(getBeijingNow()));
  const [data, setData] = useState<AIUsageQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [barMetric, setBarMetric] = useState<'cost' | 'tokens'>('cost');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const queryParams: AIUsageQueryParams = useMemo(() => {
    if (preset === 'month') {
      const bounds = getMonthBounds(customMonth);
      return { startDate: bounds.startDate, endDate: bounds.endDate };
    }
    return { days: preset };
  }, [preset, customMonth]);

  const fetchUsage = useCallback(async (params: AIUsageQueryParams) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await Storage.syncAndQueryAiUsage(params);
      setData(res);

      // 默认选中区间内最近有数据的一天（若都没有则选中区间最后一天）
      setSelectedDate((prev) => {
        if (prev && res.dailyData.some((d) => d.date === prev)) {
          return prev;
        }
        for (let i = res.dailyData.length - 1; i >= 0; i--) {
          if (res.dailyData[i].totalTokens > 0 || res.dailyData[i].costUsd > 0) {
            return res.dailyData[i].date;
          }
        }
        return res.dailyData[res.dailyData.length - 1]?.date || null;
      });
    } catch (err: any) {
      console.error('Failed to query AI usage:', err);
      setErrorMessage(err?.message || '读取 Vorssaint 数据或查询数据库失败，请尝试完全重启应用。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUsage(queryParams);
    }
  }, [isOpen, queryParams, fetchUsage]);

  const modelColorMap = useMemo(
    () => buildModelColorMap(data?.modelBreakdown || []),
    [data?.modelBreakdown]
  );

  const selectedDay = useMemo(() => {
    if (!data || !selectedDate) return null;
    return data.dailyData.find((d) => d.date === selectedDate) || null;
  }, [data, selectedDate]);

  const selectedDayIndex = useMemo(() => {
    if (!data || !selectedDate) return -1;
    return data.dailyData.findIndex((d) => d.date === selectedDate);
  }, [data, selectedDate]);

  const activeDaysCount = useMemo(() => {
    if (!data) return 0;
    return data.dailyData.filter((d) => d.requests > 0 || d.totalTokens > 0).length;
  }, [data]);

  if (!isOpen) return null;

  const totalCalendarDays = Math.max(1, data?.dailyData.filter((d) => d.date <= data.todayDate).length || data?.dailyData.length || 1);
  const dailyAvgCost = data ? data.periodSummary.costUsd / totalCalendarDays : 0;
  const maxMonthInput = getMonthIdentifier(getBeijingNow());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#2C2723]/35 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#FAF7F2] rounded-2xl shadow-2xl border border-[#E8DFD1] w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-[#E8DFD1] bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#FAF0ED] text-[#C97B63] border border-[#F0D5CD] flex items-center justify-center shadow-2xs">
              <BarChart3 className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-[#38332B]">每日 AI 模型 Token 与花费统计</h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F3EBDD] text-[#58544E] border border-[#E8DFD1]">
                  北京时间 (UTC+8)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#A4A09A] mt-0.5">
                <span className="inline-flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-[#C97B63]" />
                  <span>
                    Vorssaint 缓存更新:{' '}
                    {data?.binUpdatedAt ? formatBeijingDateTime(new Date(data.binUpdatedAt)) : '未读取到缓存'}
                  </span>
                </span>
                {data?.oldestStoredDate && data?.newestStoredDate && (
                  <span className="inline-flex items-center space-x-1">
                    <Database className="w-3 h-3 text-[#6E8B5E]" />
                    <span>
                      已沉淀本地库: {data.oldestStoredDate} ~ {data.newestStoredDate}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Time Range Pills */}
            <div className="flex items-center bg-[#F3EBDD]/70 p-0.5 rounded-xl border border-[#E8DFD1] text-xs font-medium">
              {([7, 14, 30, 90] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setPreset(days)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    preset === days
                      ? 'bg-white text-[#C97B63] shadow-2xs font-semibold'
                      : 'text-[#847D72] hover:text-[#38332B]'
                  }`}
                >
                  {days}天
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPreset('month')}
                className={`px-2.5 py-1 rounded-lg transition-all inline-flex items-center space-x-1 ${
                  preset === 'month'
                    ? 'bg-white text-[#C97B63] shadow-2xs font-semibold'
                    : 'text-[#847D72] hover:text-[#38332B]'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>按月</span>
              </button>
            </div>

            {/* Custom Month Input when 按月 selected */}
            {preset === 'month' && (
              <input
                type="month"
                value={customMonth}
                max={maxMonthInput}
                onChange={(e) => {
                  if (e.target.value) setCustomMonth(e.target.value);
                }}
                className="px-2.5 py-1 text-xs bg-white border border-[#E8DFD1] focus:border-[#C97B63] rounded-xl text-[#38332B] font-mono outline-none shadow-2xs"
              />
            )}

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={() => fetchUsage(queryParams)}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#C97B63] hover:bg-[#B66B54] disabled:bg-[#E8DFD1] text-white text-xs font-medium shadow-2xs transition-colors"
              title="重新解析 Vorssaint 缓存并同步至 diary.db"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? '同步中...' : '手动刷新'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A4A09A] hover:text-[#38332B] hover:bg-[#F3EBDD] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Error banner if IPC / runtime failed */}
          {errorMessage && (
            <div className="p-3.5 bg-[#FAF0ED] border border-[#F0D5CD] rounded-xl flex items-start space-x-2.5 text-xs text-[#A45842]">
              <AlertTriangle className="w-4 h-4 text-[#C97B63] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">数据同步失败</p>
                <p className="text-[11px] leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Warning banner if fallback / missing cache */}
          {data?.warning && (
            <div className="p-3 bg-[#FAF5EB] border border-[#E8DFD1] rounded-xl flex items-start space-x-2.5 text-xs text-[#8C6C26]">
              <AlertTriangle className="w-4 h-4 text-[#D6B16C] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">{data.warning}</p>
                <p className="text-[11px] text-[#8C6C26]/80">
                  Vorssaint 每隔约 5 分钟及休眠/退出时刷新缓存；已同步过的数据永久沉淀在 <code className="bg-white px-1 rounded border border-[#E8DFD1]">data/diary.db</code>，超 91 天也不会丢失。
                </p>
              </div>
            </div>
          )}

          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Today */}
            <div className="bg-white rounded-2xl border border-[#E8DFD1] p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#58544E]">今日消耗</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FAF0ED] text-[#C97B63]">
                  {data?.todayDate || '-'}
                </span>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-bold text-[#C97B63] font-mono tracking-tight">
                  {data ? formatUsd(data.todaySummary.costUsd) : '$0.00'}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#847D72] mt-1 font-mono">
                  <span>{data ? formatTokens(data.todaySummary.totalTokens) : '0'} Tokens</span>
                  <span>{data ? data.todaySummary.requests.toLocaleString() : '0'} 次调用</span>
                </div>
              </div>
            </div>

            {/* Card 2: Period Total Cost */}
            <div className="bg-white rounded-2xl border border-[#E8DFD1] p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#58544E]">周期累计花费</span>
                <div className="w-6 h-6 rounded-lg bg-[#FAF0ED] text-[#C97B63] flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-bold text-[#38332B] font-mono tracking-tight">
                  {data ? formatUsd(data.periodSummary.costUsd) : '$0.00'}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#847D72] mt-1">
                  <span>
                    日均 <strong className="text-[#C97B63] font-mono">{formatUsd(dailyAvgCost)}</strong>
                  </span>
                  <span className="font-mono">
                    活跃 {activeDaysCount}/{totalCalendarDays} 天
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Period Total Tokens */}
            <div className="bg-white rounded-2xl border border-[#E8DFD1] p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#58544E]">周期累计 Token</span>
                <div className="w-6 h-6 rounded-lg bg-[#F2F5F0] text-[#5C6B50] flex items-center justify-center">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-bold text-[#38332B] font-mono tracking-tight">
                  {data ? formatTokens(data.periodSummary.totalTokens) : '0'}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#847D72] mt-1 font-mono">
                  <span>共 {data ? data.periodSummary.requests.toLocaleString() : '0'} 次</span>
                  <span>
                    输出 {data ? formatTokens(data.periodSummary.outputTokens + data.periodSummary.reasoningTokens) : '0'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Cache Hit Rate & Savings */}
            <div className="bg-white rounded-2xl border border-[#E8DFD1] p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#58544E]">缓存命中与节省</span>
                <div className="w-6 h-6 rounded-lg bg-[#F2F5F0] text-[#5C6B50] flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-[#5C6B50] font-mono tracking-tight">
                    {data ? formatPercent(data.periodSummary.cacheHitRate) : '0.0%'}
                  </span>
                  {data && data.periodSummary.savingsUsd > 0 && (
                    <span className="text-[11px] font-semibold text-[#5C6B50] bg-[#F2F5F0] px-2 py-0.5 rounded-full font-mono">
                      省 {formatUsd(data.periodSummary.savingsUsd)}
                    </span>
                  )}
                </div>
                <div className="w-full h-1.5 bg-[#F3EBDD] rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-[#6E8B5E] rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, (data?.periodSummary.cacheHitRate || 0) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stacked Bar Chart */}
          <AIStackedBarChart
            dailyData={data?.dailyData || []}
            modelBreakdown={data?.modelBreakdown || []}
            modelColorMap={modelColorMap}
            metric={barMetric}
            onMetricChange={setBarMetric}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            hoveredDate={hoveredDate}
            onHoverDate={setHoveredDate}
          />

          {/* Daily Trend Line Chart */}
          <AITrendLineChart
            dailyData={data?.dailyData || []}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            hoveredDate={hoveredDate}
            onHoverDate={setHoveredDate}
          />

          {/* Bottom Split: Period Model Summary Table + Selected Day Drill-Down */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Period Model Summary Table */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E8DFD1] p-4 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0E9DF]">
                <div>
                  <h3 className="text-sm font-bold text-[#38332B]">模型累计汇总明细</h3>
                  <p className="text-[11px] text-[#A4A09A]">
                    统计区间: {data?.startDate || '-'} ~ {data?.endDate || '-'}（共 {data?.modelBreakdown.length || 0} 个模型）
                  </p>
                </div>
                <span className="text-[11px] text-[#847D72] font-mono">
                  合计 {data ? formatUsd(data.periodSummary.costUsd) : '$0.00'}
                </span>
              </div>

              {!data || data.modelBreakdown.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#A4A09A]">
                  所选区间内暂无模型调用记录
                </div>
              ) : (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#F0E9DF] text-[11px] text-[#847D72]">
                        <th className="py-2 pr-2 font-medium">模型 / 厂商</th>
                        <th className="py-2 px-2 font-medium text-right">调用</th>
                        <th className="py-2 px-2 font-medium text-right">总 Token</th>
                        <th className="py-2 px-2 font-medium text-right">花费 ($)</th>
                        <th className="py-2 pl-2 font-medium w-28 text-right">花费占比</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F6F0E6]">
                      {data.modelBreakdown.map((m) => {
                        const key = getModelKey(m.provider, m.model);
                        const pMeta = getProviderMeta(m.provider);
                        const dotColor = modelColorMap.get(key) || pMeta.color;
                        const pct = Math.min(100, m.costShare * 100);
                        return (
                          <tr key={key} className="hover:bg-[#FAF7F2]/80 transition-colors group">
                            <td className="py-2.5 pr-2">
                              <div className="flex items-center space-x-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: dotColor }}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-semibold text-[#38332B] truncate max-w-[165px]">
                                      {m.displayName}
                                    </span>
                                    <span
                                      className="text-[10px] px-1.5 py-0.2 rounded border font-medium shrink-0"
                                      style={{
                                        backgroundColor: pMeta.bgColor,
                                        color: pMeta.textColor,
                                        borderColor: pMeta.borderColor,
                                      }}
                                    >
                                      {pMeta.label}
                                    </span>
                                  </div>
                                  <div
                                    className="text-[10px] text-[#A4A09A] font-mono mt-0.5 truncate max-w-[240px]"
                                    title={`输入 ${m.inputTokens.toLocaleString()} / 缓存写 ${m.cacheWriteTokens.toLocaleString()} / 缓存读 ${m.cacheReadTokens.toLocaleString()} / 输出 ${m.outputTokens.toLocaleString()} / 推理 ${m.reasoningTokens.toLocaleString()}`}
                                  >
                                    入 {formatTokens(m.inputTokens)} · 缓 {formatTokens(m.cacheReadTokens)} · 出{' '}
                                    {formatTokens(m.outputTokens + m.reasoningTokens)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-[#58544E]">
                              {m.requests.toLocaleString()}
                            </td>
                            <td
                              className="py-2.5 px-2 text-right font-mono font-medium text-[#38332B]"
                              title={`输入 ${formatTokens(m.inputTokens)} | 缓存写 ${formatTokens(m.cacheWriteTokens)} | 缓存读 ${formatTokens(m.cacheReadTokens)} | 输出 ${formatTokens(m.outputTokens)} | 推理 ${formatTokens(m.reasoningTokens)}`}
                            >
                              {formatTokens(m.totalTokens)}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono">
                              <div className="font-semibold text-[#C97B63]">
                                {m.costUsd > 0 ? formatUsd(m.costUsd) : m.unpricedCount > 0 ? '未定价' : '$0.00'}
                              </div>
                              {m.unpricedCount > 0 && m.costUsd > 0 && (
                                <div className="text-[9px] text-[#A4A09A]">含 {m.unpricedCount} 未定价</div>
                              )}
                            </td>
                            <td className="py-2.5 pl-2 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <div className="w-14 h-1.5 bg-[#F3EBDD] rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${pct}%`, backgroundColor: dotColor }}
                                  />
                                </div>
                                <span className="font-mono text-[11px] text-[#58544E] w-11 text-right">
                                  {formatPercent(m.costShare)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Selected Day Drill-Down Panel */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E8DFD1] p-4 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0E9DF]">
                <div>
                  <h3 className="text-sm font-bold text-[#38332B]">单日消耗下钻</h3>
                  <p className="text-[11px] text-[#A4A09A]">
                    {selectedDay
                      ? `${selectedDay.date} ${getChineseWeekday(selectedDay.date)}`
                      : '点击上方图表柱体选择日期'}
                  </p>
                </div>

                {data && data.dailyData.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      disabled={selectedDayIndex <= 0}
                      onClick={() => {
                        if (selectedDayIndex > 0) {
                          setSelectedDate(data.dailyData[selectedDayIndex - 1].date);
                        }
                      }}
                      className="p-1 rounded-lg border border-[#E8DFD1] text-[#58544E] hover:bg-[#FAF7F2] disabled:opacity-40"
                      title="前一天"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={selectedDayIndex < 0 || selectedDayIndex >= data.dailyData.length - 1}
                      onClick={() => {
                        if (selectedDayIndex >= 0 && selectedDayIndex < data.dailyData.length - 1) {
                          setSelectedDate(data.dailyData[selectedDayIndex + 1].date);
                        }
                      }}
                      className="p-1 rounded-lg border border-[#E8DFD1] text-[#58544E] hover:bg-[#FAF7F2] disabled:opacity-40"
                      title="后一天"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {!selectedDay ? (
                <div className="py-12 text-center text-xs text-[#A4A09A]">暂无选中日期</div>
              ) : (
                <div className="mt-3 space-y-3 flex-1 flex flex-col">
                  {/* Selected Day Quick Summary */}
                  <div className="grid grid-cols-3 gap-2 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#F0E9DF] text-center font-mono">
                    <div>
                      <div className="text-[10px] text-[#A4A09A] font-sans">当日花费</div>
                      <div className="text-sm font-bold text-[#C97B63]">{formatUsd(selectedDay.costUsd)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#A4A09A] font-sans">当日 Token</div>
                      <div className="text-sm font-bold text-[#38332B]">
                        {formatTokens(selectedDay.totalTokens)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#A4A09A] font-sans">调用次数</div>
                      <div className="text-sm font-bold text-[#58544E]">
                        {selectedDay.requests.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Models active on selected day */}
                  {selectedDay.models.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-8 text-xs text-[#A4A09A]">
                      {selectedDay.date} 当天暂无 AI 调用记录
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                      {selectedDay.models.map((m) => {
                        const key = getModelKey(m.provider, m.model);
                        const pMeta = getProviderMeta(m.provider);
                        const dotColor = modelColorMap.get(key) || pMeta.color;
                        const dayCostPct =
                          selectedDay.costUsd > 0 ? Math.min(100, (m.costUsd / selectedDay.costUsd) * 100) : 0;

                        return (
                          <div
                            key={key}
                            className="p-2.5 rounded-xl border border-[#F0E9DF] bg-[#FAF7F2]/60 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-1.5 min-w-0">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: dotColor }}
                                />
                                <span className="text-xs font-semibold text-[#38332B] truncate">
                                  {m.displayName}
                                </span>
                                <span className="text-[10px] text-[#847D72] shrink-0">
                                  ({m.requests.toLocaleString()} 次)
                                </span>
                              </div>
                              <div className="text-right font-mono shrink-0">
                                <span className="text-xs font-bold text-[#C97B63]">
                                  {m.costUsd > 0 ? formatUsd(m.costUsd) : m.unpricedCount > 0 ? '未定价' : '$0.00'}
                                </span>
                                <span className="text-[11px] text-[#58544E] ml-2">
                                  {formatTokens(m.totalTokens)}
                                </span>
                              </div>
                            </div>

                            {/* Day share bar */}
                            <div className="w-full h-1 bg-[#E8DFD1]/70 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${dayCostPct > 0 ? dayCostPct : selectedDay.totalTokens > 0 ? (m.totalTokens / selectedDay.totalTokens) * 100 : 0}%`,
                                  backgroundColor: dotColor,
                                }}
                              />
                            </div>

                            {/* 5-bucket token breakdown */}
                            <div className="grid grid-cols-4 gap-1 text-[10px] text-[#847D72] font-mono pt-0.5">
                              <span>入 {formatTokens(m.inputTokens)}</span>
                              <span>写缓 {formatTokens(m.cacheWriteTokens)}</span>
                              <span>读缓 {formatTokens(m.cacheReadTokens)}</span>
                              <span className="text-right">
                                出 {formatTokens(m.outputTokens + m.reasoningTokens)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
