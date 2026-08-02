import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  getISOWeek,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { NoteItem } from '../types';

interface Props {
  notes: NoteItem[];
  selectedDate: string | null; // YYYY-MM-DD or null
  onSelectDate: (dateStr: string | null) => void;
}

export const NoteCalendarSidebar: React.FC<Props> = ({
  notes,
  selectedDate,
  onSelectDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Calculate note counts per YYYY-MM-DD date
  const noteCountsByDate: { [key: string]: number } = {};
  notes.forEach((note) => {
    if (note.date) {
      noteCountsByDate[note.date] = (noteCountsByDate[note.date] || 0) + 1;
    }
  });

  // Current Week Calculation
  const today = new Date();
  const currentWeekNumber = getISOWeek(today);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Month Calendar Days Calculation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col gap-4">
      {/* 1. Hafta Numarası ve Haftanın Günleri Header */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                Hafta {currentWeekNumber}
              </span>
              <p className="text-[10px] text-slate-500">Bu Haftanın Not Takvimi</p>
            </div>
          </div>

          {selectedDate && (
            <button
              onClick={() => onSelectDate(null)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 transition-colors cursor-pointer"
            >
              Filtreyi Temizle
            </button>
          )}
        </div>

        {/* Current Week Day Row */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const count = noteCountsByDate[dateStr] || 0;
            const isSelected = selectedDate === dateStr;
            const isCurrentDay = isToday(day);

            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(isSelected ? null : dateStr)}
                className={`p-1.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : isCurrentDay
                    ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                }`}
              >
                <span className="text-[9px] uppercase font-semibold opacity-75">
                  {format(day, 'EEEEEE', { locale: tr })}
                </span>
                <span className="text-xs font-bold">{format(day, 'd')}</span>

                {/* Badge for Note Count */}
                {count > 0 && (
                  <span
                    className={`text-[9px] font-extrabold px-1 rounded-full mt-0.5 ${
                      isSelected
                        ? 'bg-white text-indigo-700'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Mini Aylık Takvim Gösterimi */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
            {format(currentMonth, 'MMMM yyyy', { locale: tr })}
          </h4>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase mb-1">
          <span>Pz</span>
          <span>Sa</span>
          <span>Ça</span>
          <span>Pe</span>
          <span>Cu</span>
          <span>Ct</span>
          <span>Pz</span>
        </div>

        {/* Month Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {monthDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const count = noteCountsByDate[dateStr] || 0;
            const isSelected = selectedDate === dateStr;
            const isCurrentDay = isToday(day);
            const isCurrentMonthDay =
              format(day, 'yyyy-MM') === format(currentMonth, 'yyyy-MM');

            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(isSelected ? null : dateStr)}
                className={`h-8 rounded-lg text-xs font-medium relative flex items-center justify-center transition-all cursor-pointer ${
                  !isCurrentMonthDay
                    ? 'text-slate-300 opacity-50'
                    : isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : isCurrentDay
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span>{format(day, 'd')}</span>

                {/* Badge for Note Count */}
                {count > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 text-[8px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border ${
                      isSelected
                        ? 'bg-white text-indigo-700 border-indigo-600'
                        : 'bg-indigo-600 text-white border-white'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Filter Status Banner */}
      {selectedDate && (
        <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
          <span className="font-semibold">
            Filtrelenen Tarih: {format(parseISO(selectedDate), 'd MMMM yyyy', { locale: tr })}
          </span>
          <button
            onClick={() => onSelectDate(null)}
            className="text-[10px] font-bold bg-white text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            Tüm Notlar
          </button>
        </div>
      )}
    </div>
  );
};
