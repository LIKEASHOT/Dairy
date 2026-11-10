import React, { useState, useEffect, useCallback } from 'react';
import { Tag, DayData, SlotPeriod, Report, AppConfig } from './types';
import { Storage } from './services/storage';
import {
  getWeekDays,
  formatDate,
  addWeeks,
  getWeekIdentifier,
  getMonthIdentifier,
  getMonthDateRange,
  getBeijingNow,
} from './lib/dateUtils';
import { Navbar } from './components/Navbar';
import { WeekView } from './components/WeekView';
import { DiaryModal } from './components/DiaryModal';
import { ReportDrawer } from './components/ReportDrawer';
import { TagManagerModal } from './components/TagManagerModal';
import { SettingsModal } from './components/SettingsModal';
import { MonthPickerModal } from './components/MonthPickerModal';
import { AIUsageModal } from './components/AIUsageModal';

export const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(() => getBeijingNow());
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [daysData, setDaysData] = useState<Record<string, DayData>>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [config, setConfig] = useState<AppConfig>({});

  // Reports
  const [currentWeekReport, setCurrentWeekReport] = useState<Report | null>(null);
  const [currentMonthReport, setCurrentMonthReport] = useState<Report | null>(null);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modals
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isAIUsageOpen, setIsAIUsageOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [diaryModalDate, setDiaryModalDate] = useState<string | null>(null);

  // Update weekDays when currentDate changes
  useEffect(() => {
    setWeekDays(getWeekDays(currentDate));
  }, [currentDate]);

  // Initial load config & tags
  useEffect(() => {
    async function init() {
      const [loadedTags, loadedConfig, loadedReports] = await Promise.all([
        Storage.getTags(),
        Storage.getConfig(),
        Storage.getAllReports(),
      ]);
      setTags(loadedTags);
      setConfig(loadedConfig);
      setAllReports(loadedReports);
    }
    init();
  }, []);

  // Load week days data
  const loadWeekData = useCallback(async (days: Date[]) => {
    if (days.length === 0) return;
    const dataMap: Record<string, DayData> = {};
    for (const d of days) {
      const dateStr = formatDate(d);
      dataMap[dateStr] = await Storage.getDayData(dateStr);
    }
    setDaysData(dataMap);

    // Check week report
    const weekId = getWeekIdentifier(days[0]);
    const rep = await Storage.getReport('weekly', weekId);
    setCurrentWeekReport(rep);

    // Check month report
    const monthId = getMonthIdentifier(days[0]);
    const monthRep = await Storage.getReport('monthly', monthId);
    setCurrentMonthReport(monthRep);
  }, []);

  useEffect(() => {
    if (weekDays.length > 0) {
      loadWeekData(weekDays);
    }
  }, [weekDays, loadWeekData]);

  // Total records this week
  const totalRecordsCount = Object.values(daysData).reduce((sum, day) => {
    return (
      sum +
      (day.slots.morning?.records.length || 0) +
      (day.slots.afternoon?.records.length || 0) +
      (day.slots.evening?.records.length || 0)
    );
  }, 0);

  // Navigation handlers
  const handlePrevWeek = () => setCurrentDate((prev) => addWeeks(prev, -1));
  const handleNextWeek = () => setCurrentDate((prev) => addWeeks(prev, 1));
  const handleToday = () => setCurrentDate(getBeijingNow());
  const handleSelectDate = (d: Date) => setCurrentDate(d);

  // Record CRUD
  const handleAddRecord = async (date: string, period: SlotPeriod, content: string, tagId: string) => {
    const newRecord = await Storage.addRecord({
      date,
      period,
      content,
      tagId,
      sortOrder: (daysData[date]?.slots[period]?.records.length || 0) + 1,
    });

    setDaysData((prev) => {
      const day = prev[date];
      if (!day) return prev;
      const slot = day.slots[period];
      return {
        ...prev,
        [date]: {
          ...day,
          slots: {
            ...day.slots,
            [period]: {
              ...slot,
              records: [...slot.records, newRecord],
            },
          },
        },
      };
    });
  };

  const handleUpdateRecord = async (id: string, content: string, tagId: string) => {
    const updated = await Storage.updateRecord(id, { content, tagId });
    setDaysData((prev) => {
      const next = { ...prev };
      for (const dKey in next) {
        const day = next[dKey];
        for (const p of ['morning', 'afternoon', 'evening'] as SlotPeriod[]) {
          const recIdx = day.slots[p]?.records.findIndex((r) => r.id === id);
          if (recIdx !== undefined && recIdx >= 0) {
            const records = [...day.slots[p].records];
            records[recIdx] = updated;
            next[dKey] = {
              ...day,
              slots: {
                ...day.slots,
                [p]: {
                  ...day.slots[p],
                  records,
                },
              },
            };
            return next;
          }
        }
      }
      return prev;
    });
  };

  const handleDeleteRecord = async (id: string) => {
    await Storage.deleteRecord(id);
    setDaysData((prev) => {
      const next = { ...prev };
      for (const dKey in next) {
        const day = next[dKey];
        for (const p of ['morning', 'afternoon', 'evening'] as SlotPeriod[]) {
          if (day.slots[p]?.records.some((r) => r.id === id)) {
            next[dKey] = {
              ...day,
              slots: {
                ...day.slots,
                [p]: {
                  ...day.slots[p],
                  records: day.slots[p].records.filter((r) => r.id !== id),
                },
              },
            };
            return next;
          }
        }
      }
      return prev;
    });
  };

  const handleSaveSlotNote = async (date: string, period: SlotPeriod, note: string) => {
    await Storage.saveSlotNote(date, period, note);
    setDaysData((prev) => {
      const day = prev[date];
      if (!day) return prev;
      return {
        ...prev,
        [date]: {
          ...day,
          slots: {
            ...day.slots,
            [period]: {
              ...day.slots[period],
              summaryNote: note,
            },
          },
        },
      };
    });
  };

  const handleToggleMood = async (date: string, moodId: string) => {
    const currentMoods = daysData[date]?.moods || [];
    const newMoods = currentMoods.includes(moodId)
      ? currentMoods.filter((m) => m !== moodId)
      : [...currentMoods, moodId];

    await Storage.saveMoods(date, newMoods);
    setDaysData((prev) => {
      const day = prev[date];
      if (!day) return prev;
      return {
        ...prev,
        [date]: {
          ...day,
          moods: newMoods,
        },
      };
    });
  };

  const handleSaveDiary = async (date: string, note: string) => {
    await Storage.saveDiary(date, note);
    setDaysData((prev) => {
      const day = prev[date];
      if (!day) return prev;
      return {
        ...prev,
        [date]: {
          ...day,
          diaryNote: note,
        },
      };
    });
  };

  // Tag Handlers
  const handleSaveTag = async (tag: Tag) => {
    await Storage.saveTag(tag);
    const updated = await Storage.getTags();
    setTags(updated);
  };

  const handleReorderTags = async (reordered: Tag[]) => {
    setTags(reordered);
    await Storage.reorderTags(reordered);
  };

  const handleDeleteTag = async (id: string) => {
    await Storage.deleteTag(id);
    const updated = await Storage.getTags();
    setTags(updated);
  };

  // AI Report Generation
  const handleGenerateReport = async (type: 'weekly' | 'monthly') => {
    setIsGenerating(true);
    try {
      if (type === 'weekly') {
        const startDateStr = formatDate(weekDays[0]);
        const endDateStr = formatDate(weekDays[6]);
        const targetDate = getWeekIdentifier(weekDays[0]);
        const daysList: DayData[] = Object.values(daysData);

        let content = '';
        if (window.electronAPI) {
          content = await window.electronAPI.generateDeepSeekReport({
            type: 'weekly',
            startDate: startDateStr,
            endDate: endDateStr,
            daysData: daysList,
            tags,
          });
        } else {
          // Fallback demo in browser if no Electron API
          content = `# 📅 周报：${startDateStr} ~ ${endDateStr}

### 🎯 核心项目进展
- **工作**：
  - 梳理工作流并完成核心模块搭建
  - 联调核心足迹沉淀机制
- **学习**：
  - 深入研读专业资料与技术文档

### 💪 习惯与个人成长
- 保持日常规律作息，本周打卡记录充分
- 健身与学习均有按节奏推进

### 🧘 状态与节奏洞察
- 整体精力分配均匀，节奏保持紧凑而有序，工作推进坚实。

### 🚀 下周期重点建议
- 持续聚焦核心工作项目推进
- 保持生活与工作平衡`;
        }

        const newReport: Report = {
          id: 'rep_w_' + Date.now().toString(36),
          type: 'weekly',
          targetDate,
          startDate: startDateStr,
          endDate: endDateStr,
          title: `${targetDate} 精炼周报`,
          content,
          createdAt: new Date().toISOString(),
        };

        await Storage.saveReport(newReport);
        setCurrentWeekReport(newReport);
      } else {
        // Monthly report
        const refDate = weekDays[0] || currentDate;
        const monthRange = getMonthDateRange(refDate);
        const targetDate = getMonthIdentifier(refDate);

        // Fetch DayData for each day of the month
        const daysList: DayData[] = [];
        for (const dateStr of monthRange.dateStrings) {
          if (daysData[dateStr]) {
            daysList.push(daysData[dateStr]);
          } else {
            const dData = await Storage.getDayData(dateStr);
            daysList.push(dData);
          }
        }

        let content = '';
        if (window.electronAPI) {
          content = await window.electronAPI.generateDeepSeekReport({
            type: 'monthly',
            startDate: monthRange.startDate,
            endDate: monthRange.endDate,
            daysData: daysList,
            tags,
          });
        } else {
          // Fallback demo in browser if no Electron API
          content = `# 📅 月报：${monthRange.startDate} ~ ${monthRange.endDate}

### 🎯 核心项目进展
- **工作**：
  - 全月核心工作模块稳步推进
  - 交付多个关键里程碑
- **学习**：
  - 持续跟进前沿技术，保持阅读

### 💪 习惯与个人成长
- 全月习惯保持稳定，健康作息

### 🧘 状态与节奏洞察
- 节奏沉稳，重心聚焦

### 🚀 下周期重点建议
- 持续保持当前高效推进节奏`;
        }

        const newReport: Report = {
          id: 'rep_m_' + Date.now().toString(36),
          type: 'monthly',
          targetDate,
          startDate: monthRange.startDate,
          endDate: monthRange.endDate,
          title: `${targetDate} 精炼月报`,
          content,
          createdAt: new Date().toISOString(),
        };

        await Storage.saveReport(newReport);
        setCurrentMonthReport(newReport);
      }

      const all = await Storage.getAllReports();
      setAllReports(all);
    } catch (err: any) {
      alert(`生成失败: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#FAF7F2] select-none overflow-hidden font-sans">
      {/* Top Navbar */}
      <Navbar
        currentWeekDays={weekDays}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
        onOpenMonthPicker={() => setIsMonthPickerOpen(true)}
        onOpenReports={() => setIsReportsOpen(true)}
        onOpenAIUsage={() => setIsAIUsageOpen(true)}
        onOpenTags={() => setIsTagsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        totalRecordsCount={totalRecordsCount}
      />

      {/* Main 7-Day Board View */}
      <WeekView
        weekDays={weekDays}
        daysData={daysData}
        tags={tags}
        onAddRecord={handleAddRecord}
        onUpdateRecord={handleUpdateRecord}
        onDeleteRecord={handleDeleteRecord}
        onSaveSlotNote={handleSaveSlotNote}
        onToggleMood={handleToggleMood}
        onOpenDiaryModal={(date) => setDiaryModalDate(date)}
      />

      {/* Diary Focus Writing Modal */}
      {diaryModalDate && (
        <DiaryModal
          isOpen={Boolean(diaryModalDate)}
          dateStr={diaryModalDate}
          dayData={daysData[diaryModalDate]}
          tags={tags}
          onClose={() => setDiaryModalDate(null)}
          onSaveDiary={handleSaveDiary}
        />
      )}

      {/* Report Drawer */}
      <ReportDrawer
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        currentWeekReport={currentWeekReport}
        currentMonthReport={currentMonthReport}
        allReports={allReports}
        isGenerating={isGenerating}
        config={config}
        onGenerateReport={handleGenerateReport}
      />

      {/* Tag Manager Modal */}
      <TagManagerModal
        isOpen={isTagsOpen}
        onClose={() => setIsTagsOpen(false)}
        tags={tags}
        onSaveTag={handleSaveTag}
        onReorderTags={handleReorderTags}
        onDeleteTag={handleDeleteTag}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onExport={Storage.exportData}
      />

      {/* Month & Week Picker Modal */}
      <MonthPickerModal
        isOpen={isMonthPickerOpen}
        currentDate={currentDate}
        onClose={() => setIsMonthPickerOpen(false)}
        onSelectWeek={(targetDate) => setCurrentDate(targetDate)}
      />

      {/* AI Model Token & Cost Stats Modal */}
      <AIUsageModal
        isOpen={isAIUsageOpen}
        onClose={() => setIsAIUsageOpen(false)}
      />
    </div>
  );
};

export default App;
