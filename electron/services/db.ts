import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { Tag, DayData, ActivityRecord, SlotPeriod, Report } from '../../src/types';
import { DEFAULT_TAGS } from '../../src/lib/constants';

export function getProjectRoot(): string {
  const explicit = '/Users/likeashot/Desktop/dairy';
  if (fs.existsSync(explicit)) return explicit;
  const fromDirname = path.resolve(__dirname, '..');
  if (fs.existsSync(path.join(fromDirname, 'package.json'))) return fromDirname;
  return process.cwd();
}

let dbInstance: Database | null = null;
const DATA_DIR = path.join(getProjectRoot(), 'data');
const DB_PATH = path.join(DATA_DIR, 'diary.db');

function persistDb() {
  if (!dbInstance) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export async function initDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const filebuffer = fs.readFileSync(DB_PATH);
    dbInstance = new SQL.Database(filebuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Create tables
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      bgColor TEXT NOT NULL,
      textColor TEXT NOT NULL,
      isDefault INTEGER DEFAULT 0,
      sortOrder INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS days (
      date TEXT PRIMARY KEY,
      moods TEXT DEFAULT '[]',
      diaryNote TEXT DEFAULT '',
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS slots (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      period TEXT NOT NULL,
      summaryNote TEXT DEFAULT '',
      UNIQUE(date, period)
    );

    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      slotId TEXT,
      date TEXT NOT NULL,
      period TEXT NOT NULL,
      content TEXT NOT NULL,
      tagId TEXT NOT NULL,
      sortOrder INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      targetDate TEXT NOT NULL,
      startDate TEXT,
      endDate TEXT,
      title TEXT,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(type, targetDate)
    );
  `);

  // Seed default tags if empty
  const countRes = dbInstance.exec("SELECT COUNT(*) as count FROM tags");
  const count = (countRes[0]?.values[0]?.[0] as number) || 0;
  if (count === 0) {
    DEFAULT_TAGS.forEach((tag) => {
      dbInstance!.run(
        `INSERT INTO tags (id, name, color, bgColor, textColor, isDefault, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tag.id, tag.name, tag.color, tag.bgColor, tag.textColor, tag.isDefault ? 1 : 0, tag.sortOrder]
      );
    });
    persistDb();
  }

  return dbInstance;
}

export async function getTags(): Promise<Tag[]> {
  const db = await initDb();
  const res = db.exec("SELECT id, name, color, bgColor, textColor, isDefault, sortOrder FROM tags ORDER BY sortOrder ASC, rowid ASC");
  if (!res[0]) return [];
  return res[0].values.map((row) => ({
    id: row[0] as string,
    name: row[1] as string,
    color: row[2] as string,
    bgColor: row[3] as string,
    textColor: row[4] as string,
    isDefault: (row[5] as number) === 1,
    sortOrder: row[6] as number,
  }));
}

