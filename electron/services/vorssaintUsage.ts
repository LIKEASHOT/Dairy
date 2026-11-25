import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  AIDailyAggregate,
  AIDailyModelUsage,
  AIModelAggregate,
  AIUsageQueryParams,
  AIUsageQueryResult,
  AIUsageSummary,
} from '../../src/types';
import * as db from './db';

export const VORSSAINT_USAGE_BIN_PATH = path.join(
  os.homedir(),
  'Library/Caches/com.vorssaint.utils/AgentUsage/agent-usage.bin'
);

const VORSSAINT_PRICE_PATHS = [
  path.join(os.homedir(), 'Library/Application Support/com.vorssaint.utils/agent-prices.json'),
  '/Applications/Vorssaint.app/Contents/Resources/agent-prices.json',
];

const APPLE_REFERENCE_EPOCH_SEC = 978307200; // 2001-01-01T00:00:00Z
const EXPECTED_MAGIC = 'VAUA';
const SUPPORTED_FORMAT = 4;

interface LongContextSpec {
  above: number;
  inputMultiplier: number;
  outputMultiplier: number;
}

interface ModelPriceSpec {
  id: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cacheWriteLong: number;
  fastMultiplier: number;
  longContext?: LongContextSpec;
}

interface LoadedPricingTable {
  claude: ModelPriceSpec[];
  codex: ModelPriceSpec[];
  webSearch: number;
  usOnlyMultiplier: number;
}

// 内置兜底定价（单位：USD / 1M tokens），覆盖上游 tieredModels 迁移导致旧版 Vorssaint 未定价的型号
const BUILTIN_CODEX_PRICES: ModelPriceSpec[] = [
  {
    id: 'gpt-6.2-sol',
    input: 2,
    output: 10,
    cacheRead: 0.1,
    cacheWrite: 2.5,
    cacheWriteLong: 5,
    fastMultiplier: 2,
    longContext: { above: 272000, inputMultiplier: 2, outputMultiplier: 1.5 },
  },
  {
    id: 'gpt-6.2-astra',
    input: 8,
    output: 40,
    cacheRead: 0.4,
    cacheWrite: 10,
    cacheWriteLong: 20,
    fastMultiplier: 2,
    longContext: { above: 272000, inputMultiplier: 2, outputMultiplier: 1.5 },
  },
  {
    id: 'gpt-6.2-astra-law',
    input: 8,
    output: 40,
    cacheRead: 0.4,
    cacheWrite: 10,
    cacheWriteLong: 20,
    fastMultiplier: 1,
    longContext: { above: 272000, inputMultiplier: 2, outputMultiplier: 1.5 },
  },
];

const MODEL_SIBLING_TOKENS = ['-mini', '-nano', '-pro', '-max', '-spark', '-fast', '-cyber', '-preview', '-search'];

function parsePriceEntries(raw: unknown): ModelPriceSpec[] {
  if (!Array.isArray(raw)) return [];
  const out: ModelPriceSpec[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const id = typeof obj.id === 'string' ? obj.id.trim().toLowerCase() : '';
    const input = typeof obj.input === 'number' && Number.isFinite(obj.input) ? obj.input : null;
    const output = typeof obj.output === 'number' && Number.isFinite(obj.output) ? obj.output : null;
    const cacheRead = typeof obj.cacheRead === 'number' && Number.isFinite(obj.cacheRead) ? obj.cacheRead : null;
    if (!id || input === null || output === null || cacheRead === null) continue;
    const cacheWrite = typeof obj.cacheWrite === 'number' && Number.isFinite(obj.cacheWrite) ? obj.cacheWrite : input;
    const cacheWriteLong =
      typeof obj.cacheWriteLong === 'number' && Number.isFinite(obj.cacheWriteLong) ? obj.cacheWriteLong : cacheWrite;
    const fastMultiplier =
      typeof obj.fastMultiplier === 'number' && Number.isFinite(obj.fastMultiplier) ? obj.fastMultiplier : 1;
    let longContext: LongContextSpec | undefined;
    if (obj.longContext && typeof obj.longContext === 'object') {
      const lc = obj.longContext as Record<string, unknown>;
      if (
        typeof lc.above === 'number' &&
        typeof lc.inputMultiplier === 'number' &&
        typeof lc.outputMultiplier === 'number'
      ) {
        longContext = {
          above: lc.above,
          inputMultiplier: lc.inputMultiplier,
          outputMultiplier: lc.outputMultiplier,
        };
      }
    }
    out.push({ id, input, output, cacheRead, cacheWrite, cacheWriteLong, fastMultiplier, longContext });
  }
  return out;
}

