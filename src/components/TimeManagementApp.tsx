import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Play,
  StopCircle,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  CheckSquare,
  Mail,
  HardDrive,
  Tag as TagIcon,
  FolderKanban,
  Search,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  X,
  Check,
  FileText,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Project,
  ProjectTask,
  NoteItem,
  CalendarEvent,
  TaskItem,
  EmailItem,
  DriveFile,
  TimeLog,
} from '../types';
import { MarkdownPreview } from './MarkdownPreview';

interface TimeManagementAppProps {
  projects?: Project[];
  projectTasks?: ProjectTask[];
  notes?: NoteItem[];
  calendarEvents?: CalendarEvent[];
  tasks?: TaskItem[];
  emails?: EmailItem[];
  driveFiles?: DriveFile[];
  language?: string;
  onSelectCard?: (cardId?: string, cardTitle?: string) => void;
}

type GoogleLinkType = 'tasks' | 'calendar' | 'gmail' | 'drive' | '';

const CHART_COLORS = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

export const TimeManagementApp: React.FC<TimeManagementAppProps> = ({
  projects = [],
  projectTasks = [],
  notes = [],
  calendarEvents = [],
  tasks = [],
  emails = [],
  driveFiles = [],
  language = 'tr',
  onSelectCard,
}) => {
  const isTr = language === 'tr';

  // 1. TIMELOGS & TAGS STATE
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [userCreatedTags, setUserCreatedTags] = useState<string[]>([]);

  // Combined tags across Notes, TimeLogs, and User dynamically added tags
  const availableTags = useMemo(() => {
    const all = new Set<string>();
    notes.forEach((n) => {
      if (n.tags && Array.isArray(n.tags)) {
        n.tags.forEach((t) => {
          if (t && t.trim()) all.add(t.trim());
        });
      }
    });
    timeLogs.forEach((l) => {
      if (l.tags && Array.isArray(l.tags)) {
        l.tags.forEach((t) => {
          if (t && t.trim()) all.add(t.trim());
        });
      }
    });
    userCreatedTags.forEach((t) => {
      if (t && t.trim()) all.add(t.trim());
    });
    return Array.from(all);
  }, [notes, timeLogs, userCreatedTags]);

  const handleAddNewTag = (newTag: string) => {
    const trimmed = newTag.trim();
    if (trimmed && !availableTags.includes(trimmed)) {
      setUserCreatedTags((prev) => [...prev, trimmed]);
    }
  };

  const [isLoading, setIsLoading] = useState(true);

  // 3. LIVE TIMER TRACKER STATE
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);
  const [timerElapsedSeconds, setTimerElapsedSeconds] = useState(0);

  // Live Timer Draft Fields
  const [activeCardId, setActiveCardId] = useState<string>('');
  const [activeCustomTitle, setActiveCustomTitle] = useState<string>('');
  const [activeLinkType, setActiveLinkType] = useState<GoogleLinkType>('calendar');
  const [activeLinkId, setActiveLinkId] = useState<string>('');
  const [activeDescription, setActiveDescription] = useState<string>('');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // 4. MODAL STATE FOR MANUAL ADD & EDIT
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);

  // Form Fields
  const [formCardId, setFormCardId] = useState<string>('');
  const [formCustomTitle, setFormCustomTitle] = useState<string>('');
  const [formLinkType, setFormLinkType] = useState<GoogleLinkType>('calendar');
  const [formLinkId, setFormLinkId] = useState<string>('');
  const [formStartTime, setFormStartTime] = useState<string>('');
  const [formEndTime, setFormEndTime] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState<string>('');

  // 5. FILTERS
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('');
  const [selectedLinkTypeFilter, setSelectedLinkTypeFilter] = useState<string>('');

  // Fetch initial timelogs
  useEffect(() => {
    fetchTimelogs();
  }, []);

  const fetchTimelogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/timelogs');
      if (res.ok) {
        const data = await res.json();
        if (data.timelogs && Array.isArray(data.timelogs)) {
          setTimeLogs(data.timelogs);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend timelogs endpoint failed, setting defaults', err);
    }

    // Default seed logs if empty
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const firstTag = availableTags[0] || 'Genel';

    const demoLogs: TimeLog[] = [
      {
        id: 'log-demo-1',
        cardId: projectTasks[0]?.id || 'task-1',
        cardTitle: projectTasks[0]?.title || 'Google Workspace Entegrasyon Testleri',
        projectId: projects[0]?.id || 'proj-1',
        projectName: projects[0]?.name || 'AdminSpace v2',
        linkType: 'calendar',
        linkId: calendarEvents[0]?.id || 'evt-1',
        linkTitle: calendarEvents[0]?.summary || 'Sprint Planlama Toplantısı',
        eventId: calendarEvents[0]?.id || 'evt-1',
        eventSummary: calendarEvents[0]?.summary || 'Sprint Planlama Toplantısı',
        startTime: `${todayStr}T09:00`,
        endTime: `${todayStr}T10:30`,
        durationMinutes: 90,
        description: 'Google Calendar ve Timelog entegrasyon senkronizasyonu geliştirildi.',
        tags: [firstTag],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'log-demo-2',
        cardId: projectTasks[1]?.id || 'task-2',
        cardTitle: projectTasks[1]?.title || 'Kanban Arayüz İnceleme',
        projectId: projects[0]?.id || 'proj-1',
        projectName: projects[0]?.name || 'AdminSpace v2',
        linkType: 'gmail',
        linkId: emails[0]?.id || 'msg-1',
        linkTitle: emails[0]?.subject || 'Proje Güncelleme Bildirimi',
        startTime: `${todayStr}T11:00`,
        endTime: `${todayStr}T12:00`,
        durationMinutes: 60,
        description: 'E-posta üzerinden gelen müşteri feedback metinleri incelendi.',
        tags: [firstTag],
        createdAt: new Date().toISOString(),
      },
    ];
    setTimeLogs(demoLogs);
    setIsLoading(false);
  };

  // Live Timer Interval
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerStartTime) {
      interval = setInterval(() => {
        const secs = Math.floor((new Date().getTime() - timerStartTime.getTime()) / 1000);
        setTimerElapsedSeconds(secs);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerStartTime]);

  // Start Live Timer
  const handleStartTimer = () => {
    const now = new Date();
    setTimerStartTime(now);
    setTimerElapsedSeconds(0);
    setIsTimerRunning(true);
  };

  // Stop Live Timer & Save Log
  const handleStopTimer = async () => {
    if (!timerStartTime) return;
    const end = new Date();
    const durationMins = Math.max(1, Math.round((end.getTime() - timerStartTime.getTime()) / 60000));

    // Resolve Card & Project
    let cardTitle = activeCustomTitle.trim();
    let cardId = activeCardId;
    let projId = '';
    let projName = '';

    if (activeCardId) {
      const foundTask = projectTasks.find((t) => t.id === activeCardId);
      if (foundTask) {
        cardTitle = foundTask.title;
        projId = foundTask.projectId || '';
        const foundProj = projects.find((p) => p.id === projId);
        if (foundProj) projName = foundProj.name;
      }
    }

    if (!cardTitle) {
      cardTitle = 'Genel Çalışma Seansı';
    }

    // Resolve Linked Item
    const { linkTitle, eventId, eventSummary } = resolveLinkedItemDetails(
      activeLinkType,
      activeLinkId
    );

    const formatLocalDateTime = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const newLog: TimeLog = {
      id: `log-${Date.now()}`,
      cardId: cardId || undefined,
      cardTitle,
      projectId: projId || undefined,
      projectName: projName || undefined,
      linkType: activeLinkType || undefined,
      linkId: activeLinkId || undefined,
      linkTitle: linkTitle || undefined,
      eventId: eventId || undefined,
      eventSummary: eventSummary || undefined,
      startTime: formatLocalDateTime(timerStartTime),
      endTime: formatLocalDateTime(end),
      durationMinutes: durationMins,
      description: activeDescription.trim(),
      tags: activeTags.length > 0 ? activeTags : availableTags.slice(0, 1),
      createdAt: new Date().toISOString(),
    };

    setTimeLogs((prev) => [newLog, ...prev]);
    setIsTimerRunning(false);
    setTimerStartTime(null);
    setTimerElapsedSeconds(0);
    setActiveDescription('');

    try {
      await fetch('/api/timelogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog),
      });
    } catch (err) {
      console.error('Error saving timelog:', err);
    }
  };

  // Helper to resolve linked item title & event fallback
  const resolveLinkedItemDetails = (type: GoogleLinkType, id: string) => {
    let linkTitle = '';
    let eventId: string | undefined = undefined;
    let eventSummary: string | undefined = undefined;

    if (!id || !type) return { linkTitle, eventId, eventSummary };

    if (type === 'tasks') {
      const found = tasks.find((t) => t.id === id);
      if (found) linkTitle = found.title;
    } else if (type === 'calendar') {
      const found = calendarEvents.find((e) => e.id === id);
      if (found) {
        linkTitle = found.summary;
        eventId = found.id;
        eventSummary = found.summary;
      }
    } else if (type === 'gmail') {
      const found = emails.find((m) => m.id === id);
      if (found) linkTitle = found.subject;
    } else if (type === 'drive') {
      const found = driveFiles.find((f) => f.id === id);
      if (found) linkTitle = found.name;
    }

    return { linkTitle, eventId, eventSummary };
  };

  // Open Modal for New Log
  const handleOpenAddModal = () => {
    setEditingLog(null);
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    setFormCardId(projectTasks[0]?.id || '');
    setFormCustomTitle('');
    setFormLinkType('calendar');
    setFormLinkId('');
    setFormStartTime(`${todayStr}T09:00`);
    setFormEndTime(`${todayStr}T10:00`);
    setFormDescription('');
    setFormTags(availableTags.slice(0, 1));
    setIsModalOpen(true);
  };

  // Open Modal for Edit Log
  const handleOpenEditModal = (log: TimeLog) => {
    setEditingLog(log);
    setFormCardId(log.cardId || '');
    setFormCustomTitle(log.cardId ? '' : log.cardTitle);
    setFormLinkType((log.linkType as GoogleLinkType) || (log.eventId ? 'calendar' : ''));
    setFormLinkId(log.linkId || log.eventId || '');
    setFormStartTime(log.startTime || '');
    setFormEndTime(log.endTime || '');
    setFormDescription(log.description || '');
    setFormTags(log.tags || []);
    setIsModalOpen(true);
  };

  // Save Modal Add / Edit
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();

    let cardTitle = formCustomTitle.trim();
    let cardId = formCardId;
    let projId = '';
    let projName = '';

    if (formCardId) {
      const foundTask = projectTasks.find((t) => t.id === formCardId);
      if (foundTask) {
        cardTitle = foundTask.title;
        projId = foundTask.projectId || '';
        const foundProj = projects.find((p) => p.id === projId);
        if (foundProj) projName = foundProj.name;
      }
    }

    if (!cardTitle) {
      cardTitle = 'Başlıksız Çalışma Kaydı';
    }

    const { linkTitle, eventId, eventSummary } = resolveLinkedItemDetails(formLinkType, formLinkId);

    let mins = 30;
    if (formStartTime && formEndTime) {
      const startMs = new Date(formStartTime).getTime();
      const endMs = new Date(formEndTime).getTime();
      if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
        mins = Math.round((endMs - startMs) / 60000);
      }
    }

    const logToSave: TimeLog = {
      id: editingLog ? editingLog.id : `log-${Date.now()}`,
      cardId: cardId || undefined,
      cardTitle,
      projectId: projId || undefined,
      projectName: projName || undefined,
      linkType: formLinkType || undefined,
      linkId: formLinkId || undefined,
      linkTitle: linkTitle || undefined,
      eventId: eventId || undefined,
      eventSummary: eventSummary || undefined,
      startTime: formStartTime,
      endTime: formEndTime,
      durationMinutes: mins,
      description: formDescription.trim(),
      tags: formTags.length > 0 ? formTags : availableTags.slice(0, 1),
      createdAt: editingLog ? editingLog.createdAt : new Date().toISOString(),
    };

    if (editingLog) {
      setTimeLogs((prev) => prev.map((l) => (l.id === editingLog.id ? logToSave : l)));
    } else {
      setTimeLogs((prev) => [logToSave, ...prev]);
    }

    setIsModalOpen(false);

    try {
      await fetch('/api/timelogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logToSave),
      });
    } catch (err) {
      console.error('Error saving timelog to backend:', err);
    }
  };

  // Delete Timelog
  const handleDeleteLog = async (id: string) => {
    if (!confirm(isTr ? 'Bu timelog kaydını silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this timelog?')) {
      return;
    }
    setTimeLogs((prev) => prev.filter((l) => l.id !== id));
    try {
      await fetch(`/api/timelogs/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting timelog:', err);
    }
  };

  // Toggle tag selection in form
  const handleToggleFormTag = (tag: string) => {
    if (formTags.includes(tag)) {
      setFormTags(formTags.filter((t) => t !== tag));
    } else {
      setFormTags([...formTags, tag]);
    }
  };

  // Add custom tag from input
  const handleAddCustomTagFromInput = () => {
    const trimmed = customTagInput.trim();
    if (trimmed) {
      handleAddNewTag(trimmed);
      if (!formTags.includes(trimmed)) {
        setFormTags([...formTags, trimmed]);
      }
      setCustomTagInput('');
    }
  };

  // Get available items for selected Google Link Type
  const getLinkedItemsOptions = (type: GoogleLinkType, selectedCardId?: string) => {
    let proj: Project | undefined = undefined;
    if (selectedCardId) {
      const task = projectTasks.find((t) => t.id === selectedCardId);
      if (task) {
        proj = projects.find((p) => p.id === task.projectId);
      }
    }

    switch (type) {
      case 'tasks': {
        return tasks.map((t) => ({ id: t.id, title: t.title }));
      }
      case 'calendar': {
        let eventsList = calendarEvents;
        if (proj && proj.linkedEventIds && proj.linkedEventIds.length > 0) {
          const linked = calendarEvents.filter((e) => proj!.linkedEventIds!.includes(e.id));
          if (linked.length > 0) eventsList = linked;
        }
        return eventsList.map((e) => ({ id: e.id, title: `${e.summary} (${formatDateTimeDisplay(e.start)})` }));
      }
      case 'gmail': {
        let emailList = emails;
        if (proj && proj.linkedEmailIds && proj.linkedEmailIds.length > 0) {
          const linked = emails.filter((m) => proj!.linkedEmailIds!.includes(m.id));
          if (linked.length > 0) emailList = linked;
        }
        return emailList.map((m) => ({ id: m.id, title: `${m.subject} - ${m.sender}` }));
      }
      case 'drive': {
        let fileList = driveFiles;
        if (proj && proj.linkedDriveFileIds && proj.linkedDriveFileIds.length > 0) {
          const linked = driveFiles.filter((f) => proj!.linkedDriveFileIds!.includes(f.id));
          if (linked.length > 0) fileList = linked;
        }
        return fileList.map((f) => ({ id: f.id, title: f.name }));
      }
      default:
        return [];
    }
  };

  // Filtered Timelogs
  const filteredLogs = timeLogs.filter((log) => {
    const matchesSearch =
      !searchQuery ||
      log.cardTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.description && log.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.projectName && log.projectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.linkTitle && log.linkTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.eventSummary && log.eventSummary.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = !selectedTagFilter || (log.tags && log.tags.includes(selectedTagFilter));
    const matchesProject = !selectedProjectFilter || log.projectId === selectedProjectFilter;
    const matchesLinkType = !selectedLinkTypeFilter || log.linkType === selectedLinkTypeFilter;

    return matchesSearch && matchesTag && matchesProject && matchesLinkType;
  });

  // Analytics
  const totalDurationMinutes = timeLogs.reduce((acc, log) => acc + (log.durationMinutes || 0), 0);
  const totalHours = (totalDurationMinutes / 60).toFixed(1);

  // Group duration by Tag for PieChart
  const tagDurationMap: Record<string, number> = {};
  timeLogs.forEach((log) => {
    const logTags = log.tags && log.tags.length > 0 ? log.tags : ['Etiketsiz'];
    logTags.forEach((t) => {
      tagDurationMap[t] = (tagDurationMap[t] || 0) + log.durationMinutes;
    });
  });

  const pieChartData = Object.keys(tagDurationMap).map((tag) => ({
    name: tag,
    value: tagDurationMap[tag],
  }));

  // Group duration by Card/Project for BarChart
  const cardDurationMap: Record<string, number> = {};
  timeLogs.forEach((log) => {
    const label = log.cardTitle.length > 20 ? log.cardTitle.substring(0, 20) + '...' : log.cardTitle;
    cardDurationMap[label] = (cardDurationMap[label] || 0) + log.durationMinutes;
  });

  const barChartData = Object.keys(cardDurationMap)
    .map((card) => ({
      name: card,
      dakika: cardDurationMap[card],
    }))
    .slice(0, 6);

  // Formatting Digits
  const formatTimerDigits = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const formatDateTimeDisplay = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  // Helper badge icon renderer for linked service
  const renderLinkBadge = (type?: string, title?: string, cardTitle?: string) => {
    if (!type || type === '' || type === 'none') return null;

    // If the link title is identical to the main cardTitle (or is a task link pointing to the same card), don't duplicate it
    if (title && cardTitle && title.trim().toLowerCase() === cardTitle.trim().toLowerCase()) {
      if (type === 'tasks' || type === 'task') return null;
    }

    const itemTitle = title || (isTr ? 'Bağlı Öğe' : 'Linked Item');

    switch (type) {
      case 'tasks':
      case 'task':
        return (
          <a
            href="https://tasks.google.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold hover:bg-emerald-100 hover:underline transition-all cursor-pointer"
            title={isTr ? 'Google Tasks Sayfasına Git' : 'Open Google Tasks'}
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[200px]">{itemTitle}</span>
            <ExternalLink className="w-2.5 h-2.5 text-emerald-600 opacity-70 ml-0.5 shrink-0" />
          </a>
        );
      case 'calendar':
      case 'event':
        return (
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold hover:bg-blue-100 hover:underline transition-all cursor-pointer"
            title={isTr ? 'Google Takvim Sayfasına Git' : 'Open Google Calendar'}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate max-w-[200px]">{itemTitle}</span>
            <ExternalLink className="w-2.5 h-2.5 text-blue-600 opacity-70 ml-0.5 shrink-0" />
          </a>
        );
      case 'gmail':
      case 'email':
        return (
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold hover:bg-rose-100 hover:underline transition-all cursor-pointer"
            title={isTr ? 'Gmail Sayfasına Git' : 'Open Gmail'}
          >
            <Mail className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="truncate max-w-[200px]">{itemTitle}</span>
            <ExternalLink className="w-2.5 h-2.5 text-rose-600 opacity-70 ml-0.5 shrink-0" />
          </a>
        );
      case 'drive':
        return (
          <a
            href="https://drive.google.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold hover:bg-amber-100 hover:underline transition-all cursor-pointer"
            title={isTr ? 'Google Drive Sayfasına Git' : 'Open Google Drive'}
          >
            <HardDrive className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate max-w-[200px]">{itemTitle}</span>
            <ExternalLink className="w-2.5 h-2.5 text-amber-600 opacity-70 ml-0.5 shrink-0" />
          </a>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-medium mb-3">
              <Clock className="w-3.5 h-3.5" />
              {isTr ? 'Kanban & Google Workspace Timelog' : 'Kanban & Google Workspace Timelog'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isTr ? 'Zaman Yönetimi & Kayıtlar' : 'Time Management & Logs'}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              {isTr
                ? 'Kanban kartlarınıza Google Tasks, Calendar, Gmail ve Drive öğelerini bağlayın, çalışma sürelerinizi not etiketleriyle analiz edin.'
                : 'Track work time on Kanban cards linked to Google Tasks, Calendar, Gmail & Drive.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              {isTr ? 'Zaman Kaydı Ekle' : 'Add Timelog'}
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-3.5 border border-slate-700/50">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              {isTr ? 'Toplam Süre' : 'Total Duration'}
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{totalHours} {isTr ? 'Saat' : 'Hours'}</div>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-3.5 border border-slate-700/50">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              {isTr ? 'Toplam Kayıt' : 'Total Timelogs'}
            </div>
            <div className="text-xl font-bold text-white mt-1">{timeLogs.length}</div>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-3.5 border border-slate-700/50">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              {isTr ? 'Aktif Kart / Proje' : 'Active Cards'}
            </div>
            <div className="text-xl font-bold text-indigo-300 mt-1">
              {new Set(timeLogs.map((l) => l.cardTitle)).size}
            </div>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-3.5 border border-slate-700/50">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              {isTr ? 'Etiket Sayısı' : 'Active Tags'}
            </div>
            <div className="text-xl font-bold text-amber-300 mt-1">{availableTags.length}</div>
          </div>
        </div>
      </div>

      {/* LIVE TIMER TRACKER */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${isTimerRunning ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                {isTr ? 'Canlı Zaman Sayacı' : 'Live Timer Tracker'}
              </h2>
              <p className="text-xs text-slate-500">
                {isTr ? 'Kanban kartı ve bağlı servisi seçip çalışmanızı canlı kaydedin.' : 'Track live work sessions on cards.'}
              </p>
            </div>
          </div>

          {/* Clock Display & Action Buttons */}
          <div className="flex items-center gap-3">
            <div className={`text-2xl font-mono font-bold tracking-tight px-4 py-2 rounded-2xl ${
              isTimerRunning ? 'bg-emerald-950 text-emerald-400 ring-2 ring-emerald-500/50' : 'bg-slate-100 text-slate-700'
            }`}>
              {formatTimerDigits(timerElapsedSeconds)}
            </div>

            {!isTimerRunning ? (
              <button
                onClick={handleStartTimer}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                {isTr ? 'Başlat' : 'Start'}
              </button>
            ) : (
              <button
                onClick={handleStopTimer}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <StopCircle className="w-4 h-4" />
                {isTr ? 'Durdur & Kaydet' : 'Stop & Save'}
              </button>
            )}
          </div>
        </div>

        {/* Live Timer Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Kanban Card Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-indigo-600" />
              {isTr ? 'İlişkili Kanban Kartı' : 'Related Kanban Card'}
            </label>
            <select
              value={activeCardId}
              onChange={(e) => {
                setActiveCardId(e.target.value);
                if (e.target.value) setActiveCustomTitle('');
              }}
              disabled={isTimerRunning}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75"
            >
              <option value="">{isTr ? '-- Kanban Kartı Seçin --' : '-- Select Kanban Card --'}</option>
              {projectTasks.map((task) => {
                const proj = projects.find((p) => p.id === task.projectId);
                return (
                  <option key={task.id} value={task.id}>
                    {proj ? `[${proj.name}] ` : ''}{task.title}
                  </option>
                );
              })}
            </select>
            {!activeCardId && (
              <input
                type="text"
                placeholder={isTr ? 'veya Özel Kart/Görev Başlığı...' : 'or Custom Task Title...'}
                value={activeCustomTitle}
                onChange={(e) => setActiveCustomTitle(e.target.value)}
                disabled={isTimerRunning}
                className="w-full mt-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            )}
          </div>

          {/* 2. Linked Google Workspace Service Options (Tasks, Calendar, Gmail, Drive) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              {isTr ? 'Bağlı Google Servisi' : 'Linked Google Service'}
            </label>
            <div className="grid grid-cols-5 gap-1 mb-2">
              <button
                type="button"
                disabled={isTimerRunning}
                onClick={() => { setActiveLinkType(''); setActiveLinkId(''); }}
                className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  !activeLinkType
                    ? 'bg-slate-700 text-white border-slate-700 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title={isTr ? 'Bağlı Öğe Yok' : 'No Linked Item'}
              >
                <span>{isTr ? 'Öğesiz' : 'None'}</span>
              </button>

              <button
                type="button"
                disabled={isTimerRunning}
                onClick={() => { setActiveLinkType('tasks'); setActiveLinkId(''); }}
                className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  activeLinkType === 'tasks'
                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="Google Tasks"
              >
                <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Tasks</span>
              </button>

              <button
                type="button"
                disabled={isTimerRunning}
                onClick={() => { setActiveLinkType('calendar'); setActiveLinkId(''); }}
                className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  activeLinkType === 'calendar'
                    ? 'bg-blue-600 text-white border-blue-600 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="Google Calendar"
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Takvim</span>
              </button>

              <button
                type="button"
                disabled={isTimerRunning}
                onClick={() => { setActiveLinkType('gmail'); setActiveLinkId(''); }}
                className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  activeLinkType === 'gmail'
                    ? 'bg-rose-600 text-white border-rose-600 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="Gmail"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Gmail</span>
              </button>

              <button
                type="button"
                disabled={isTimerRunning}
                onClick={() => { setActiveLinkType('drive'); setActiveLinkId(''); }}
                className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  activeLinkType === 'drive'
                    ? 'bg-amber-600 text-white border-amber-600 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="Google Drive"
              >
                <HardDrive className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Drive</span>
              </button>
            </div>

            {/* Sub-item selector for selected Google Service */}
            {activeLinkType && (
              <select
                value={activeLinkId}
                onChange={(e) => setActiveLinkId(e.target.value)}
                disabled={isTimerRunning}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75"
              >
                <option value="">
                  {isTr
                    ? `-- ${activeLinkType.toUpperCase()} Öğesi Seçin --`
                    : `-- Select ${activeLinkType.toUpperCase()} Item --`}
                </option>
                {getLinkedItemsOptions(activeLinkType, activeCardId).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 3. Tags (Strictly matching Notes tags + User tags) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5 text-amber-600" />
              {isTr ? 'Etiketler (Notlardaki Etiketler)' : 'Tags (Matching Notes)'}
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
              {availableTags.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic p-1">
                  {isTr ? 'Henüz etiket bulunmuyor.' : 'No tags found.'}
                </span>
              ) : (
                availableTags.map((tag) => {
                  const isSelected = activeTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={isTimerRunning}
                      onClick={() => {
                        if (isSelected) {
                          setActiveTags(activeTags.filter((t) => t !== tag));
                        } else {
                          setActiveTags([...activeTags, tag]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Work Description Note */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-slate-700">
              {isTr ? 'Açıklama / Detaylar (Markdown)' : 'Description / Details (Markdown)'}
            </label>
            <span className="text-[10px] text-slate-400">**kalın**, *italik*, - liste</span>
          </div>
          <textarea
            rows={2}
            placeholder={isTr ? 'Çalışma detayı veya not ekleyin (Markdown destekli)...' : 'Add work description or note (Markdown supported)...'}
            value={activeDescription}
            onChange={(e) => setActiveDescription(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* CHARTS & ANALYTICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <PieChartIcon className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              {isTr ? 'Not Etiketleri Bazında Zaman Dağılımı' : 'Time Distribution by Note Tags'}
            </h3>
          </div>
          {pieChartData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (%${(percent * 100).toFixed(0)})`}
                  >
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} dk`, 'Süre']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
              {isTr ? 'Henüz zaman kaydı bulunmuyor.' : 'No timelogs available.'}
            </div>
          )}
        </div>

        {/* Bar Chart */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              {isTr ? 'En Çok Zaman Ayrılan Kartlar (Dakika)' : 'Top Cards by Duration (Minutes)'}
            </h3>
          </div>
          {barChartData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => [`${value} dk`, 'Süre']} />
                  <Bar dataKey="dakika" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
              {isTr ? 'Henüz zaman kaydı bulunmuyor.' : 'No timelogs available.'}
            </div>
          )}
        </div>
      </div>

      {/* TIMELOG LIST & FULL MANAGEMENT SECTION (ADD, EDIT, DELETE) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {isTr ? 'Tüm Timelog Kayıtları & Yönetimi' : 'Timelog Records & Management'}
            </h3>
            <p className="text-xs text-slate-500">
              {isTr ? 'Kayıtlarınızı filtreleyin, düzenleyin veya silin.' : 'Filter, edit or delete your logged sessions.'}
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-bold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isTr ? 'Manuel Kayıt Ekle' : 'Add Manual Log'}
          </button>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={isTr ? 'Kart, proje, e-posta veya detay ara...' : 'Search card, project, or details...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Link Type Filter */}
            <select
              value={selectedLinkTypeFilter}
              onChange={(e) => setSelectedLinkTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{isTr ? 'Tüm Bağlı Servisler' : 'All Linked Services'}</option>
              <option value="tasks">📌 Google Tasks</option>
              <option value="calendar">📅 Google Calendar</option>
              <option value="gmail">✉️ Gmail</option>
              <option value="drive">📁 Google Drive</option>
            </select>

            {/* Tag Filter */}
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{isTr ? 'Tüm Etiketler' : 'All Tags'}</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>

            {/* Project Filter */}
            {projects.length > 0 && (
              <select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">{isTr ? 'Tüm Projeler' : 'All Projects'}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Timelog Records Cards List */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            {isTr ? 'Timelog kayıtları yükleniyor...' : 'Loading timelogs...'}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-2">
            <Clock className="w-8 h-8 mx-auto text-slate-300" />
            <p>{isTr ? 'Filtre kriterlerine uygun timelog kaydı bulunamadı.' : 'No timelogs match your filters.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              return (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-emerald-200 transition-all shadow-2xs group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    {/* Header: Card Title + Project + Linked Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      {log.cardTitle ? (
                        <button
                          type="button"
                          onClick={() => onSelectCard?.(log.cardId || log.linkId, log.cardTitle)}
                          className="font-bold text-slate-900 hover:text-purple-700 hover:underline text-sm inline-flex items-center gap-1.5 cursor-pointer group/card transition-colors"
                          title={isTr ? 'Projelere / Karta Git' : 'Go to Card'}
                        >
                          <FolderKanban className="w-3.5 h-3.5 text-purple-600 group-hover/card:scale-110 transition-transform shrink-0" />
                          <span>{log.cardTitle}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 opacity-60 group-hover/card:opacity-100 transition-opacity shrink-0" />
                        </button>
                      ) : (
                        <span className="font-bold text-slate-400 text-xs italic">
                          {isTr ? 'Kartsız Zaman Kaydı' : 'Unlinked Timelog'}
                        </span>
                      )}

                      {/* Linked Service Badge */}
                      {renderLinkBadge(log.linkType, log.linkTitle || log.eventSummary, log.cardTitle)}
                    </div>

                    {/* Description Note (Markdown Rendered) */}
                    {log.description && (
                      <div className="bg-white/80 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <MarkdownPreview content={log.description} className="text-xs" />
                      </div>
                    )}

                    {/* Note Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {log.tags && log.tags.length > 0 ? (
                        log.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Etiketsiz</span>
                      )}
                    </div>
                  </div>

                  {/* Duration + Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        {log.durationMinutes} {isTr ? 'dk' : 'min'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {formatDateTimeDisplay(log.startTime)} - {formatDateTimeDisplay(log.endTime)}
                      </div>
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(log)}
                        className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 transition-all cursor-pointer shadow-2xs"
                        title={isTr ? 'Güncelle / Düzenle' : 'Edit Timelog'}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-300 text-slate-500 hover:text-rose-600 transition-all cursor-pointer shadow-2xs"
                        title={isTr ? 'Sil' : 'Delete Timelog'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: EDIT / ADD TIMELOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-slate-900 text-base">
                  {editingLog ? (isTr ? 'Timelog Kaydını Güncelle' : 'Update Timelog') : (isTr ? 'Yeni Timelog Kaydı' : 'New Timelog')}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* Kanban Card Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isTr ? 'İlişkili Kanban Kartı' : 'Related Kanban Card'}
                </label>
                <select
                  value={formCardId}
                  onChange={(e) => {
                    setFormCardId(e.target.value);
                    if (e.target.value) setFormCustomTitle('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{isTr ? '-- Kanban Kartı Seçin --' : '-- Select Kanban Card --'}</option>
                  {projectTasks.map((task) => {
                    const proj = projects.find((p) => p.id === task.projectId);
                    return (
                      <option key={task.id} value={task.id}>
                        {proj ? `[${proj.name}] ` : ''}{task.title}
                      </option>
                    );
                  })}
                </select>
                {!formCardId && (
                  <input
                    type="text"
                    placeholder={isTr ? 'veya Özel Kart / Görev Başlığı...' : 'or Custom Card Title...'}
                    value={formCustomTitle}
                    onChange={(e) => setFormCustomTitle(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              {/* Google Service Options for Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  {isTr ? 'Bağlı Servis / Öğe' : 'Linked Service / Item'}
                </label>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => { setFormLinkType(''); setFormLinkId(''); }}
                    className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      !formLinkType
                        ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{isTr ? 'Öğesiz' : 'None'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setFormLinkType('tasks'); setFormLinkId(''); }}
                    className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      formLinkType === 'tasks'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                    <span>Tasks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setFormLinkType('calendar'); setFormLinkId(''); }}
                    className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      formLinkType === 'calendar'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Takvim</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setFormLinkType('gmail'); setFormLinkId(''); }}
                    className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      formLinkType === 'gmail'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>Gmail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setFormLinkType('drive'); setFormLinkId(''); }}
                    className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      formLinkType === 'drive'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <HardDrive className="w-3.5 h-3.5 shrink-0" />
                    <span>Drive</span>
                  </button>
                </div>

                {/* Dropdown list of items corresponding to selected Google Service */}
                {formLinkType && (
                  <select
                    value={formLinkId}
                    onChange={(e) => setFormLinkId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">
                      {isTr
                        ? `-- Karta / Projeye Bağlı ${formLinkType.toUpperCase()} Öğesini Seçin --`
                        : `-- Select Linked ${formLinkType.toUpperCase()} Item --`}
                    </option>
                    {getLinkedItemsOptions(formLinkType, formCardId).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Start & End Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isTr ? 'Başlangıç Zamanı' : 'Start Time'}
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isTr ? 'Bitiş Zamanı' : 'End Time'}
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Tags Section (Strictly Note Tags + Add New Tag) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isTr ? 'Etiketler (Not Etiketleri ile Eş)' : 'Tags (Matching Notes)'}
                </label>

                {availableTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mb-2 max-h-28 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                    {availableTags.map((tag) => {
                      const isSelected = formTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleFormTag(tag)}
                          className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic mb-2">
                    {isTr ? 'Notlarda kayıtlı etiket bulunamadı. Aşağıdan yeni bir etiket ekleyebilirsiniz.' : 'No note tags found. Add a new tag below.'}
                  </div>
                )}

                {/* Add New Tag Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={isTr ? 'Yeni etiket adı yazın...' : 'Type new tag name...'}
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTagFromInput();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTagFromInput}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    {isTr ? 'Yeni Etiket Ekle' : 'Add Tag'}
                  </button>
                </div>
              </div>

              {/* Description (Markdown Supported) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    {isTr ? 'Açıklama / Detaylar (Markdown Destekli)' : 'Description / Details (Markdown Supported)'}
                  </label>
                  <span className="text-[10px] text-slate-400">**kalın**, *italik*, # başlık, - liste</span>
                </div>
                <textarea
                  rows={3}
                  placeholder={isTr ? 'Çalışma sırasında yapılan işlerin özeti (Markdown formatı kullanılabilir: **kalın**, *italik*, - liste)...' : 'Summary of work done (Markdown format supported)...'}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  {isTr ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {isTr ? (editingLog ? 'Güncelle' : 'Kaydet') : (editingLog ? 'Update' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
