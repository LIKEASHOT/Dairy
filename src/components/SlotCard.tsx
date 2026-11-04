import React, { useState, useRef } from 'react';
import {
  SunMedium,
  Sun,
  Moon,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  FileText,
  Tag as TagIcon,
} from 'lucide-react';
import { SlotPeriod, ActivityRecord, Tag } from '../types';
import { PERIOD_CONFIG } from '../lib/constants';

interface SlotCardProps {
  date: string;
  period: SlotPeriod;
  records: ActivityRecord[];
  summaryNote?: string;
  tags: Tag[];
  onAddRecord: (date: string, period: SlotPeriod, content: string, tagId: string) => void;
  onUpdateRecord: (id: string, content: string, tagId: string) => void;
  onDeleteRecord: (id: string) => void;
  onSaveSlotNote: (date: string, period: SlotPeriod, note: string) => void;
}

export const SlotCard: React.FC<SlotCardProps> = ({
  date,
  period,
  records,
  summaryNote = '',
  tags,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onSaveSlotNote,
}) => {
  const config = PERIOD_CONFIG[period];
  const [inputText, setInputText] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string>(tags[0]?.id || '');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(summaryNote);

  // Edit item state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingTagId, setEditingTagId] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Fallback to first tag if selectedTagId is invalid
  const currentTag = tags.find((t) => t.id === selectedTagId) || tags[0];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const tagIdToUse = currentTag ? currentTag.id : '';
    onAddRecord(date, period, inputText.trim(), tagIdToUse);
    setInputText('');
  };

  const startEdit = (rec: ActivityRecord) => {
    setEditingRecordId(rec.id);
    setEditingContent(rec.content);
    setEditingTagId(rec.tagId);
  };

  const saveEdit = (id: string) => {
    if (!editingContent.trim()) {
      onDeleteRecord(id);
    } else {
      onUpdateRecord(id, editingContent.trim(), editingTagId);
    }
    setEditingRecordId(null);
  };

  const getPeriodIcon = () => {
    switch (period) {
      case 'morning':
        return <SunMedium className="w-3.5 h-3.5 text-amber-500" />;
      case 'afternoon':
        return <Sun className="w-3.5 h-3.5 text-sky-500" />;
      case 'evening':
        return <Moon className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col">
      {/* Slot Header */}
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
        <div className="flex items-center space-x-1.5">
          {getPeriodIcon()}
          <span className="text-xs font-semibold text-slate-700">{config.name}</span>
          <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">{config.time}</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              setIsEditingNote(!isEditingNote);
              setNoteText(summaryNote);
            }}
            className={`p-1 rounded text-slate-400 hover:text-slate-600 transition-colors ${
              summaryNote ? 'text-indigo-500 bg-indigo-50' : ''
            }`}
            title={summaryNote ? '查看/编辑时段备注' : '添加时段备注'}
          >
            <FileText className="w-3 h-3" />
          </button>
          <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 rounded-full bg-slate-100">
            {records.length}
          </span>
        </div>
      </div>

      {/* Optional Period Note */}
      {isEditingNote && (
        <div className="p-2.5 bg-amber-50/40 border-b border-amber-100/60 text-xs">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="写下这时段的整体状态或重点备注..."
            rows={2}
            className="w-full text-xs p-1.5 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
          />
          <div className="flex justify-end space-x-1.5 mt-1">
            <button
              onClick={() => setIsEditingNote(false)}
              className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700"
            >
              取消
            </button>
            <button
              onClick={() => {
                onSaveSlotNote(date, period, noteText.trim());
                setIsEditingNote(false);
              }}
              className="px-2.5 py-0.5 text-[11px] bg-amber-500 text-white font-medium rounded hover:bg-amber-600 shadow-2xs"
            >
              保存备注
            </button>
          </div>
        </div>
      )}

      {/* Show saved note badge if not editing */}
      {!isEditingNote && summaryNote && (
        <div className="px-3 py-1 bg-amber-50/50 border-b border-amber-100/50 text-[11px] text-amber-800/90 italic flex items-center justify-between">
          <span className="truncate">💡 {summaryNote}</span>
        </div>
      )}

      {/* Records List (Pure Done-Log: NO checkboxes) */}
      <div className="p-2 space-y-1.5 flex-1 min-h-[50px] max-h-[220px] overflow-y-auto">
        {records.length === 0 ? (
          <div className="h-10 flex items-center justify-center text-[11px] text-slate-300 italic select-none">
            暂无记录
          </div>
        ) : (
          records.map((rec) => {
            const isEditing = editingRecordId === rec.id;
            const tag = tags.find((t) => t.id === rec.tagId) || rec.tag;

            if (isEditing) {
              return (
                <div key={rec.id} className="p-1.5 bg-slate-50 rounded-lg border border-indigo-200 text-xs space-y-1.5">
                  <input
                    type="text"
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <select
                      value={editingTagId}
                      onChange={(e) => setEditingTagId(e.target.value)}
                      className="text-[11px] px-1.5 py-0.5 bg-white border border-slate-200 rounded"
                    >
                      {tags.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => saveEdit(rec.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        title="保存"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingRecordId(null)}
                        className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                        title="取消"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={rec.id}
                className="group relative flex items-start space-x-1.5 p-1.5 rounded-lg hover:bg-slate-50/90 border border-transparent hover:border-slate-200/60 transition-all text-xs"
              >
                {/* Tag Pill with custom color */}
                {tag && (
                  <span
                    style={{
                      backgroundColor: tag.bgColor || '#F1F5F9',
                      color: tag.textColor || tag.color || '#334155',
                      borderColor: tag.color + '40',
                    }}
                    className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border tracking-tight"
                  >
                    {tag.name}
                  </span>
                )}

                {/* Record Content */}
                <span className="flex-1 text-slate-700 leading-snug break-words">
                  {rec.content}
                </span>

                {/* Actions on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-0.5 shrink-0">
                  <button
                    onClick={() => startEdit(rec)}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                    title="编辑"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDeleteRecord(rec.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    title="删除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleAdd} className="p-2 border-t border-slate-100 bg-slate-50/40 rounded-b-xl">
        <div className="flex items-center space-x-1.5">
          {/* Tag Selector Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              style={{
                backgroundColor: currentTag?.bgColor || '#EEF2FF',
                color: currentTag?.textColor || currentTag?.color || '#4338CA',
              }}
              className="text-[11px] font-medium px-2 py-1 rounded-lg border border-slate-200/80 flex items-center space-x-1 shrink-0 shadow-2xs hover:brightness-95 transition-all"
              title="切换当前标签"
            >
              <TagIcon className="w-2.5 h-2.5" />
              <span>{currentTag?.name || '标签'}</span>
            </button>

            {/* Tag Selection Popup */}
            {showTagDropdown && (
              <div className="absolute bottom-full left-0 mb-1 w-32 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 max-h-48 overflow-y-auto">
                {tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTagId(t.id);
                      setShowTagDropdown(false);
                      inputRef.current?.focus();
                    }}
                    className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-50 flex items-center space-x-1.5"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Activity Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="记录做了什么，回车添加..."
            className="flex-1 text-xs px-2.5 py-1 bg-white border border-slate-200/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-300 shadow-2xs"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 transition-colors shadow-2xs"
            title="添加记录"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
