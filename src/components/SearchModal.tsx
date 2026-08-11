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
  ChevronUp,
  Link2,
  FolderKanban,
  Mail,
  User,
  ExternalLink,
  Save,
} from 'lucide-react';
import { NoteItem, NoteType, ProjectTask, TimeLog } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: NoteItem[];
  timeLogs?: TimeLog[];
  noteTypes?: NoteType[];
  projectTasks?: ProjectTask[];
  initialLinkedItem?: LinkedItemSummary | null;
  onSelectNote: (note: NoteItem) => void;
  onDeleteNote?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onSaveNote?: (data: any) => Promise<void>;
  onRefreshNotes?: () => void;
}

export interface LinkedItemSummary {
  id: string;
  type: 'task' | 'email' | 'event' | 'drive' | 'contact';
  typeLabel: string;
  title: string;
  url?: string;
  connectedNotes: NoteItem[];
  count: number;
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
  timeLogs = [],
  noteTypes = [],
  projectTasks = [],
  initialLinkedItem = null,
  onSelectNote,
  onDeleteNote,
  onTogglePin,
  onSaveNote,
  onRefreshNotes,
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

  // Accordion open/close state
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    type: true,
    tags: true,
    days: false,
    month: false,
    location: false,
    linked: true,
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Linked item filtering & category
  const [selectedLinkedItem, setSelectedLinkedItem] = useState<LinkedItemSummary | null>(null);
  const [linkedCategoryFilter, setLinkedCategoryFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen && initialLinkedItem) {
      setSelectedLinkedItem(initialLinkedItem);
    }
  }, [isOpen, initialLinkedItem]);

  // Quick edit state for linked item
  const [editingLinkedItem, setEditingLinkedItem] = useState<LinkedItemSummary | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Week Navigation State (0 = Current Week, -1 = Prev Week, +1 = Next Week)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Month Navigation State (Default = Current Month & Year)
  const now = new Date();
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth()); // 0..11

  // Helper to format date and time in Turkish
  const formatDateTR = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const iso = dateStr.includes('T') ? dateStr : `${dateStr}T12:00`;
      const d = new Date(iso);
      if (isNaN(d.getTime())) return dateStr;
      const formattedDate = d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        weekday: 'short',
      });
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${formattedDate} ${hours}:${minutes}`;
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

  // 5. Aggregate ALL linked items across all notes & project tasks
  const allLinkedItems = useMemo(() => {
    const map = new Map<string, LinkedItemSummary>();
    const customTitles: Record<string, string> = (() => {
      try {
        return JSON.parse(localStorage.getItem('custom_linked_titles') || '{}');
      } catch {
        return {};
      }
    })();

    notes.forEach((note) => {
      // a. linkedTasks
      if (note.linkedTasks && Array.isArray(note.linkedTasks)) {
        note.linkedTasks.forEach((t) => {
          if (!t.id && !t.title) return;
          const key = `task_${t.id || t.title}`;
          const existing = map.get(key);
          if (!existing) {
            map.set(key, {
              id: t.id || key,
              type: 'task',
              typeLabel: 'Kanban Kartı / Görev',
              title: customTitles[key] || t.title || 'Görev',
              url: '',
              connectedNotes: [note],
              count: 1,
            });
          } else {
            if (!existing.connectedNotes.some((n) => n.id === note.id)) {
              existing.connectedNotes.push(note);
              existing.count++;
            }
          }
        });
      }

      // b. cardId / cardTitle
      if (note.cardId || note.cardTitle) {
        const rawTitle = note.cardTitle || 'Kanban Kartı';
        const key = `task_${note.cardId || rawTitle}`;
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            id: note.cardId || key,
            type: 'task',
            typeLabel: 'Kanban Kartı / Görev',
            title: customTitles[key] || rawTitle,
            url: '',
            connectedNotes: [note],
            count: 1,
          });
        } else {
          if (!existing.connectedNotes.some((n) => n.id === note.id)) {
            existing.connectedNotes.push(note);
            existing.count++;
          }
        }
      }

      // c. linkedEmails
      if (note.linkedEmails && Array.isArray(note.linkedEmails)) {
        note.linkedEmails.forEach((e) => {
          if (!e.id && !e.subject) return;
          const key = `email_${e.id || e.subject}`;
          const existing = map.get(key);
          if (!existing) {
            map.set(key, {
              id: e.id || key,
              type: 'email',
              typeLabel: 'E-posta',
              title: customTitles[key] || e.subject || 'E-posta',
              url: '',
              connectedNotes: [note],
              count: 1,
            });
          } else {
            if (!existing.connectedNotes.some((n) => n.id === note.id)) {
              existing.connectedNotes.push(note);
              existing.count++;
            }
          }
        });
      }

      // d. linkedEvents
      if (note.linkedEvents && Array.isArray(note.linkedEvents)) {
        note.linkedEvents.forEach((ev) => {
          if (!ev.id && !ev.summary) return;
          const key = `event_${ev.id || ev.summary}`;
          const existing = map.get(key);
          if (!existing) {
            map.set(key, {
              id: ev.id || key,
              type: 'event',
              typeLabel: 'Takvim Etkinliği',
              title: customTitles[key] || ev.summary || 'Etkinlik',
              url: ev.htmlLink || '',
              connectedNotes: [note],
              count: 1,
            });
          } else {
            if (!existing.connectedNotes.some((n) => n.id === note.id)) {
              existing.connectedNotes.push(note);
              existing.count++;
            }
          }
        });
      }

      // e. linkedDriveFiles
      if (note.linkedDriveFiles && Array.isArray(note.linkedDriveFiles)) {
        note.linkedDriveFiles.forEach((d) => {
          if (!d.id && !d.name) return;
          const key = `drive_${d.id || d.name}`;
          const existing = map.get(key);
          if (!existing) {
            map.set(key, {
              id: d.id || key,
              type: 'drive',
              typeLabel: 'Drive Dosyası',
              title: customTitles[key] || d.name || 'Drive Dosyası',
              url: d.webViewLink || '',
              connectedNotes: [note],
              count: 1,
            });
          } else {
            if (!existing.connectedNotes.some((n) => n.id === note.id)) {
              existing.connectedNotes.push(note);
              existing.count++;
            }
          }
        });
      }

      // f. contacts
      if (note.contacts && Array.isArray(note.contacts)) {
        note.contacts.forEach((c) => {
          if (!c.resourceName && !c.displayName) return;
          const key = `contact_${c.resourceName || c.displayName}`;
          const existing = map.get(key);
          if (!existing) {
            map.set(key, {
              id: c.resourceName || key,
              type: 'contact',
              typeLabel: 'Kişi / İletişim',
              title: customTitles[key] || c.displayName || 'Kişi',
              url: c.email ? `mailto:${c.email}` : '',
              connectedNotes: [note],
              count: 1,
            });
          } else {
            if (!existing.connectedNotes.some((n) => n.id === note.id)) {
              existing.connectedNotes.push(note);
              existing.count++;
            }
          }
        });
      }
    });

    // Also map projectTasks if available
    if (projectTasks && Array.isArray(projectTasks)) {
      projectTasks.forEach((task) => {
        const key = `task_${task.id || task.title}`;
        if (!map.has(key)) {
          map.set(key, {
            id: task.id,
            type: 'task',
            typeLabel: 'Kanban Kartı / Görev',
            title: customTitles[key] || task.title,
            url: '',
            connectedNotes: [],
            count: 0,
          });
        }
      });
    }

    // Also map timeLogs if available
    if (timeLogs && Array.isArray(timeLogs)) {
      timeLogs.forEach((tl) => {
        const targetId = tl.linkId || tl.eventId || tl.entityId;
        const targetType = tl.linkType || tl.entityType;
        if (!targetId || !targetType) return;

        let itemType: 'task' | 'email' | 'event' | 'drive' | 'contact' = 'event';
        let typeLabel = 'Takvim Etkinliği';

        if (targetType === 'calendar' || targetType === 'event') {
          itemType = 'event';
          typeLabel = 'Takvim Etkinliği';
        } else if (targetType === 'gmail' || targetType === 'email') {
          itemType = 'email';
          typeLabel = 'E-posta';
        } else if (targetType === 'drive') {
          itemType = 'drive';
          typeLabel = 'Drive Dosyası';
        } else if (targetType === 'contact') {
          itemType = 'contact';
          typeLabel = 'Kişi / İletişim';
        } else if (targetType === 'tasks' || targetType === 'task') {
          itemType = 'task';
          typeLabel = 'Kanban Kartı / Görev';
        }

        const key = `${itemType}_${targetId}`;
        const title = customTitles[key] || tl.linkTitle || tl.eventSummary || 'Bağlanan Öğe';
        const matchingNote = notes.find((n) => n.id === tl.id);

        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            id: targetId,
            type: itemType,
            typeLabel,
            title,
            url: itemType === 'event' ? (targetId.startsWith('http') ? targetId : 'https://calendar.google.com') : '',
            connectedNotes: matchingNote ? [matchingNote] : [],
            count: 1,
          });
        } else {
          if (matchingNote && !existing.connectedNotes.some((n) => n.id === matchingNote.id)) {
            existing.connectedNotes.push(matchingNote);
            existing.count++;
          }
        }
      });
    }

    return Array.from(map.values());
  }, [notes, projectTasks, timeLogs]);

  // Displayed linked items based on category sub-filter
  const displayedLinkedItems = useMemo(() => {
    if (linkedCategoryFilter === 'all') return allLinkedItems;
    return allLinkedItems.filter((i) => i.type === linkedCategoryFilter);
  }, [allLinkedItems, linkedCategoryFilter]);

  // Handle Quick Edit Save for Linked Item
  const handleSaveLinkedItemEdit = async () => {
    if (!editingLinkedItem) return;
    const { id, type, title: oldTitle, connectedNotes } = editingLinkedItem;
    const newTitle = editTitle.trim() || oldTitle;
    const newUrl = editUrl.trim();

    setIsSavingEdit(true);
    try {
      const targetNotes = connectedNotes.length > 0
        ? connectedNotes
        : notes.filter((n) => {
            if (type === 'task') return n.cardId === id || n.cardTitle === oldTitle || n.linkedTasks?.some((t) => t.id === id || t.title === oldTitle);
            if (type === 'email') return n.linkedEmails?.some((e) => e.id === id || e.subject === oldTitle);
            if (type === 'event') return n.linkedEvents?.some((e) => e.id === id || e.summary === oldTitle);
            if (type === 'drive') return n.linkedDriveFiles?.some((d) => d.id === id || d.name === oldTitle);
            if (type === 'contact') return n.contacts?.some((c) => c.resourceName === id || c.displayName === oldTitle);
            return false;
          });

      for (const note of targetNotes) {
        const updated = { ...note };
        let modified = false;

        if (type === 'task') {
          if (updated.cardTitle === oldTitle || updated.cardId === id) {
            updated.cardTitle = newTitle;
            modified = true;
          }
          if (updated.linkedTasks) {
            updated.linkedTasks = updated.linkedTasks.map((t) => {
              if (t.id === id || t.title === oldTitle) {
                modified = true;
                return { ...t, title: newTitle };
              }
              return t;
            });
          }
        } else if (type === 'email') {
          if (updated.linkedEmails) {
            updated.linkedEmails = updated.linkedEmails.map((e) => {
              if (e.id === id || e.subject === oldTitle) {
                modified = true;
                return { ...e, subject: newTitle };
              }
              return e;
            });
          }
        } else if (type === 'event') {
          if (updated.linkedEvents) {
            updated.linkedEvents = updated.linkedEvents.map((e) => {
              if (e.id === id || e.summary === oldTitle) {
                modified = true;
                return { ...e, summary: newTitle, htmlLink: newUrl || e.htmlLink };
              }
              return e;
            });
          }
        } else if (type === 'drive') {
          if (updated.linkedDriveFiles) {
            updated.linkedDriveFiles = updated.linkedDriveFiles.map((d) => {
              if (d.id === id || d.name === oldTitle) {
                modified = true;
                return { ...d, name: newTitle, webViewLink: newUrl || d.webViewLink };
              }
              return d;
            });
          }
        } else if (type === 'contact') {
          if (updated.contacts) {
            updated.contacts = updated.contacts.map((c) => {
              if (c.resourceName === id || c.displayName === oldTitle) {
                modified = true;
                return { ...c, displayName: newTitle, email: newUrl || c.email };
              }
              return c;
            });
          }
        }

        if (modified) {
          if (onSaveNote) {
            await onSaveNote(updated);
          } else {
            await fetch(`/api/notes/${updated.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updated),
            });
          }
        }
      }

      if (type === 'task' && id && !id.startsWith('task_')) {
        try {
          await fetch(`/api/projects/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle }),
          });
        } catch (err) {
          console.error('Task title update error:', err);
        }
      }

      if (onRefreshNotes) onRefreshNotes();
      setEditingLinkedItem(null);
    } catch (err) {
      console.error('Error saving linked item edit:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

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
      // Selected Linked Item Filter
      if (selectedLinkedItem) {
        let isMatch = false;
        const itemType = selectedLinkedItem.type;
        const itemId = selectedLinkedItem.id;
        const itemTitle = selectedLinkedItem.title.toLowerCase();

        if (itemType === 'task') {
          if (n.cardId === itemId || (n.cardTitle && n.cardTitle.toLowerCase() === itemTitle)) isMatch = true;
          if (n.linkedTasks?.some((t) => t.id === itemId || t.title.toLowerCase() === itemTitle)) isMatch = true;
        } else if (itemType === 'email') {
          if (n.linkedEmails?.some((e) => e.id === itemId || e.subject.toLowerCase() === itemTitle)) isMatch = true;
        } else if (itemType === 'event') {
          if (n.linkedEvents?.some((ev) => ev.id === itemId || ev.summary.toLowerCase() === itemTitle)) isMatch = true;
        } else if (itemType === 'drive') {
          if (n.linkedDriveFiles?.some((d) => d.id === itemId || d.name.toLowerCase() === itemTitle)) isMatch = true;
        } else if (itemType === 'contact') {
          if (n.contacts?.some((c) => c.resourceName === itemId || c.displayName.toLowerCase() === itemTitle)) isMatch = true;
        }

        if (!isMatch) return false;
      }

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
        const rawDate = n.date || n.createdAt || '';
        const nDateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
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
    setSelectedLinkedItem(null);
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
    selectedLinkedItem !== null ||
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

                {selectedLinkedItem && (
                  <span className="px-2 py-0.5 bg-cyan-900/90 text-cyan-200 border border-cyan-700 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                    🔗 Bağlanan Öğeler: {selectedLinkedItem.title}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedLinkedItem(null)} />
                  </span>
                )}

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

          {/* RIGHT SIDEBAR: ACCORDION PANELS */}
          <div className="w-full lg:w-80 bg-slate-900/95 p-3 sm:p-4 overflow-y-auto space-y-3 border-t lg:border-t-0 border-slate-800 shrink-0">
            
            {/* ACCORDION 1: NOT TÜRLERİ */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleAccordion('type')}
                className="w-full px-3.5 py-3 flex items-center justify-between text-xs font-black text-slate-200 hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 text-indigo-400">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Not Türü Filtresi</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold">
                    {typeOptions.length} Tür
                  </span>
                  {openAccordions['type'] ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {openAccordions['type'] && (
                <div className="p-3 pt-0 border-t border-slate-800/50 space-y-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedType('all')}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                      selectedType === 'all'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>Tüm Türler</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-950/60 rounded-full font-black">
                      {notes.length}
                    </span>
                  </button>
                  {typeOptions.map((opt) => {
                    const isSelected = selectedType === opt.id;
                    const count = notes.filter((n) => (n.noteType || 'note') === opt.id).length;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedType(opt.id)}
                        className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{opt.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-950/60 rounded-full font-black">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ACCORDION 2: MEVCUT ETİKETLER */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleAccordion('tags')}
                className="w-full px-3.5 py-3 flex items-center justify-between text-xs font-black text-slate-200 hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 text-emerald-400">
                  <Tag className="w-4 h-4" />
                  <span>Mevcut Etiketler</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold">
                    {Object.keys(tagCounts).length} Etiket
                  </span>
                  {openAccordions['tags'] ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {openAccordions['tags'] && (
                <div className="p-3 pt-0 border-t border-slate-800/50 mt-1">
                  {Object.keys(tagCounts).length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-1">Etiket bulunamadı.</p>
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
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
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
              )}
            </div>

            {/* ACCORDION 3: HAFTANIN GÜNLERİ */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleAccordion('days')}
                className="w-full px-3.5 py-3 flex items-center justify-between text-xs font-black text-slate-200 hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 text-purple-400">
                  <CalendarDays className="w-4 h-4" />
                  <span>Haftanın Günleri</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold">
                    {weekLabel}
                  </span>
                  {openAccordions['days'] ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {openAccordions['days'] && (
                <div className="p-3 pt-0 border-t border-slate-800/50 space-y-2 mt-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-0.5">
                    <span>{weekRangeSubLabel}</span>
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setWeekOffset((prev) => prev - 1)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                        title="Önceki Hafta"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      {weekOffset !== 0 && (
                        <button
                          type="button"
                          onClick={() => setWeekOffset(0)}
                          className="text-purple-400 hover:underline font-bold px-1 text-[10px]"
                        >
                          Bu Hafta
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setWeekOffset((prev) => prev + 1)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                        title="Sonraki Hafta"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsWeekOnly(!isWeekOnly);
                      setSelectedDate(null);
                    }}
                    className={`w-full p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                      isWeekOnly
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-purple-400" />
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
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                            isSelected
                              ? 'bg-purple-900/90 text-white border-purple-500 shadow-md'
                              : 'bg-slate-900 hover:bg-slate-800/80 text-slate-300 border-slate-800/80'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                count > 0 ? 'bg-purple-400' : 'bg-slate-700'
                              }`}
                            />
                            <span>{day.name}</span>
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
              )}
            </div>

            {/* ACCORDION 4: AY GÖRÜNÜMÜ */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleAccordion('month')}
                className="w-full px-3.5 py-3 flex items-center justify-between text-xs font-black text-slate-200 hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 text-sky-400">
                  <Calendar className="w-4 h-4" />
                  <span>Ay Görünümü</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold capitalize">
                    {selectedMonthName}
                  </span>
                  {openAccordions['month'] ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {openAccordions['month'] && (
                <div className="p-3 pt-0 border-t border-slate-800/50 space-y-2 mt-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-0.5">
                    <span className="capitalize">{selectedMonthName}</span>
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
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
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      {(viewYear !== now.getFullYear() || viewMonth !== now.getMonth()) && (
                        <button
                          type="button"
                          onClick={() => {
                            setViewYear(now.getFullYear());
                            setViewMonth(now.getMonth());
                          }}
                          className="text-sky-400 hover:underline font-bold px-1 text-[10px]"
                        >
                          Güncel
                        </button>
                      )}
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
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCurrentMonthOnly(!isCurrentMonthOnly);
                      setSelectedDate(null);
                    }}
                    className={`w-full p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                      isCurrentMonthOnly
                        ? 'bg-sky-600 text-white border-sky-500 shadow-md'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-sky-400" />
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

                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800/80 space-y-1.5">
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
                                : 'bg-slate-950 text-slate-500 hover:bg-slate-800'
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
              )}
            </div>

            {/* ACCORDION 5: LOKASYON ETİKETLERİ */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleAccordion('location')}
                className="w-full px-3.5 py-3 flex items-center justify-between text-xs font-black text-slate-200 hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 text-amber-400">
                  <MapPin className="w-4 h-4" />
                  <span>Lokasyon Etiketleri</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold">
                    {Object.keys(locationCounts).length} Lokasyon
                  </span>
                  {openAccordions['location'] ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {openAccordions['location'] && (
                <div className="p-3 pt-0 border-t border-slate-800/50 mt-1">
                  {Object.keys(locationCounts).length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-1">Lokasyonlu not bulunamadı.</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {Object.entries(locationCounts).map(([locName, count]) => {
                        const isSelected = selectedLocation === locName;

                        return (
                          <div
                            key={locName}
                            onClick={() => setSelectedLocation(isSelected ? null : locName)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                              isSelected
                                ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                                : 'bg-slate-900 hover:bg-slate-800/80 text-slate-300 border-slate-800/80'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate max-w-[170px]">
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
              )}
            </div>

            {/* ACCORDION 6: BAĞLANAN ÖĞELER (EN SON ITEM) */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleAccordion('linked')}
                className="w-full px-3.5 py-3 flex items-center justify-between text-xs font-black text-slate-200 hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 text-cyan-400">
                  <Link2 className="w-4 h-4" />
                  <span>Bağlanan Öğeler</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-800/50 text-cyan-300 rounded-full text-[10px] font-bold">
                    {allLinkedItems.length} Öğe
                  </span>
                  {openAccordions['linked'] ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {openAccordions['linked'] && (
                <div className="p-3 pt-0 border-t border-slate-800/50 space-y-2 mt-1">
                  
                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-bold">
                    {[
                      { id: 'all', label: 'Tümü' },
                      { id: 'task', label: 'Kart/Görev' },
                      { id: 'email', label: 'E-posta' },
                      { id: 'event', label: 'Takvim' },
                      { id: 'drive', label: 'Drive' },
                      { id: 'contact', label: 'Kişi' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setLinkedCategoryFilter(cat.id)}
                        className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                          linkedCategoryFilter === cat.id
                            ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {displayedLinkedItems.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-2">
                      Bağlanan öğe bulunamadı.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {displayedLinkedItems.map((item) => {
                        const isFiltered = selectedLinkedItem?.id === item.id;
                        return (
                          <div
                            key={`${item.type}_${item.id}`}
                            className={`p-2 rounded-xl border text-xs transition-all flex flex-col gap-1.5 ${
                              isFiltered
                                ? 'bg-cyan-950/80 border-cyan-600 shadow-md ring-1 ring-cyan-500/40'
                                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {item.type === 'task' && <FolderKanban className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                                {item.type === 'email' && <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                {item.type === 'event' && <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                                {item.type === 'drive' && <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                                {item.type === 'contact' && <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                <span className="font-bold text-slate-200 truncate" title={item.title}>
                                  {item.title}
                                </span>
                              </div>

                              {/* Connected Notes Badge */}
                              <span
                                className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800/60 rounded-full text-[10px] font-black shrink-0"
                                title={`${item.count} adet nota bağlı`}
                              >
                                {item.count} Not/Kart
                              </span>
                            </div>

                            {/* Sub Controls: Filter Trigger & External Link */}
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
                              <div className="flex items-center gap-1.5 w-full justify-between">
                                {/* Trigger Filter */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isFiltered) {
                                      setSelectedLinkedItem(null);
                                    } else {
                                      setSelectedLinkedItem(item);
                                    }
                                  }}
                                  className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                    isFiltered
                                      ? 'bg-cyan-600 text-white'
                                      : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'
                                  }`}
                                >
                                  <Search className="w-3 h-3" />
                                  <span>{isFiltered ? 'Filtreyi Kaldır' : 'Sonuçları Getir'}</span>
                                </button>

                                {/* External URL if exists */}
                                {item.url && (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors flex items-center gap-1"
                                    title="Bağlantıyı Aç"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* QUICK EDIT MODAL FOR LINKED ITEM */}
      {editingLinkedItem && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl w-full max-w-md text-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Edit3 className="w-4 h-4" />
                <span>Bağlanan Öğeyi Hızlı Düzenle</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingLinkedItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Öğe Türü
                </label>
                <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg font-bold text-indigo-300 inline-block">
                  {editingLinkedItem.typeLabel}
                </span>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Ad / Başlık
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                  placeholder="Öğe adını giriniz..."
                />
              </div>

              {['event', 'drive', 'contact'].includes(editingLinkedItem.type) && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Bağlantı / Link / E-posta
                  </label>
                  <input
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 text-xs"
                    placeholder="https://..."
                  />
                </div>
              )}

              <p className="text-[11px] text-slate-400 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                Bu düzenleme, bu öğeye bağlı tüm ({editingLinkedItem.count}) not ve kartlarda anında güncellenecektir.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingLinkedItem(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={isSavingEdit || !editTitle.trim()}
                onClick={handleSaveLinkedItemEdit}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
              >
                {isSavingEdit ? (
                  <span>Kaydediliyor...</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Kaydet & Güncelle</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
