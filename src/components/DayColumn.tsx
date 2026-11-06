import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Maximize2, ChevronDown, Smile, X } from 'lucide-react';
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

  const [showMoodDropdown, setShowMoodDropdown] = useState(false);
  const moodDropdownRef = useRef<HTMLDivElement>(null);

  // Close mood dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moodDropdownRef.current && !moodDropdownRef.current.contains(event.target as Node)) {
        setShowMoodDropdown(false);
      }
    }
    if (showMoodDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoodDropdown]);

  // Current selected single mood
  const currentMoodId = dayData.moods?.[0] || null;
  const currentMood = MOOD_OPTIONS.find((m) => m.id === currentMoodId);

  const handleSelectMood = (moodId: string) => {
    onToggleMood(dateStr, moodId);
    setShowMoodDropdown(false);
  };

  const totalDayRecords =
    (dayData.slots.morning?.records.length || 0) +
    (dayData.slots.afternoon?.records.length || 0) +
    (dayData.slots.evening?.records.length || 0);

  return (
    <div
      className={`flex flex-col min-w-[250px] xl:min-w-[270px] flex-1 rounded-2xl border transition-all ${
        isCurrentDay
          ? 'bg-[#FDFBF7] border-[#C97B63] ring-1 ring-[#C97B63]/30 shadow-xs'
          : 'bg-[#FAF7F2]/60 border-[#E8DFD1] hover:border-[#D5C9B8]'
      }`}
    >
      {/* Column Header */}
      <div
        className={`sticky top-0 z-20 px-3.5 py-2.5 rounded-t-2xl border-b shrink-0 backdrop-blur-md ${
          isCurrentDay
            ? 'bg-[#FAF0ED]/95 border-[#F0D5CD]'
            : 'bg-[#FAF7F2]/95 border-[#F0E9DF]'
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

        {/* Mood Selector Dropdown: Point 1 - Click to show list with emoji + text */}
        <div className="mt-2 pt-1.5 border-t border-[#F0E9DF] flex items-center justify-between relative" ref={moodDropdownRef}>
          <span className="text-[11px] text-[#847D72] font-medium">心情</span>

          {/* Current Mood Button / Trigger */}
          <button
            type="button"
            onClick={() => setShowMoodDropdown(!showMoodDropdown)}
            className={`px-2 py-0.5 rounded-lg border text-xs flex items-center space-x-1 transition-all shadow-2xs ${
              currentMood
                ? 'bg-white border-[#C97B63]/50 text-[#38332B] font-medium'
                : 'bg-white/80 border-[#E8DFD1] text-[#A4A09A] hover:border-[#C97B63] hover:text-[#38332B]'
            }`}
          >
            {currentMood ? (
              <>
                <span>{currentMood.emoji}</span>
                <span className="text-[11px] text-[#38332B]">{currentMood.label}</span>
              </>
            ) : (
              <>
                <Smile className="w-3 h-3 text-[#A4A09A]" />
                <span className="text-[11px]">选择心情</span>
              </>
            )}
            <ChevronDown className="w-3 h-3 text-[#A4A09A]" />
          </button>

          {/* Mood Dropdown Menu: Displays Emoji + Text */}
          {showMoodDropdown && (
            <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-xl shadow-xl border border-[#E8DFD1] py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-medium text-[#A4A09A] border-b border-[#F0E9DF] mb-0.5">
                选择今日心情
              </div>

              {MOOD_OPTIONS.map((mood) => {
                const isSelected = currentMoodId === mood.id;
                return (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => handleSelectMood(mood.id)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#FAF7F2] flex items-center space-x-2 transition-colors ${
                      isSelected ? 'bg-[#FAF0ED] text-[#C97B63] font-semibold' : 'text-[#38332B]'
                    }`}
                  >
                    <span className="text-sm">{mood.emoji}</span>
                    <span>{mood.label}</span>
                  </button>
                );
              })}

              {currentMood && (
                <>
                  <div className="my-1 border-t border-[#F0E9DF]" />
                  <button
                    type="button"
                    onClick={() => handleSelectMood(currentMood.id)} // Toggles off
                    className="w-full text-left px-3 py-1 text-[11px] text-[#A4A09A] hover:text-rose-600 hover:bg-[#FAF7F2] flex items-center space-x-1.5"
                  >
                    <X className="w-3 h-3" />
                    <span>清除心情</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3 Period Cards: Morning, Afternoon, Evening (Consistent 270px height) */}
      <div className="p-2 space-y-2.5 flex flex-col shrink-0">
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
      <div className="p-2 pt-0.5 pb-2.5 shrink-0">
        <div
          onClick={() => onOpenDiaryModal(dateStr)}
          className="group cursor-pointer p-2.5 rounded-xl bg-white border border-[#E8DFD1] hover:border-[#C97B63] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[62px]"
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