export async function saveTag(tag: Tag): Promise<Tag> {
  const db = await initDb();
  db.run(
    `INSERT OR REPLACE INTO tags (id, name, color, bgColor, textColor, isDefault, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tag.id, tag.name, tag.color, tag.bgColor, tag.textColor, tag.isDefault ? 1 : 0, tag.sortOrder]
  );
  persistDb();
  return tag;
}

export async function deleteTag(id: string): Promise<boolean> {
  const db = await initDb();
  db.run("DELETE FROM tags WHERE id = ?", [id]);
  persistDb();
  return true;
}

export async function getDayData(date: string): Promise<DayData> {
  const db = await initDb();
  const tags = await getTags();
  const tagMap = new Map<string, Tag>();
  tags.forEach((t) => tagMap.set(t.id, t));

  // 1. Day info
  const dayRes = db.exec("SELECT moods, diaryNote FROM days WHERE date = ?", [date]);
  let moods: string[] = [];
  let diaryNote = '';
  if (dayRes[0]?.values?.[0]) {
    try {
      moods = JSON.parse(dayRes[0].values[0][0] as string);
    } catch {}
    diaryNote = (dayRes[0].values[0][1] as string) || '';
  }

  // 2. Slot notes
  const slotRes = db.exec("SELECT period, summaryNote FROM slots WHERE date = ?", [date]);
  const slotNotes: Record<SlotPeriod, string> = {
    morning: '',
    afternoon: '',
    evening: '',
  };
  if (slotRes[0]?.values) {
    slotRes[0].values.forEach((row) => {
      const p = row[0] as SlotPeriod;
      slotNotes[p] = (row[1] as string) || '';
    });
  }

  // 3. Records
  const recRes = db.exec(
    "SELECT id, slotId, date, period, content, tagId, sortOrder, createdAt FROM records WHERE date = ? ORDER BY sortOrder ASC, createdAt ASC",
    [date]
  );

  const recordsByPeriod: Record<SlotPeriod, ActivityRecord[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  if (recRes[0]?.values) {
    recRes[0].values.forEach((row) => {
      const tagId = row[5] as string;
      const rec: ActivityRecord = {
        id: row[0] as string,
        slotId: row[1] as string,
        date: row[2] as string,
        period: row[3] as SlotPeriod,
        content: row[4] as string,
        tagId,
        tag: tagMap.get(tagId),
        sortOrder: row[6] as number,
        createdAt: row[7] as string,
      };
      if (recordsByPeriod[rec.period]) {
        recordsByPeriod[rec.period].push(rec);
      }
    });
  }

  return {
    date,
    moods,
    diaryNote,
    slots: {
      morning: {
        date,
        period: 'morning',
        summaryNote: slotNotes.morning,
        records: recordsByPeriod.morning,
      },
      afternoon: {
        date,
        period: 'afternoon',
        summaryNote: slotNotes.afternoon,
        records: recordsByPeriod.afternoon,
      },
      evening: {
        date,
        period: 'evening',
        summaryNote: slotNotes.evening,
        records: recordsByPeriod.evening,
      },
    },
  };
}

export async function saveMoods(date: string, moods: string[]): Promise<void> {
  const db = await initDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO days (date, moods, updatedAt) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET moods = excluded.moods, updatedAt = excluded.updatedAt`,
    [date, JSON.stringify(moods), now]
  );
  persistDb();
}

export async function saveDiary(date: string, note: string): Promise<void> {
  const db = await initDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO days (date, diaryNote, updatedAt) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET diaryNote = excluded.diaryNote, updatedAt = excluded.updatedAt`,
    [date, note, now]
  );
  persistDb();
}

export async function saveSlotNote(date: string, period: SlotPeriod, note: string): Promise<void> {
  const db = await initDb();
  const id = `${date}_${period}`;
  db.run(
    `INSERT INTO slots (id, date, period, summaryNote) VALUES (?, ?, ?, ?)
     ON CONFLICT(date, period) DO UPDATE SET summaryNote = excluded.summaryNote`,
    [id, date, period, note]
  );
  persistDb();
}

export async function addRecord(item: Omit<ActivityRecord, 'id' | 'createdAt'>): Promise<ActivityRecord> {
  const db = await initDb();
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  const createdAt = new Date().toISOString();
  const slotId = `${item.date}_${item.period}`;

  db.run(
    `INSERT INTO records (id, slotId, date, period, content, tagId, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, slotId, item.date, item.period, item.content, item.tagId, item.sortOrder || 0, createdAt]
  );
  persistDb();

  const tags = await getTags();
  const tag = tags.find((t) => t.id === item.tagId);

  return {
    ...item,
    id,
    slotId,
    createdAt,
    tag,
  };
}

export async function updateRecord(id: string, updates: Partial<ActivityRecord>): Promise<ActivityRecord> {
  const db = await initDb();
  const existingRes = db.exec("SELECT id, slotId, date, period, content, tagId, sortOrder, createdAt FROM records WHERE id = ?", [id]);
  if (!existingRes[0]?.values?.[0]) {
    throw new Error('Record not found');
  }
  const row = existingRes[0].values[0];
  const current: ActivityRecord = {
    id: row[0] as string,
    slotId: row[1] as string,
    date: row[2] as string,
    period: row[3] as SlotPeriod,
    content: row[4] as string,
    tagId: row[5] as string,
    sortOrder: row[6] as number,
    createdAt: row[7] as string,
  };

  const updated: ActivityRecord = {
    ...current,
    ...updates,
  };

  db.run(
    `UPDATE records SET content = ?, tagId = ?, sortOrder = ? WHERE id = ?`,
    [updated.content, updated.tagId, updated.sortOrder, id]
  );
  persistDb();

  const tags = await getTags();
  updated.tag = tags.find((t) => t.id === updated.tagId);
  return updated;
}

export async function deleteRecord(id: string): Promise<boolean> {
  const db = await initDb();
  db.run("DELETE FROM records WHERE id = ?", [id]);
  persistDb();
  return true;
}

