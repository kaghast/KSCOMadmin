import React, { useState } from 'react';
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
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { NoteItem, ContactItem, NoteLocation } from '../types';
import { NoteCalendarSidebar } from './NoteCalendarSidebar';

interface Props {
  notes: NoteItem[];
  contacts: ContactItem[];
  locations: NoteLocation[];
  onAddNote: () => void;
  onEditNote: (note: NoteItem) => void;
  onDeleteNote: (id: string) => Promise<void>;
  onTogglePin: (note: NoteItem) => Promise<void>;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenMapForLocation?: (loc: NoteLocation) => void;
}

export const NotesSection: React.FC<Props> = ({
  notes,
  contacts,
  locations,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onTogglePin,
  onRefresh,
  isLoading,
  onOpenMapForLocation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = Array.from(
    new Set(notes.flatMap((n) => n.tags || []))
  );

  // Filter notes based on search, tag, date
  const filteredNotes = notes.filter((n) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      n.title.toLowerCase().includes(term) ||
      n.content.toLowerCase().includes(term) ||
      (n.contactDisplayName && n.contactDisplayName.toLowerCase().includes(term)) ||
      (n.location && n.location.name.toLowerCase().includes(term));

    const matchesTag = !selectedTagFilter || (n.tags && n.tags.includes(selectedTagFilter));
    const matchesDate = !selectedDateFilter || n.date === selectedDateFilter;

    return matchesSearch && matchesTag && matchesDate;
  });

  // Sort notes: pinned first, then newest date
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

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
              Kişi bağlantılı, konum haritalı ve Markdown destekli notlar
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
          {/* Search & Tag Bar */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Not başlığı, içerik, kişi veya konum adı ile arayın..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400"
              />
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
                <p className="text-xs font-medium">Aramanıza uygun not bulunamadı.</p>
                <button
                  onClick={onAddNote}
                  className="mt-1 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Yeni bir not oluşturun
                </button>
              </div>
            ) : (
              sortedNotes.map((note) => (
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
                    <div className="flex items-center gap-2 min-w-0 flex-1">
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
                  <div className="text-xs text-slate-700 leading-relaxed bg-white/80 p-3 rounded-xl border border-slate-100 prose max-w-none">
                    <ReactMarkdown>{note.content}</ReactMarkdown>
                  </div>

                  {/* Metadata Chips: Contact, Location, Date, Tags */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Linked Contact */}
                      {note.contactDisplayName && (
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md font-semibold flex items-center gap-1">
                          <User className="w-3 h-3 text-indigo-500" />
                          {note.contactDisplayName}
                        </span>
                      )}

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
              ))
            )}
          </div>
        </div>

        {/* Right Column: Week Number, Days & Calendar Sidebar */}
        <div className="lg:col-span-1">
          <NoteCalendarSidebar
            notes={notes}
            selectedDate={selectedDateFilter}
            onSelectDate={setSelectedDateFilter}
          />
        </div>
      </div>
    </div>
  );
};
