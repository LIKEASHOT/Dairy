import React from 'react';
import { BookOpen, Sparkles, Maximize2 } from 'lucide-react';
import { DayData, SlotPeriod, Tag } from '../types';
import { MOOD_OPTIONS } from '../lib/constants';
import { getWeekdayName, isToday } from '../lib/dateUtils';
import { SlotCard } from './SlotCard';

interface DayColumnProps {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayData: DayData;
  tags: Tag[];
  onAddRecord: (date: string, period: SlotPeriod, content: string, tagId: string) => void;
  onUpdateRecord: (id: string, content: string, tagId: string) => void;
  onDeleteRecord: (id: string) => void;
  onSaveSlotNote: (date: string, period: SlotPeriod, note: string) => void;
  onToggleMood: (date: string, moodId: string) => void;
  onOpenDiaryModal: (date: string) => void;
}

export const DayColumn: React.FC<DayColumnProps> = ({
  date,
  dateStr,
  dayData,
  tags,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onSaveSlotNote,
  onToggleMood,
  onOpenDiaryModal,
}) => {
  const isCurrentDay = isToday(date);
  const weekday = getWeekdayName(date);
  const monthDay = `${date.getMonth() + 1}月${date.getDate()}日`;

  const totalDayRecords =
    (dayData.slots.morning?.records.length || 0) +
    (dayData.slots.afternoon?.records.length || 0) +
    (dayData.slots.evening?.records.length || 0);

  return (
    <div
      className={`flex flex-col min-w-[240px] xl:min-w-[260px] flex-1 rounded-2xl border transition-all ${
        isCurrentDay
          ? 'bg-slate-50/70 border-indigo-300 ring-2 ring-indigo-500/10 shadow-sm'
          : 'bg-slate-50/40 border-slate-200/70 hover:border-slate-300/80'
      }`}
    >
      {/* Column Header */}
      <div
        className={`px-3 py-2.5 rounded-t-2xl border-b ${
          isCurrentDay
            ? 'bg-gradient-to-b from-indigo-50/80 to-indigo-100/30 border-indigo-100'
            : 'bg-white/60 border-slate-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span
              className={`text-sm font-bold tracking-tight ${
                isCurrentDay ? 'text-indigo-600' : 'text-slate-800'
              }`}
            >
              {weekday}
            </span>
            <span className="text-xs text-slate-400 font-mono">{monthDay}</span>
            {isCurrentDay && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-indigo-600 text-white shadow-2xs">
                今日
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            {totalDayRecords} 条
          </span>
        </div>

        {/* Mood Selector (Multi-selection enabled) */}
        <div className="mt-2 flex items-center justify-between gap-1 pt-1.5 border-t border-slate-100/80">
          <span className="text-[10px] text-slate-400 font-medium shrink-0">心情</span>
          <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-0.5">
            {MOOD_OPTIONS.map((mood) => {
              const isSelected = dayData.moods.includes(mood.id);
              return (
                <button
                  key={mood.id}
                  onClick={() => onToggleMood(dateStr, mood.id)}
                  title={`${mood.label} (点击选择/取消)`}
                  className={`text-xs px-1.5 py-0.5 rounded-md transition-all ${
                    isSelected
                      ? 'bg-white border border-indigo-300 shadow-xs scale-110'
                      : 'opacity-40 hover:opacity-80 grayscale hover:grayscale-0'
                  }`}
                >
                  {mood.emoji}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3 Period Cards: Morning, Afternoon, Evening */}
      <div className="p-2 space-y-2.5 flex-1">
        <SlotCard
          date={dateStr}
          period="morning"
          records={dayData.slots.morning?.records || []}
          summaryNote={dayData.slots.morning?.summaryNote}
          tags={tags}
          onAddRecord={onAddRecord}
          onUpdateRecord={onUpdateRecord}
          onDeleteRecord={onDeleteRecord}
          onSaveSlotNote={onSaveSlotNote}
        />

        <SlotCard
          date={dateStr}
          period="afternoon"
          records={dayData.slots.afternoon?.records || []}
          summaryNote={dayData.slots.afternoon?.summaryNote}
          tags={tags}
          onAddRecord={onAddRecord}
          onUpdateRecord={onUpdateRecord}
          onDeleteRecord={onDeleteRecord}
          onSaveSlotNote={onSaveSlotNote}
        />

        <SlotCard
          date={dateStr}
          period="evening"
          records={dayData.slots.evening?.records || []}
          summaryNote={dayData.slots.evening?.summaryNote}
          tags={tags}
          onAddRecord={onAddRecord}
          onUpdateRecord={onUpdateRecord}
          onDeleteRecord={onDeleteRecord}
          onSaveSlotNote={onSaveSlotNote}
        />
      </div>

      {/* Bottom: Daily Diary / Thoughts Section */}
      <div className="p-2 pt-0 mt-auto">
        <div
          onClick={() => onOpenDiaryModal(dateStr)}
          className="group cursor-pointer p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[64px]"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <div className="flex items-center space-x-1 font-medium text-slate-600">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>今日随想</span>
            </div>
            <Maximize2 className="w-3 h-3 text-slate-300 group-hover:text-indigo-600 transition-colors" />
          </div>

          {dayData.diaryNote ? (
            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed italic">
              “{dayData.diaryNote}”
            </p>
          ) : (
            <span className="text-[11px] text-slate-300 italic group-hover:text-slate-400 transition-colors">
              写下今天的日记或心得...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
