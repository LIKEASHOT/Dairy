import React, { useState, useEffect, useCallback } from 'react';
import { Tag, DayData, SlotPeriod, Report, AppConfig } from './types';
import { Storage } from './services/storage';
import {
  getWeekDays,
  formatDate,
  addWeeks,
  getWeekIdentifier,
  getMonthIdentifier,
} from './lib/dateUtils';
import { Navbar } from './components/Navbar';
import { WeekView } from './components/WeekView';
import { DiaryModal } from './components/DiaryModal';
import { ReportDrawer } from './components/ReportDrawer';
import { TagManagerModal } from './components/TagManagerModal';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [daysData, setDaysData] = useState<Record<string, DayData>>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [config, setConfig] = useState<AppConfig>({});

  // Reports
  const [currentWeekReport, setCurrentWeekReport] = useState<Report | null>(null);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modals
  const [isReportsOpen, setIsReportsOpen] = useState(false);
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
  const handleToday = () => setCurrentDate(new Date());
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

  const handleDeleteTag = async (id: string) => {
    await Storage.deleteTag(id);
    const updated = await Storage.getTags();
    setTags(updated);
  };

  // AI Report Generation
  const handleGenerateReport = async (type: 'weekly' | 'monthly') => {
    setIsGenerating(true);
    try {
      const startDateStr = formatDate(weekDays[0]);
      const endDateStr = formatDate(weekDays[6]);
      const targetDate = type === 'weekly' ? getWeekIdentifier(weekDays[0]) : getMonthIdentifier(weekDays[0]);

      let daysList: DayData[] = Object.values(daysData);

      let content = '';
      if (window.electronAPI) {
        content = await window.electronAPI.generateDeepSeekReport({
          type,
          startDate: startDateStr,
          endDate: endDateStr,
          daysData: daysList,
          tags,
        });
      } else {
        // Fallback demo in browser if no Electron API
        content = `# 📅 ${type === 'weekly' ? '周报' : '月报'}：${startDateStr} ~ ${endDateStr}

### 🎯 核心项目进展
- **SPFR**：
  - 梳理工作流并完成核心模块搭建
  - 联调核心足迹沉淀机制
- **GDA**：
  - 跑通基线数据验证流程

### 💪 习惯与个人成长
- 保持日常规律作息，本周打卡记录充分
- 健身与学习均有按节奏推进

### 🧘 状态与节奏洞察
- 整体精力分配均匀，节奏保持紧凑而有序，工作推进坚实。

### 🚀 下周期重点建议
- 持续聚焦 SPFR 深度迭代
- 保持生活与工作平衡`;
      }

      const newReport: Report = {
        id: 'rep_' + Date.now().toString(36),
        type,
        targetDate,
        startDate: startDateStr,
        endDate: endDateStr,
        title: `${targetDate} ${type === 'weekly' ? '精炼周报' : '精炼月报'}`,
        content,
        createdAt: new Date().toISOString(),
      };

      await Storage.saveReport(newReport);
      setCurrentWeekReport(newReport);

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
        onSelectDate={handleSelectDate}
        onOpenReports={() => setIsReportsOpen(true)}
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
        onDeleteTag={handleDeleteTag}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onExport={Storage.exportData}
      />
    </div>
  );
};

export default App;
