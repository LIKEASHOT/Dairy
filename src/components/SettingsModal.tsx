import React, { useState } from 'react';
import {
  X,
  Settings,
  ShieldCheck,
  Download,
  FileCode,
  FileText,
  Cpu,
} from 'lucide-react';
import { AppConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onExport: (format: 'json' | 'markdown') => Promise<{ success: boolean; filePath?: string; content?: string }>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onExport,
}) => {
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const hasKey = Boolean(config.deepseekApiKey && config.deepseekApiKey !== 'your_deepseek_api_key_here');

  const handleExport = async (format: 'json' | 'markdown') => {
    setIsExporting(true);
    setExportMessage(null);
    try {
      const res = await onExport(format);
      if (res.success && res.filePath) {
        setExportMessage(`导出成功！文件已保存至：\n${res.filePath}`);
      } else {
        // Fallback for browser download
        const blob = new Blob([res.content || ''], {
          type: format === 'json' ? 'application/json' : 'text/markdown',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diary-export-${new Date().toISOString().slice(0, 10)}.${format === 'json' ? 'json' : 'md'}`;
        a.click();
        URL.revokeObjectURL(url);
        setExportMessage(`导出成功！已通过浏览器下载备份文件。`);
      }
    } catch (e: any) {
      setExportMessage(`导出失败: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2723]/35 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E8DFD1] w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F0E9DF] flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0ED] text-[#C97B63] flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#38332B]">设置与数据管理</h2>
              <p className="text-xs text-[#A4A09A]">DeepSeek 状态 · 隐私隔离 · 数据本地备份</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A4A09A] hover:text-[#38332B] hover:bg-[#F3EBDD] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 text-xs text-[#58544E]">
          {/* DeepSeek API Status */}
          <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#E8DFD1] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 font-semibold text-[#38332B]">
                <Cpu className="w-4 h-4 text-[#C97B63]" />
                <span>DeepSeek API 配置</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  hasKey
                    ? 'bg-[#F2F5F0] text-[#5C6B50] border border-[#9EAD90]/40'
                    : 'bg-[#FAF5EB] text-[#8C6C26] border border-[#E8DFD1]'
                }`}
              >
                {hasKey ? '已在 .env 中配置' : '未配置有效密钥'}
              </span>
            </div>

            <p className="text-[11px] text-[#847D72] leading-relaxed">
              为保护个人隐私与开源安全，API Key 统一通过项目根目录的 <code className="bg-white px-1.5 py-0.5 rounded border border-[#E8DFD1] text-[#38332B] font-mono">.env</code> 文件读取，不在界面重复暴露。
            </p>

            <div className="bg-white p-3 rounded-lg border border-[#E8DFD1] space-y-1 font-mono text-[11px] text-[#58544E]">
              <div className="flex justify-between">
                <span className="text-[#A4A09A]">Model:</span>
                <span className="font-semibold text-[#C97B63]">{config.deepseekModel || 'deepseek-chat'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A4A09A]">Base URL:</span>
                <span className="truncate max-w-[280px]">{config.deepseekBaseUrl || 'https://api.deepseek.com'}</span>
              </div>
            </div>
          </div>

          {/* Privacy & Git Security Notice */}
          <div className="p-4 bg-[#FAF0ED]/60 rounded-xl border border-[#F0D5CD] space-y-2">
            <div className="flex items-center space-x-1.5 font-semibold text-[#A45842]">
              <ShieldCheck className="w-4 h-4 text-[#C97B63]" />
              <span>100% 本地隐私安全承诺</span>
            </div>
            <p className="text-[11px] text-[#A45842]/90 leading-relaxed">
              本项目专为个人本地运行设计，所有事项、心情和日记均存储在本地 SQLite 数据库（<code className="bg-white/90 px-1 rounded font-mono border border-[#F0D5CD]">data/diary.db</code>）中。<br />
              项目已配置严格的 <code className="bg-white/90 px-1 rounded font-mono border border-[#F0D5CD]">.gitignore</code>，无论推送到任何 GitHub 公开仓库，你的个人数据与 API 密钥都<strong>绝对不会被上传</strong>。
            </p>
          </div>

          {/* Data Export & Backup */}
          <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#E8DFD1] space-y-3">
            <div className="flex items-center space-x-1.5 font-semibold text-[#38332B]">
              <Download className="w-4 h-4 text-[#C97B63]" />
              <span>数据导出与备份</span>
            </div>
            <p className="text-[11px] text-[#847D72]">
              你可以随时将记录的所有工作足迹、项目成果和日记导出为标准文本文件，方便沉淀至个人 Obsidian、Notion 或本地冷备份。
            </p>

            <div className="flex items-center space-x-3 pt-1">
              <button
                onClick={() => handleExport('markdown')}
                disabled={isExporting}
                className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-white border border-[#E8DFD1] hover:border-[#C97B63] hover:text-[#C97B63] text-[#38332B] rounded-xl shadow-2xs transition-all font-medium text-xs"
              >
                <FileText className="w-3.5 h-3.5 text-[#C97B63]" />
                <span>导出为 Markdown (.md)</span>
              </button>

              <button
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-white border border-[#E8DFD1] hover:border-[#C97B63] hover:text-[#C97B63] text-[#38332B] rounded-xl shadow-2xs transition-all font-medium text-xs"
              >
                <FileCode className="w-3.5 h-3.5 text-[#C97B63]" />
                <span>导出完整 JSON 数据库</span>
              </button>
            </div>

            {exportMessage && (
              <div className="p-2.5 bg-[#F2F5F0] border border-[#9EAD90]/50 text-[#526046] rounded-lg text-[11px] whitespace-pre-wrap font-mono">
                {exportMessage}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#F0E9DF] bg-[#FAF7F2] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#F3EBDD] hover:bg-[#E8DFD1] text-[#38332B] text-xs font-medium rounded-xl transition-colors border border-[#E8DFD1]"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
