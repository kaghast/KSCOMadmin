import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Plus,
  X,
  FileText,
  Timer,
  Tag,
  Check,
  Sparkles,
  ChevronDown,
  Layers,
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
  isToday,
  parseISO,
  addDays,
  subDays,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { NoteItem, TimeLog, CalendarEvent } from '../types';

interface Props {
  notes: NoteItem[];
  timeLogs?: TimeLog[];
  events?: CalendarEvent[];
  selectedDate: string | null; // YYYY-MM-DD or null
  onSelectDate: (dateStr: string | null) => void;
  onSaveNote?: (data: any) => Promise<void>;
  onSaveTimelog?: (data: any) => Promise<void>;
  onRefresh?: () => void;
}

export const NoteCalendarSidebar: React.FC<Props> = ({
  notes,
  timeLogs = [],
  events = [],
  selectedDate,
  onSelectDate,
  onSaveNote,
  onSaveTimelog,
  onRefresh,
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showFullDay, setShowFullDay] = useState(false); // false: 07:00-22:00, true: 00:00-23:00

  // Quick Add State for Hourly Slots
  const [activeSlotHour, setActiveSlotHour] = useState<number | null>(null);
  const [addType, setAddType] = useState<'note' | 'timelog'>('note');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickTags, setQuickTags] = useState('');
  const [quickDuration, setQuickDuration] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine active target date for Daily View
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const activeDateStr = selectedDate || todayStr;
  const activeDateObj = parseISO(activeDateStr);

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

  // Hours range calculation
  const startHour = showFullDay ? 0 : 7;
  const endHour = showFullDay ? 23 : 22;
  const hoursList = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  // Helper to check if an item belongs to a specific hour on activeDateStr
  const getItemHour = (dateOrTimeStr?: string): number | null => {
    if (!dateOrTimeStr) return null;
    if (dateOrTimeStr.includes('T')) {
      const parsed = parseISO(dateOrTimeStr);
      return isNaN(parsed.getTime()) ? null : parsed.getHours();
    }
    if (dateOrTimeStr.includes(':')) {
      const parts = dateOrTimeStr.split(':');
      const h = parseInt(parts[0], 10);
      return isNaN(h) ? null : h;
    }
    return null;
  };

  // Quick Slot Save Handler
  const handleQuickAddSubmit = async (hour: number) => {
    if (!quickTitle.trim()) return;
    setIsSubmitting(true);

    const hourStr = String(hour).padStart(2, '0');
    const nextHourStr = String((hour + 1) % 24).padStart(2, '0');
    const startTimeStr = `${hourStr}:00`;
    const endTimeStr = `${nextHourStr}:00`;
    const tagArray = quickTags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    try {
      if (addType === 'note') {
        if (onSaveNote) {
          await onSaveNote({
            title: quickTitle.trim(),
            content: `Saatlik Plan (${startTimeStr} - ${endTimeStr})`,
            noteType: 'note',
            startTime: startTimeStr,
            endTime: endTimeStr,
            date: activeDateStr,
            tags: tagArray,
          });
        }
      } else {
        // Timelog Creation
        if (onSaveTimelog) {
          await onSaveTimelog({
            cardTitle: quickTitle.trim(),
            description: `Saatlik Çalışma Kaydı (${startTimeStr})`,
            startTime: `${activeDateStr}T${startTimeStr}:00`,
            endTime: `${activeDateStr}T${endTimeStr}:00`,
            durationMinutes: quickDuration,
            tags: tagArray,
          });
        }
        // Save as timelog note for cross-sync
        if (onSaveNote) {
          await onSaveNote({
            title: quickTitle.trim(),
            content: `Zaman Kaydı (${quickDuration} dk)`,
            noteType: 'timelog',
            startTime: startTimeStr,
            endTime: endTimeStr,
            durationMinutes: quickDuration,
            date: activeDateStr,
            tags: tagArray,
          });
        }
      }

      if (onRefresh) onRefresh();
      // Reset Quick Add Form
      setQuickTitle('');
      setQuickTags('');
      setActiveSlotHour(null);
    } catch (err) {
      console.error('Quick slot save error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col gap-5">
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
                      isSelected ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'
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
            const isCurrentMonthDay = format(day, 'yyyy-MM') === format(currentMonth, 'yyyy-MM');

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
            className="text-[10px] font-bold bg-white text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            Tüm Notlar
          </button>
        </div>
      )}

      {/* 3. GÜNLÜK GÖRÜNÜM VE SAATLİK PLANLAMA (DAILY HOURLY PLANNER) */}
      <div className="border-t border-slate-200/80 pt-4 space-y-3">
        {/* Daily Section Header & Date Controls */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              Günlük Görünüm & Saatlik Plan
            </h4>

            <button
              onClick={() => setShowFullDay(!showFullDay)}
              className="text-[10px] font-semibold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            >
              {showFullDay ? '07:00-22:00' : 'Tüm Gün (24 Saat)'}
            </button>
          </div>

          {/* Active Date Navigation Header Bar */}
          <div className="bg-slate-900 text-white p-2.5 rounded-xl flex items-center justify-between text-xs shadow-xs">
            <button
              onClick={() => {
                const prevDate = format(subDays(activeDateObj, 1), 'yyyy-MM-dd');
                onSelectDate(prevDate);
              }}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Önceki Gün"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 text-center">
              <span className="font-bold text-slate-100">
                {format(activeDateObj, 'd MMMM yyyy, EEEE', { locale: tr })}
              </span>
              {isToday(activeDateObj) && (
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[9px] font-extrabold rounded-full border border-emerald-500/30">
                  Bugün
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!isToday(activeDateObj) && (
                <button
                  onClick={() => onSelectDate(todayStr)}
                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                >
                  Bugün
                </button>
              )}
              <button
                onClick={() => {
                  const nextDate = format(addDays(activeDateObj, 1), 'yyyy-MM-dd');
                  onSelectDate(nextDate);
                }}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Sonraki Gün"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Hourly Timeline Slots Container */}
        <div className="max-h-[500px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
          {hoursList.map((hour) => {
            const hourStr = String(hour).padStart(2, '0');
            const isCurrentHourSlot = isToday(activeDateObj) && new Date().getHours() === hour;

            // Filter items for this slot
            const slotNotes = notes.filter((n) => {
              if (n.date !== activeDateStr) return false;
              if (n.startTime) {
                const h = getItemHour(n.startTime);
                return h === hour;
              }
              // If no startTime, fallback to createdAt hour on that day
              if (n.createdAt) {
                const h = getItemHour(n.createdAt);
                return h === hour;
              }
              return false;
            });

            const slotTimelogs = timeLogs.filter((tl) => {
              if (!tl.startTime || !tl.startTime.startsWith(activeDateStr)) return false;
              const h = getItemHour(tl.startTime);
              return h === hour;
            });

            const slotEvents = events.filter((e) => {
              if (!e.start || !e.start.startsWith(activeDateStr)) return false;
              const h = getItemHour(e.start);
              return h === hour;
            });

            const totalItemsCount = slotNotes.length + slotTimelogs.length + slotEvents.length;
            const isAddingToThisSlot = activeSlotHour === hour;

            return (
              <div
                key={hour}
                className={`p-2 rounded-xl border transition-all ${
                  isCurrentHourSlot
                    ? 'bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-400/30'
                    : totalItemsCount > 0
                    ? 'bg-slate-50/90 border-slate-200'
                    : 'bg-white border-slate-100 hover:border-slate-200'
                }`}
              >
                {/* Slot Header: Hour Label + Current Badge + Quick Add Button */}
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md text-[11px]">
                      {hourStr}:00
                    </span>
                    {isCurrentHourSlot && (
                      <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.2 rounded-full">
                        Şu An
                      </span>
                    )}
                  </div>

                  {!isAddingToThisSlot && (
                    <button
                      onClick={() => {
                        setActiveSlotHour(hour);
                        setQuickTitle('');
                        setQuickTags('');
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-100 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Slot'a Ekle
                    </button>
                  )}
                </div>

                {/* Display Existing Items in this Slot */}
                {totalItemsCount > 0 ? (
                  <div className="space-y-1.5 mt-1.5">
                    {/* Notes in slot */}
                    {slotNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{note.title}</span>
                          {note.noteType && note.noteType !== 'note' && (
                            <span className="px-1 py-0.2 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded">
                              {note.noteType}
                            </span>
                          )}
                        </div>

                        {note.tags && note.tags.length > 0 && (
                          <div className="flex gap-1 shrink-0">
                            {note.tags.slice(0, 2).map((t) => (
                              <span key={t} className="text-[9px] text-slate-500 bg-slate-100 px-1 rounded">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Timelogs in slot */}
                    {slotTimelogs.map((tl) => (
                      <div
                        key={tl.id}
                        className="p-1.5 bg-amber-50/80 border border-amber-200/80 rounded-lg text-xs shadow-2xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Timer className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-semibold text-amber-900 truncate">
                            {tl.cardTitle || tl.projectName || 'Zaman Kaydı'}
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded shrink-0">
                          {tl.durationMinutes} dk
                        </span>
                      </div>
                    ))}

                    {/* Events in slot */}
                    {slotEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs shadow-2xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-semibold text-blue-900 truncate">{ev.summary}</span>
                        </div>
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1 rounded shrink-0">
                          Etkinlik
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  !isAddingToThisSlot && (
                    <div className="text-[10px] text-slate-400 italic py-0.5">
                      Bu saat diliminde not veya kayit yok.
                    </div>
                  )
                )}

                {/* Inline Quick Add Form inside Slot */}
                {isAddingToThisSlot && (
                  <div className="mt-2 p-2.5 bg-slate-900 text-white rounded-xl space-y-2 border border-slate-800 shadow-md">
                    {/* Type Selector Tabs */}
                    <div className="flex items-center justify-between">
                      <div className="flex bg-slate-800 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setAddType('note')}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                            addType === 'note' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          📝 Hızlı Not
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddType('timelog')}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                            addType === 'timelog' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          ⏱️ Timelog
                        </button>
                      </div>

                      <button
                        onClick={() => setActiveSlotHour(null)}
                        className="text-slate-400 hover:text-white p-0.5 rounded-md cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Title Input */}
                    <input
                      type="text"
                      placeholder={addType === 'note' ? 'Not başlığı...' : 'Yapılan çalışma / görev başlığı...'}
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      autoFocus
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
                    />

                    {/* Duration Picker for Timelog */}
                    {addType === 'timelog' && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-bold mr-1">Süre:</span>
                        {[15, 30, 45, 60].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setQuickDuration(mins)}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition-colors cursor-pointer ${
                              quickDuration === mins
                                ? 'bg-amber-500 text-slate-950 border-amber-400'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {mins} dk
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Tags Input */}
                    <input
                      type="text"
                      placeholder="Etiketler (örn: proje, toplantı)"
                      value={quickTags}
                      onChange={(e) => setQuickTags(e.target.value)}
                      className="w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveSlotHour(null)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting || !quickTitle.trim()}
                        onClick={() => handleQuickAddSubmit(hour)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Check className="w-3 h-3" />
                        {isSubmitting ? 'Kaydediliyor...' : 'Slot\'a Kaydet'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