function loadFallbackPricingTable(): LoadedPricingTable {
  const claudeMap = new Map<string, ModelPriceSpec>();
  const codexMap = new Map<string, ModelPriceSpec>();
  let webSearch = 0.01;
  let usOnlyMultiplier = 1.1;

  for (const spec of BUILTIN_CODEX_PRICES) {
    codexMap.set(spec.id, spec);
  }

  // 先加载内置包，再加载用户目录最新下载表（覆盖旧值），同时兼容 models 与 tieredModels
  const pathsOldestFirst = [...VORSSAINT_PRICE_PATHS].reverse();
  for (const filePath of pathsOldestFirst) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const json = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, any>;
      if (json?.claude && typeof json.claude === 'object') {
        if (typeof json.claude.webSearch === 'number') webSearch = json.claude.webSearch;
        if (typeof json.claude.usOnlyMultiplier === 'number') usOnlyMultiplier = json.claude.usOnlyMultiplier;
        for (const spec of [
          ...parsePriceEntries(json.claude.models),
          ...parsePriceEntries(json.claude.tieredModels),
        ]) {
          claudeMap.set(spec.id, spec);
        }
      }
      if (json?.codex && typeof json.codex === 'object') {
        for (const spec of [
          ...parsePriceEntries(json.codex.models),
          ...parsePriceEntries(json.codex.tieredModels),
        ]) {
          codexMap.set(spec.id, spec);
        }
      }
    } catch {
      // 忽略损坏或正在写入的价格表
    }
  }

  return {
    claude: Array.from(claudeMap.values()),
    codex: Array.from(codexMap.values()),
    webSearch,
    usOnlyMultiplier,
  };
}

function matchesModelFamily(id: string, family: string): boolean {
  if (!id.startsWith(family)) return false;
  const rest = id.slice(family.length);
  if (!rest) return true;
  const next = rest[0];
  if (next !== '-' && next !== '_' && next !== ':') return false;
  const numMatch = rest.slice(1).match(/^\d+/);
  return !numMatch || numMatch[0].length >= 4;
}

