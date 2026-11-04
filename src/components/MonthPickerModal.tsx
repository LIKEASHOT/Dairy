import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { getMonday, getWeekNumber, isToday, formatDate } from '../lib/dateUtils';

interface MonthPickerModalProps {
  isOpen: boolean;
  currentDate: Date;
  onClose: () => void;
  onSelectWeek: (targetDate: Date) => void;
}

export const MonthPickerModal: React.FC<MonthPickerModalProps> = ({
  isOpen,
  currentDate,
  onClose,
  onSelectWeek,
}) => {
  const [viewDate, setViewDate] = useState<Date>(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));

  if (!isOpen) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11

  // Prev / Next month
  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const jumpToToday = () => {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelectWeek(today);
    onClose();
  };

  // Build matrix of weeks for this month view
  // First day of month
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Start from the Monday of the week that includes firstDayOfMonth
  let cur = getMonday(firstDayOfMonth);
  const weeks: { weekNum: number; monday: Date; days: Date[] }[] = [];

  while (cur <= lastDayOfMonth || weeks.length < 5) {
    const weekNum = getWeekNumber(cur);
    const days: Date[] = [];
    const mondayCopy = new Date(cur);

    for (let i = 0; i < 7; i++) {
      const d = new Date(cur);
      d.setDate(cur.getDate() + i);
      days.push(d);
    }

    weeks.push({
      weekNum,
      monday: mondayCopy,
      days,
    });

    // Advance to next Monday
    cur = new Date(cur);
    cur.setDate(cur.getDate() + 7);

    // Stop if we exceeded lastDayOfMonth and have at least 5 rows
    if (cur > lastDayOfMonth && weeks.length >= 4) {
      break;
    }
  }

  const currentMondayStr = formatDate(getMonday(currentDate));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2723]/35 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E8DFD1] w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#F0E9DF] flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-[#FAF0ED] text-[#C97B63] flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#38332B]">
                {year}年 {month + 1}月
              </h3>
              <p className="text-[10px] text-[#A4A09A]">选择指定周快速跳转全景手帐</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <div className="flex items-center bg-[#F3EBDD]/70 p-0.5 rounded-lg border border-[#E8DFD1]">
              <button
                onClick={prevMonth}
                className="p-1 rounded text-[#58544E] hover:text-[#2A2621] hover:bg-white transition-all"
                title="上一月"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={jumpToToday}
                className="px-2 py-0.5 text-[11px] font-medium text-[#58544E] hover:bg-white rounded transition-all"
              >
                本月
              </button>
              <button
                onClick={nextMonth}
                className="p-1 rounded text-[#58544E] hover:text-[#2A2621] hover:bg-white transition-all"
                title="下一月"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A4A09A] hover:text-[#38332B] hover:bg-[#F3EBDD] transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar Table */}
        <div className="p-4 space-y-1 select-none">
          {/* Weekday headers */}
          <div className="grid grid-cols-8 text-center text-[11px] font-medium text-[#A4A09A] pb-2 border-b border-[#F0E9DF]">
            <span className="text-[#C97B63] font-semibold">周次</span>
            <span>一</span>
            <span>二</span>
            <span>三</span>
            <span>四</span>
            <span>五</span>
            <span>六</span>
            <span>日</span>
          </div>

          {/* Weeks rows */}
          <div className="space-y-1 pt-1">
            {weeks.map((w) => {
              const isSelectedWeek = formatDate(w.monday) === currentMondayStr;
              const hasToday = w.days.some((d) => isToday(d));

              return (
                <div
                  key={w.weekNum + '_' + formatDate(w.monday)}
                  onClick={() => {
                    onSelectWeek(w.monday);
                    onClose();
                  }}
                  className={`group grid grid-cols-8 items-center text-center py-2 px-1 rounded-xl cursor-pointer transition-all border ${
                    isSelectedWeek
                      ? 'bg-[#FAF0ED] border-[#C97B63] shadow-xs'
                      : 'hover:bg-[#FAF7F2] border-transparent hover:border-[#E8DFD1]'
                  }`}
                  title={`点击跳转至第 ${w.weekNum} 周`}
                >
                  {/* Week badge button */}
                  <div className="flex items-center justify-center space-x-0.5">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                        isSelectedWeek
                          ? 'bg-[#C97B63] text-white'
                          : 'bg-[#F3EBDD]/60 text-[#847D72] group-hover:bg-[#C97B63] group-hover:text-white'
                      }`}
                    >
                      W{w.weekNum}
                    </span>
                  </div>

                  {/* 7 Days in the week */}
                  {w.days.map((day) => {
                    const isCurMonth = day.getMonth() === month;
                    const isDayToday = isToday(day);

                    return (
                      <div key={day.toISOString()} className="flex items-center justify-center">
                        <span
                          className={`w-6 h-6 flex items-center justify-center text-xs rounded-full font-mono transition-all ${
                            isDayToday
                              ? 'bg-[#C97B63] text-white font-bold shadow-2xs'
                              : isCurMonth
                              ? 'text-[#38332B] group-hover:font-semibold'
                              : 'text-[#C4B8A5]'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-[#FAF7F2] border-t border-[#F0E9DF] flex items-center justify-between text-[11px] text-[#847D72]">
          <span>点击整行或周次标即可直接跳转至该周看板</span>
          <button
            onClick={jumpToToday}
            className="flex items-center space-x-1 text-[#C97B63] font-medium hover:underline"
          >
            <span>回到今天</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
