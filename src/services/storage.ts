import { Tag, DayData, ActivityRecord, SlotPeriod, Report, AppConfig } from '../types';
import { DEFAULT_TAGS } from '../lib/constants';
import { generateId } from '../lib/utils';

declare global {
  interface Window {
    electronAPI?: {
      // Tags
      getTags: () => Promise<Tag[]>;
      saveTag: (tag: Tag) => Promise<Tag>;
      reorderTags: (tags: Tag[]) => Promise<Tag[]>;
      deleteTag: (id: string) => Promise<boolean>;

      // Day & Slots
      getDayData: (date: string) => Promise<DayData>;
      saveMoods: (date: string, moods: string[]) => Promise<void>;
      saveDiary: (date: string, note: string) => Promise<void>;
      saveSlotNote: (date: string, period: SlotPeriod, note: string) => Promise<void>;

      // Records
      addRecord: (record: Omit<ActivityRecord, 'id' | 'createdAt'>) => Promise<ActivityRecord>;
      updateRecord: (id: string, updates: Partial<ActivityRecord>) => Promise<ActivityRecord>;
      deleteRecord: (id: string) => Promise<boolean>;

      // Reports
      getReport: (type: 'weekly' | 'monthly', targetDate: string) => Promise<Report | null>;
      saveReport: (report: Report) => Promise<Report>;
      getAllReports: () => Promise<Report[]>;

      // Config & Export
      getConfig: () => Promise<AppConfig>;
      generateDeepSeekReport: (params: {
        type: 'weekly' | 'monthly';
        startDate: string;
        endDate: string;
        daysData: DayData[];
        tags: Tag[];
      }) => Promise<string>;
      exportData: (format: 'json' | 'markdown') => Promise<{ success: boolean; filePath?: string; content?: string }>;
    };
  }
}

// Fallback LocalStorage Storage for Browser Dev
class LocalStorageProvider {
  private TAGS_KEY = 'diary_tags_v1';
  private DAYS_KEY_PREFIX = 'diary_day_v1_';
  private REPORTS_KEY = 'diary_reports_v1';

  async getTags(): Promise<Tag[]> {
    const raw = localStorage.getItem(this.TAGS_KEY);
    if (!raw) {
      localStorage.setItem(this.TAGS_KEY, JSON.stringify(DEFAULT_TAGS));
      return DEFAULT_TAGS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_TAGS;
    }
  }

  async saveTag(tag: Tag): Promise<Tag> {
    const tags = await this.getTags();
    const index = tags.findIndex((t) => t.id === tag.id);
    if (index >= 0) {
      tags[index] = tag;
    } else {
      tags.push(tag);
    }
    localStorage.setItem(this.TAGS_KEY, JSON.stringify(tags));
    return tag;
  }

  async reorderTags(orderedTags: Tag[]): Promise<Tag[]> {
    orderedTags.forEach((t, i) => (t.sortOrder = i + 1));
    localStorage.setItem(this.TAGS_KEY, JSON.stringify(orderedTags));
    return orderedTags;
  }

  async deleteTag(id: string): Promise<boolean> {
    const tags = await this.getTags();
    const filtered = tags.filter((t) => t.id !== id);
    localStorage.setItem(this.TAGS_KEY, JSON.stringify(filtered));
    return true;
  }

