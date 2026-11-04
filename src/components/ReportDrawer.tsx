import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
} from 'lucide-react';
import { Report, DayData, Tag, AppConfig } from '../types';

interface ReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeekReport: Report | null;
  allReports: Report[];
  isGenerating: boolean;
  config: AppConfig;
  onGenerateReport: (type: 'weekly' | 'monthly') => void;
}

export const ReportDrawer: React.FC<ReportDrawerProps> = ({
  isOpen,
  onClose,
  currentWeekReport,
  allReports,
  isGenerating,
  config,
  onGenerateReport,
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'archive'>('current');
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedArchiveReport, setSelectedArchiveReport] = useState<Report | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const activeReport = activeTab === 'current' ? currentWeekReport : (selectedArchiveReport || allReports[0] || null);

  const handleCopy = () => {
    if (!activeReport) return;
    navigator.clipboard.writeText(activeReport.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasApiKey = Boolean(config.deepseekApiKey && config.deepseekApiKey !== 'your_deepseek_api_key_here');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-2xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">DeepSeek 智能总结</h2>
              <p className="text-xs text-slate-400">项目导向 · 直白精炼 · 一目了然</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tab switch */}
            <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setActiveTab('current')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeTab === 'current'
                    ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                当前总结
              </button>
              <button
                onClick={() => setActiveTab('archive')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeTab === 'archive'
                    ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                历史归档 ({allReports.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* API Key Warning if not configured */}
        {!hasApiKey && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start space-x-2 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">尚未在项目根目录 .env 中配置 DeepSeek API Key</p>
              <p className="text-amber-700 mt-0.5">
                请打开项目根目录下的 <code className="bg-amber-100/80 px-1 rounded">.env</code> 文件，填入你的 <code className="bg-amber-100/80 px-1 rounded">DEEPSEEK_API_KEY</code> 即可启用自动周报与月报提炼。
              </p>
            </div>
          </div>
        )}

        {/* Action Bar for Current Tab */}
        {activeTab === 'current' && (
          <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-white text-xs">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setReportType('weekly')}
                className={`px-2.5 py-1 rounded-lg border font-medium ${
                  reportType === 'weekly'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                本周周报
              </button>
              <button
                onClick={() => setReportType('monthly')}
                className={`px-2.5 py-1 rounded-lg border font-medium ${
                  reportType === 'monthly'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                本月月报
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onGenerateReport(reportType)}
                disabled={isGenerating}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded-lg shadow-xs shadow-indigo-200 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'AI 提炼中...' : activeReport ? '重新生成' : '立即生成'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'archive' ? (
            /* Archive List */
            <div className="space-y-4">
              <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-slate-100">
                {allReports.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">暂无历史报告归档</p>
                ) : (
                  allReports.map((rep) => {
                    const isSel = selectedArchiveReport?.id === rep.id;
                    return (
                      <button
                        key={rep.id}
                        onClick={() => setSelectedArchiveReport(rep)}
                        className={`px-3 py-2 rounded-xl text-left border text-xs shrink-0 transition-all ${
                          isSel
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-semibold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{rep.title || `${rep.targetDate} ${rep.type === 'weekly' ? '周报' : '月报'}`}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          {rep.startDate} ~ {rep.endDate}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedArchiveReport && (
                <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                    <span className="text-xs font-semibold text-slate-700 font-mono">
                      归档时间: {new Date(selectedArchiveReport.createdAt).toLocaleString()}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-indigo-600 shadow-2xs"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? '已复制' : '复制 Markdown'}</span>
                    </button>
                  </div>
                  <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-wrap font-sans text-xs leading-relaxed">
                    {selectedArchiveReport.content}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Current Report View */
            <div>
              {isGenerating ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-xs font-medium text-slate-600">DeepSeek 正在提炼本周期工作生活足迹...</p>
                  <p className="text-[11px] text-slate-400">分类归纳项目进展 · 提炼日常习惯 · 洞察身心节奏</p>
                </div>
              ) : activeReport ? (
                <div className="space-y-4">
                  {/* Top report actions */}
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-500 font-mono">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>生成于 {new Date(activeReport.createdAt).toLocaleString()}</span>
                    </div>
                    <button
                      onClick={handleCopy}
                      className="flex items-center space-x-1 px-3 py-1 bg-white border border-slate-200/80 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 font-medium rounded-lg shadow-2xs transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? '已复制' : '复制 Markdown'}</span>
                    </button>
                  </div>

                  {/* Rendered Markdown Content */}
                  <div className="p-6 bg-slate-50/40 rounded-2xl border border-slate-200/80 text-xs leading-relaxed text-slate-800 font-sans whitespace-pre-wrap select-text">
                    {activeReport.content}
                  </div>
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <Sparkles className="w-8 h-8 text-indigo-300" />
                  <p className="text-xs font-medium text-slate-600">本周尚未生成总结</p>
                  <p className="text-[11px] text-slate-400 text-center max-w-sm">
                    点击右上角「立即生成」，DeepSeek 将根据本周早中晚记录的所有真实事项，一键输出直白精炼的项目周报。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
