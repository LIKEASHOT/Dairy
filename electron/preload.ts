import { contextBridge, ipcRenderer } from 'electron';
import {
  Tag,
  DayData,
  ActivityRecord,
  SlotPeriod,
  Report,
  AIUsageQueryParams,
  AIUsageQueryResult,
} from '../src/types';

contextBridge.exposeInMainWorld('electronAPI', {
  // Tags
  getTags: (): Promise<Tag[]> => ipcRenderer.invoke('db:getTags'),
  saveTag: (tag: Tag): Promise<Tag> => ipcRenderer.invoke('db:saveTag', tag),
  reorderTags: (tags: Tag[]): Promise<Tag[]> => ipcRenderer.invoke('db:reorderTags', tags),
  deleteTag: (id: string): Promise<boolean> => ipcRenderer.invoke('db:deleteTag', id),

  // Day & Slots
  getDayData: (date: string): Promise<DayData> => ipcRenderer.invoke('db:getDayData', date),
  saveMoods: (date: string, moods: string[]): Promise<void> => ipcRenderer.invoke('db:saveMoods', date, moods),
  saveDiary: (date: string, note: string): Promise<void> => ipcRenderer.invoke('db:saveDiary', date, note),
  saveSlotNote: (date: string, period: SlotPeriod, note: string): Promise<void> =>
    ipcRenderer.invoke('db:saveSlotNote', date, period, note),

  // Records
  addRecord: (record: Omit<ActivityRecord, 'id' | 'createdAt'>): Promise<ActivityRecord> =>
    ipcRenderer.invoke('db:addRecord', record),
  updateRecord: (id: string, updates: Partial<ActivityRecord>): Promise<ActivityRecord> =>
    ipcRenderer.invoke('db:updateRecord', id, updates),
  deleteRecord: (id: string): Promise<boolean> => ipcRenderer.invoke('db:deleteRecord', id),

  // Reports
  getReport: (type: 'weekly' | 'monthly', targetDate: string): Promise<Report | null> =>
    ipcRenderer.invoke('db:getReport', type, targetDate),
  saveReport: (report: Report): Promise<Report> => ipcRenderer.invoke('db:saveReport', report),
  getAllReports: (): Promise<Report[]> => ipcRenderer.invoke('db:getAllReports'),

  // Config & DeepSeek
  getConfig: () => ipcRenderer.invoke('app:getConfig'),
  generateDeepSeekReport: (params: {
    type: 'weekly' | 'monthly';
    startDate: string;
    endDate: string;
    daysData: DayData[];
    tags: Tag[];
  }): Promise<string> => ipcRenderer.invoke('ai:generateReport', params),

  // AI Model Token & Cost Usage
  syncAndQueryAiUsage: (params?: AIUsageQueryParams): Promise<AIUsageQueryResult> =>
    ipcRenderer.invoke('aiUsage:syncAndQuery', params),

  // Export
  exportData: (format: 'json' | 'markdown') => ipcRenderer.invoke('app:exportData', format),
});
