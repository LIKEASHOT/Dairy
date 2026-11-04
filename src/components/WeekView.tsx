import React from 'react';
import { DayData, SlotPeriod, Tag } from '../types';
import { formatDate } from '../lib/dateUtils';
import { DayColumn } from './DayColumn';

interface WeekViewProps {
  weekDays: Date[];
  daysData: Record<string, DayData>;
  tags: Tag[];
  onAddRecord: (date: string, period: SlotPeriod, content: string, tagId: string) => void;
  onUpdateRecord: (id: string, content: string, tagId: string) => void;
  onDeleteRecord: (id: string) => void;
  onSaveSlotNote: (date: string, period: SlotPeriod, note: string) => void;
  onToggleMood: (date: string, moodId: string) => void;
  onOpenDiaryModal: (date: string) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  weekDays,
  daysData,
  tags,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onSaveSlotNote,
  onToggleMood,
  onOpenDiaryModal,
}) => {
  return (
    <div className="flex-1 h-[calc(100vh-4rem)] overflow-x-auto p-3.5 xl:p-5 flex flex-col">
      <div className="flex space-x-3 min-w-full h-full pb-1">
        {weekDays.map((d) => {
          const dateStr = formatDate(d);
          const dayData = daysData[dateStr] || {
            date: dateStr,
            moods: [],
            diaryNote: '',
            slots: {
              morning: { date: dateStr, period: 'morning', records: [] },
              afternoon: { date: dateStr, period: 'afternoon', records: [] },
              evening: { date: dateStr, period: 'evening', records: [] },
            },
          };

          return (
            <DayColumn
              key={dateStr}
              date={d}
              dateStr={dateStr}
              dayData={dayData}
              tags={tags}
              onAddRecord={onAddRecord}
              onUpdateRecord={onUpdateRecord}
              onDeleteRecord={onDeleteRecord}
              onSaveSlotNote={onSaveSlotNote}
              onToggleMood={onToggleMood}
              onOpenDiaryModal={onOpenDiaryModal}
            />
          );
        })}
      </div>
    </div>
  );
};
