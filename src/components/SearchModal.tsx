import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  Tag,
  Calendar,
  MapPin,
  Clock,
  ArrowUpDown,
  Filter,
  Check,
  Pin,
  Trash2,
  Edit3,
  CalendarDays,
  Compass,
  FileText,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { NoteItem, NoteType } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: NoteItem[];
  noteTypes?: NoteType[];
  onSelectNote: (note: NoteItem) => void;
  onDeleteNote?: (id: string) => void;
  onTogglePin?: (id: string) => void;
}

// Days of week mapping (Turkish)
const TR_DAYS = [
  { index: 1, name: 'Pazartesi', short: 'Pzt' },
  { index: 2, name: 'Salı', short: 'Sal' },
  { index: 3, name: 'Çarşamba', short: 'Çar' },
  { index: 4, name: 'Perşembe', short: 'Per' },
  { index: 5, name: 'Cuma', short: 'Cum' },
  { index: 6, name: 'Cumartesi', short: 'Cmt' },
  { index: 0, name: 'Pazar', short: 'Paz' },
];

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  notes = [],
  noteTypes = [],
  onSelectNote,
  onDeleteNote,
  onTogglePin,
}) => {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null); // 0..6
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD
  const [isCurrentMonthOnly, setIsCurrentMonthOnly] = useState<boolean>(false);
  const [isWeekOnly, setIsWeekOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'updated'>('newest');

  // Week Navigation State (0 = Current Week, -1 = Prev Week, +1 = Next Week)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Month Navigation State (Default = Current Month & Year)
  const now = new Date();
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth()); // 0..11

  // Helper to format date in Turkish
  const formatDateTR = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        weekday: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to get day of week index (0=Pazar, 1=Pazartesi, etc.)
  const getDayOfWeek = (dateStr: string): number | null => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.getDay();
    } catch {
      return null;
    }
  };

  // --- WEEK CALCULATION HELPERS ---
  const { weekMonday, weekSunday } = useMemo(() => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun, 1=Mon, 2=Tue...
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { weekMonday: monday, weekSunday: sunday };
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return 'Bu Hafta';
    if (weekOffset === -1) return 'Geçen Hafta';
    if (weekOffset === 1) return 'Gelecek Hafta';

    const mStr = weekMonday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    const sStr = weekSunday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    return `${mStr} - ${sStr}`;
  }, [weekOffset, weekMonday, weekSunday]);

  const weekRangeSubLabel = useMemo(() => {
    const mStr = weekMonday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    const sStr = weekSunday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${mStr} - ${sStr}`;
  }, [weekMonday, weekSunday]);

  // Exact YYYY-MM-DD for a day of week in current weekOffset
  const getExactDateForDayInWeek = (dayIndex: number) => {
    const offsetFromMonday = dayIndex === 0 ? 6 : dayIndex - 1;
    const d = new Date(weekMonday);
    d.setDate(weekMonday.getDate() + offsetFromMonday);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  // --- MONTH CALCULATION HELPERS ---
  const selectedMonthName = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  }, [viewYear, viewMonth]);

  const daysInViewMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  // 1. Tag Counts across all notes
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((n) => {
      (n.tags || []).forEach((tag) => {
        if (tag && typeof tag === 'string' && tag.trim()) {
          const cleaned = tag.trim().toLowerCase();
          counts[cleaned] = (counts[cleaned] || 0) + 1;
        }
      });
    });
    return counts;
  }, [notes]);

  // 2. Days of Week Counts for the selected Week (weekOffset)
  const dayOfWeekCounts = useMemo(() => {
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const mondayTime = weekMonday.getTime();
    const sundayTime = weekSunday.getTime();

    notes.forEach((n) => {
      const d = new Date(n.createdAt || n.date);
      if (!isNaN(d.getTime())) {
        const time = d.getTime();
        if (time >= mondayTime && time <= sundayTime) {
          const dow = d.getDay();
          counts[dow] = (counts[dow] || 0) + 1;
        }
      }
    });
    return counts;
  }, [notes, weekMonday, weekSunday]);

  const weekTotalNotes = useMemo(() => {
    return Object.values(dayOfWeekCounts).reduce((a, b) => a + b, 0);
  }, [dayOfWeekCounts]);

  // 3. Month Stats & Day Breakdown for selected Month (viewYear, viewMonth)
  const monthStats = useMemo(() => {
    let monthTotal = 0;
    const daysMap: Record<number, number> = {}; // dayOfMonth -> count

    notes.forEach((n) => {
      const d = new Date(n.createdAt || n.date);
      if (!isNaN(d.getTime())) {
        if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
          monthTotal++;
          const dayNum = d.getDate();
          daysMap[dayNum] = (daysMap[dayNum] || 0) + 1;
        }
      }
    });

    return { monthTotal, daysMap };
  }, [notes, viewYear, viewMonth]);

  // 4. Location Counts across all notes
  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((n) => {
      const locName = n.location?.name;
      if (locName && locName.trim()) {
        const cleaned = locName.trim();
        counts[cleaned] = (counts[cleaned] || 0) + 1;
      }
    });
    return counts;
  }, [notes]);

  // Available Note Types Options
  const typeOptions = useMemo(() => {
    const map = new Map<string, string>();
    map.set('note', 'Standart Not');
    map.set('timelog', 'Timelog');
    noteTypes.forEach((t) => map.set(t.id, t.name));
    notes.forEach((n) => {
      if (n.noteType && !map.has(n.noteType)) {
        map.set(n.noteType, n.noteType);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [noteTypes, notes]);

  // Filtered Notes (works for any note type: note, timelog, custom)
  const filteredNotes = useMemo(() => {
    const mondayTime = weekMonday.getTime();
    const sundayTime = weekSunday.getTime();

    return notes.filter((n) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesTitle = (n.title || '').toLowerCase().includes(term);
        const matchesContent = (n.content || '').toLowerCase().includes(term);
        const matchesLocation = (n.location?.name || '').toLowerCase().includes(term);
        const matchesProject = (n.projectName || '').toLowerCase().includes(term);
        const matchesCard = (n.cardTitle || '').toLowerCase().includes(term);
        const matchesTags = (n.tags || []).some((t) => typeof t === 'string' && t.toLowerCase().includes(term));
        if (!matchesTitle && !matchesContent && !matchesLocation && !matchesProject && !matchesCard && !matchesTags) {
          return false;
        }
      }

      // Note Type Filter
      if (selectedType !== 'all') {
        const nType = n.noteType || 'note';
        if (nType !== selectedType) return false;
      }

      // Tag Filter
      if (selectedTag) {
        const hasTag = (n.tags || []).some((t) => typeof t === 'string' && t.trim().toLowerCase() === selectedTag.toLowerCase());
        if (!hasTag) return false;
      }

      // Day of Week Filter
      if (selectedDayOfWeek !== null) {
        const dow = getDayOfWeek(n.createdAt || n.date);
        if (dow !== selectedDayOfWeek) return false;
      }

      // Location Filter
      if (selectedLocation) {
        if (n.location?.name !== selectedLocation) return false;
      }

      // Exact Date Filter
      if (selectedDate) {
        const nDateStr = n.date || (n.createdAt ? n.createdAt.split('T')[0] : '');
        if (nDateStr !== selectedDate) return false;
      }

      // Selected Week Only Filter
      if (isWeekOnly) {
        const d = new Date(n.createdAt || n.date);
        if (isNaN(d.getTime())) return false;
        const time = d.getTime();
        if (time < mondayTime || time > sundayTime) return false;
      }

      // Selected Month Only Filter
      if (isCurrentMonthOnly) {
        const d = new Date(n.createdAt || n.date);
        if (isNaN(d.getTime()) || d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) {
          return false;
        }
      }

      return true;
    });
  }, [
    notes,
    searchTerm,
    selectedType,
    selectedTag,
    selectedDayOfWeek,
    selectedLocation,
    selectedDate,
    isWeekOnly,
    weekMonday,
    weekSunday,
    isCurrentMonthOnly,
    viewYear,
    viewMonth,
  ]);

  // Sorted Notes (Default: Newest to Oldest)
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      switch (sortBy) {
        case 'oldest': {
          const timeA = new Date(a.date || a.createdAt || 0).getTime();
          const timeB = new Date(b.date || b.createdAt || 0).getTime();
          return timeA - timeB;
        }
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '', 'tr');
        case 'title-desc':
          return (b.title || '').localeCompare(a.title || '', 'tr');
        case 'updated': {
          const timeA = new Date(a.updatedAt || a.date || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.date || b.createdAt || 0).getTime();
          return timeB - timeA;
        }
        case 'newest':
        default: {
          const timeA = new Date(a.date || a.createdAt || 0).getTime();
          const timeB = new Date(b.date || b.createdAt || 0).getTime();
          return timeB - timeA;
        }
      }
    });
  }, [filteredNotes, sortBy]);

  // Lazy Loading State (10 items initially)
  const [visibleCount, setVisibleCount] = useState<number>(10);

  // Reset visibleCount whenever search or filter parameters change
  useEffect(() => {
    setVisibleCount(10);
  }, [
    searchTerm,
    selectedType,
    selectedTag,
    selectedDayOfWeek,
    selectedLocation,
    selectedDate,
    isWeekOnly,
    isCurrentMonthOnly,
    weekOffset,
    viewYear,
    viewMonth,
    sortBy,
    notes.length,
  ]);

  const displayedNotes = useMemo(() => {
    return sortedNotes.slice(0, visibleCount);
  }, [sortedNotes, visibleCount]);

  // Clear all filters handler
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedTag(null);
    setSelectedDayOfWeek(null);
    setSelectedLocation(null);
    setSelectedDate(null);
    setIsWeekOnly(false);
    setIsCurrentMonthOnly(false);
    setWeekOffset(0);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSortBy('newest');
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    selectedType !== 'all' ||
    selectedTag !== null ||
    selectedDayOfWeek !== null ||
    selectedLocation !== null ||
    selectedDate !== null ||
    isWeekOnly ||
    isCurrentMonthOnly ||
    weekOffset !== 0 ||
    viewYear !== now.getFullYear() ||
    viewMonth !== now.getMonth() ||
    sortBy !== 'newest';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* HEADER BAR */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 rounded-2xl shadow-md">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Gelişmiş Not & İçerik Arama
                <span className="px-2.5 py-0.5 bg-indigo-950 border border-indigo-500/30 text-indigo-300 text-xs rounded-full font-bold">
                  {notes.length} Not Kaydı
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Notlar, timeloglar, etiketler, haftanın günleri ve konum bilgileri arasında anında filtreleme yapın.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SEARCH INPUT BAR */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative flex-1 min-w-[280px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4 text-indigo-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Başlık, metin içeriği, proje, kart veya konum ara..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Filtreleri Temizle</span>
            </button>
          )}
        </div>

        {/* MAIN BODY: 2 COLUMN LAYOUT (LEFT: RESULTS & SORT, RIGHT: SIDEBAR) */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT AREA: RESULTS & TOP SORT BAR */}
          <div className="flex-1 min-w-0 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 overflow-hidden">
            
            {/* TOP SORTING & FILTER STATUS BAR */}
            <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
              
              {/* Active Filter Badges */}
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="text-slate-400 font-bold flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sonuçlar ({sortedNotes.length}):</span>
                </span>

                {selectedType !== 'all' && (
                  <span className="px-2 py-0.5 bg-indigo-900/80 text-indigo-200 border border-indigo-700 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                    Tür: {typeOptions.find((t) => t.id === selectedType)?.name || selectedType}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedType('all')} />
                  </span>
                )}

                {selectedTag && (
                  <span className="px-2 py-0.5 bg-emerald-900/80 text-emerald-200 border border-emerald-700 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                    #{selectedTag}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedTag(null)} />
                  </span>
                )}

                {selectedDayOfWeek !== null && (
                  <span className="px-2 py-0.5 bg-purple-900/80 text-purple-200 border border-purple-700 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                    Gün: {TR_DAYS.find((d) => d.index === selectedDayOfWeek)?.name}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedDayOfWeek(null)} />
                  </span>
                )}

                {selectedLocation && (
                  <span className="px-2 py-0.5 bg-amber-900/80 text-amber-200 border border-amber-700 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                    📍 {selectedLocation}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedLocation(null)} />
                  </span>
                )}

                {isWeekOnly && (
                  <span className="px-2 py-0.5 bg-purple-900/80 text-purple-200 border border-purple-700 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                    📅 Hafta: {weekLabel}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setIsWeekOnly(false)} />
                  </span>
                )}

                {isCurrentMonthOnly && (
                  <span className="px-2 py-0.5 bg-sky-900/80 text-sky-200 border border-sky-700 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                    📅 Ay: {selectedMonthName}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setIsCurrentMonthOnly(false)} />
                  </span>
                )}

                {selectedDate && (
                  <span className="px-2 py-0.5 bg-cyan-900/80 text-cyan-200 border border-cyan-700 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                    Tarih: {selectedDate}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedDate(null)} />
                  </span>
                )}
              </div>

              {/* SORTING DROPDOWN */}
              <div className="flex items-center gap-2 ml-auto shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400 font-bold hidden sm:inline">Sıralama:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-900 text-white border border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="newest">📅 En Yeni → En Eski (Varsayılan)</option>
                  <option value="oldest">📅 En Eski → En Yeni</option>
                  <option value="title-asc">🔤 Başlığa Göre (A-Z)</option>
                  <option value="title-desc">🔤 Başlığa Göre (Z-A)</option>
                  <option value="updated">⚡ Son Güncellenme Tarihi</option>
                </select>
              </div>
            </div>

            {/* RESULTS LIST */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {sortedNotes.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                  <FileText className="w-12 h-12 text-slate-600 mb-3" />
                  <h3 className="text-sm font-bold text-slate-300">Arama kriterlerine uygun not bulunamadı</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Filtrelerinizi değiştirerek veya "Filtreleri Temizle" butonuna basarak tüm notları görüntüleyebilirsiniz.
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Tüm Filtreleri Temizle
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {displayedNotes.map((note) => {
                      const isTimelog = note.noteType === 'timelog' || (note.durationMinutes && note.durationMinutes > 0);
                      const formattedDate = formatDateTR(note.date || note.createdAt);

                      return (
                        <div
                          key={note.id}
                          onClick={() => onSelectNote(note)}
                          className={`group p-4 bg-slate-950/60 hover:bg-slate-800/90 border rounded-2xl transition-all cursor-pointer relative flex flex-col justify-between space-y-3 shadow-xs hover:shadow-lg ${
                            note.pinned
                              ? 'border-indigo-500/60 bg-indigo-950/20'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* Note Top Bar */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {/* Type Badge */}
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                    isTimelog
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                      : 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                                  }`}
                                >
                                  {isTimelog ? '⏱️ Timelog' : '📝 ' + (note.noteType || 'Not')}
                                </span>

                                {/* Pinned Badge */}
                                {note.pinned && (
                                  <span className="px-1.5 py-0.5 bg-indigo-600/30 text-indigo-300 text-[10px] font-bold rounded-md border border-indigo-500/40 flex items-center gap-0.5">
                                    <Pin className="w-2.5 h-2.5 fill-indigo-400" /> İğneli
                                  </span>
                                )}

                                {/* Duration if Timelog */}
                                {note.durationMinutes ? (
                                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {note.durationMinutes} dk
                                  </span>
                                ) : null}
                              </div>

                              <h4 className="text-sm font-extrabold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                                {note.title || 'Başlıksız Not'}
                              </h4>
                            </div>

                            {/* Quick Pin / Delete Actions */}
                            <div
                              className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {onTogglePin && (
                                <button
                                  type="button"
                                  onClick={() => onTogglePin(note.id)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    note.pinned
                                      ? 'text-indigo-400 bg-indigo-950/60'
                                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                  }`}
                                  title={note.pinned ? 'İğneyi Kaldır' : 'Üste İğnele'}
                                >
                                  <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-indigo-400' : ''}`} />
                                </button>
                              )}
                              {onDeleteNote && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteNote(note.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                                  title="Notu Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Content Preview */}
                          {note.content && (
                            <p className="text-xs text-slate-400 line-clamp-3 font-normal leading-relaxed">
                              {note.content}
                            </p>
                          )}

                          {/* Bottom Metadata: Tags, Location, Project & Date */}
                          <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-400">
                            {/* Tags */}
                            {note.tags && note.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {note.tags.map((t, i) => (
                                  <span
                                    key={i}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTag(t.trim());
                                    }}
                                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-indigo-900 text-slate-300 hover:text-indigo-200 rounded-md text-[10px] font-semibold transition-colors cursor-pointer"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                              {/* Location */}
                              {note.location?.name ? (
                                <span className="flex items-center gap-1 text-amber-400/90 font-medium truncate max-w-[180px]">
                                  <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                                  {note.location.name}
                                </span>
                              ) : (
                                <span />
                              )}

                              {/* Date */}
                              <span className="flex items-center gap-1 text-slate-400 font-mono">
                                <Calendar className="w-3 h-3 text-indigo-400" />
                                {formattedDate}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Devamını Yükle Button */}
                  {visibleCount < sortedNotes.length && (
                    <div className="pt-2 pb-2 flex flex-col items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => prev + 10)}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 border border-indigo-400/30"
                      >
                        <ChevronDown className="w-4 h-4" />
                        <span>Devamını Yükle (+10)</span>
                      </button>
                      <span className="text-[11px] font-medium text-slate-400">
                        Gösterilen: {displayedNotes.length} / {sortedNotes.length} Not
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR: MEVCUT ETİKETLER, HAFTANIN GÜNLERİ, GÜNCEL AY GÖRÜNÜMÜ, LOKASYONLAR */}
          <div className="w-full lg:w-80 bg-slate-900/95 p-4 overflow-y-auto space-y-5 border-t lg:border-t-0 border-slate-800 shrink-0 divide-y divide-slate-800/80">
            
            {/* 1. SECTION: MEVCUT ETİKETLER */}
            <div className="pt-1 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-black text-slate-200">
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <Tag className="w-4 h-4" />
                  <span>Mevcut Etiketler</span>
                </span>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold">
                  {Object.keys(tagCounts).length} Etiket
                </span>
              </div>

              {Object.keys(tagCounts).length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">Etiket bulunamadı.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(tagCounts).map(([tag, count]) => {
                    const isSelected = selectedTag?.toLowerCase() === tag.toLowerCase();
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTag(isSelected ? null : tag)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span>#{tag}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            isSelected ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. SECTION: HAFTANIN GÜNLERİ */}
            <div className="pt-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-black text-slate-200">
                <span className="flex items-center gap-1.5 text-purple-400">
                  <CalendarDays className="w-4 h-4" />
                  <span>Haftanın Günleri</span>
                </span>

                {/* Prev / Next Week Controls */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setWeekOffset((prev) => prev - 1)}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Önceki Hafta"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-[10px] font-black text-purple-300 px-1 min-w-[65px] text-center truncate">
                    {weekLabel}
                  </span>

                  <button
                    type="button"
                    onClick={() => setWeekOffset((prev) => prev + 1)}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Sonraki Hafta"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-0.5">
                <span>{weekRangeSubLabel}</span>
                {weekOffset !== 0 && (
                  <button
                    type="button"
                    onClick={() => setWeekOffset(0)}
                    className="text-purple-400 hover:underline font-bold cursor-pointer"
                  >
                    Bu Hafta
                  </button>
                )}
              </div>

              {/* Toggle Week Filter Button */}
              <button
                type="button"
                onClick={() => {
                  setIsWeekOnly(!isWeekOnly);
                  setSelectedDate(null);
                }}
                className={`w-full p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                  isWeekOnly
                    ? 'bg-purple-600 text-white border-purple-500 shadow-md ring-2 ring-purple-500/30'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-purple-400" />
                  <span>Sadece Bu Haftaki Notlar</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                    isWeekOnly ? 'bg-purple-800 text-white' : 'bg-slate-800 text-purple-300'
                  }`}
                >
                  {weekTotalNotes} Not
                </span>
              </button>

              {/* Days List */}
              <div className="space-y-1">
                {TR_DAYS.map((day) => {
                  const count = dayOfWeekCounts[day.index] || 0;
                  const exactDate = getExactDateForDayInWeek(day.index);
                  const isDateSelected = selectedDate === exactDate;
                  const isDowSelected = selectedDayOfWeek === day.index;
                  const isSelected = isDateSelected || isDowSelected;

                  return (
                    <div
                      key={day.index}
                      onClick={() => {
                        if (isDateSelected) {
                          setSelectedDate(null);
                        } else {
                          setSelectedDate(exactDate);
                          setIsWeekOnly(false);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                        isSelected
                          ? 'bg-purple-900/90 text-white border-purple-500 shadow-md'
                          : 'bg-slate-950 hover:bg-slate-800/80 text-slate-300 border-slate-800/80'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            count > 0 ? 'bg-purple-400' : 'bg-slate-700'
                          }`}
                        />
                        <span>{day.name}</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({exactDate.split('-').slice(1).reverse().join('/')})
                        </span>
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                          isSelected
                            ? 'bg-purple-700 text-white'
                            : count > 0
                            ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {count} Not
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. SECTION: GÜNCEL AYIN GÖRÜNÜMÜ */}
            <div className="pt-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-black text-slate-200">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <Calendar className="w-4 h-4" />
                  <span>Ay Görünümü</span>
                </span>

                {/* Prev / Next Month Controls */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (viewMonth === 0) {
                        setViewMonth(11);
                        setViewYear((y) => y - 1);
                      } else {
                        setViewMonth((m) => m - 1);
                      }
                    }}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Önceki Ay"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-[10px] font-black text-sky-300 px-1 min-w-[75px] text-center capitalize truncate">
                    {selectedMonthName}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (viewMonth === 11) {
                        setViewMonth(0);
                        setViewYear((y) => y + 1);
                      } else {
                        setViewMonth((m) => m + 1);
                      }
                    }}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Sonraki Ay"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-0.5">
                <span className="capitalize">{selectedMonthName}</span>
                {(viewYear !== now.getFullYear() || viewMonth !== now.getMonth()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setViewYear(now.getFullYear());
                      setViewMonth(now.getMonth());
                    }}
                    className="text-sky-400 hover:underline font-bold cursor-pointer"
                  >
                    Güncel Ay
                  </button>
                )}
              </div>

              {/* Toggle Current Month Filter */}
              <button
                type="button"
                onClick={() => {
                  setIsCurrentMonthOnly(!isCurrentMonthOnly);
                  setSelectedDate(null);
                }}
                className={`w-full p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                  isCurrentMonthOnly
                    ? 'bg-sky-600 text-white border-sky-500 shadow-md ring-2 ring-sky-500/30'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span>Sadece Bu Ayki Notlar</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                    isCurrentMonthOnly ? 'bg-sky-800 text-white' : 'bg-slate-800 text-sky-300'
                  }`}
                >
                  {monthStats.monthTotal} Not
                </span>
              </button>

              {/* Mini Calendar Days Grid for Selected Month */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 space-y-2">
                <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                  <span className="capitalize">{selectedMonthName} Günleri:</span>
                  <span>Tıkla & Filtrele</span>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {Array.from({ length: daysInViewMonth }, (_, i) => i + 1).map((dayNum) => {
                    const count = monthStats.daysMap[dayNum] || 0;
                    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(
                      dayNum
                    ).padStart(2, '0')}`;
                    const isSelected = selectedDate === dateStr;

                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedDate(null);
                          } else {
                            setSelectedDate(dateStr);
                            setIsCurrentMonthOnly(false);
                          }
                        }}
                        className={`p-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer relative flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-sky-500 text-white ring-2 ring-sky-400 shadow-md'
                            : count > 0
                            ? 'bg-sky-950/80 text-sky-200 border border-sky-700/60 hover:bg-sky-900'
                            : 'bg-slate-900 text-slate-500 hover:bg-slate-800'
                        }`}
                        title={`${dayNum} ${selectedMonthName}: ${count} not`}
                      >
                        <span>{dayNum}</span>
                        {count > 0 && (
                          <span className="w-1.5 h-1.5 bg-sky-400 rounded-full mt-0.5 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. SECTION: LOKASYON ETİKETLERİ */}
            <div className="pt-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-black text-slate-200">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <MapPin className="w-4 h-4" />
                  <span>Lokasyon Etiketleri</span>
                </span>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold">
                  {Object.keys(locationCounts).length} Lokasyon
                </span>
              </div>

              {Object.keys(locationCounts).length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">Kayıtlı konumlu not bulunamadı.</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {Object.entries(locationCounts).map(([locName, count]) => {
                    const isSelected = selectedLocation === locName;

                    return (
                      <div
                        key={locName}
                        onClick={() => setSelectedLocation(isSelected ? null : locName)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                            : 'bg-slate-950 hover:bg-slate-800/80 text-slate-300 border-slate-800/80'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">{locName}</span>
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 ${
                            isSelected ? 'bg-amber-800 text-white' : 'bg-slate-800 text-amber-300'
                          }`}
                        >
                          {count} Not
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
