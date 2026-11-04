import React, { useState, useEffect } from 'react';
import { X, BookOpen, CheckCircle, Sparkles } from 'lucide-react';
import { DayData, Tag } from '../types';
import { parseDate, getWeekdayName } from '../lib/dateUtils';
import { MOOD_OPTIONS } from '../lib/constants';

interface DiaryModalProps {
  isOpen: boolean;
  dateStr: string;
  dayData?: DayData;
  tags: Tag[];
  onClose: () => void;
  onSaveDiary: (date: string, note: string) => void;
}

export const DiaryModal: React.FC<DiaryModalProps> = ({
  isOpen,
  dateStr,
  dayData,
  tags,
  onClose,
  onSaveDiary,
}) => {
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (dayData) {
      setNote(dayData.diaryNote || '');
    }
  }, [dayData, dateStr]);

  if (!isOpen || !dateStr) return null;

  const dateObj = parseDate(dateStr);
  const weekday = getWeekdayName(dateObj);
  const displayTitle = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日 · ${weekday}`;

  const tagMap = new Map<string, Tag>();
  tags.forEach((t) => tagMap.set(t.id, t));

  const allRecords = [
    ...(dayData?.slots.morning?.records || []),
    ...(dayData?.slots.afternoon?.records || []),
    ...(dayData?.slots.evening?.records || []),
  ];

  const handleSave = () => {
    onSaveDiary(dateStr, note);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2723]/35 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E8DFD1] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#F0E9DF] flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0ED] text-[#C97B63] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#38332B]">{displayTitle}</h2>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-xs text-[#A4A09A]">今日随想与日记</span>
                {dayData?.moods && dayData.moods.length > 0 && (
                  <div className="flex items-center space-x-1 pl-2 border-l border-[#E8DFD1]">
                    {dayData.moods.map((mId) => {
                      const m = MOOD_OPTIONS.find((opt) => opt.id === mId);
                      return (
                        <span key={mId} className="text-xs" title={m?.label}>
                          {m?.emoji}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A4A09A] hover:text-[#38332B] hover:bg-[#F3EBDD] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {/* Today's Logged Activities Reference Banner */}
          {allRecords.length > 0 && (
            <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8DFD1] text-xs text-[#58544E]">
              <div className="font-semibold text-[#38332B] mb-1.5 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-[#C97B63]" />
                <span>今日足迹回顾 ({allRecords.length} 项)</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {allRecords.map((r) => {
                  const tag = tagMap.get(r.tagId);
                  return (
                    <span
                      key={r.id}
                      className="px-2 py-0.5 rounded-md bg-white border border-[#E8DFD1] text-[11px] text-[#38332B] flex items-center space-x-1"
                    >
                      {tag && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      <span>{r.content}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Text Editor */}
          <div className="relative">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="写下今天的所思所想、工作反思、复盘或生活感悟..."
              rows={12}
              className="w-full p-4 bg-[#FAF7F2]/40 hover:bg-[#FAF7F2]/70 focus:bg-white border border-[#E8DFD1] rounded-xl text-sm leading-relaxed text-[#38332B] placeholder:text-[#C4B8A5] focus:outline-none focus:ring-2 focus:ring-[#C97B63]/20 focus:border-[#C97B63] transition-all resize-none font-sans"
              autoFocus
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#F0E9DF] bg-[#FAF7F2] flex items-center justify-between text-xs text-[#A4A09A]">
          <div>
            <span>字数：{note.length}</span>
            {saved && (
              <span className="ml-3 text-[#5C6B50] font-medium inline-flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>已保存</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[#58544E] hover:text-[#38332B] hover:bg-[#F3EBDD] transition-colors"
            >
              关闭
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#C97B63] hover:bg-[#B66B54] text-white font-medium shadow-2xs transition-colors"
            >
              保存日记
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