function findFallbackModelPrice(rawModel: string, table: LoadedPricingTable): ModelPriceSpec | null {
  const normalized = (rawModel || '').trim().toLowerCase().replace(/^(openai|anthropic)\//, '');
  if (!normalized) return null;
  const list = normalized.startsWith('claude-') ? table.claude : table.codex;
  let best: ModelPriceSpec | null = null;
  for (const item of list) {
    if (matchesModelFamily(normalized, item.id)) {
      if (!best || item.id.length > best.id.length) {
        best = item;
      }
    }
  }
  if (!best) return null;
  const rest = normalized.slice(best.id.length);
  if (rest && MODEL_SIBLING_TOKENS.some((sib) => rest.includes(sib))) {
    return null;
  }
  return best;
}

function estimateFallbackCost(
  rawModel: string,
  billable: {
    input: number;
    cacheWrite: number;
    cacheRead: number;
    output: number;
    isAggregate: boolean;
    longCacheWrite: number;
    fast: boolean;
    domestic: boolean;
    webSearches: number;
  },
  table: LoadedPricingTable
): { cost: number; savings: number } | null {
  const totalTokens = billable.input + billable.cacheWrite + billable.cacheRead + billable.output;
  if (totalTokens === 0 && billable.webSearches <= 0) {
    return { cost: 0, savings: 0 };
  }
  const price = findFallbackModelPrice(rawModel, table);
  if (!price) return null;

  const longWrite = Math.min(Math.max(0, billable.longCacheWrite), billable.cacheWrite);
  let multiplier = billable.fast ? price.fastMultiplier : 1;
  if (billable.domestic) multiplier *= table.usOnlyMultiplier;
  let inputRate = multiplier;
  let outputRate = multiplier;

  const promptTokens = billable.input + billable.cacheWrite + billable.cacheRead;
  if (!billable.isAggregate && price.longContext && promptTokens > price.longContext.above) {
    inputRate *= price.longContext.inputMultiplier;
    outputRate *= price.longContext.outputMultiplier;
  }

  const cost =
    (billable.input * price.input * inputRate +
      (billable.cacheWrite - longWrite) * price.cacheWrite * inputRate +
      longWrite * price.cacheWriteLong * inputRate +
      billable.cacheRead * price.cacheRead * inputRate +
      billable.output * price.output * outputRate) /
      1_000_000 +
    Math.max(0, billable.webSearches) * table.webSearch;

  const savings =
    (billable.cacheRead * Math.max(0, price.input - price.cacheRead) * inputRate) / 1_000_000;

  return { cost, savings };
}

const beijingDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * 将 Unix 毫秒时间戳转换为北京时间 (Asia/Shanghai) 的 YYYY-MM-DD 字符串
 */
export function formatBeijingDateFromMs(ms: number): string {
  const parts = beijingDateFormatter.formatToParts(new Date(ms));
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }
  return `${map.year}-${map.month}-${map.day}`;
}

/**
 * 纯日历日期偏移（基于 UTC 年月日计算，不受宿主机本地 DST 或时区干扰）
 */
function shiftCalendarDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 生成从 startDate 到 endDate（含首尾）的连续 YYYY-MM-DD 日期序列
 */
function buildDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let cursor = startDate;
  let guard = 0;
  while (cursor <= endDate && guard < 1500) {
    dates.push(cursor);
    cursor = shiftCalendarDate(cursor, 1);
    guard++;
  }
  return dates;
}

