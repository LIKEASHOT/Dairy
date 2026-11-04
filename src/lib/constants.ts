import { MoodOption, Tag, SlotPeriod } from '../types';

export const DEFAULT_TAGS: Tag[] = [
  {
    id: 'tag_spfr',
    name: 'SPFR',
    color: '#C97B63', // 陶土橙 (Terracotta)
    bgColor: '#FAF0ED',
    textColor: '#A45842',
    isDefault: true,
    sortOrder: 1,
  },
  {
    id: 'tag_gda',
    name: 'GDA',
    color: '#9EAD90', // 鼠尾草绿 (Sage Green)
    bgColor: '#F2F5F0',
    textColor: '#526046',
    isDefault: true,
    sortOrder: 2,
  },
  {
    id: 'tag_fitness',
    name: '健身',
    color: '#D6B16C', // 暖金 (Warm Gold)
    bgColor: '#FAF5EB',
    textColor: '#8C6C26',
    isDefault: true,
    sortOrder: 3,
  },
  {
    id: 'tag_study',
    name: '学习',
    color: '#777A80', // 暗灰 (Slate Charcoal)
    bgColor: '#F1F2F3',
    textColor: '#484B50',
    isDefault: true,
    sortOrder: 4,
  },
  {
    id: 'tag_daily',
    name: '日常',
    color: '#A4A09A', // 暖灰 (Warm Gray)
    bgColor: '#F6F5F3',
    textColor: '#58544E',
    isDefault: true,
    sortOrder: 5,
  },
  {
    id: 'tag_rest',
    name: '休息',
    color: '#B58872', // 柔和棕粉 (Muted Rose Brown)
    bgColor: '#F8F2EF',
    textColor: '#7E533F',
    isDefault: true,
    sortOrder: 6,
  },
];

export const PRESET_COLORS = [
  { color: '#C97B63', bgColor: '#FAF0ED', textColor: '#A45842', label: '陶土橙 (Clay)' },
  { color: '#9EAD90', bgColor: '#F2F5F0', textColor: '#526046', label: '鼠尾草绿 (Sage)' },
  { color: '#D6B16C', bgColor: '#FAF5EB', textColor: '#8C6C26', label: '暖金 (Gold)' },
  { color: '#A4A09A', bgColor: '#F6F5F3', textColor: '#58544E', label: '暖灰 (Warm Gray)' },
  { color: '#777A80', bgColor: '#F1F2F3', textColor: '#484B50', label: '暗灰 (Dark Gray)' },
  { color: '#889BA8', bgColor: '#F0F4F7', textColor: '#435866', label: '雾霾蓝 (Slate Blue)' },
  { color: '#B58872', bgColor: '#F8F2EF', textColor: '#7E533F', label: '复古肉桂 (Cinnamon)' },
  { color: '#B0A880', bgColor: '#F8F7EE', textColor: '#635D38', label: '柔和橄榄 (Olive)' },
  { color: '#C28490', bgColor: '#FBF0F2', textColor: '#824854', label: '干枯玫瑰 (Dusty Rose)' },
];

export const MOOD_OPTIONS: MoodOption[] = [
  { id: 'focus', emoji: '⚡', label: '高效', color: '#C97B63' },
  { id: 'energetic', emoji: '💪', label: '活力', color: '#9EAD90' },
  { id: 'peaceful', emoji: '🧘', label: '平静', color: '#889BA8' },
  { id: 'coffee', emoji: '☕', label: '专注', color: '#D6B16C' },
  { id: 'happy', emoji: '🎉', label: '愉悦', color: '#D6B16C' },
  { id: 'busy', emoji: '🔥', label: '忙碌', color: '#C97B63' },
  { id: 'tired', emoji: '😴', label: '疲惫', color: '#A4A09A' },
  { id: 'low', emoji: '🌧️', label: '低落', color: '#777A80' },
];

export const PERIOD_CONFIG: Record<SlotPeriod, { name: string; subtitle: string; icon: string; time: string; accentColor: string }> = {
  morning: {
    name: '早间',
    subtitle: 'Morning',
    icon: 'SunMedium',
    time: '06:00 - 12:00',
    accentColor: 'text-[#D6B16C] bg-[#FAF5EB] border-[#E8DFD1]',
  },
  afternoon: {
    name: '午间',
    subtitle: 'Afternoon',
    icon: 'Sun',
    time: '12:00 - 18:00',
    accentColor: 'text-[#C97B63] bg-[#FAF0ED] border-[#E8DFD1]',
  },
  evening: {
    name: '晚间',
    subtitle: 'Evening',
    icon: 'Moon',
    time: '18:00 - 24:00',
    accentColor: 'text-[#777A80] bg-[#F1F2F3] border-[#E8DFD1]',
  },
};
