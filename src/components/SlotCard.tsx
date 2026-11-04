import React, { useState, useRef, useEffect } from 'react';
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
  ChevronDown,
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
  // Point 3: Default is EMPTY (未选择标签), not SPFR!
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(summaryNote);

  // Edit item state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingTagId, setEditingTagId] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTag = tags.find((t) => t.id === selectedTagId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTagDropdown(false);
      }
    }
    if (showTagDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTagDropdown]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onAddRecord(date, period, inputText.trim(), selectedTagId);
    setInputText('');
  };

  const startEdit = (rec: ActivityRecord) => {
    setEditingRecordId(rec.id);
    setEditingContent(rec.content);
    setEditingTagId(rec.tagId || '');
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
        return <SunMedium className="w-3.5 h-3.5 text-[#D6B16C]" />;
      case 'afternoon':
        return <Sun className="w-3.5 h-3.5 text-[#C97B63]" />;
      case 'evening':
        return <Moon className="w-3.5 h-3.5 text-[#777A80]" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8DFD1] shadow-2xs hover:shadow-xs transition-shadow flex-1 flex flex-col min-h-[145px] relative">
      {/* Slot Header */}
      <div className="px-3 py-2 border-b border-[#F0E9DF] flex items-center justify-between bg-[#FAF7F2]/60 rounded-t-xl shrink-0">
        <div className="flex items-center space-x-1.5">
          {getPeriodIcon()}
          <span className="text-xs font-semibold text-[#38332B]">{config.name}</span>
          <span className="text-[10px] text-[#A4A09A] font-mono hidden xl:inline">{config.time}</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              setIsEditingNote(!isEditingNote);
              setNoteText(summaryNote);
            }}
            className={`p-1 rounded text-[#A4A09A] hover:text-[#38332B] transition-colors ${
              summaryNote ? 'text-[#C97B63] bg-[#FAF0ED]' : ''
            }`}
            title={summaryNote ? '查看/编辑时段备注' : '添加时段备注'}
          >
            <FileText className="w-3 h-3" />
          </button>
          <span className="text-[10px] text-[#847D72] font-mono px-1.5 py-0.5 rounded-full bg-[#F3EBDD]/60 border border-[#E8DFD1]/50">
            {records.length}
          </span>
        </div>
      </div>

      {/* Optional Period Note */}
      {isEditingNote && (
        <div className="p-2.5 bg-[#FAF5EB] border-b border-[#E8DFD1] text-xs shrink-0">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="写下这时段的整体状态或重点备注..."
            rows={2}
            className="w-full text-xs p-1.5 bg-white border border-[#E8DFD1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C97B63] resize-none text-[#38332B]"
          />
          <div className="flex justify-end space-x-1.5 mt-1">
            <button
              onClick={() => setIsEditingNote(false)}
              className="px-2 py-0.5 text-[11px] text-[#847D72] hover:text-[#38332B]"
            >
              取消
            </button>
            <button
              onClick={() => {
                onSaveSlotNote(date, period, noteText.trim());
                setIsEditingNote(false);
              }}
              className="px-2.5 py-0.5 text-[11px] bg-[#C97B63] text-white font-medium rounded hover:bg-[#B66B54] shadow-2xs"
            >
              保存备注
            </button>
          </div>
        </div>
      )}

      {/* Show saved note badge if not editing */}
      {!isEditingNote && summaryNote && (
        <div className="px-3 py-1 bg-[#FAF5EB]/80 border-b border-[#E8DFD1]/60 text-[11px] text-[#8C6C26] italic flex items-center justify-between shrink-0">
          <span className="truncate">💡 {summaryNote}</span>
        </div>
      )}

      {/* Records List (Flexible vertical stretch) */}
      <div className="p-2 space-y-1.5 flex-1 min-h-[60px] overflow-y-auto">
        {records.length === 0 ? (
          <div className="h-full min-h-[40px] flex items-center justify-center text-[11px] text-[#C4B8A5] italic select-none">
            暂无记录
          </div>
        ) : (
          records.map((rec) => {
            const isEditing = editingRecordId === rec.id;
            const tag = tags.find((t) => t.id === rec.tagId) || rec.tag;

            if (isEditing) {
              return (
                <div key={rec.id} className="p-2 bg-[#FAF7F2] rounded-lg border border-[#C97B63] text-xs space-y-1.5">
                  <input
                    type="text"
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-[#E8DFD1] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#C97B63]"
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <select
                      value={editingTagId}
                      onChange={(e) => setEditingTagId(e.target.value)}
                      className="text-[11px] px-1.5 py-0.5 bg-white border border-[#E8DFD1] rounded text-[#38332B]"
                    >
                      <option value="">(无标签)</option>
                      {tags.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => saveEdit(rec.id)}
                        className="p-1 text-[#5C6B50] hover:bg-[#F2F5F0] rounded"
                        title="保存"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingRecordId(null)}
                        className="p-1 text-[#A4A09A] hover:bg-[#F3EBDD] rounded"
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
                className="group relative flex items-start space-x-1.5 p-1.5 rounded-lg hover:bg-[#FAF7F2] border border-transparent hover:border-[#E8DFD1] transition-all text-xs"
              >
                {/* Tag Pill with custom color */}
                {tag && (
                  <span
                    style={{
                      backgroundColor: tag.bgColor || '#F2F5F0',
                      color: tag.textColor || tag.color || '#38332B',
                      borderColor: tag.color + '40',
                    }}
                    className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md border tracking-tight"
                  >
                    {tag.name}
                  </span>
                )}

                {/* Record Content */}
                <span className="flex-1 text-[#38332B] leading-snug break-words">
                  {rec.content}
                </span>

                {/* Actions on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-0.5 shrink-0">
                  <button
                    onClick={() => startEdit(rec)}
                    className="p-1 text-[#A4A09A] hover:text-[#C97B63] rounded"
                    title="编辑"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDeleteRecord(rec.id)}
                    className="p-1 text-[#A4A09A] hover:text-rose-600 rounded"
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

      {/* Quick Add Form: Fixed layout with whitespace-nowrap and min-w-0 */}
      <form onSubmit={handleAdd} className="p-2 border-t border-[#F0E9DF] bg-[#FAF7F2]/40 rounded-b-xl shrink-0">
        <div className="flex items-center gap-1.5 w-full">
          {/* Tag Selector Button */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              style={
                currentTag
                  ? {
                      backgroundColor: currentTag.bgColor || '#FAF0ED',
                      color: currentTag.textColor || currentTag.color || '#A45842',
                      borderColor: currentTag.color + '50',
                    }
                  : {}
              }
              className={`text-[11px] font-medium px-2 py-1 rounded-lg border flex items-center space-x-1 shrink-0 whitespace-nowrap shadow-2xs transition-all ${
                currentTag
                  ? ''
                  : 'bg-white border-[#E8DFD1] text-[#847D72] hover:border-[#C97B63] hover:text-[#38332B]'
              }`}
              title="切换当前标签 (默认无标签)"
            >
              <TagIcon className="w-2.5 h-2.5 shrink-0" />
              <span className="whitespace-nowrap">{currentTag ? currentTag.name : '+ 标签'}</span>
              <ChevronDown className="w-2.5 h-2.5 text-[#A4A09A] shrink-0" />
            </button>

            {/* Tag Selection Popup: Positioned cleanly, won't get cut off */}
            {showTagDropdown && (
              <div
                className={`absolute left-0 w-36 bg-white rounded-xl shadow-xl border border-[#E8DFD1] py-1.5 z-50 max-h-48 overflow-y-auto ${
                  period === 'morning' ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
                }`}
              >
                <div className="px-2.5 py-1 text-[10px] font-medium text-[#A4A09A] border-b border-[#F0E9DF] mb-1">
                  选择项目/习惯标签
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTagId('');
                    setShowTagDropdown(false);
                    inputRef.current?.focus();
                  }}
                  className={`w-full text-left px-2.5 py-1 text-xs hover:bg-[#FAF7F2] flex items-center space-x-1.5 ${
                    selectedTagId === '' ? 'text-[#C97B63] font-semibold bg-[#FAF0ED]/50' : 'text-[#847D72]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full border border-dashed border-[#A4A09A]" />
                  <span>无标签 (未选择)</span>
                </button>
                <div className="my-1 border-t border-[#F0E9DF]" />
                {tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTagId(t.id);
                      setShowTagDropdown(false);
                      inputRef.current?.focus();
                    }}
                    className={`w-full text-left px-2.5 py-1 text-xs hover:bg-[#FAF7F2] flex items-center space-x-1.5 text-[#38332B] ${
                      selectedTagId === t.id ? 'bg-[#FAF7F2] font-semibold text-[#C97B63]' : ''
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Activity Text Input (min-w-0 prevents flex blowout) */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="记录做了什么，回车添加..."
            className="flex-1 min-w-0 text-xs px-2.5 py-1 bg-white border border-[#E8DFD1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C97B63] focus:border-[#C97B63] placeholder:text-[#C4B8A5] shadow-2xs text-[#38332B]"
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-[#C97B63] hover:bg-[#B66B54] disabled:bg-[#E8DFD1] text-white disabled:text-[#A4A09A] transition-colors shadow-2xs"
            title="添加记录"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
