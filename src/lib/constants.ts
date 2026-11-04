import { MoodOption, Tag, SlotPeriod } from '../types';

export const DEFAULT_TAGS: Tag[] = [
  {
    id: 'tag_spfr',
    name: 'SPFR',
    color: '#6366F1', // Indigo
    bgColor: '#EEF2FF',
    textColor: '#4338CA',
    isDefault: true,
    sortOrder: 1,
  },
  {
    id: 'tag_gda',
    name: 'GDA',
    color: '#8B5CF6', // Purple
    bgColor: '#F5F3FF',
    textColor: '#6D28D9',
    isDefault: true,
    sortOrder: 2,
  },
  {
    id: 'tag_fitness',
    name: '健身',
    color: '#10B981', // Emerald
    bgColor: '#ECFDF5',
    textColor: '#047857',
    isDefault: true,
    sortOrder: 3,
  },
  {
    id: 'tag_study',
    name: '学习',
    color: '#F59E0B', // Amber
    bgColor: '#FFFBEB',
    textColor: '#B45309',
    isDefault: true,
    sortOrder: 4,
  },
  {
    id: 'tag_daily',
    name: '日常',
    color: '#64748B', // Slate
    bgColor: '#F8FAFC',
    textColor: '#334155',
    isDefault: true,
    sortOrder: 5,
  },
  {
    id: 'tag_rest',
    name: '休息',
    color: '#EC4899', // Pink
    bgColor: '#FDF2F8',
    textColor: '#BE185D',
    isDefault: true,
    sortOrder: 6,
  },
];

export const PRESET_COLORS = [
  { color: '#6366F1', bgColor: '#EEF2FF', textColor: '#4338CA', label: '靛蓝 (Indigo)' },
  { color: '#8B5CF6', bgColor: '#F5F3FF', textColor: '#6D28D9', label: '紫色 (Purple)' },
  { color: '#3B82F6', bgColor: '#EFF6FF', textColor: '#1D4ED8', label: '天蓝 (Blue)' },
  { color: '#06B6D4', bgColor: '#ECFEFF', textColor: '#0E7490', label: '青色 (Cyan)' },
  { color: '#10B981', bgColor: '#ECFDF5', textColor: '#047857', label: '翡翠 (Emerald)' },
  { color: '#84CC16', bgColor: '#F7FEE7', textColor: '#4D7C0F', label: '青柠 (Lime)' },
  { color: '#F59E0B', bgColor: '#FFFBEB', textColor: '#B45309', label: '琥珀 (Amber)' },
  { color: '#F97316', bgColor: '#FFF7ED', textColor: '#C2410C', label: '橙色 (Orange)' },
  { color: '#EF4444', bgColor: '#FEF2F2', textColor: '#B91C1C', label: '珊瑚红 (Red)' },
  { color: '#EC4899', bgColor: '#FDF2F8', textColor: '#BE185D', label: '粉红 (Pink)' },
  { color: '#64748B', bgColor: '#F8FAFC', textColor: '#334155', label: '石板灰 (Slate)' },
];

export const MOOD_OPTIONS: MoodOption[] = [
  { id: 'focus', emoji: '⚡', label: '高效', color: '#6366F1' },
  { id: 'energetic', emoji: '💪', label: '活力', color: '#10B981' },
  { id: 'peaceful', emoji: '🧘', label: '平静', color: '#06B6D4' },
  { id: 'coffee', emoji: '☕', label: '专注', color: '#B45309' },
  { id: 'happy', emoji: '🎉', label: '愉悦', color: '#F59E0B' },
  { id: 'busy', emoji: '🔥', label: '忙碌', color: '#EF4444' },
  { id: 'tired', emoji: '😴', label: '疲惫', color: '#8B5CF6' },
  { id: 'low', emoji: '🌧️', label: '低落', color: '#64748B' },
];

export const PERIOD_CONFIG: Record<SlotPeriod, { name: string; subtitle: string; icon: string; time: string; accentColor: string }> = {
  morning: {
    name: '早间',
    subtitle: 'Morning',
    icon: 'SunMedium',
    time: '06:00 - 12:00',
    accentColor: 'text-amber-500 bg-amber-50 border-amber-200',
  },
  afternoon: {
    name: '午间',
    subtitle: 'Afternoon',
    icon: 'Sun',
    time: '12:00 - 18:00',
    accentColor: 'text-sky-500 bg-sky-50 border-sky-200',
  },
  evening: {
    name: '晚间',
    subtitle: 'Evening',
    icon: 'Moon',
    time: '18:00 - 24:00',
    accentColor: 'text-indigo-500 bg-indigo-50 border-indigo-200',
  },
};
