/**
 * 获取当前北京时间 (UTC+8, Asia/Shanghai) 的 Date 对象。
 * 其 getFullYear(), getMonth(), getDate(), getHours() 等均对应北京时间数值。
 * 该方案完全在应用内沙盒化隔离，不修改系统设置，其他软件绝不可见且不受任何影响。
 */
export function getBeijingNow(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = parseInt(part.value, 10);
    }
  }
  return new Date(map.year, map.month - 1, map.day, (map.hour || 0) % 24, map.minute || 0, map.second || 0);
}

/**
 * 将 ISO 时间字符串或 Date 对象格式化为北京时间显示文本
 */
export function formatBeijingDateTime(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(str: string): Date {
  const [year, month, day] = str.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Get Monday of the week for a given date
export function getMonday(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  // In JS, 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

// Get 7 days for the week starting from Monday
export function getWeekDays(baseDate: Date): Date[] {
  const monday = getMonday(baseDate);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  }
  return days;
}

// Get ISO week number
export function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getWeekIdentifier(d: Date): string {
  const year = d.getFullYear();
  const week = getWeekNumber(d);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function getMonthIdentifier(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getWeekdayName(d: Date): string {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[d.getDay()];
}

export function isToday(d: Date): boolean {
  const today = getBeijingNow();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export function formatWeekRange(startDate: Date, endDate: Date): string {
  const sy = startDate.getFullYear();
  const sm = String(startDate.getMonth() + 1).padStart(2, '0');
  const sd = String(startDate.getDate()).padStart(2, '0');
  
  const ey = endDate.getFullYear();
  const em = String(endDate.getMonth() + 1).padStart(2, '0');
  const ed = String(endDate.getDate()).padStart(2, '0');

  if (sy === ey) {
    return `${sy}.${sm}.${sd} - ${em}.${ed}`;
  }
  return `${sy}.${sm}.${sd} - ${ey}.${em}.${ed}`;
}

export function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

/**
 * 获取指定日期所在月份的起始日期、结束日期以及整月所有日期的格式化字符串列表 (YYYY-MM-DD)
 */
export function getMonthDateRange(d: Date): { startDate: string; endDate: string; dateStrings: string[] } {
  const year = d.getFullYear();
  const month = d.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const dateStrings: string[] = [];
  for (let day = 1; day <= lastDay; day++) {
    dateStrings.push(formatDate(new Date(year, month, day)));
  }
  return {
    startDate: dateStrings[0],
    endDate: dateStrings[dateStrings.length - 1],
    dateStrings,
  };
}