export async function getReport(type: 'weekly' | 'monthly', targetDate: string): Promise<Report | null> {
  const db = await initDb();
  const res = db.exec(
    "SELECT id, type, targetDate, startDate, endDate, title, content, createdAt FROM reports WHERE type = ? AND targetDate = ?",
    [type, targetDate]
  );
  if (!res[0]?.values?.[0]) return null;
  const row = res[0].values[0];
  return {
    id: row[0] as string,
    type: row[1] as 'weekly' | 'monthly',
    targetDate: row[2] as string,
    startDate: row[3] as string,
    endDate: row[4] as string,
    title: row[5] as string,
    content: row[6] as string,
    createdAt: row[7] as string,
  };
}

export async function saveReport(report: Report): Promise<Report> {
  const db = await initDb();
  db.run(
    `INSERT INTO reports (id, type, targetDate, startDate, endDate, title, content, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(type, targetDate) DO UPDATE SET
       startDate = excluded.startDate,
       endDate = excluded.endDate,
       title = excluded.title,
       content = excluded.content,
       createdAt = excluded.createdAt`,
    [report.id, report.type, report.targetDate, report.startDate, report.endDate, report.title, report.content, report.createdAt]
  );
  persistDb();
  return report;
}

export async function getAllReports(): Promise<Report[]> {
  const db = await initDb();
  const res = db.exec("SELECT id, type, targetDate, startDate, endDate, title, content, createdAt FROM reports ORDER BY createdAt DESC");
  if (!res[0]?.values) return [];
  return res[0].values.map((row) => ({
    id: row[0] as string,
    type: row[1] as 'weekly' | 'monthly',
    targetDate: row[2] as string,
    startDate: row[3] as string,
    endDate: row[4] as string,
    title: row[5] as string,
    content: row[6] as string,
    createdAt: row[7] as string,
  }));
}

export async function exportData(format: 'json' | 'markdown'): Promise<{ success: boolean; filePath?: string; content?: string }> {
  const db = await initDb();
  const tags = await getTags();
  const allReports = await getAllReports();

  const backupDir = path.join(getProjectRoot(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (format === 'json') {
    // Export complete database dump in JSON
    const daysRes = db.exec("SELECT * FROM days");
    const recordsRes = db.exec("SELECT * FROM records");
    const exportObject = {
      exportTime: new Date().toISOString(),
      tags,
      reports: allReports,
      days: daysRes[0] ? daysRes[0].values : [],
      records: recordsRes[0] ? recordsRes[0].values : [],
    };
    const content = JSON.stringify(exportObject, null, 2);
    const filePath = path.join(backupDir, `diary-export-${timestamp}.json`);
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, filePath, content };
  } else {
    // Export Markdown
    let md = `# Diary 工作生活足迹导出备份\n\n`;
    md += `> 导出时间：${new Date().toLocaleString()}\n\n`;
    md += `## 1. 项目标签\n\n`;
    tags.forEach((t) => {
      md += `- **${t.name}** (颜色: \`${t.color}\`)\n`;
    });
    md += `\n## 2. 事项记录与日记\n\n`;

    const daysRes = db.exec("SELECT date FROM days ORDER BY date DESC");
    if (daysRes[0]?.values) {
      for (const row of daysRes[0].values) {
        const d = row[0] as string;
        const dayData = await getDayData(d);
        md += `### 📅 ${dayData.date} ${dayData.moods.length ? `[心情: ${dayData.moods.join(' ')}]` : ''}\n\n`;
        (['morning', 'afternoon', 'evening'] as const).forEach((p) => {
          const slot = dayData.slots[p];
          const periodName = p === 'morning' ? '早间' : p === 'afternoon' ? '午间' : '晚间';
          if (slot.records.length > 0 || slot.summaryNote) {
            md += `#### ${periodName}\n`;
            slot.records.forEach((r) => {
              md += `- [${r.tag?.name || '未打标'}] ${r.content}\n`;
            });
            if (slot.summaryNote) {
              md += `*备注: ${slot.summaryNote}*\n`;
            }
            md += `\n`;
          }
        });
        if (dayData.diaryNote) {
          md += `> **今日随想：**\n> ${dayData.diaryNote.replace(/\n/g, '\n> ')}\n\n`;
        }
      }
    }

    const filePath = path.join(backupDir, `diary-export-${timestamp}.md`);
    fs.writeFileSync(filePath, md, 'utf-8');
    return { success: true, filePath, content: md };
  }
}
