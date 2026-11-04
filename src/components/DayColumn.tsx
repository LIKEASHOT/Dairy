import React from 'react';
import { BookOpen, Maximize2 } from 'lucide-react';
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
      className={`flex flex-col h-full min-w-[240px] xl:min-w-[260px] flex-1 rounded-2xl border transition-all ${
        isCurrentDay
          ? 'bg-[#FDFBF7] border-[#C97B63] ring-1 ring-[#C97B63]/30 shadow-xs'
          : 'bg-[#FAF7F2]/60 border-[#E8DFD1] hover:border-[#D5C9B8]'
      }`}
    >
      {/* Column Header */}
      <div
        className={`px-3 py-2.5 rounded-t-2xl border-b shrink-0 ${
          isCurrentDay
            ? 'bg-gradient-to-b from-[#FAF0ED] to-[#FDFBF7] border-[#F0D5CD]'
            : 'bg-white/70 border-[#F0E9DF]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span
              className={`text-sm font-bold tracking-tight ${
                isCurrentDay ? 'text-[#C97B63]' : 'text-[#38332B]'
              }`}
            >
              {weekday}
            </span>
            <span className="text-xs text-[#A4A09A] font-mono">{monthDay}</span>
            {isCurrentDay && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[#C97B63] text-white shadow-2xs">
                今日
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#A4A09A] font-mono">
            {totalDayRecords} 条
          </span>
        </div>

        {/* Mood Selector (Multi-selection enabled) */}
        <div className="mt-2 flex items-center justify-between gap-1 pt-1.5 border-t border-[#F0E9DF]">
          <span className="text-[10px] text-[#A4A09A] font-medium shrink-0">心情</span>
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
                      ? 'bg-white border border-[#C97B63] shadow-xs scale-110'
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

      {/* 3 Period Cards: Morning, Afternoon, Evening (Stretching to fill available height) */}
      <div className="p-2 space-y-2 flex-1 flex flex-col min-h-0 overflow-y-auto">
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
      <div className="p-2 pt-0 mt-auto shrink-0">
        <div
          onClick={() => onOpenDiaryModal(dateStr)}
          className="group cursor-pointer p-2.5 rounded-xl bg-white border border-[#E8DFD1] hover:border-[#C97B63] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[58px]"
        >
          <div className="flex items-center justify-between text-xs text-[#847D72] mb-1">
            <div className="flex items-center space-x-1 font-medium text-[#38332B]">
              <BookOpen className="w-3.5 h-3.5 text-[#C97B63]" />
              <span>今日随想</span>
            </div>
            <Maximize2 className="w-3 h-3 text-[#A4A09A] group-hover:text-[#C97B63] transition-colors" />
          </div>

          {dayData.diaryNote ? (
            <p className="text-[11px] text-[#58544E] line-clamp-2 leading-relaxed italic">
              “{dayData.diaryNote}”
            </p>
          ) : (
            <span className="text-[11px] text-[#C4B8A5] italic group-hover:text-[#847D72] transition-colors">
              写下今天的日记或心得...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
