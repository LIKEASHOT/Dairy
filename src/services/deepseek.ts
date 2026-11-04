import { DayData, Tag, AppConfig } from '../types';

export function buildDeepSeekPrompt(
  type: 'weekly' | 'monthly',
  startDate: string,
  endDate: string,
  daysData: DayData[],
  tags: Tag[]
): { system: string; user: string } {
  const tagMap = new Map<string, Tag>();
  tags.forEach((t) => tagMap.set(t.id, t));

  // Collect records by tag
  const recordsByTag: Record<string, string[]> = {};
  const unTaggedRecords: string[] = [];
  const moodsCount: Record<string, number> = {};
  const diaryNotes: { date: string; note: string }[] = [];

  daysData.forEach((day) => {
    // Moods
    day.moods.forEach((m) => {
      moodsCount[m] = (moodsCount[m] || 0) + 1;
    });

    // Diary
    if (day.diaryNote && day.diaryNote.trim()) {
      diaryNotes.push({ date: day.date, note: day.diaryNote.trim() });
    }

    // Records in morning, afternoon, evening
    (['morning', 'afternoon', 'evening'] as const).forEach((period) => {
      const slot = day.slots[period];
      if (slot && slot.records && slot.records.length > 0) {
        slot.records.forEach((rec) => {
          const tagName = tagMap.get(rec.tagId)?.name || '未分类';
          if (!recordsByTag[tagName]) {
            recordsByTag[tagName] = [];
          }
          recordsByTag[tagName].push(`[${day.date} ${period === 'morning' ? '早' : period === 'afternoon' ? '中' : '晚'}] ${rec.content}`);
        });
      }
    });
  });

  const periodTitle = type === 'weekly' ? '周报' : '月报';

  let inputSummary = `【周期范围】：${startDate} 至 ${endDate} (${periodTitle})\n\n`;

  inputSummary += `### 1. 各项目与标签下记录的事项：\n`;
  const tagKeys = Object.keys(recordsByTag);
  if (tagKeys.length === 0) {
    inputSummary += `（本周期暂无记录事项）\n`;
  } else {
    tagKeys.forEach((tagName) => {
      inputSummary += `#### 【${tagName}】 (${recordsByTag[tagName].length} 条足迹):\n`;
      recordsByTag[tagName].forEach((line) => {
        inputSummary += `- ${line}\n`;
      });
    });
  }

  inputSummary += `\n### 2. 心情分布：\n`;
  const moodKeys = Object.keys(moodsCount);
  if (moodKeys.length === 0) {
    inputSummary += `（本周期未记录心情）\n`;
  } else {
    moodKeys.forEach((m) => {
      inputSummary += `- ${m}: ${moodsCount[m]} 次\n`;
    });
  }

  inputSummary += `\n### 3. 每日随想与日记摘要：\n`;
  if (diaryNotes.length === 0) {
    inputSummary += `（本周期未撰写随想）\n`;
  } else {
    diaryNotes.forEach((d) => {
      inputSummary += `- [${d.date}]: ${d.note}\n`;
    });
  }

  const systemPrompt = `你是一位高效、敏锐、务实的工作与生活复盘专家。
你的任务是根据用户提供的周期真实已完成事项记录、每日心情与日记，输出一份直白、精炼、一眼能看懂的${periodTitle}。

【重要原则】：
1. 杜绝空话套话，不要长篇大论。
2. 重点突出各项目（如 工作、学习、健身等）的具体产出与成果。
3. 结构清晰，采用美观利落的 Markdown 排版。
4. 语言风格客观、务实、干练，让人看一眼就明白这周/这月到底做了什么。

【版式要求】：
# 📅 ${periodTitle}：${startDate} ~ ${endDate}

### 🎯 核心项目进展
(按项目标签分类，每个项目提炼 2~4 条最核心的做完的事情与成果，格式：
- **项目名**：
  - 做了什么/进展 1
  - 做了什么/进展 2)

### 💪 习惯与个人成长
(健身打卡频次、学习收获、生活日常小结，简明扼要)

### 🧘 状态与节奏洞察
(结合心情分布与日记，用 1~2 句话客观点评本周期的工作节奏、心理状态与精力分配)

### 🚀 下周期重点建议
(根据当前进展与未完事务，给出 2~3 条高优先级行动建议)`;

  return {
    system: systemPrompt,
    user: inputSummary,
  };
}

export async function requestDeepSeek(
  config: AppConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = config.deepseekApiKey;
  if (!apiKey) {
    throw new Error('未配置 DeepSeek API Key，请在 .env 文件中填入 DEEPSEEK_API_KEY');
  }

  const baseUrl = (config.deepseekBaseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
  const model = config.deepseekModel || 'deepseek-chat';

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API 请求失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek API 未返回有效内容');
  }

  return content;
}
