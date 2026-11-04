import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  Tags,
  Settings,
  CalendarDays,
} from 'lucide-react';
import { formatWeekRange, getWeekNumber, isToday } from '../lib/dateUtils';

interface NavbarProps {
  currentWeekDays: Date[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onSelectDate: (date: Date) => void;
  onOpenReports: () => void;
  onOpenTags: () => void;
  onOpenSettings: () => void;
  totalRecordsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentWeekDays,
  onPrevWeek,
  onNextWeek,
  onToday,
  onSelectDate,
  onOpenReports,
  onOpenTags,
  onOpenSettings,
  totalRecordsCount,
}) => {
  const startDate = currentWeekDays[0];
  const endDate = currentWeekDays[6];
  const weekNum = startDate ? getWeekNumber(startDate) : 1;
  const isCurrentWeek = currentWeekDays.some((d) => isToday(d));

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-5 flex items-center justify-between select-none shadow-xs">
      {/* Brand & Title */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
          <CalendarDays className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-slate-800 text-lg tracking-tight">Diary</h1>
            <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              足迹手帐
            </span>
          </div>
          <p className="text-[11px] text-slate-400">记录每日真实所为 · 条理沉淀</p>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="flex items-center space-x-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
        <button
          onClick={onPrevWeek}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-xs"
          title="上一周"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={onToday}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            isCurrentWeek
              ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
              : 'text-slate-700 hover:bg-white hover:text-slate-900'
          }`}
        >
          今天
        </button>

        <div className="flex items-center space-x-1.5 px-3 py-1 bg-white rounded-lg border border-slate-200/50 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-semibold text-slate-800">
            {startDate && endDate ? formatWeekRange(startDate, endDate) : ''}
          </span>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
            第 {weekNum} 周
          </span>
        </div>

        {/* Date Picker Input */}
        <input
          type="date"
          className="w-7 h-7 opacity-0 absolute cursor-pointer"
          onChange={(e) => {
            if (e.target.value) {
              const [y, m, d] = e.target.value.split('-').map(Number);
              onSelectDate(new Date(y, m - 1, d));
            }
          }}
          title="跳转到指定日期"
        />

        <button
          onClick={onNextWeek}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-xs"
          title="下一周"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2.5">
        <div className="hidden sm:flex items-center text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg font-mono">
          本周已记录 <span className="font-bold text-indigo-600 ml-1">{totalRecordsCount}</span> 条
        </div>

        {/* DeepSeek Report Button */}
        <button
          onClick={onOpenReports}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-sky-50 hover:from-indigo-100 hover:to-sky-100 text-indigo-700 text-xs font-medium border border-indigo-200/80 transition-all shadow-xs hover:shadow-indigo-100/50"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
          <span>周报与总结</span>
        </button>

        {/* Tags Manager */}
        <button
          onClick={onOpenTags}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60 transition-all shadow-xs"
          title="管理项目与习惯标签"
        >
          <Tags className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60 transition-all shadow-xs"
          title="设置与数据导出"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
