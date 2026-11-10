import { DayData, Tag, AppConfig, AIUsageQueryResult } from '../types';
import { formatPercent, formatTokens, formatUsd } from '../lib/aiUsageFormat';

export function buildDeepSeekPrompt(
  type: 'weekly' | 'monthly',
  startDate: string,
  endDate: string,
  daysData: DayData[],
  tags: Tag[],
  aiUsage?: AIUsageQueryResult | null
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

  inputSummary += `\n### 4. AI 模型算力消耗与花费统计（北京时间 ${startDate} ~ ${endDate}）：\n`;
  if (!aiUsage || aiUsage.periodSummary.requests === 0) {
    inputSummary += `（本周期暂无 AI 模型调用或花费记录）\n`;
  } else {
    const s = aiUsage.periodSummary;
    const activeDays = aiUsage.dailyData.filter((d) => d.requests > 0 || d.totalTokens > 0);
    let peakCostDay = activeDays[0];
    let peakTokenDay = activeDays[0];
    for (const d of activeDays) {
      if (!peakCostDay || d.costUsd > peakCostDay.costUsd) peakCostDay = d;
      if (!peakTokenDay || d.totalTokens > peakTokenDay.totalTokens) peakTokenDay = d;
    }

    const elapsedDays = Math.max(1, aiUsage.dailyData.filter((d) => d.date <= aiUsage.todayDate).length);
    inputSummary += `- 总花费: ${formatUsd(s.costUsd)}（统计期已过 ${elapsedDays} 天，活跃 ${activeDays.length} 天，日均 ${formatUsd(s.costUsd / elapsedDays)}）\n`;
    inputSummary += `- 总 Token: ${formatTokens(s.totalTokens)}（总调用 ${s.requests.toLocaleString()} 次；输入 ${formatTokens(s.inputTokens)}，缓存写入 ${formatTokens(s.cacheWriteTokens)}，缓存读取 ${formatTokens(s.cacheReadTokens)}，输出 ${formatTokens(s.outputTokens)}，推理 ${formatTokens(s.reasoningTokens)}）\n`;
    inputSummary += `- 缓存命中率: ${formatPercent(s.cacheHitRate)}${s.savingsUsd > 0 ? `，累计估算节省 ${formatUsd(s.savingsUsd)}` : ''}\n`;
    if (peakCostDay) {
      inputSummary += `- 最高花费峰值日: ${peakCostDay.date}（${formatUsd(peakCostDay.costUsd)}，${formatTokens(peakCostDay.totalTokens)} Tokens，${peakCostDay.requests} 次调用）\n`;
    }
    if (peakTokenDay && peakTokenDay.date !== peakCostDay?.date) {
      inputSummary += `- 最高 Token 峰值日: ${peakTokenDay.date}（${formatTokens(peakTokenDay.totalTokens)} Tokens，${formatUsd(peakTokenDay.costUsd)}，${peakTokenDay.requests} 次调用）\n`;
    }
    if (aiUsage.modelBreakdown.length > 0) {
      inputSummary += `- 分模型明细:\n`;
      aiUsage.modelBreakdown.forEach((m) => {
        inputSummary += `  - ${m.displayName} [${m.provider}]: ${formatUsd(m.costUsd)}（花费占比 ${formatPercent(m.costShare)}），${formatTokens(m.totalTokens)} Tokens（Token 占比 ${formatPercent(m.tokenShare)}），${m.requests.toLocaleString()} 次调用\n`;
      });
    }

    if (type === 'weekly' && activeDays.length > 0) {
      inputSummary += `- 本周逐日消耗:\n`;
      aiUsage.dailyData.forEach((d) => {
        if (d.requests > 0 || d.totalTokens > 0) {
          inputSummary += `  - ${d.date}: ${formatUsd(d.costUsd)} | ${formatTokens(d.totalTokens)} Tokens | ${d.requests} 次\n`;
        }
      });
    }
  }

  const periodDesc = type === 'weekly' ? '这周' : '这月';
  const systemPrompt = `你是一位高效、敏锐、务实的工作与生活复盘专家。
你的任务是根据用户提供的周期真实已完成事项记录、每日心情、日记以及 AI 模型算力消耗统计，输出一份直白、精炼、一眼能看懂的${periodTitle}。

【重要原则】：
1. 杜绝空话套话，不要长篇大论。
2. 重点突出各项目（如 工作、学习、健身等）的具体产出与成果。
3. 所有项目成果、AI 模型花费、Token 与调用次数必须严格忠于输入数据，绝不编造数字。
4. 结构清晰，采用美观利落的 Markdown 排版，语言客观务实，让人看一眼就明白${periodDesc}到底做了什么以及算力消耗如何。

【版式要求】：
# 📅 ${periodTitle}：${startDate} ~ ${endDate}

### 🎯 核心项目进展
(按项目标签分类，每个项目提炼 2~4 条最核心的做完的事情与成果，格式：
- **项目名**：
  - 做了什么/进展 1
  - 做了什么/进展 2)

### 💪 习惯与个人成长
(健身打卡频次、学习收获、生活日常小结，简明扼要)

### 🤖 AI 模型用量与花费
(基于本周期 AI 模型统计数据，简明精炼地总结：
- **总消耗概览**：总花费、总 Token 量、总调用次数、缓存命中率与节省估算
- **主力模型分布**：点出核心使用的主力模型及其花费/占比
- **节奏与峰值**：标出日均花费及最高消耗峰值日；若本周期输入显示无模型调用记录，则直接一句话说明“本周期暂无 AI 模型调用记录”)

### 🧘 状态与节奏洞察
(结合心情分布、日记以及 AI 算力投入强度，用 1~2 句话客观点评本周期的工作节奏、心理状态与精力分配)

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
  userPrompt: string,
  fetchFn: typeof fetch = fetch
): Promise<string> {
  const apiKey = config.deepseekApiKey;
  if (!apiKey) {
    throw new Error('未配置 DeepSeek API Key，请在 .env 文件中填入 DEEPSEEK_API_KEY');
  }

  const baseUrl = (config.deepseekBaseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
  const model = config.deepseekModel || 'deepseek-chat';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const response = await fetchFn(`${baseUrl}/v1/chat/completions`, {
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
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('DeepSeek API 请求超时 (60s)。如果开启了 VPN/代理，请检查代理节点网络是否通畅。');
    }
    const causeMsg = err.cause ? ` (${err.cause.message || err.cause})` : '';
    throw new Error(
      `DeepSeek API 网络连接失败: ${err.message}${causeMsg}。\n💡 建议排查：\n1. 如果开启了 VPN/代理软件（如 Clash、Surge、梯子等），建议将 api.deepseek.com 加入「直连 (DIRECT)」白名单规则，或暂时关闭 VPN 后重试。\n2. 检查电脑网络连接是否正常。`
    );
  }
}