function capitalizeWord(word: string): string {
  if (!word) return '';
  if (word.toLowerCase() === 'gpt') return 'GPT';
  if (word.toLowerCase() === 'ai') return 'AI';
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * 模型展示名标准化，与 Vorssaint 视觉口径对齐
 */
export function formatModelDisplayName(rawModel: string, provider: string): string {
  const model = (rawModel || '').trim();
  const providerLabel = provider ? capitalizeWord(provider) : 'AI';

  // 过滤异常解析片段（如包含换行、代码符号或超长字符串）
  if (!model || /[\r\n]/.test(model) || model.length > 64 || /^[^a-zA-Z0-9]/.test(model)) {
    return `${providerLabel} (未识别型号)`;
  }

  // 已带空格的标准可读名直接保留（如 "Gemini 3", "Claude Opus 4"）
  if (model.includes(' ')) {
    return model;
  }

  const lower = model.toLowerCase();

  // Claude 系列: claude-opus-5-5 -> Opus 5.5, claude-sonnet-5 -> Sonnet 5, claude-fable-5-2 -> Fable 5.2
  if (lower.startsWith('claude-')) {
    const cleaned = model.slice(7).replace(/-\d{8}$/, '');
    const tokens = cleaned.split('-').filter(Boolean);
    const words: string[] = [];
    const nums: string[] = [];
    for (const token of tokens) {
      if (/^\d+$/.test(token)) {
        nums.push(token);
      } else {
        words.push(capitalizeWord(token));
      }
    }
    if (words.length > 0 && nums.length > 0) {
      return `${words.join(' ')} ${nums.join('.')}`;
    }
    if (words.length > 0) {
      return words.join(' ');
    }
  }

  // GPT 系列: gpt-6.1-sol -> GPT-6.1 Sol, gpt-6-astra -> GPT-6 Astra
  if (lower.startsWith('gpt-')) {
    const tokens = model.slice(4).split('-').filter(Boolean);
    if (tokens.length > 0) {
      const head = `GPT-${tokens[0]}`;
      const tail = tokens.slice(1).map(capitalizeWord).join(' ');
      return tail ? `${head} ${tail}` : head;
    }
  }

  // Gemini 系列: gemini-3.8-flash -> Gemini 3.8 Flash
  if (lower.startsWith('gemini-')) {
    const tokens = model.split('-').filter(Boolean);
    return tokens
      .map((token) => (/^\d+(\.\d+)?$/.test(token) ? token : capitalizeWord(token)))
      .join(' ');
  }

  // 通用连字符/下划线模型名美化: codex-auto-review -> Codex Auto Review
  return model
    .split(/[-_]+/)
    .filter(Boolean)
    .map((token) => (/^\d+(\.\d+)?$/.test(token) ? token : capitalizeWord(token)))
    .join(' ');
}

export interface ParsedVorssaintResult {
  success: boolean;
  binPath: string;
  binExists: boolean;
  binUpdatedAt: number | null;
  aggregatedRows: AIDailyModelUsage[];
  seenDates: string[];
  rawRecordCount: number;
  warning?: string;
}

/**
 * 解析 Vorssaint 缓存二进制文件 (Magic: VAUA, Format: 4)
 */
export function parseVorssaintUsageBin(filePath: string = VORSSAINT_USAGE_BIN_PATH): ParsedVorssaintResult {
  let binUpdatedAt: number | null = null;

  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      binPath: filePath,
      binExists: false,
      binUpdatedAt: null,
      aggregatedRows: [],
      seenDates: [],
      rawRecordCount: 0,
      warning: '未在本机检测到 Vorssaint 缓存文件，当前仅展示历史留存数据。',
    };
  }

  try {
    const stat = fs.statSync(filePath);
    binUpdatedAt = stat.mtimeMs;

    const buf = fs.readFileSync(filePath);
    if (buf.length < 16) {
      throw new Error('文件长度过短，可能正在写入');
    }

    const magic = buf.subarray(0, 4).toString('ascii');
    if (magic !== EXPECTED_MAGIC) {
      throw new Error(`文件魔数不匹配 (${magic})`);
    }

    // 剔除前 4 字节 Magic 与末尾 8 字节校验和
    const body = buf.subarray(4, buf.length - 8);
    let pos = 0;

    const readUnsigned = (): bigint => {
      let result = 0n;
      let shift = 0n;
      while (pos < body.length) {
        const b = body[pos++];
        result |= BigInt(b & 0x7f) << shift;
        if ((b & 0x80) === 0) {
          return result;
        }
        shift += 7n;
      }
      throw new Error('读取 ULEB128 整数越界');
    };

    const readSigned = (): number => {
      const r = readUnsigned();
      return Number((r >> 1n) ^ -(r & 1n));
    };

    const readBool = (): boolean => {
      if (pos >= body.length) {
        throw new Error('读取布尔值越界');
      }
      return body[pos++] !== 0;
    };

    const readDouble = (): number => {
      if (pos + 8 > body.length) {
        throw new Error('读取 Double 越界');
      }
      const val = body.readDoubleLE(pos);
      pos += 8;
      return val;
    };

    const readDateMs = (): number => {
      const appleSec = readDouble();
      return (appleSec + APPLE_REFERENCE_EPOCH_SEC) * 1000;
    };

    // 1. Header
    const format = readSigned();
    if (format !== SUPPORTED_FORMAT) {
      throw new Error(`不支持的缓存格式版本: ${format}（仅支持 Format ${SUPPORTED_FORMAT}）`);
    }

    const stringCount = Number(readUnsigned());
    if (stringCount < 0 || stringCount > 5_000_000) {
      throw new Error(`字符串表长度异常: ${stringCount}`);
    }

    const strings: string[] = new Array(stringCount);
    for (let i = 0; i < stringCount; i++) {
      const len = Number(readUnsigned());
      if (len < 0 || pos + len > body.length) {
        throw new Error(`字符串偏移越界: index=${i}, len=${len}`);
      }
      strings[i] = body.subarray(pos, pos + len).toString('utf8');
      pos += len;
    }

    const readString = (): string => {
      const idx = Number(readUnsigned());
      if (idx < 0 || idx >= strings.length) {
        throw new Error(`字符串表下标越界: ${idx}`);
      }
      return strings[idx];
    };

    // 2. Body
    readString(); // build
    const providerCount = Number(readUnsigned());
    for (let i = 0; i < providerCount; i++) {
      readString();
    }

    const recordCount = Number(readUnsigned());
    if (recordCount < 0 || recordCount > 5_000_000) {
      throw new Error(`记录条数异常: ${recordCount}`);
    }

    const nowMs = Date.now();
    const pricingTable = loadFallbackPricingTable();
    const aggregateMap = new Map<string, AIDailyModelUsage>();
    const seenDateSet = new Set<string>();

    for (let i = 0; i < recordCount; i++) {
      readString(); // key
      const provider = readString();
      const dateMs = readDateMs();
      const model = readString();
      readString(); // project
      readString(); // session
      const requests = readSigned();
      const input = readSigned();
      const cacheWrite = readSigned();
      const cacheRead = readSigned();
      const output = readSigned();
      const reasoning = readSigned();
      const hasCost = readBool();
      const costUsd = hasCost ? readDouble() : null;
      const savingsUsd = readDouble();

      let billableInput = input;
      let billableCacheWrite = cacheWrite;
      let billableCacheRead = cacheRead;
      let billableOutput = output;
      const sameBillable = readBool();
      if (!sameBillable) {
        billableInput = readSigned();
        billableCacheWrite = readSigned();
        billableCacheRead = readSigned();
        billableOutput = readSigned();
        readSigned(); // billableReasoning (already contained in billableOutput)
      }

      const isAggregate = readBool();
      const longCacheWrite = readSigned();
      const fast = readBool();
      const domestic = readBool();
      const webSearches = readSigned();
      const sourcesCount = Number(readUnsigned());
      for (let j = 0; j < sourcesCount; j++) {
        readString();
      }

      if (!Number.isFinite(dateMs) || dateMs <= 0) {
        continue;
      }

      const dateStr = formatBeijingDateFromMs(dateMs);
      seenDateSet.add(dateStr);

      const safeInput = Math.max(0, input);
      const safeCacheWrite = Math.max(0, cacheWrite);
      const safeCacheRead = Math.max(0, cacheRead);
      const safeOutput = Math.max(0, output);
      const safeReasoning = Math.max(0, reasoning);
      const safeTotal = safeInput + safeCacheWrite + safeCacheRead + safeOutput + safeReasoning;

      const mapKey = `${dateStr}\0${provider}\0${model}`;
      let entry = aggregateMap.get(mapKey);
      if (!entry) {
        entry = {
          date: dateStr,
          provider,
          model,
          displayName: formatModelDisplayName(model, provider),
          requests: 0,
          inputTokens: 0,
          cacheWriteTokens: 0,
          cacheReadTokens: 0,
          outputTokens: 0,
          reasoningTokens: 0,
          totalTokens: 0,
          costUsd: 0,
          savingsUsd: 0,
          unpricedCount: 0,
          updatedAt: nowMs,
        };
        aggregateMap.set(mapKey, entry);
      }

      entry.requests += Math.max(0, requests);
      entry.inputTokens += safeInput;
      entry.cacheWriteTokens += safeCacheWrite;
      entry.cacheReadTokens += safeCacheRead;
      entry.outputTokens += safeOutput;
      entry.reasoningTokens += safeReasoning;
      entry.totalTokens += safeTotal;

      if (hasCost && costUsd !== null && Number.isFinite(costUsd)) {
        entry.costUsd += costUsd;
        if (Number.isFinite(savingsUsd)) {
          entry.savingsUsd += Math.max(0, savingsUsd);
        }
      } else {
        const fallback = estimateFallbackCost(
          model,
          {
            input: Math.max(0, billableInput),
            cacheWrite: Math.max(0, billableCacheWrite),
            cacheRead: Math.max(0, billableCacheRead),
            output: Math.max(0, billableOutput),
            isAggregate,
            longCacheWrite,
            fast,
            domestic,
            webSearches,
          },
          pricingTable
        );
        if (fallback) {
          entry.costUsd += fallback.cost;
          entry.savingsUsd += Math.max(0, fallback.savings);
        } else {
          entry.unpricedCount += 1;
          if (Number.isFinite(savingsUsd)) {
            entry.savingsUsd += Math.max(0, savingsUsd);
          }
        }
      }
    }

    return {
      success: true,
      binPath: filePath,
      binExists: true,
      binUpdatedAt,
      aggregatedRows: Array.from(aggregateMap.values()),
      seenDates: Array.from(seenDateSet).sort(),
      rawRecordCount: recordCount,
    };
  } catch (err: any) {
    console.warn('[Diary] Failed to parse Vorssaint cache:', err);
    return {
      success: false,
      binPath: filePath,
      binExists: true,
      binUpdatedAt,
      aggregatedRows: [],
      seenDates: [],
      rawRecordCount: 0,
      warning: `Vorssaint 缓存读取降级（${err?.message || '格式校验未通过'}），已保留并展示本地历史记录，请稍后刷新重试。`,
    };
  }
}

