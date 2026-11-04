import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import * as db from './services/db';
import { loadEnvConfig, generateReportViaDeepSeek } from './services/deepseek';

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('[Diary] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Diary] Unhandled Rejection:', reason);
});

let mainWindow: BrowserWindow | null = null;

function getAppRoot(): string {
  const explicit = '/Users/likeashot/Desktop/dairy';
  if (fs.existsSync(explicit)) return explicit;
  const fromDirname = path.resolve(__dirname, '..');
  if (fs.existsSync(path.join(fromDirname, 'package.json'))) return fromDirname;
  return process.cwd();
}

async function createWindow() {
  const rootDir = getAppRoot();
  const iconPath = path.join(rootDir, 'assets', 'icon.png');
  const preloadPath = path.join(rootDir, 'dist-electron', 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 1040,
    minHeight: 700,
    title: 'Diary',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: fs.existsSync(preloadPath) ? preloadPath : path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#FAF7F2',
    show: true, // Show immediately, don't stay hidden!
  });

  const prodHtml = path.join(rootDir, 'dist', 'index.html');
  const devUrl = 'http://localhost:5173';

  if (fs.existsSync(prodHtml)) {
    await mainWindow.loadFile(prodHtml);
  } else {
    try {
      await mainWindow.loadURL(devUrl);
    } catch (e) {
      console.error('Failed to load devUrl, fallback to file:', e);
      if (fs.existsSync(prodHtml)) {
        await mainWindow.loadFile(prodHtml);
      }
    }
  }

  mainWindow.show();
  mainWindow.focus();
}

// Register IPC handlers
function registerIpcHandlers() {
  // DB: Tags
  ipcMain.handle('db:getTags', async () => db.getTags());
  ipcMain.handle('db:saveTag', async (_, tag) => db.saveTag(tag));
  ipcMain.handle('db:deleteTag', async (_, id) => db.deleteTag(id));

  // DB: Days & Slots
  ipcMain.handle('db:getDayData', async (_, date) => db.getDayData(date));
  ipcMain.handle('db:saveMoods', async (_, date, moods) => db.saveMoods(date, moods));
  ipcMain.handle('db:saveDiary', async (_, date, note) => db.saveDiary(date, note));
  ipcMain.handle('db:saveSlotNote', async (_, date, period, note) => db.saveSlotNote(date, period, note));

  // DB: Records
  ipcMain.handle('db:addRecord', async (_, record) => db.addRecord(record));
  ipcMain.handle('db:updateRecord', async (_, id, updates) => db.updateRecord(id, updates));
  ipcMain.handle('db:deleteRecord', async (_, id) => db.deleteRecord(id));

  // DB: Reports
  ipcMain.handle('db:getReport', async (_, type, targetDate) => db.getReport(type, targetDate));
  ipcMain.handle('db:saveReport', async (_, report) => db.saveReport(report));
  ipcMain.handle('db:getAllReports', async () => db.getAllReports());

  // DeepSeek & Config
  ipcMain.handle('app:getConfig', async () => loadEnvConfig());
  ipcMain.handle('ai:generateReport', async (_, params) => generateReportViaDeepSeek(params));

  // Export
  ipcMain.handle('app:exportData', async (_, format) => db.exportData(format));
}

app.whenReady().then(async () => {
  const rootDir = getAppRoot();
  try {
    process.chdir(rootDir);
  } catch (e) {
    console.error('Failed to chdir:', e);
  }

  // Set dock icon on macOS
  if (process.platform === 'darwin') {
    const iconPng = path.join(rootDir, 'assets', 'icon.png');
    if (fs.existsSync(iconPng) && app.dock) {
      try {
        app.dock.setIcon(iconPng);
      } catch (e) {
        console.error('Failed to set dock icon:', e);
      }
    }
  }

  try {
    await db.initDb();
  } catch (e) {
    console.error('[Diary] Error initializing database:', e);
  }

  registerIpcHandlers();

  try {
    await createWindow();
  } catch (e) {
    console.error('[Diary] Error creating window:', e);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
