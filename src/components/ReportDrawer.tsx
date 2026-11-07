import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  FileText,
  Clock,
  Eye,
} from 'lucide-react';
import { Report, AppConfig } from '../types';
import { formatBeijingDateTime } from '../lib/dateUtils';
import { MarkdownView } from './MarkdownView';

interface ReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeekReport: Report | null;
  currentMonthReport: Report | null;
  allReports: Report[];
  isGenerating: boolean;
  config: AppConfig;
  onGenerateReport: (type: 'weekly' | 'monthly') => void;
}

export const ReportDrawer: React.FC<ReportDrawerProps> = ({
  isOpen,
  onClose,
  currentWeekReport,
  currentMonthReport,
  allReports,
  isGenerating,
  config,
  onGenerateReport,
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'archive'>('current');
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedArchiveReport, setSelectedArchiveReport] = useState<Report | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);

  if (!isOpen) return null;

  // Pick report based on selected reportType ('weekly' vs 'monthly')
  const currentPeriodReport = reportType === 'weekly' ? currentWeekReport : currentMonthReport;
  const activeReport = activeTab === 'current' ? currentPeriodReport : (selectedArchiveReport || allReports[0] || null);

  const handleCopy = () => {
    if (!activeReport) return;
    navigator.clipboard.writeText(activeReport.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasApiKey = Boolean(config.deepseekApiKey && config.deepseekApiKey !== 'your_deepseek_api_key_here');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#2C2723]/30 backdrop-blur-2xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-[#E8DFD1] flex flex-col">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-[#E8DFD1] flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C97B63] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#38332B]">DeepSeek 智能总结</h2>
              <p className="text-xs text-[#A4A09A]">项目导向 · 直白精炼 · 一目了然</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tab switch */}
            <div className="flex bg-[#F3EBDD] p-0.5 rounded-lg text-xs font-medium border border-[#E8DFD1]">
              <button
                onClick={() => setActiveTab('current')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeTab === 'current'
                    ? 'bg-white text-[#C97B63] shadow-2xs font-semibold'
                    : 'text-[#847D72] hover:text-[#38332B]'
                }`}
              >
                当前总结
              </button>
              <button
                onClick={() => setActiveTab('archive')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeTab === 'archive'
                    ? 'bg-white text-[#C97B63] shadow-2xs font-semibold'
                    : 'text-[#847D72] hover:text-[#38332B]'
                }`}
              >
                历史归档 ({allReports.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A4A09A] hover:text-[#38332B] hover:bg-[#F3EBDD] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* API Key Warning if not configured */}
        {!hasApiKey && (
          <div className="mx-6 mt-4 p-3 bg-[#FAF5EB] border border-[#E8DFD1] rounded-xl flex items-start space-x-2 text-xs text-[#8C6C26]">
            <AlertCircle className="w-4 h-4 text-[#D6B16C] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#8C6C26]">尚未在项目根目录 .env 中配置 DeepSeek API Key</p>
              <p className="text-[#8C6C26]/80 mt-0.5">
                请打开项目根目录下的 <code className="bg-white px-1 rounded border border-[#E8DFD1]">.env</code> 文件，填入你的 <code className="bg-white px-1 rounded border border-[#E8DFD1]">DEEPSEEK_API_KEY</code> 即可启用自动周报与月报提炼。
              </p>
            </div>
          </div>
        )}

        {/* Action Bar for Current Tab */}
        {activeTab === 'current' && (
          <div className="px-6 py-3 border-b border-[#F0E9DF] flex items-center justify-between bg-white text-xs">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setReportType('weekly')}
                className={`px-2.5 py-1 rounded-lg border font-medium ${
                  reportType === 'weekly'
                    ? 'bg-[#FAF0ED] border-[#F0D5CD] text-[#C97B63]'
                    : 'border-[#E8DFD1] text-[#847D72] hover:bg-[#FAF7F2]'
                }`}
              >
                本周周报
              </button>
              <button
                onClick={() => setReportType('monthly')}
                className={`px-2.5 py-1 rounded-lg border font-medium ${
                  reportType === 'monthly'
                    ? 'bg-[#FAF0ED] border-[#F0D5CD] text-[#C97B63]'
                    : 'border-[#E8DFD1] text-[#847D72] hover:bg-[#FAF7F2]'
                }`}
              >
                本月月报
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onGenerateReport(reportType)}
                disabled={isGenerating}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#C97B63] hover:bg-[#B66B54] disabled:bg-[#E8DFD1] text-white font-medium rounded-lg shadow-2xs transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>
                  {isGenerating
                    ? 'AI 提炼中...'
                    : activeReport
                    ? `重新生成${reportType === 'weekly' ? '周报' : '月报'}`
                    : `生成${reportType === 'weekly' ? '本周周报' : '本月月报'}`}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'archive' ? (
            /* Archive List */
            <div className="space-y-4">
              <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-[#F0E9DF]">
                {allReports.length === 0 ? (
                  <p className="text-xs text-[#A4A09A] py-4">暂无历史报告归档</p>
                ) : (
                  allReports.map((rep) => {
                    const isSel = selectedArchiveReport?.id === rep.id;
                    return (
                      <button
                        key={rep.id}
                        onClick={() => setSelectedArchiveReport(rep)}
                        className={`px-3 py-2 rounded-xl text-left border text-xs shrink-0 transition-all ${
                          isSel
                            ? 'bg-[#FAF0ED] border-[#C97B63] text-[#A45842] font-semibold shadow-2xs'
                            : 'bg-white border-[#E8DFD1] text-[#58544E] hover:bg-[#FAF7F2]'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#C97B63]" />
                          <span>{rep.title || `${rep.targetDate} ${rep.type === 'weekly' ? '周报' : '月报'}`}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              rep.type === 'weekly'
                                ? 'bg-[#FAF0ED] text-[#C97B63]'
                                : 'bg-[#EBF1E8] text-[#5C6B50]'
                            }`}
                          >
                            {rep.type === 'weekly' ? '周报' : '月报'}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#A4A09A] mt-1 font-mono">
                          {rep.startDate} ~ {rep.endDate}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedArchiveReport && (
                <div className="bg-white p-5 rounded-2xl border border-[#E8DFD1] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD1]">
                    <span className="text-xs font-semibold text-[#58544E] font-mono">
                      归档时间: {formatBeijingDateTime(selectedArchiveReport.createdAt)}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setShowRawMarkdown(!showRawMarkdown)}
                        className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-[#FAF7F2] border border-[#E8DFD1] hover:border-[#C97B63] rounded-lg text-[#58544E] hover:text-[#C97B63] shadow-2xs transition-colors"
                        title={showRawMarkdown ? '切换为渲染视图' : '查看 Markdown 源码'}
                      >
                        {showRawMarkdown ? <Eye className="w-3.5 h-3.5 text-[#C97B63]" /> : <FileText className="w-3.5 h-3.5" />}
                        <span>{showRawMarkdown ? '渲染视图' : '源码'}</span>
                      </button>
                      <button
                        onClick={handleCopy}
                        className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-white border border-[#E8DFD1] hover:border-[#C97B63] rounded-lg text-[#38332B] hover:text-[#C97B63] shadow-2xs transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-[#5C6B50]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? '已复制' : '复制 Markdown'}</span>
                      </button>
                    </div>
                  </div>
                  {showRawMarkdown ? (
                    <pre className="p-4 bg-[#FAF7F2] rounded-xl border border-[#E8DFD1] text-xs leading-relaxed text-[#38332B] font-mono whitespace-pre-wrap select-text overflow-x-auto">
                      {selectedArchiveReport.content}
                    </pre>
                  ) : (
                    <div className="p-1">
                      <MarkdownView content={selectedArchiveReport.content} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Current Report View */
            <div>
              {isGenerating ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 text-[#A4A09A]">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#C97B63]" />
                  <p className="text-xs font-medium text-[#38332B]">DeepSeek 正在提炼本周期工作生活足迹...</p>
                  <p className="text-[11px] text-[#A4A09A]">分类归纳项目进展 · 提炼日常习惯 · 洞察身心节奏</p>
                </div>
              ) : activeReport ? (
                <div className="space-y-4">
                  {/* Top report actions */}
                  <div className="flex items-center justify-between bg-[#FAF7F2] p-3 rounded-xl border border-[#E8DFD1] text-xs">
                    <div className="flex items-center space-x-1.5 text-[#847D72] font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#C97B63]" />
                      <span>生成于 {formatBeijingDateTime(activeReport.createdAt)}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setShowRawMarkdown(!showRawMarkdown)}
                        className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-white border border-[#E8DFD1] hover:border-[#C97B63] rounded-lg text-[#58544E] hover:text-[#C97B63] shadow-2xs transition-colors"
                        title={showRawMarkdown ? '切换为渲染视图' : '查看 Markdown 源码'}
                      >
                        {showRawMarkdown ? <Eye className="w-3.5 h-3.5 text-[#C97B63]" /> : <FileText className="w-3.5 h-3.5" />}
                        <span>{showRawMarkdown ? '渲染视图' : '源码'}</span>
                      </button>
                      <button
                        onClick={handleCopy}
                        className="flex items-center space-x-1 px-3 py-1 bg-white border border-[#E8DFD1] hover:border-[#C97B63] text-[#38332B] hover:text-[#C97B63] font-medium rounded-lg shadow-2xs transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-[#5C6B50]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? '已复制' : '复制 Markdown'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Rendered Markdown Content */}
                  {showRawMarkdown ? (
                    <pre className="p-5 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD1] text-xs leading-relaxed text-[#38332B] font-mono whitespace-pre-wrap select-text overflow-x-auto">
                      {activeReport.content}
                    </pre>
                  ) : (
                    <div className="p-6 bg-white rounded-2xl border border-[#E8DFD1] shadow-2xs">
                      <MarkdownView content={activeReport.content} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 text-[#A4A09A]">
                  <Sparkles className="w-8 h-8 text-[#C97B63]/40" />
                  <p className="text-xs font-medium text-[#38332B]">
                    {reportType === 'weekly' ? '本周尚未生成周报' : '本月尚未生成月报'}
                  </p>
                  <p className="text-[11px] text-[#A4A09A] text-center max-w-sm">
                    {reportType === 'weekly'
                      ? '点击右上角「生成本周周报」，DeepSeek 将根据本周早中晚记录的所有真实事项，一键输出直白精炼的项目周报。'
                      : '点击右上角「生成本月月报」，DeepSeek 将根据本月各项目与生活记录的所有真实足迹，一键输出宏观精炼的项目月报。'}
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