function summarizeRows(rows: AIDailyModelUsage[]): AIUsageSummary {
  let requests = 0;
  let inputTokens = 0;
  let cacheWriteTokens = 0;
  let cacheReadTokens = 0;
  let outputTokens = 0;
  let reasoningTokens = 0;
  let totalTokens = 0;
  let costUsd = 0;
  let savingsUsd = 0;
  let unpricedCount = 0;

  for (const r of rows) {
    requests += r.requests;
    inputTokens += r.inputTokens;
    cacheWriteTokens += r.cacheWriteTokens;
    cacheReadTokens += r.cacheReadTokens;
    outputTokens += r.outputTokens;
    reasoningTokens += r.reasoningTokens;
    totalTokens += r.totalTokens;
    costUsd += r.costUsd;
    savingsUsd += r.savingsUsd;
    unpricedCount += r.unpricedCount;
  }

  const promptDenom = inputTokens + cacheReadTokens + cacheWriteTokens;
  const cacheHitRate = promptDenom > 0 ? cacheReadTokens / promptDenom : 0;

  return {
    requests,
    inputTokens,
    cacheWriteTokens,
    cacheReadTokens,
    outputTokens,
    reasoningTokens,
    totalTokens,
    costUsd,
    savingsUsd,
    unpricedCount,
    cacheHitRate,
  };
}

