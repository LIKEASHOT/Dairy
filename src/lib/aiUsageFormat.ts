import { AIModelAggregate } from '../types';

export interface ProviderMeta {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  palette: string[];
}

const PROVIDER_META_MAP: Record<string, ProviderMeta> = {
  claude: {
    label: 'Claude',
    color: '#D97757',
    bgColor: '#FAF0ED',
    textColor: '#A45842',
    borderColor: '#F0D5CD',
    palette: ['#D97757', '#E6997E', '#B85A3B', '#F0B8A5', '#C97B63'],
  },
  codex: {
    label: 'Codex',
    color: '#7D99FF',
    bgColor: '#EEF2FF',
    textColor: '#4358A8',
    borderColor: '#CBD6FC',
    palette: ['#7D99FF', '#5674E0', '#A4B8FF', '#445CC4', '#8DA5FA'],
  },
  gemini: {
    label: 'Gemini',
    color: '#4285F4',
    bgColor: '#EBF3FE',
    textColor: '#2558B0',
    borderColor: '#C5DCFB',
    palette: ['#4285F4', '#74A8FA', '#2766D1', '#9BC0FC', '#5C96F6'],
  },
  copilot: {
    label: 'Copilot',
    color: '#4DC7AD',
    bgColor: '#EAF8F4',
    textColor: '#297D6B',
    borderColor: '#BEEBE0',
    palette: ['#4DC7AD', '#2F9E88', '#7EDBC7', '#207C6A', '#62D2BA'],
  },
};

export function getProviderMeta(provider: string): ProviderMeta {
  const key = (provider || '').toLowerCase();
  if (PROVIDER_META_MAP[key]) {
    return PROVIDER_META_MAP[key];
  }
  const label = provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'Other';
  return {
    label,
    color: '#9EAD90',
    bgColor: '#F2F5F0',
    textColor: '#5C6B50',
    borderColor: '#D5DEC9',
    palette: ['#9EAD90', '#7D8E6D', '#B6C3AA', '#5C6B50', '#847D72'],
  };
}

export function getModelKey(provider: string, model: string): string {
  return `${provider}::${model}`;
}

/**
 * 基于模型排序列表为每个 (provider, model) 分配同厂商色系下的可区分颜色
 */
export function buildModelColorMap(models: AIModelAggregate[]): Map<string, string> {
  const colorMap = new Map<string, string>();
  const providerIndex = new Map<string, number>();

  for (const m of models) {
    const key = getModelKey(m.provider, m.model);
    if (colorMap.has(key)) continue;
    const pKey = (m.provider || '').toLowerCase();
    const meta = getProviderMeta(pKey);
    const idx = providerIndex.get(pKey) || 0;
    colorMap.set(key, meta.palette[idx % meta.palette.length]);
    providerIndex.set(pKey, idx + 1);
  }

  return colorMap;
}

export function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 10_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

export function formatUsd(val: number): string {
  if (!Number.isFinite(val) || val <= 0) return '$0.00';
  if (val < 0.01) return `$${val.toFixed(4)}`;
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return '0.0%';
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatShortDate(dateStr: string): string {
  // YYYY-MM-DD -> MM-DD
  return dateStr.length >= 10 ? dateStr.slice(5) : dateStr;
}

export function getChineseWeekday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(Date.UTC(y, m - 1, d));
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return names[dt.getUTCDay()] || '';
}

/**
 * 计算整洁的坐标轴刻度最大值与分档值
 */
export function computeNiceTicks(maxValue: number, segments = 4): { niceMax: number; ticks: number[] } {
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return { niceMax: 4, ticks: [0, 1, 2, 3, 4] };
  }
  const rawStep = maxValue / segments;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let niceNormalized: number;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 2.5) niceNormalized = 2.5;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;

  const step = niceNormalized * magnitude;
  const niceMax = step * segments;
  const ticks: number[] = [];
  for (let i = 0; i <= segments; i++) {
    ticks.push(i * step);
  }
  return { niceMax, ticks };
}

/**
 * Fritsch-Carlson 单调三次样条插值路径（保证平滑且不会在零基线附近出现负向过冲）
 */
export function buildMonotoneSvgPath(
  points: Array<{ x: number; y: number }>,
  minY: number,
  maxY: number
): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;
  }

  const n = points.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const slopes: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const deltaX = points[i + 1].x - points[i].x || 1;
    const deltaY = points[i + 1].y - points[i].y;
    dx.push(deltaX);
    dy.push(deltaY);
    slopes.push(deltaY / deltaX);
  }

  const tangents: number[] = new Array(n).fill(0);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      tangents[i] = 0;
    } else {
      tangents[i] = (slopes[i - 1] + slopes[i]) / 2;
    }
  }

  // Fritsch-Carlson 单调性约束
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(slopes[i]) < 1e-9) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const a = tangents[i] / slopes[i];
      const b = tangents[i + 1] / slopes[i];
      const s = a * a + b * b;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        tangents[i] = tau * a * slopes[i];
        tangents[i + 1] = tau * b * slopes[i];
      }
    }
  }

  const clampY = (y: number) => Math.max(minY, Math.min(maxY, y));
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 0; i < n - 1; i++) {
    const stepX = dx[i] / 3;
    const cp1x = points[i].x + stepX;
    const cp1y = clampY(points[i].y + tangents[i] * stepX);
    const cp2x = points[i + 1].x - stepX;
    const cp2y = clampY(points[i + 1].y - tangents[i + 1] * stepX);
    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${points[i + 1].x.toFixed(2)} ${points[i + 1].y.toFixed(2)}`;
  }

  return path;
}
