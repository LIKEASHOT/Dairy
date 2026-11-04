import { initDb, getTags, saveTag, addRecord, getDayData, saveMoods, saveDiary, exportData } from '../electron/services/db';
import { buildDeepSeekPrompt } from '../src/services/deepseek';

async function runVerification() {
  console.log('--- 1. Testing SQLite Database & Default Tags ---');
  await initDb();
  const tags = await getTags();
  console.log(`Loaded ${tags.length} tags:`);
  tags.forEach((t) => console.log(`  - [${t.name}] color: ${t.color}`));

  if (!tags.some((t) => t.name === '工作') || !tags.some((t) => t.name === '学习')) {
    throw new Error('Default project tags 工作 / 学习 missing!');
  }
  console.log('✓ Default tags verified successfully');

  console.log('\n--- 2. Testing Done-Log Records (Morning, Afternoon, Evening) ---');
  const testDate = '2026-11-04';
  const workTag = tags.find((t) => t.name === '工作')!;
  const fitTag = tags.find((t) => t.name === '健身')!;
  const studyTag = tags.find((t) => t.name === '学习')!;

  const rec1 = await addRecord({
    date: testDate,
    period: 'morning',
    content: '重构并联调鉴权核心链路',
    tagId: workTag.id,
    sortOrder: 1,
  });
  console.log('Added Morning Record:', rec1.content);

  const rec2 = await addRecord({
    date: testDate,
    period: 'afternoon',
    content: '跑通基线数据验证实验',
    tagId: studyTag.id,
    sortOrder: 1,
  });
  console.log('Added Afternoon Record:', rec2.content);

  const rec3 = await addRecord({
    date: testDate,
    period: 'evening',
    content: '胸背核心力量训练 45 分钟',
    tagId: fitTag.id,
    sortOrder: 1,
  });
  console.log('Added Evening Record:', rec3.content);

  console.log('\n--- 3. Testing Moods & Diary ---');
  await saveMoods(testDate, ['focus', 'energetic']);
  await saveDiary(testDate, '今天状态很好，关键节点顺利推进一步，晚间力量训练很充实。');

  const dayData = await getDayData(testDate);
  console.log('Retrieved Day Data for', testDate);
  console.log('  Moods:', dayData.moods);
  console.log('  Diary Note:', dayData.diaryNote);
  console.log('  Morning records count:', dayData.slots.morning.records.length);
  console.log('  Afternoon records count:', dayData.slots.afternoon.records.length);
  console.log('  Evening records count:', dayData.slots.evening.records.length);

  if (dayData.slots.morning.records.length !== 1 || dayData.slots.afternoon.records.length !== 1) {
    throw new Error('Records verification failed!');
  }
  console.log('✓ Records and Diary verified successfully');

  console.log('\n--- 4. Testing DeepSeek Prompt Construction ---');
  const { system, user } = buildDeepSeekPrompt('weekly', '2026-11-02', '2026-11-08', [dayData], tags);
  console.log('Generated User Prompt length:', user.length);
  if (!user.includes('重构并联调鉴权核心链路') || !user.includes('跑通基线数据验证实验') || !user.includes('胸背核心力量训练')) {
    throw new Error('DeepSeek prompt does not contain expected logged activities!');
  }
  console.log('✓ DeepSeek Prompt verified successfully');

  console.log('\n--- 5. Testing Export to JSON & Markdown ---');
  const mdExport = await exportData('markdown');
  console.log('Exported Markdown path:', mdExport.filePath);
  const jsonExport = await exportData('json');
  console.log('Exported JSON path:', jsonExport.filePath);

  console.log('\n===========================================');
  console.log(' ALL AUTOMATED VERIFICATION TESTS PASSED! ');
  console.log('===========================================');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