/**
 * 同步 Vorssaint 本地缓存至 diary.db，并按北京时间维度查询指定区间统计结果
 */
export async function syncAndQueryAiUsage(params: AIUsageQueryParams = {}): Promise<AIUsageQueryResult> {
  const parsed = parseVorssaintUsageBin(VORSSAINT_USAGE_BIN_PATH);

  let syncedDaysCount = 0;
  if (parsed.success && parsed.seenDates.length > 0) {
    syncedDaysCount = await db.syncAiDailyUsage(parsed.aggregatedRows, parsed.seenDates);
  }

  const todayDate = formatBeijingDateFromMs(Date.now());
  let startDate: string;
  let endDate: string;

  if (params.startDate && params.endDate) {
    startDate = params.startDate <= params.endDate ? params.startDate : params.endDate;
    endDate = params.startDate <= params.endDate ? params.endDate : params.startDate;
  } else {
    const days = Math.max(1, Math.min(365, params.days || 30));
    endDate = todayDate;
    startDate = shiftCalendarDate(todayDate, -(days - 1));
  }

  const [periodRows, todayRows, bounds] = await Promise.all([
    db.queryAiDailyUsage(startDate, endDate),
    db.queryAiDailyUsage(todayDate, todayDate),
    db.getAiUsageDateBounds(),
  ]);

  const todaySummary = summarizeRows(todayRows);
  const periodSummary = summarizeRows(periodRows);

  // 构建连续日期列表（空白日填零）
  const dateList = buildDateRange(startDate, endDate);
  const dayMap = new Map<string, AIDailyAggregate>();
  for (const d of dateList) {
    dayMap.set(d, {
      date: d,
      requests: 0,
      inputTokens: 0,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      savingsUsd: 0,
      unpricedCount: 0,
      models: [],
    });
  }

  const modelMap = new Map<string, AIModelAggregate>();

  for (const row of periodRows) {
    const dayAgg = dayMap.get(row.date);
    if (dayAgg) {
      dayAgg.requests += row.requests;
      dayAgg.inputTokens += row.inputTokens;
      dayAgg.cacheWriteTokens += row.cacheWriteTokens;
      dayAgg.cacheReadTokens += row.cacheReadTokens;
      dayAgg.outputTokens += row.outputTokens;
      dayAgg.reasoningTokens += row.reasoningTokens;
      dayAgg.totalTokens += row.totalTokens;
      dayAgg.costUsd += row.costUsd;
      dayAgg.savingsUsd += row.savingsUsd;
      dayAgg.unpricedCount += row.unpricedCount;
      dayAgg.models.push(row);
    }

    const mKey = `${row.provider}\0${row.model}`;
    let mAgg = modelMap.get(mKey);
    if (!mAgg) {
      mAgg = {
        provider: row.provider,
        model: row.model,
        displayName: row.displayName,
        requests: 0,
        inputTokens: 0,
        cacheWriteTokens: 0,
        cacheReadTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        savingsUsd: 0,
        unpricedCount: 0,
        costShare: 0,
        tokenShare: 0,
      };
      modelMap.set(mKey, mAgg);
    }

    mAgg.requests += row.requests;
    mAgg.inputTokens += row.inputTokens;
    mAgg.cacheWriteTokens += row.cacheWriteTokens;
    mAgg.cacheReadTokens += row.cacheReadTokens;
    mAgg.outputTokens += row.outputTokens;
    mAgg.reasoningTokens += row.reasoningTokens;
    mAgg.totalTokens += row.totalTokens;
    mAgg.costUsd += row.costUsd;
    mAgg.savingsUsd += row.savingsUsd;
    mAgg.unpricedCount += row.unpricedCount;
  }

  // 当日内按花费/Token 降序排序模型明细
  const dailyData = Array.from(dayMap.values()).map((day) => {
    day.models.sort((a, b) => b.costUsd - a.costUsd || b.totalTokens - a.totalTokens);
    return day;
  });

  // 计算周期内各模型占比并排序
  const modelBreakdown = Array.from(modelMap.values())
    .map((m) => ({
      ...m,
      costShare: periodSummary.costUsd > 0 ? m.costUsd / periodSummary.costUsd : 0,
      tokenShare: periodSummary.totalTokens > 0 ? m.totalTokens / periodSummary.totalTokens : 0,
    }))
    .sort((a, b) => b.costUsd - a.costUsd || b.totalTokens - a.totalTokens);

  return {
    startDate,
    endDate,
    todayDate,
    todaySummary,
    periodSummary,
    dailyData,
    modelBreakdown,
    binPath: parsed.binPath,
    binExists: parsed.binExists,
    binUpdatedAt: parsed.binUpdatedAt,
    syncedDaysCount,
    oldestStoredDate: bounds.oldestDate,
    newestStoredDate: bounds.newestDate,
    warning: parsed.warning,
  };
}