  async getDayData(date: string): Promise<DayData> {
    const raw = localStorage.getItem(this.DAYS_KEY_PREFIX + date);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error(e);
      }
    }

    return {
      date,
      moods: [],
      diaryNote: '',
      slots: {
        morning: { date, period: 'morning', records: [] },
        afternoon: { date, period: 'afternoon', records: [] },
        evening: { date, period: 'evening', records: [] },
      },
    };
  }

  private saveDayData(dayData: DayData) {
    localStorage.setItem(this.DAYS_KEY_PREFIX + dayData.date, JSON.stringify(dayData));
  }

  async saveMoods(date: string, moods: string[]): Promise<void> {
    const day = await this.getDayData(date);
    day.moods = moods;
    this.saveDayData(day);
  }

  async saveDiary(date: string, note: string): Promise<void> {
    const day = await this.getDayData(date);
    day.diaryNote = note;
    this.saveDayData(day);
  }

  async saveSlotNote(date: string, period: SlotPeriod, note: string): Promise<void> {
    const day = await this.getDayData(date);
    if (!day.slots[period]) {
      day.slots[period] = { date, period, records: [] };
    }
    day.slots[period].summaryNote = note;
    this.saveDayData(day);
  }

  async addRecord(item: Omit<ActivityRecord, 'id' | 'createdAt'>): Promise<ActivityRecord> {
    const day = await this.getDayData(item.date);
    if (!day.slots[item.period]) {
      day.slots[item.period] = { date: item.date, period: item.period, records: [] };
    }

    const newRecord: ActivityRecord = {
      ...item,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    day.slots[item.period].records.push(newRecord);
    this.saveDayData(day);
    return newRecord;
  }

  async updateRecord(id: string, updates: Partial<ActivityRecord>): Promise<ActivityRecord> {
    // Search across days stored in local storage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.DAYS_KEY_PREFIX)) {
        const day: DayData = JSON.parse(localStorage.getItem(key)!);
        for (const period of ['morning', 'afternoon', 'evening'] as SlotPeriod[]) {
          const rec = day.slots[period]?.records.find((r) => r.id === id);
          if (rec) {
            Object.assign(rec, updates);
            this.saveDayData(day);
            return rec;
          }
        }
      }
    }
    throw new Error('Record not found');
  }

  async deleteRecord(id: string): Promise<boolean> {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.DAYS_KEY_PREFIX)) {
        const day: DayData = JSON.parse(localStorage.getItem(key)!);
        for (const period of ['morning', 'afternoon', 'evening'] as SlotPeriod[]) {
          if (day.slots[period]) {
            const beforeLen = day.slots[period].records.length;
            day.slots[period].records = day.slots[period].records.filter((r) => r.id !== id);
            if (day.slots[period].records.length !== beforeLen) {
              this.saveDayData(day);
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  async getReport(type: 'weekly' | 'monthly', targetDate: string): Promise<Report | null> {
    const all = await this.getAllReports();
    return all.find((r) => r.type === type && r.targetDate === targetDate) || null;
  }

  async saveReport(report: Report): Promise<Report> {
    const all = await this.getAllReports();
    const idx = all.findIndex((r) => r.id === report.id || (r.type === report.type && r.targetDate === report.targetDate));
    if (idx >= 0) {
      all[idx] = report;
    } else {
      all.unshift(report);
    }
    localStorage.setItem(this.REPORTS_KEY, JSON.stringify(all));
    return report;
  }

  async getAllReports(): Promise<Report[]> {
    const raw = localStorage.getItem(this.REPORTS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async getConfig(): Promise<AppConfig> {
    return {
      deepseekApiKey: '',
      deepseekBaseUrl: 'https://api.deepseek.com',
      deepseekModel: 'deepseek-chat',
    };
  }
}

const localFallback = new LocalStorageProvider();

export const Storage = {
  isElectron: (): boolean => {
    return typeof window !== 'undefined' && Boolean(window.electronAPI);
  },

  getTags: async (): Promise<Tag[]> => {
    if (window.electronAPI) return window.electronAPI.getTags();
    return localFallback.getTags();
  },

  saveTag: async (tag: Tag): Promise<Tag> => {
    if (window.electronAPI) return window.electronAPI.saveTag(tag);
    return localFallback.saveTag(tag);
  },

  reorderTags: async (tags: Tag[]): Promise<Tag[]> => {
    if (window.electronAPI) return window.electronAPI.reorderTags(tags);
    return localFallback.reorderTags(tags);
  },

  deleteTag: async (id: string): Promise<boolean> => {
    if (window.electronAPI) return window.electronAPI.deleteTag(id);
    return localFallback.deleteTag(id);
  },

  getDayData: async (date: string): Promise<DayData> => {
    if (window.electronAPI) return window.electronAPI.getDayData(date);
    return localFallback.getDayData(date);
  },

  saveMoods: async (date: string, moods: string[]): Promise<void> => {
    if (window.electronAPI) return window.electronAPI.saveMoods(date, moods);
    return localFallback.saveMoods(date, moods);
  },

  saveDiary: async (date: string, note: string): Promise<void> => {
    if (window.electronAPI) return window.electronAPI.saveDiary(date, note);
    return localFallback.saveDiary(date, note);
  },

  saveSlotNote: async (date: string, period: SlotPeriod, note: string): Promise<void> => {
    if (window.electronAPI) return window.electronAPI.saveSlotNote(date, period, note);
    return localFallback.saveSlotNote(date, period, note);
  },

  addRecord: async (record: Omit<ActivityRecord, 'id' | 'createdAt'>): Promise<ActivityRecord> => {
    if (window.electronAPI) return window.electronAPI.addRecord(record);
    return localFallback.addRecord(record);
  },

  updateRecord: async (id: string, updates: Partial<ActivityRecord>): Promise<ActivityRecord> => {
    if (window.electronAPI) return window.electronAPI.updateRecord(id, updates);
    return localFallback.updateRecord(id, updates);
  },

  deleteRecord: async (id: string): Promise<boolean> => {
    if (window.electronAPI) return window.electronAPI.deleteRecord(id);
    return localFallback.deleteRecord(id);
  },

  getReport: async (type: 'weekly' | 'monthly', targetDate: string): Promise<Report | null> => {
    if (window.electronAPI) return window.electronAPI.getReport(type, targetDate);
    return localFallback.getReport(type, targetDate);
  },

  saveReport: async (report: Report): Promise<Report> => {
    if (window.electronAPI) return window.electronAPI.saveReport(report);
    return localFallback.saveReport(report);
  },

  getAllReports: async (): Promise<Report[]> => {
    if (window.electronAPI) return window.electronAPI.getAllReports();
    return localFallback.getAllReports();
  },

  getConfig: async (): Promise<AppConfig> => {
    if (window.electronAPI) return window.electronAPI.getConfig();
    return localFallback.getConfig();
  },

  exportData: async (format: 'json' | 'markdown') => {
    if (window.electronAPI) return window.electronAPI.exportData(format);
    return { success: false, content: '请在 Electron 桌面端使用一键导出' };
  },
};
