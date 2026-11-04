import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  Tags,
  Settings,
  BookOpen,
} from 'lucide-react';
import { formatWeekRange, getWeekNumber, isToday } from '../lib/dateUtils';

interface NavbarProps {
  currentWeekDays: Date[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onOpenMonthPicker: () => void;
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
  onOpenMonthPicker,
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
    <header className="h-16 border-b border-[#E8DFD1] bg-[#FAF7F2]/95 backdrop-blur-md sticky top-0 z-30 px-5 pl-24 flex items-center justify-between select-none shadow-xs app-drag">
      {/* Brand & Title (shifted right to avoid traffic lights) */}
      <div className="flex items-center space-x-3 app-no-drag">
        <div className="w-8 h-8 rounded-xl bg-[#C97B63] flex items-center justify-center text-white shadow-xs">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-[#38332B] text-base tracking-tight">Diary</h1>
            <span className="text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-full bg-[#FAF0ED] text-[#C97B63] border border-[#F0D5CD]">
              足迹手帐
            </span>
          </div>
          <p className="text-[10px] text-[#A4A09A]">记录每日真实所为 · 条理沉淀</p>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="flex items-center space-x-1.5 bg-[#F3EBDD]/70 p-1 rounded-xl border border-[#E8DFD1] app-no-drag">
        <button
          onClick={onPrevWeek}
          className="p-1.5 rounded-lg text-[#58544E] hover:text-[#2A2621] hover:bg-white transition-all shadow-2xs"
          title="上一周"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={onToday}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            isCurrentWeek
              ? 'bg-[#C97B63] text-white shadow-xs'
              : 'text-[#58544E] hover:bg-white hover:text-[#2A2621]'
          }`}
        >
          今天
        </button>

        {/* Clickable Month/Week Picker Button */}
        <button
          type="button"
          onClick={onOpenMonthPicker}
          className="flex items-center space-x-1.5 px-3 py-1 bg-white rounded-lg border border-[#E8DFD1] hover:border-[#C97B63] shadow-2xs transition-all cursor-pointer group"
          title="点击查看月历与周跳转"
        >
          <Calendar className="w-3.5 h-3.5 text-[#C97B63] group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-[#38332B] group-hover:text-[#C97B63] transition-colors">
            {startDate && endDate ? formatWeekRange(startDate, endDate) : ''}
          </span>
          <span className="text-[10px] text-[#A4A09A] font-mono bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#E8DFD1]/60">
            第 {weekNum} 周
          </span>
        </button>

        <button
          onClick={onNextWeek}
          className="p-1.5 rounded-lg text-[#58544E] hover:text-[#2A2621] hover:bg-white transition-all shadow-2xs"
          title="下一周"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 app-no-drag">
        <div className="hidden sm:flex items-center text-xs text-[#847D72] bg-[#F3EBDD]/60 px-2.5 py-1 rounded-lg font-mono border border-[#E8DFD1]/70">
          本周已记录 <span className="font-bold text-[#C97B63] ml-1">{totalRecordsCount}</span> 条
        </div>

        {/* DeepSeek Report Button */}
        <button
          onClick={onOpenReports}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#FAF0ED] hover:bg-[#F5E5E0] text-[#A45842] text-xs font-medium border border-[#EAD2CB] transition-all shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#C97B63]" />
          <span>周报与总结</span>
        </button>

        {/* Tags Manager */}
        <button
          onClick={onOpenTags}
          className="p-2 rounded-xl text-[#58544E] hover:text-[#2A2621] hover:bg-[#F3EBDD]/70 border border-[#E8DFD1] transition-all shadow-2xs"
          title="管理项目与习惯标签"
        >
          <Tags className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-[#58544E] hover:text-[#2A2621] hover:bg-[#F3EBDD]/70 border border-[#E8DFD1] transition-all shadow-2xs"
          title="设置与数据导出"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
