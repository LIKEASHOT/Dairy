import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import * as db from './services/db';
import { loadEnvConfig, generateReportViaDeepSeek } from './services/deepseek';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  const iconPath = path.join(process.cwd(), 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 1040,
    minHeight: 700,
    title: 'Diary',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#FAF7F2',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Check if running in dev mode or with dist
  const devUrl = 'http://localhost:5173';
  const prodHtml = path.join(__dirname, '../dist/index.html');

  if (process.env.NODE_ENV === 'development') {
    try {
      await mainWindow.loadURL(devUrl);
    } catch {
      if (fs.existsSync(prodHtml)) {
        await mainWindow.loadFile(prodHtml);
      }
    }
  } else {
    if (fs.existsSync(prodHtml)) {
      await mainWindow.loadFile(prodHtml);
    } else {
      await mainWindow.loadURL(devUrl);
    }
  }
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
  // Set dock icon on macOS
  if (process.platform === 'darwin') {
    const iconPng = path.join(process.cwd(), 'assets', 'icon.png');
    if (fs.existsSync(iconPng) && app.dock) {
      app.dock.setIcon(iconPng);
    }
  }

  await db.initDb();
  registerIpcHandlers();
  await createWindow();

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
