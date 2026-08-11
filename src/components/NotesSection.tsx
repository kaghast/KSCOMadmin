import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Pin,
  MapPin,
  User,
  Tag,
  Calendar,
  Edit2,
  Trash2,
  BookOpen,
  Mail,
  Calendar as CalendarIcon,
  Filter,
  ArrowUpDown,
  Layers,
  X,
  ChevronDown,
} from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';
import { NoteItem, ContactItem, NoteLocation, EmailItem, CalendarEvent, TimeLog, NoteType } from '../types';
import { NoteCalendarSidebar } from './NoteCalendarSidebar';

interface Props {
  notes: NoteItem[];
  contacts: ContactItem[];
  emails?: EmailItem[];
  events?: CalendarEvent[];
  locations: NoteLocation[];
  timeLogs?: TimeLog[];
  noteTypes?: NoteType[];
  onAddNote: () => void;
  onEditNote: (note: NoteItem) => void;
  onDeleteNote: (id: string) => Promise<void>;
  onTogglePin: (note: NoteItem) => Promise<void>;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenMapForLocation?: (loc: NoteLocation) => void;
  onSaveNote?: (data: any) => Promise<void>;
  onSaveTimelog?: (data: any) => Promise<void>;
  initialSearchTerm?: string;
}

export const NotesSection: React.FC<Props> = ({
  notes,
  contacts,
  emails = [],
  events = [],
  locations,
  timeLogs = [],
  noteTypes = [],
  onAddNote,
  onEditNote,
  onDeleteNote,
  onTogglePin,
  onRefresh,
  isLoading,
  onOpenMapForLocation,
  onSaveNote,
  onSaveTimelog,
  initialSearchTerm = '',
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  useEffect(() => {
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'updated'>('newest');
  const [visibleCount, setVisibleCount] = useState<number>(10);

  // Reset lazy load limit on filter/search changes
  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, selectedTagFilter, selectedDateFilter, selectedTypeFilter, sortBy, notes.length]);

  // Helper to get printable name for note type
  const getNoteTypeName = (typeId?: string) => {
    if (!typeId || typeId === 'note') return 'Standart Not';
    if (typeId === 'timelog') return 'Timelog';
    const found = noteTypes.find((t) => t.id === typeId);
    return found ? found.name : typeId;
  };

  // Collect available note type options (including timelog)
  const availableTypeOptions = React.useMemo(() => {
    const optionsMap = new Map<string, string>();
    optionsMap.set('note', 'Standart Not');

    // Add custom types from noteTypes prop
    noteTypes.forEach((nt) => {
      optionsMap.set(nt.id, nt.name);
    });

    // Add any types present in notes
    notes.forEach((n) => {
      if (n.noteType && !optionsMap.has(n.noteType)) {
        optionsMap.set(n.noteType, getNoteTypeName(n.noteType));
      }
    });

    return Array.from(optionsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [noteTypes, notes]);

  // Extract all unique tags across notes and timelogs
  const allTags = Array.from(
    new Set(
      [
        ...notes.flatMap((n) => n.tags || []),
        ...timeLogs.flatMap((tl) => tl.tags || []),
      ].filter((t) => t && typeof t === 'string' && t.trim())
    )
  );

  // Filter notes based on search, type, tag, date
  const filteredNotes = notes.filter((n) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      n.title.toLowerCase().includes(term) ||
      n.content.toLowerCase().includes(term) ||
      (n.contactDisplayName && n.contactDisplayName.toLowerCase().includes(term)) ||
      (n.contacts && n.contacts.some((c) => c.displayName.toLowerCase().includes(term))) ||
      (n.linkedEmails && n.linkedEmails.some((e) => e.subject.toLowerCase().includes(term))) ||
      (n.linkedEvents && n.linkedEvents.some((ev) => ev.summary.toLowerCase().includes(term))) ||
      (n.location && n.location.name.toLowerCase().includes(term));

    const matchesType =
      selectedTypeFilter === 'all' ||
      (selectedTypeFilter === 'note' && (!n.noteType || n.noteType === 'note')) ||
      n.noteType === selectedTypeFilter;

    const matchesTag = !selectedTagFilter || (n.tags && n.tags.includes(selectedTagFilter));
    const matchesDate = !selectedDateFilter || n.date === selectedDateFilter;

    return matchesSearch && matchesType && matchesTag && matchesDate;
  });

  // Sort notes: pinned first, then selected sort order
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    switch (sortBy) {
      case 'oldest':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'title-asc':
        return a.title.localeCompare(b.title, 'tr');
      case 'title-desc':
        return b.title.localeCompare(a.title, 'tr');
      case 'updated': {
        const timeA = (a as any).updatedAt ? new Date((a as any).updatedAt).getTime() : new Date(a.date).getTime();
        const timeB = (b as any).updatedAt ? new Date((b as any).updatedAt).getTime() : new Date(b.date).getTime();
        return timeB - timeA;
      }
      case 'newest':
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  const displayedNotes = sortedNotes.slice(0, visibleCount);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
      {/* Top Main Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-2xl shadow-2xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Not Yönetim Sistemi</h2>
            <p className="text-xs text-slate-500">
              Kişi bağlantılı, konum haritalı, ilişkili mail & takvim etkinlikli Markdown notlar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            title="Yenile"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button
            onClick={onAddNote}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Yeni Not Ekle
          </button>
        </div>
      </div>

      {/* Main Grid: Left Notes List + Right Calendar Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search, Tag Chips & Notes Grid (Spans 2 cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search, Filter & Sort Bar */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Not başlığı, içerik, kişi, e-posta, etkinlik veya konum adı ile arayın..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400 font-medium"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 cursor-pointer"
                    title="Aramayı temizle"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Note Type Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px] font-bold text-slate-600">Tür:</span>
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">Tüm Türler ({notes.length})</option>
                  {availableTypeOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px] font-bold text-slate-600">Sırala:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="newest">En Yeni Tarih</option>
                  <option value="oldest">En Eski Tarih</option>
                  <option value="updated">Son Güncelleme</option>
                  <option value="title-asc">Başlık (A - Z)</option>
                  <option value="title-desc">Başlık (Z - A)</option>
                </select>
              </div>
            </div>

            {/* Tag Filter Chips */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">Etiketler:</span>
                <button
                  onClick={() => setSelectedTagFilter(null)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    !selectedTagFilter
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tümü
                </button>
                {allTags.map((tag) => {
                  const isSelected = selectedTagFilter === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTagFilter(isSelected ? null : tag)}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100'
                      }`}
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes Cards List */}
          <div className="space-y-3">
            {sortedNotes.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <FileText className="w-10 h-10 stroke-1 text-slate-300" />
                <p className="text-xs font-medium">Aramanıza veya filtrenize uygun not bulunamadı.</p>
                <button
                  onClick={onAddNote}
                  className="mt-1 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Yeni bir not oluşturun
                </button>
              </div>
            ) : (
              <>
                {displayedNotes.map((note) => {
                  const noteContacts = note.contacts && note.contacts.length > 0
                    ? note.contacts
                    : note.contactDisplayName
                    ? [{ resourceName: note.contactResourceName || '', displayName: note.contactDisplayName }]
                    : [];

                  return (
                    <div
                      key={note.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 relative group ${
                        note.pinned
                          ? 'bg-amber-50/40 border-amber-200/80 shadow-xs'
                          : 'bg-slate-50/40 border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      {/* Title & Pin & Actions Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                          <button
                            onClick={() => onTogglePin(note)}
                            className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                              note.pinned
                                ? 'text-amber-600 bg-amber-100 hover:bg-amber-200'
                                : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
                            }`}
                            title={note.pinned ? 'Sabitlemeyi Kaldır' : 'Üste Sabitle'}
                          >
                            <Pin className="w-4 h-4 fill-current" />
                          </button>

                          <h3 className="text-sm font-bold text-slate-900 truncate">{note.title}</h3>

                          {/* Note Type Badge */}
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md text-[10px] font-bold shrink-0 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-indigo-500" />
                            {getNoteTypeName(note.noteType)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => onEditNote(note)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteNote(note.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Markdown Content Box */}
                      <div className="text-xs text-slate-700 bg-white/80 p-3 rounded-xl border border-slate-100">
                        <MarkdownPreview content={note.content} imgMaxHeight="max-h-72" />
                      </div>

                      {/* Custom Fields (Parameters) */}
                      {note.customFields && Object.keys(note.customFields).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                          {Object.entries(note.customFields).map(([key, value]) => {
                            if (value === undefined || value === null || value === '') return null;
                            const typeDef = noteTypes.find((t) => t.id === note.noteType);
                            const fieldDef = typeDef?.fields?.find((f) => f.id === key);
                            const fieldLabel = fieldDef ? fieldDef.name : key;
                            const displayVal = typeof value === 'boolean' ? (value ? 'Evet' : 'Hayır') : String(value);

                            return (
                              <span
                                key={key}
                                className="px-2 py-0.5 bg-slate-100 border border-slate-200/60 text-slate-700 rounded-md text-[10px] font-medium"
                              >
                                <span className="font-bold text-slate-500">{fieldLabel}:</span> {displayVal}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Linked Relational Items (Emails & Events) */}
                      {((note.linkedEmails && note.linkedEmails.length > 0) ||
                        (note.linkedEvents && note.linkedEvents.length > 0)) && (
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                          {note.linkedEmails?.map((em) => (
                            <span
                              key={em.id}
                              className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-[10px] font-semibold flex items-center gap-1"
                              title={`Gönderen: ${em.sender || ''}`}
                            >
                              <Mail className="w-3 h-3 text-rose-600" />
                              <span className="truncate max-w-[180px]">{em.subject}</span>
                            </span>
                          ))}

                          {note.linkedEvents?.map((ev) => (
                            <span
                              key={ev.id}
                              className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-[10px] font-semibold flex items-center gap-1"
                            >
                              <CalendarIcon className="w-3 h-3 text-blue-600" />
                              <span className="truncate max-w-[180px]">{ev.summary}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Metadata Chips: Contacts, Location, Date, Tags */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Linked Contacts */}
                          {noteContacts.map((c, idx) => (
                            <span
                              key={c.resourceName || idx}
                              className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md font-semibold flex items-center gap-1"
                            >
                              <User className="w-3 h-3 text-indigo-500" />
                              {c.displayName}
                            </span>
                          ))}

                          {/* Linked Location */}
                          {note.location && (
                            <button
                              type="button"
                              onClick={() => onOpenMapForLocation?.(note.location!)}
                              className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-md font-semibold flex items-center gap-1 hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Haritada Görüntüle"
                            >
                              <MapPin className="w-3 h-3 text-emerald-600" />
                              {note.location.name}
                            </button>
                          )}

                          {/* Date */}
                          <span className="flex items-center gap-1 text-slate-400 font-medium">
                            <Calendar className="w-3 h-3" />
                            {note.date}
                          </span>
                        </div>

                        {/* Tags */}
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            {note.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 bg-slate-200/60 text-slate-700 rounded-md font-medium text-[10px]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Devamını Yükle Lazy Load Button */}
                {visibleCount < sortedNotes.length && (
                  <div className="pt-4 flex flex-col items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 10)}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                    >
                      <ChevronDown className="w-4 h-4" />
                      <span>Devamını Yükle (+10)</span>
                    </button>
                    <span className="text-[11px] font-medium text-slate-500">
                      Gösterilen: {displayedNotes.length} / {sortedNotes.length} Not
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Week Number, Days & Calendar Sidebar */}
        <div className="lg:col-span-1">
          <NoteCalendarSidebar
            notes={notes}
            timeLogs={timeLogs}
            events={events}
            selectedDate={selectedDateFilter}
            onSelectDate={setSelectedDateFilter}
            onSaveNote={onSaveNote}
            onSaveTimelog={onSaveTimelog}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    </div>
  );
};
