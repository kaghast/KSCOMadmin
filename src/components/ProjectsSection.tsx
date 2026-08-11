import React, { useState, useEffect } from 'react';
import { MarkdownPreview } from './MarkdownPreview';
import { createTaskSlug } from '../utils/slug';

const getNowDateTimeLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatNoteDateTime = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const iso = dateStr.includes('T') ? dateStr : `${dateStr}T12:00`;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return dateStr;
    const datePart = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timePart = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${datePart} ${timePart}`;
  } catch {
    return dateStr;
  }
};
import {
  FolderKanban,
  Plus,
  Edit2,
  Edit3,
  Trash2,
  Share2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Mail,
  Calendar,
  HardDrive,
  Users,
  ChevronRight,
  ChevronLeft,
  MoveRight,
  Save,
  ExternalLink,
  Loader2,
  X,
  Tag,
  Check,
  Search,
  MoreVertical,
  Layers,
  Filter,
  BarChart3,
  ChevronDown,
} from 'lucide-react';
import { LinkedItemSummary } from './SearchModal';
import {
  Project,
  ProjectColumn,
  ProjectTask,
  TaskPriority,
  NoteItem,
  EmailItem,
  CalendarEvent,
  DriveFile,
  ContactItem,
  TaskItem,
  TimeLog,
  NoteType,
} from '../types';

interface Props {
  projects: Project[];
  tasks: ProjectTask[];
  googleTasks?: TaskItem[];
  notes: NoteItem[];
  emails: EmailItem[];
  events: CalendarEvent[];
  driveFiles: DriveFile[];
  contacts: ContactItem[];
  noteTypes?: NoteType[];
  onUpdateProject: (project: Project) => Promise<void>;
  onCreateProject: (projectData: Partial<Project>) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onCreateTask: (projectId: string, taskData: Partial<ProjectTask>) => Promise<void>;
  onUpdateTask: (task: ProjectTask) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onOpenNoteModal: (note?: NoteItem) => void;
  language?: 'tr' | 'en';
  initialTaskIdOrSlug?: string | null;
  onSelectTaskSlug?: (task: ProjectTask | null) => void;
  onOpenSearchWithItem?: (item: LinkedItemSummary) => void;
}

export const ProjectsSection: React.FC<Props> = ({
  projects,
  tasks,
  googleTasks = [],
  notes,
  emails,
  events,
  driveFiles,
  contacts,
  noteTypes = [
    { id: 'note', name: 'Düz Not', isSystem: true },
    { id: 'timelog', name: 'Timelog', isSystem: true },
  ],
  onUpdateProject,
  onCreateProject,
  onDeleteProject,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onOpenNoteModal,
  language = 'tr',
  initialTaskIdOrSlug,
  onSelectTaskSlug,
  onOpenSearchWithItem,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects[0]?.id || ''
  );

  // Custom display titles for linked items (saved in localStorage)
  const [customItemTitles, setCustomItemTitles] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('custom_linked_titles');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [editingItemInfo, setEditingItemInfo] = useState<{
    key: string;
    type: 'task' | 'email' | 'event' | 'drive' | 'contact';
    typeLabel: string;
    originalTitle: string;
    currentTitle: string;
    url?: string;
  } | null>(null);

  const [tempEditTitle, setTempEditTitle] = useState('');

  const handleSaveCustomTitle = () => {
    if (!editingItemInfo) return;
    const newTitle = tempEditTitle.trim();
    const updated = { ...customItemTitles };
    if (newTitle && newTitle !== editingItemInfo.originalTitle) {
      updated[editingItemInfo.key] = newTitle;
    } else {
      delete updated[editingItemInfo.key];
    }
    setCustomItemTitles(updated);
    try {
      localStorage.setItem('custom_linked_titles', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save custom linked title:', e);
    }
    setEditingItemInfo(null);
  };

  // Sync selectedProjectId when projects array loads or changes
  useEffect(() => {
    if (projects.length > 0 && (!selectedProjectId || !projects.some((p) => p.id === selectedProjectId))) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Priority Filter on Kanban Board
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'none'>('all');

  // Modals & Form State
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [targetColumnId, setTargetColumnId] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');

  const [isNewColumnModalOpen, setIsNewColumnModalOpen] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const [editingColumn, setEditingColumn] = useState<ProjectColumn | null>(null);
  const [editColumnTitle, setEditColumnTitle] = useState('');

  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [detailTask, setDetailTask] = useState<ProjectTask | null>(null);

  // Sync setDetailTask with external URL routing callback
  const handleSetDetailTask = (t: ProjectTask | null) => {
    setDetailTask(t);
    if (onSelectTaskSlug) {
      onSelectTaskSlug(t);
    }
  };

  // Automatically fetch Drive files on mount to ensure metadata is present for linked files
  useEffect(() => {
    fetch('/api/drive/files?limit=100')
      .then((res) => res.json())
      .then((data) => {
        if (data.files && Array.isArray(data.files)) {
          setRemoteDriveFiles(data.files);
        }
      })
      .catch(() => {});
  }, []);

  // Sync initialTaskIdOrSlug from URL to set detailTask on page load or URL change
  useEffect(() => {
    if (initialTaskIdOrSlug && tasks && tasks.length > 0) {
      const param = initialTaskIdOrSlug.trim();
      const found = tasks.find((t) => {
        if (t.id === param) return true;
        const slug = createTaskSlug(t);
        if (slug === param) return true;
        if (param.endsWith(`-${t.id}`) || param.endsWith(t.id) || param.includes(t.id)) return true;
        return false;
      });
      if (found) {
        setDetailTask(found);
        if (found.projectId) {
          setSelectedProjectId(found.projectId);
        }
      }
    }
  }, [initialTaskIdOrSlug, tasks]);

  // Detail View Title & Description Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleText, setEditTitleText] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescriptionText, setEditDescriptionText] = useState('');

  // Note Filtering & Sorting State in Card Detail View
  const [noteTypeFilter, setNoteTypeFilter] = useState<string>('all');
  const [noteTagFilter, setNoteTagFilter] = useState<string>('all');
  const [noteSortOrder, setNoteSortOrder] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [cardNotesVisibleCount, setCardNotesVisibleCount] = useState<number>(10);

  useEffect(() => {
    setCardNotesVisibleCount(10);
  }, [noteTypeFilter, noteTagFilter, noteSortOrder, detailTask?.id]);

  // Live Timer for Deadline Countdown
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (detailTask) {
      const updated = tasks.find((t) => t.id === detailTask.id);
      if (updated) {
        setDetailTask(updated);
        setEditDescriptionText(updated.description || '');
        setEditTitleText(updated.title || '');
      }
    }
  }, [tasks, detailTask?.id]);

  // Countdown Helper
  const getCountdown = (dueDateStr?: string) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr.includes('T') ? dueDateStr : `${dueDateStr}T23:59:59`);
    const diffMs = due.getTime() - currentTime.getTime();

    const isPast = diffMs < 0;
    const absMs = Math.abs(diffMs);

    const days = Math.floor(absMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((absMs % (1000 * 60)) / 1000);

    let formatted = '';
    if (days > 0) formatted += `${days}g `;
    if (hours > 0 || days > 0) formatted += `${hours}sa `;
    if (minutes > 0 || hours > 0 || days > 0) formatted += `${minutes}dk `;
    formatted += `${seconds}sn`;

    if (isPast) {
      return {
        text: `Süresi Doldu (${formatted} önce)`,
        status: 'expired' as const,
      };
    } else if (days < 1) {
      return {
        text: `Kalan Süre: ${formatted}`,
        status: 'urgent' as const,
      };
    } else if (days <= 2) {
      return {
        text: `Kalan Süre: ${formatted}`,
        status: 'warning' as const,
      };
    } else {
      return {
        text: `Kalan Süre: ${formatted}`,
        status: 'normal' as const,
      };
    }
  };

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Drive Sync Loading & Feedback
  const [isSyncingMarkdown, setIsSyncingMarkdown] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    message: string;
    url?: string;
    type: 'success' | 'error';
  } | null>(null);

  // Link Modals & Realtime Entity Search
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkEntityType, setLinkEntityType] = useState<
    'email' | 'event' | 'drive' | 'contact' | 'task'
  >('email');
  const [entitySearch, setEntitySearch] = useState('');
  const [isSearchingEntities, setIsSearchingEntities] = useState(false);
  const [remoteDriveFiles, setRemoteDriveFiles] = useState<DriveFile[]>([]);
  const [remoteContacts, setRemoteContacts] = useState<ContactItem[]>([]);
  const [remoteGoogleTasks, setRemoteGoogleTasks] = useState<TaskItem[]>([]);
  const [remoteEmails, setRemoteEmails] = useState<EmailItem[]>([]);
  const [remoteEvents, setRemoteEvents] = useState<CalendarEvent[]>([]);
  const [showCompletedGoogleTasks, setShowCompletedGoogleTasks] = useState(false);

  useEffect(() => {
    if (!isLinkModalOpen) return;

    const timer = setTimeout(() => {
      setIsSearchingEntities(true);
      const q = encodeURIComponent(entitySearch.trim());

      if (linkEntityType === 'drive') {
        const queryParam = entitySearch.trim()
          ? `search=${q}&limit=30`
          : `limit=10`;
        fetch(`/api/drive/files?${queryParam}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.files && Array.isArray(data.files)) {
              setRemoteDriveFiles(data.files);
            }
          })
          .catch((err) => console.error('Drive fetch error:', err))
          .finally(() => setIsSearchingEntities(false));
      } else if (linkEntityType === 'contact') {
        fetch(`/api/contacts?search=${q}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.contacts && Array.isArray(data.contacts)) {
              setRemoteContacts(data.contacts);
            }
          })
          .catch((err) => console.error('Contacts fetch error:', err))
          .finally(() => setIsSearchingEntities(false));
      } else if (linkEntityType === 'task') {
        fetch(`/api/tasks?search=${q}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.tasks && Array.isArray(data.tasks)) {
              setRemoteGoogleTasks(data.tasks);
            }
          })
          .catch((err) => console.error('Tasks fetch error:', err))
          .finally(() => setIsSearchingEntities(false));
      } else if (linkEntityType === 'email') {
        fetch(`/api/gmail/messages?search=${q}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.messages && Array.isArray(data.messages)) {
              setRemoteEmails(data.messages);
            }
          })
          .catch((err) => console.error('Emails fetch error:', err))
          .finally(() => setIsSearchingEntities(false));
      } else if (linkEntityType === 'event') {
        fetch(`/api/calendar/events?search=${q}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.events && Array.isArray(data.events)) {
              setRemoteEvents(data.events);
            }
          })
          .catch((err) => console.error('Events fetch error:', err))
          .finally(() => setIsSearchingEntities(false));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isLinkModalOpen, linkEntityType, entitySearch]);

  // Timelogs State & Filters
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [detailActiveTab, setDetailActiveTab] = useState<'notes' | 'timelogs'>('notes');
  const [timelogSearch, setTimelogSearch] = useState('');
  const [timelogServiceFilter, setTimelogServiceFilter] = useState('all');
  const [timelogTagFilter, setTimelogTagFilter] = useState('all');

  // Add Manual Timelog Modal State
  const [isAddTimelogModalOpen, setIsAddTimelogModalOpen] = useState(false);
  const [manualDescription, setManualDescription] = useState('');
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');
  const [manualDurationMinutes, setManualDurationMinutes] = useState(30);
  const [manualLinkType, setManualLinkType] = useState<string>('');
  const [manualLinkId, setManualLinkId] = useState<string>('');
  const [manualLinkTitle, setManualLinkTitle] = useState<string>('');
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [manualTagInput, setManualTagInput] = useState<string>('');
  const [isSavingTimelog, setIsSavingTimelog] = useState(false);

  useEffect(() => {
    fetchTimelogs();
  }, []);

  const fetchTimelogs = async () => {
    try {
      const res = await fetch('/api/timelogs');
      if (res.ok) {
        const data = await res.json();
        if (data.timelogs && Array.isArray(data.timelogs)) {
          setTimeLogs(data.timelogs);
        }
      }
    } catch (err) {
      console.error('Failed to fetch timelogs:', err);
    }
  };

  const getItemTimelogMinutes = (
    type: 'task' | 'email' | 'event' | 'drive' | 'contact',
    itemId: string
  ) => {
    if (!timeLogs || timeLogs.length === 0) return 0;
    return timeLogs.reduce((sum, log) => {
      let match = false;
      if (log.linkId === itemId) match = true;
      if (type === 'event' && log.eventId === itemId) match = true;
      if (type === 'task' && (log.linkType === 'tasks' || log.linkType === 'task') && log.linkId === itemId) match = true;
      if (type === 'email' && (log.linkType === 'gmail' || log.linkType === 'email') && log.linkId === itemId) match = true;
      if (type === 'event' && (log.linkType === 'calendar' || log.linkType === 'event') && log.linkId === itemId) match = true;
      if (type === 'drive' && log.linkType === 'drive' && log.linkId === itemId) match = true;
      if (type === 'contact' && log.linkId === itemId) match = true;
      return match ? sum + (log.durationMinutes || 0) : sum;
    }, 0);
  };

  const formatMinutesToText = (minutes: number) => {
    if (!minutes || minutes <= 0) return '0 dk';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0 && mins > 0) return `${hrs}s ${mins}dk`;
    if (hrs > 0) return `${hrs}s`;
    return `${mins}dk`;
  };

  const handleDeleteTimelog = async (logId: string) => {
    try {
      await fetch(`/api/timelogs/${logId}`, { method: 'DELETE' });
      setTimeLogs((prev) => prev.filter((l) => l.id !== logId));
    } catch (err) {
      console.error('Failed to delete timelog:', err);
    }
  };

  const handleOpenAddTimelogModal = () => {
    const now = new Date();
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const toDatetimeLocal = (d: Date) => {
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate()
      )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setManualStartTime(toDatetimeLocal(thirtyMinsAgo));
    setManualEndTime(toDatetimeLocal(now));
    setManualDurationMinutes(30);
    setManualDescription('');
    setManualLinkType('');
    setManualLinkId('');
    setManualLinkTitle('');
    setManualTags([]);
    setManualTagInput('');
    setIsAddTimelogModalOpen(true);
  };

  const handleCalculateManualDuration = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return;
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    if (!isNaN(start) && !isNaN(end) && end > start) {
      const mins = Math.round((end - start) / (60 * 1000));
      setManualDurationMinutes(mins);
    }
  };

  const handleSaveManualTimelog = async (
    e: React.FormEvent,
    cardId: string,
    cardTitle: string,
    projId: string,
    projName: string
  ) => {
    e.preventDefault();
    setIsSavingTimelog(true);

    const newLog: TimeLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      cardId,
      cardTitle,
      projectId: projId,
      projectName: projName,
      linkType: manualLinkType || undefined,
      linkId: manualLinkId || undefined,
      linkTitle: manualLinkTitle || undefined,
      startTime: manualStartTime || new Date().toISOString(),
      endTime: manualEndTime || new Date().toISOString(),
      durationMinutes: Math.max(1, Number(manualDurationMinutes) || 1),
      description: manualDescription.trim() || 'Manuel Zaman Kaydı',
      tags: manualTags,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/timelogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog),
      });

      if (res.ok) {
        setTimeLogs((prev) => [newLog, ...prev]);
        setIsAddTimelogModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to save timelog:', err);
    } finally {
      setIsSavingTimelog(false);
    }
  };

  const activeProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0];

  const projectTasks = tasks.filter(
    (t) => t.projectId === (activeProject?.id || '')
  );

  const projectNotes = notes.filter((n) => {
    if (!activeProject) return false;
    if (n.projectId === activeProject.id) return true;
    if (activeProject.linkedNoteIds?.includes(n.id)) return true;
    if (projectTasks.some((t) => t.id === n.projectId)) return true;
    return false;
  });

  // Projeye ve zaman kayıtlarına/notlara bağlı tüm öğeleri derleyelim
  const projectTimelogs = timeLogs.filter((log) => {
    if (!activeProject) return false;
    if (log.projectId === activeProject.id) return true;
    if (projectTasks.some((t) => t.id === log.projectId || t.id === log.cardId)) return true;
    return false;
  });

  const timelogTaskIds = new Set<string>();
  const timelogEmailIds = new Set<string>();
  const timelogEventIds = new Set<string>();
  const timelogDriveIds = new Set<string>();
  const timelogContactIds = new Set<string>();

  projectTimelogs.forEach((log) => {
    const targetId = log.linkId || log.entityId || log.eventId;
    const targetType = log.linkType || log.entityType;
    if (!targetId) return;

    if (targetType === 'tasks' || targetType === 'task') timelogTaskIds.add(targetId);
    if (targetType === 'gmail' || targetType === 'email') timelogEmailIds.add(targetId);
    if (targetType === 'calendar' || targetType === 'event') timelogEventIds.add(targetId);
    if (targetType === 'drive') timelogDriveIds.add(targetId);
    if (targetType === 'contact') timelogContactIds.add(targetId);
  });

  projectNotes.forEach((n: any) => {
    if (n.linkedTaskIds && Array.isArray(n.linkedTaskIds)) n.linkedTaskIds.forEach((id: string) => timelogTaskIds.add(id));
    if (n.linkedEmailIds && Array.isArray(n.linkedEmailIds)) n.linkedEmailIds.forEach((id: string) => timelogEmailIds.add(id));
    if (n.linkedEventIds && Array.isArray(n.linkedEventIds)) n.linkedEventIds.forEach((id: string) => timelogEventIds.add(id));
    if (n.linkedDriveFileIds && Array.isArray(n.linkedDriveFileIds)) n.linkedDriveFileIds.forEach((id: string) => timelogDriveIds.add(id));
    if (n.linkedContactResourceNames && Array.isArray(n.linkedContactResourceNames)) n.linkedContactResourceNames.forEach((res: string) => timelogContactIds.add(res));
  });

  const allTasksMap = new Map<string, TaskItem>();
  (googleTasks || []).forEach((gt) => allTasksMap.set(gt.id, gt));
  (remoteGoogleTasks || []).forEach((gt) => allTasksMap.set(gt.id, gt));

  const combinedTaskIds = Array.from(
    new Set([
      ...(activeProject?.linkedTaskIds || []),
      ...Array.from(timelogTaskIds),
    ])
  );

  const linkedGoogleTasksList = combinedTaskIds
    .map((id) => allTasksMap.get(id))
    .filter(Boolean) as TaskItem[];

  const filteredGoogleTasksList = linkedGoogleTasksList.filter(
    (gt) => showCompletedGoogleTasks || gt.status !== 'completed'
  );

  const allEmailsMap = new Map<string, EmailItem>();
  (emails || []).forEach((e) => allEmailsMap.set(e.id, e));
  (remoteEmails || []).forEach((e) => allEmailsMap.set(e.id, e));

  const combinedEmailIds = Array.from(
    new Set([
      ...(activeProject?.linkedEmailIds || []),
      ...Array.from(timelogEmailIds),
    ])
  );

  const linkedEmailsList = combinedEmailIds
    .map((id) => allEmailsMap.get(id))
    .filter(Boolean) as EmailItem[];

  const allEventsMap = new Map<string, CalendarEvent>();
  (events || []).forEach((evt) => allEventsMap.set(evt.id, evt));
  (remoteEvents || []).forEach((evt) => allEventsMap.set(evt.id, evt));

  const combinedEventIds = Array.from(
    new Set([
      ...(activeProject?.linkedEventIds || []),
      ...Array.from(timelogEventIds),
    ])
  );

  const linkedEventsList = combinedEventIds
    .map((id) => allEventsMap.get(id))
    .filter(Boolean) as CalendarEvent[];

  const allDriveFilesMap = new Map<string, DriveFile>();
  (driveFiles || []).forEach((f) => allDriveFilesMap.set(f.id, f));
  (remoteDriveFiles || []).forEach((f) => allDriveFilesMap.set(f.id, f));

  const combinedDriveIds = Array.from(
    new Set([
      ...(activeProject?.linkedDriveFileIds || []),
      ...Array.from(timelogDriveIds),
    ])
  );

  const linkedDriveFilesList = combinedDriveIds
    .map((id) => allDriveFilesMap.get(id) || {
      id,
      name: 'Google Drive Dosyası',
      mimeType: 'application/vnd.google-apps.document',
      webViewLink: id.startsWith('http') ? id : `https://drive.google.com/file/d/${id}/view`,
      modifiedTime: new Date().toISOString(),
      isFolder: false,
    })
    .filter(Boolean) as DriveFile[];

  const allContactsMap = new Map<string, ContactItem>();
  (contacts || []).forEach((c) => allContactsMap.set(c.resourceName, c));
  (remoteContacts || []).forEach((c) => allContactsMap.set(c.resourceName, c));

  const combinedContactIds = Array.from(
    new Set([
      ...(activeProject?.linkedContactResourceNames || []),
      ...Array.from(timelogContactIds),
    ])
  );

  const linkedContactsList = combinedContactIds
    .map((resName) => {
      const found = allContactsMap.get(resName);
      if (found) return found;
      return {
        resourceName: resName,
        displayName: resName.startsWith('people/')
          ? `Kişi (${resName.replace('people/', '')})`
          : resName,
        email: '',
        phone: '',
      };
    })
    .filter(Boolean) as ContactItem[];

  // Handle Export Markdown to Google Drive
  const handleExportMarkdown = async () => {
    if (!activeProject) return;
    setIsSyncingMarkdown(true);
    setSyncFeedback(null);

    try {
      const res = await fetch(
        `/api/projects/${activeProject.id}/export-markdown`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes: projectNotes,
            emails: linkedEmailsList,
            events: linkedEventsList,
            driveFiles: linkedDriveFilesList,
            contacts: linkedContactsList,
          }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        setSyncFeedback({
          message: `Markdown dosyası (${activeProject.name}.md) Drive 'adminspace' klasörüne başarıyla kaydedildi!`,
          url: data.driveFileUrl,
          type: 'success',
        });
      } else {
        throw new Error(data.error || 'Aktarım başarısız oldu');
      }
    } catch (err: any) {
      setSyncFeedback({
        message: err.message || 'Drive senkronizasyonunda bir hata oluştu',
        type: 'error',
      });
    } finally {
      setIsSyncingMarkdown(false);
    }
  };

  // Add Column Handler
  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newColumnTitle.trim()) return;

    const newCol: ProjectColumn = {
      id: `col-${Date.now()}`,
      title: newColumnTitle.trim(),
      color: 'bg-slate-100 text-slate-800',
    };

    const updatedCols = [...(activeProject.columns || []), newCol];
    await onUpdateProject({
      ...activeProject,
      columns: updatedCols,
    });

    setNewColumnTitle('');
    setIsNewColumnModalOpen(false);
  };

  // Rename Column Handler
  const handleRenameColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !editingColumn || !editColumnTitle.trim()) return;

    const updatedCols = activeProject.columns.map((c) =>
      c.id === editingColumn.id ? { ...c, title: editColumnTitle.trim() } : c
    );

    await onUpdateProject({
      ...activeProject,
      columns: updatedCols,
    });

    setEditingColumn(null);
    setEditColumnTitle('');
  };

  // Delete Column Handler
  const handleDeleteColumn = async (columnId: string) => {
    if (!activeProject) return;
    if (
      !window.confirm(
        'Bu sütunu silmek istediğinizden emin misiniz? Sütundaki tüm görevler silinecektir.'
      )
    )
      return;

    const updatedCols = activeProject.columns.filter((c) => c.id !== columnId);
    // Delete tasks in this column
    const tasksInCol = projectTasks.filter((t) => t.columnId === columnId);
    for (const t of tasksInCol) {
      await onDeleteTask(t.id);
    }

    await onUpdateProject({
      ...activeProject,
      columns: updatedCols,
    });
  };

  // Move Task Handler
  const handleMoveTask = async (task: ProjectTask, newColumnId: string) => {
    await onUpdateTask({
      ...task,
      columnId: newColumnId,
    });
  };

  const handleMoveTaskById = async (taskId: string, newColumnId: string) => {
    const taskToMove = projectTasks.find((t) => t.id === taskId);
    if (taskToMove && taskToMove.columnId !== newColumnId) {
      await handleMoveTask(taskToMove, newColumnId);
    }
  };

  // Create Task Submission
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !taskTitle.trim() || !targetColumnId) return;

    await onCreateTask(activeProject.id, {
      columnId: targetColumnId,
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      priority: taskPriority,
      dueDate: taskDueDate || undefined,
      assignee: taskAssignee.trim() || undefined,
    });

    setSelectedPriorityFilter('all');
    setTaskTitle('');
    setTaskDesc('');
    setTaskDueDate('');
    setTaskAssignee('');
    setIsNewTaskModalOpen(false);
  };

  // Update Task Submission
  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    await onUpdateTask(editingTask);
    setEditingTask(null);
  };

  // Toggle Entity Link
  const handleToggleEntityLink = async (
    type: 'email' | 'event' | 'drive' | 'contact' | 'task',
    idOrResource: string
  ) => {
    if (detailTask) {
      let updatedTask = { ...detailTask };

      if (type === 'email') {
        const current = updatedTask.linkedEmailIds || [];
        updatedTask.linkedEmailIds = current.includes(idOrResource)
          ? current.filter((id) => id !== idOrResource)
          : [...current, idOrResource];
      } else if (type === 'event') {
        const current = updatedTask.linkedEventIds || [];
        updatedTask.linkedEventIds = current.includes(idOrResource)
          ? current.filter((id) => id !== idOrResource)
          : [...current, idOrResource];
      } else if (type === 'drive') {
        const current = updatedTask.linkedDriveFileIds || [];
        updatedTask.linkedDriveFileIds = current.includes(idOrResource)
          ? current.filter((id) => id !== idOrResource)
          : [...current, idOrResource];
      } else if (type === 'contact') {
        const current = updatedTask.linkedContactResourceNames || [];
        updatedTask.linkedContactResourceNames = current.includes(idOrResource)
          ? current.filter((res) => res !== idOrResource)
          : [...current, idOrResource];
      } else if (type === 'task') {
        const current = updatedTask.linkedTaskIds || [];
        updatedTask.linkedTaskIds = current.includes(idOrResource)
          ? current.filter((id) => id !== idOrResource)
          : [...current, idOrResource];
      }

      setDetailTask(updatedTask);
      await onUpdateTask(updatedTask);
      return;
    }

    if (!activeProject) return;

    let updatedProject = { ...activeProject };

    if (type === 'email') {
      const current = updatedProject.linkedEmailIds || [];
      updatedProject.linkedEmailIds = current.includes(idOrResource)
        ? current.filter((id) => id !== idOrResource)
        : [...current, idOrResource];
    } else if (type === 'event') {
      const current = updatedProject.linkedEventIds || [];
      updatedProject.linkedEventIds = current.includes(idOrResource)
        ? current.filter((id) => id !== idOrResource)
        : [...current, idOrResource];
    } else if (type === 'drive') {
      const current = updatedProject.linkedDriveFileIds || [];
      updatedProject.linkedDriveFileIds = current.includes(idOrResource)
        ? current.filter((id) => id !== idOrResource)
        : [...current, idOrResource];
    } else if (type === 'contact') {
      const current = updatedProject.linkedContactResourceNames || [];
      updatedProject.linkedContactResourceNames = current.includes(
        idOrResource
      )
        ? current.filter((res) => res !== idOrResource)
        : [...current, idOrResource];
    } else if (type === 'task') {
      const current = updatedProject.linkedTaskIds || [];
      updatedProject.linkedTaskIds = current.includes(idOrResource)
        ? current.filter((id) => id !== idOrResource)
        : [...current, idOrResource];
    }

    await onUpdateProject(updatedProject);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 overflow-hidden">
      {/* 1. TOP HEADER & PROJECT SELECTOR */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        {/* Left: Section Title */}
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-purple-100 text-purple-700 rounded-2xl shadow-xs">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Projeler & Kanban Yönetimi
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Görev kartlarınızı sürükleyip bırakın veya detaylarını tam sayfada düzenleyin
            </p>
          </div>
        </div>

        {/* Priority Filter Bar */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner">
          <span className="text-[11px] font-black text-slate-500 pl-2 pr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-purple-600" /> Öncelik:
          </span>
          {(
            [
              { id: 'all', label: 'Tümü' },
              { id: 'high', label: 'Yüksek' },
              { id: 'medium', label: 'Orta' },
              { id: 'low', label: 'Düşük' },
              { id: 'none', label: 'Önceliksiz' },
            ] as const
          ).map((p) => {
            const isActive = selectedPriorityFilter === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPriorityFilter(p.id)}
                className={`px-3 py-1 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Right Action: Yeni Kart Ekle Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setTargetColumnId(activeProject?.columns?.[0]?.id || 'col-1');
              setIsNewTaskModalOpen(true);
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white border border-purple-600 rounded-xl text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
            title="Yeni Proje Kartı Ekle"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Kart Ekle</span>
          </button>
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div
          className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between border-b ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{syncFeedback.message}</span>
            {syncFeedback.url && (
              <a
                href={syncFeedback.url}
                target="_blank"
                rel="noreferrer"
                className="underline font-black text-emerald-700 hover:text-emerald-950 flex items-center gap-1 ml-2"
              >
                Drive'da Görüntüle <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. DIRECT KANBAN BOARD VIEW */}
      {activeProject ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 p-6 overflow-x-auto overflow-y-auto bg-slate-100/70">
              <div className="flex items-start gap-5 min-w-max pb-6">
                {(activeProject.columns || []).map((col) => {
                  const colTasks = projectTasks.filter((t) => {
                    if (t.columnId !== col.id) return false;
                    if (selectedPriorityFilter === 'all') return true;
                    const taskP = t.priority || 'none';
                    return taskP === selectedPriorityFilter;
                  });

                  const isOver = dragOverColId === col.id;

                  return (
                    <div
                      key={col.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverColId !== col.id) setDragOverColId(col.id);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        if (dragOverColId === col.id) setDragOverColId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const tId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                        if (tId) {
                          handleMoveTaskById(tId, col.id);
                        }
                        setDragOverColId(null);
                        setDraggedTaskId(null);
                      }}
                      className={`w-80 bg-slate-200/60 rounded-3xl p-4 border transition-all flex flex-col max-h-[calc(100vh-220px)] shadow-xs ${
                        isOver
                          ? 'border-purple-500 bg-purple-100/40 ring-2 ring-purple-500/30'
                          : 'border-slate-300/80'
                      }`}
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-800 text-sm">
                            {col.title}
                          </h3>
                          <span className="px-2 py-0.5 bg-slate-300/80 text-slate-700 text-xs font-black rounded-full">
                            {colTasks.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setTargetColumnId(col.id);
                              setIsNewTaskModalOpen(true);
                            }}
                            className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100/70 rounded-lg cursor-pointer transition-colors"
                            title="Bu Sütuna Kart Ekle"
                          >
                            <Plus className="w-4 h-4 font-bold" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingColumn(col);
                              setEditColumnTitle(col.title);
                            }}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-300 rounded-lg cursor-pointer transition-colors"
                            title="Sütunu Yeniden Adlandır"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteColumn(col.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-300 rounded-lg cursor-pointer transition-colors"
                            title="Sütunu Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Task Cards Container */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[100px]">
                        {colTasks.map((task) => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', task.id);
                              setDraggedTaskId(task.id);
                            }}
                            onDragEnd={() => {
                              setDraggedTaskId(null);
                              setDragOverColId(null);
                            }}
                            onClick={() => handleSetDetailTask(task)}
                            className={`bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:shadow-md transition-all group space-y-2.5 cursor-grab active:cursor-grabbing hover:border-purple-300 ${
                              draggedTaskId === task.id ? 'opacity-40 scale-95' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-extrabold text-slate-900 text-xs leading-snug group-hover:text-purple-900">
                                {task.title}
                              </h4>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetDetailTask(task);
                                  }}
                                  className="p-1 text-slate-400 hover:text-purple-600 cursor-pointer"
                                  title="Detaylar"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTask(task);
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title="Düzenle"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTask(task.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="Sil"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {task.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium">
                                {task.description}
                              </p>
                            )}

                            {/* Task Metadata Badges */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {task.priority === 'high' && (
                                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md font-extrabold">
                                    Yüksek
                                  </span>
                                )}
                                {task.priority === 'medium' && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-extrabold">
                                    Orta
                                  </span>
                                )}
                                {task.priority === 'low' && (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-extrabold">
                                    Düşük
                                  </span>
                                )}
                                {(task.priority === 'none' || !task.priority) && (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-semibold">
                                    Önceliksiz
                                  </span>
                                )}

                                {task.dueDate && (
                                  <span className="flex items-center gap-1 text-slate-500 font-semibold">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {task.dueDate}
                                  </span>
                                )}
                              </div>

                              {/* Column Transfer Select */}
                              <select
                                value={col.id}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  handleMoveTask(task, e.target.value)
                                }
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg px-1.5 py-0.5 focus:outline-hidden cursor-pointer"
                              >
                                {activeProject.columns.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    Taşı: {c.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}

                        {colTasks.length === 0 && (
                          <div className="py-8 text-center border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 text-xs italic font-medium">
                            Proje kartı yok
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add New Column Button */}
                <button
                  onClick={() => setIsNewColumnModalOpen(true)}
                  className="w-72 py-6 bg-slate-200/50 hover:bg-slate-200 border-2 border-dashed border-slate-300 rounded-3xl text-slate-600 text-xs font-extrabold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer h-32 shrink-0"
                >
                  <Plus className="w-5 h-5 text-purple-600" />
                  <span>Yeni Sütun Ekle</span>
                </button>
              </div>
            </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
          <FolderKanban className="w-16 h-16 text-slate-300 mb-3" />
          <h2 className="text-lg font-extrabold text-slate-700 mb-1">
            Proje Bulunamadı
          </h2>
          <p className="text-xs max-w-md mb-4">
            Henüz oluşturulmuş bir proje kartı bulunmuyor. "Yeni Kart Ekle" butonuna basarak kart oluşturabilirsiniz.
          </p>
        </div>
      )}
      {/* MODAL: NEW TASK MODAL */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                Yeni Kanban Kartı Ekle
              </h3>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sütun *
                </label>
                <select
                  value={targetColumnId}
                  onChange={(e) => setTargetColumnId(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden text-slate-900 font-bold cursor-pointer"
                >
                  {(activeProject?.columns || []).map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Görev Başlığı *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Görev adı..."
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Detaylar..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 resize-none h-20"
                />
              </div>

              <div className={`grid ${taskPriority === 'none' ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Öncelik
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => {
                      const newP = e.target.value as TaskPriority;
                      setTaskPriority(newP);
                      if (newP === 'none') {
                        setTaskDueDate('');
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-hidden"
                  >
                    <option value="none">Önceliksiz</option>
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                  </select>
                </div>

                {taskPriority !== 'none' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Son Tarih
                    </label>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Kart Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT TASK MODAL */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                Görevi Düzenle
              </h3>
              <button
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Görev Başlığı
                </label>
                <input
                  type="text"
                  required
                  value={editingTask.title}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, title: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 resize-none h-20"
                />
              </div>

              <div className={`grid ${editingTask.priority === 'none' ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Öncelik
                  </label>
                  <select
                    value={editingTask.priority || 'none'}
                    onChange={(e) => {
                      const newP = e.target.value as TaskPriority;
                      setEditingTask({
                        ...editingTask,
                        priority: newP,
                        dueDate: newP === 'none' ? '' : editingTask.dueDate,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-hidden"
                  >
                    <option value="none">Önceliksiz</option>
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                  </select>
                </div>

                {editingTask.priority !== 'none' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Son Tarih
                    </label>
                    <input
                      type="date"
                      value={editingTask.dueDate || ''}
                      onChange={(e) =>
                        setEditingTask({
                          ...editingTask,
                          dueDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: NEW COLUMN MODAL */}
      {isNewColumnModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                Yeni Sütun Ekle
              </h3>
              <button
                onClick={() => setIsNewColumnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddColumn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sütun Adı *
                </label>
                <input
                  type="text"
                  required
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  placeholder="Örn: Test Aşamasında"
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden text-slate-900 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewColumnModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Sütunu Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: RENAME COLUMN MODAL */}
      {editingColumn && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                Sütunu Yeniden Adlandır
              </h3>
              <button
                onClick={() => setEditingColumn(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRenameColumn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sütun Adı
                </label>
                <input
                  type="text"
                  required
                  value={editColumnTitle}
                  onChange={(e) => setEditColumnTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden text-slate-900 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingColumn(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. FULL PAGE CARD DETAIL VIEW */}
      {detailTask && activeProject && (() => {
        const countdown = detailTask.dueDate ? getCountdown(detailTask.dueDate) : null;

        // Notes specific to this card (check projectId, cardId, cardTitle, linkedTasks)
        const cardNotes = notes.filter((n) => {
          if (n.projectId === detailTask.id || n.cardId === detailTask.id) return true;
          if (n.cardTitle && detailTask.title && n.cardTitle.toLowerCase() === detailTask.title.toLowerCase()) return true;
          if (n.linkedTasks?.some((t: any) => t.id === detailTask.id || (t.title && detailTask.title && t.title.toLowerCase() === detailTask.title.toLowerCase()))) return true;
          return false;
        });

        // Extract all card timelogs
        const cardTimelogs = timeLogs.filter((log) => {
          if (log.cardId && log.cardId === detailTask.id) return true;
          if (log.projectId && log.projectId === detailTask.id) return true;
          if (log.cardTitle && detailTask.title && log.cardTitle.toLowerCase() === detailTask.title.toLowerCase()) return true;
          if (log.linkId === detailTask.id || log.entityId === detailTask.id) return true;
          return false;
        });

        // Convert cardTimelogs to note-compatible objects
        const convertedTimelogs = cardTimelogs.map((tl) => ({
          id: tl.id,
          title: tl.cardTitle || tl.eventSummary || (tl.description ? tl.description.slice(0, 40) : 'Timelog Kaydı'),
          content: tl.description || '',
          noteType: 'timelog',
          startTime: tl.startTime || '',
          endTime: tl.endTime || '',
          durationMinutes: tl.durationMinutes || 0,
          tags: tl.tags || [],
          date: tl.startTime ? tl.startTime.split('T')[0] : (tl.createdAt ? tl.createdAt.split('T')[0] : ''),
          createdAt: tl.createdAt || tl.startTime || new Date().toISOString(),
          updatedAt: tl.createdAt || new Date().toISOString(),
          projectId: tl.projectId || detailTask.id,
          cardId: tl.cardId || detailTask.id,
          cardTitle: tl.cardTitle || detailTask.title,
          customFields: {},
          linkedEvents: tl.eventId || tl.linkType === 'calendar' || tl.linkType === 'event'
            ? [{ id: tl.eventId || tl.linkId || '', summary: tl.eventSummary || tl.linkTitle || '' }]
            : [],
          linkedEmails: tl.linkType === 'gmail' || tl.linkType === 'email'
            ? [{ id: tl.linkId || '', subject: tl.linkTitle || '' }]
            : [],
          linkedDriveFiles: tl.linkType === 'drive'
            ? [{ id: tl.linkId || '', name: tl.linkTitle || '' }]
            : [],
          contacts: tl.linkType === 'contact'
            ? [{ resourceName: tl.linkId || '', displayName: tl.linkTitle || tl.linkId || '' }]
            : [],
          linkedTasks: tl.linkType === 'tasks' || tl.linkType === 'task'
            ? [{ id: tl.linkId || '', title: tl.linkTitle || '' }]
            : [],
        }));

        const existingNoteIds = new Set(cardNotes.map((n) => n.id));
        const extraTimelogNotes = convertedTimelogs.filter((tn) => !existingNoteIds.has(tn.id));

        const allCardDisplayNotes = [...cardNotes, ...extraTimelogNotes];

        // Extract note tags across card notes and all system notes
        const allNoteTags = Array.from(
          new Set(
            [
              ...allCardDisplayNotes.flatMap((n) => n.tags || []),
              ...notes.flatMap((n) => n.tags || []),
            ].filter((t) => t && typeof t === 'string' && t.trim())
          )
        );

        // Filter notes by noteType and tag
        let filteredNotes = allCardDisplayNotes.filter((n) => {
          if (noteTypeFilter !== 'all') {
            const currentType = n.noteType || (n.durationMinutes && n.durationMinutes > 0 ? 'timelog' : 'note');
            if (noteTypeFilter === 'timelog') {
              if (currentType !== 'timelog' && (!n.durationMinutes || n.durationMinutes <= 0)) {
                return false;
              }
            } else {
              if (currentType !== noteTypeFilter) return false;
            }
          }
          if (noteTagFilter !== 'all') {
            if (!n.tags?.includes(noteTagFilter)) return false;
          }
          return true;
        });

        // Sort notes
        filteredNotes.sort((a, b) => {
          if (noteSortOrder === 'newest') {
            return new Date(b.createdAt || b.date || '').getTime() - new Date(a.createdAt || a.date || '').getTime();
          }
          if (noteSortOrder === 'oldest') {
            return new Date(a.createdAt || a.date || '').getTime() - new Date(b.createdAt || b.date || '').getTime();
          }
          if (noteSortOrder === 'title') {
            return a.title.localeCompare(b.title, 'tr');
          }
          return 0;
        });

        const displayedCardNotes = filteredNotes.slice(0, cardNotesVisibleCount);

        // Timelog notes and combined stats
        const timelogNotes = cardNotes.filter((n) => n.noteType === 'timelog' || (n.durationMinutes && n.durationMinutes > 0));
        
        const combinedTimeItems = [
          ...timelogNotes.map(n => ({
            durationMinutes: n.durationMinutes || 0,
            dateStr: n.startTime ? n.startTime.split('T')[0] : n.date || '',
          })),
          ...cardTimelogs.map(l => ({
            durationMinutes: l.durationMinutes || 0,
            dateStr: l.startTime ? l.startTime.split('T')[0] : l.createdAt ? l.createdAt.split('T')[0] : '',
          }))
        ];

        // Calculate stats for card time items
        const cardTotalMinutes = combinedTimeItems.reduce((sum, l) => sum + l.durationMinutes, 0);
        const cardUniqueDays = new Set(combinedTimeItems.map(l => l.dateStr).filter(Boolean));
        const cardDaysCount = Math.max(1, cardUniqueDays.size);
        const cardDailyAvgMinutes = combinedTimeItems.length > 0 ? Math.round(cardTotalMinutes / cardDaysCount) : 0;

        // All available tags from notes and timelogs
        const allTimelogTags = Array.from(
          new Set([
            ...allNoteTags,
            ...cardTimelogs.flatMap((l) => l.tags || []).filter(Boolean),
          ])
        );

        // Filter card timelogs
        const filteredCardTimelogs = cardTimelogs.filter((log) => {
          if (timelogSearch.trim()) {
            const q = timelogSearch.toLowerCase();
            const matchDesc = log.description?.toLowerCase().includes(q);
            const matchTitle = log.cardTitle?.toLowerCase().includes(q) || log.linkTitle?.toLowerCase().includes(q);
            const matchTag = log.tags?.some((t) => t.toLowerCase().includes(q));
            if (!matchDesc && !matchTitle && !matchTag) return false;
          }
          if (timelogServiceFilter !== 'all') {
            if (timelogServiceFilter === 'card_only') {
              if (log.linkType && log.linkType !== '') return false;
            } else {
              if (log.linkType !== timelogServiceFilter) return false;
            }
          }
          if (timelogTagFilter !== 'all') {
            if (!log.tags?.includes(timelogTagFilter)) return false;
          }
          return true;
        });

        // Extract workspace items linked specifically to this detailTask
        const cardTimelogTaskIds = new Set<string>();
        const cardTimelogEmailIds = new Set<string>();
        const cardTimelogEventIds = new Set<string>();
        const cardTimelogDriveIds = new Set<string>();
        const cardTimelogContactIds = new Set<string>();

        cardTimelogs.forEach((log) => {
          const targetId = log.linkId || log.entityId || log.eventId;
          const targetType = log.linkType || log.entityType;
          if (!targetId) return;

          if (targetType === 'tasks' || targetType === 'task') cardTimelogTaskIds.add(targetId);
          if (targetType === 'gmail' || targetType === 'email') cardTimelogEmailIds.add(targetId);
          if (targetType === 'calendar' || targetType === 'event') cardTimelogEventIds.add(targetId);
          if (targetType === 'drive') cardTimelogDriveIds.add(targetId);
          if (targetType === 'contact') cardTimelogContactIds.add(targetId);
        });

        cardNotes.forEach((n: any) => {
          if (n.linkedTasks && Array.isArray(n.linkedTasks)) n.linkedTasks.forEach((t: any) => cardTimelogTaskIds.add(typeof t === 'string' ? t : t.id));
          if (n.linkedEmails && Array.isArray(n.linkedEmails)) n.linkedEmails.forEach((e: any) => cardTimelogEmailIds.add(typeof e === 'string' ? e : e.id));
          if (n.linkedEvents && Array.isArray(n.linkedEvents)) n.linkedEvents.forEach((ev: any) => cardTimelogEventIds.add(typeof ev === 'string' ? ev : ev.id));
          if (n.linkedDriveFiles && Array.isArray(n.linkedDriveFiles)) n.linkedDriveFiles.forEach((f: any) => cardTimelogDriveIds.add(typeof f === 'string' ? f : f.id));
          if (n.contacts && Array.isArray(n.contacts)) n.contacts.forEach((c: any) => cardTimelogContactIds.add(typeof c === 'string' ? c : c.resourceName));
        });

        const cardTaskIds = Array.from(
          new Set([
            ...(detailTask.linkedTaskIds || []),
            ...Array.from(cardTimelogTaskIds),
          ])
        );

        const cardLinkedGoogleTasksList = cardTaskIds
          .map((id) => {
            const found = allTasksMap.get(id);
            if (found) return found;

            let title = '';
            const logMatch = cardTimelogs.find(l => (l.linkId === id || l.entityId === id));
            if (logMatch) {
              title = logMatch.linkTitle || '';
            }

            if (!title) {
              const noteMatch = cardNotes.find(n => n.linkedTasks?.some((t: any) => (typeof t === 'string' ? t === id : t.id === id)));
              if (noteMatch) {
                const foundT = noteMatch.linkedTasks?.find((t: any) => (typeof t === 'string' ? t === id : t.id === id));
                if (foundT && typeof foundT !== 'string') {
                  title = foundT.title || '';
                }
              }
            }

            if (!title) title = 'Google Görevi';

            return {
              id,
              title,
              status: 'needsAction',
            };
          })
          .filter(Boolean) as TaskItem[];

        const cardFilteredGoogleTasksList = cardLinkedGoogleTasksList.filter(
          (gt) => showCompletedGoogleTasks || gt.status !== 'completed'
        );

        const cardEmailIds = Array.from(
          new Set([
            ...(detailTask.linkedEmailIds || []),
            ...Array.from(cardTimelogEmailIds),
          ])
        );

        const cardLinkedEmailsList = cardEmailIds
          .map((id) => {
            const found = allEmailsMap.get(id);
            if (found) return found;

            let subject = '';
            let sender = '';
            let date = '';

            const logMatch = cardTimelogs.find(l => (l.linkId === id || l.entityId === id));
            if (logMatch) {
              subject = logMatch.linkTitle || '';
              if (logMatch.startTime) date = logMatch.startTime;
            }

            if (!subject) {
              const noteMatch = cardNotes.find(n => n.linkedEmails?.some((e: any) => (typeof e === 'string' ? e === id : e.id === id)));
              if (noteMatch) {
                const foundE = noteMatch.linkedEmails?.find((e: any) => (typeof e === 'string' ? e === id : e.id === id));
                if (foundE && typeof foundE !== 'string') {
                  subject = foundE.subject || '';
                  if (foundE.sender) sender = foundE.sender;
                }
              }
            }

            if (!subject) subject = 'E-posta';
            if (!date) date = new Date().toISOString();

            return {
              id,
              subject,
              sender: sender || '',
              date,
              snippet: '',
            };
          })
          .filter(Boolean) as EmailItem[];

        const cardEventIds = Array.from(
          new Set([
            ...(detailTask.linkedEventIds || []),
            ...Array.from(cardTimelogEventIds),
          ])
        );

        const cardLinkedEventsList = cardEventIds
          .map((id) => {
            const found = allEventsMap.get(id);
            if (found) return found;

            let summary = '';
            let htmlLink = '';
            let startStr = '';

            const logMatch = cardTimelogs.find(l => (l.linkId === id || l.eventId === id || l.entityId === id));
            if (logMatch) {
              summary = logMatch.eventSummary || logMatch.linkTitle || '';
              if (logMatch.startTime) startStr = logMatch.startTime;
            }

            if (!summary) {
              const noteMatch = cardNotes.find(n => n.linkedEvents?.some((ev: any) => (typeof ev === 'string' ? ev === id : ev.id === id)));
              if (noteMatch) {
                const foundEv = noteMatch.linkedEvents?.find((ev: any) => (typeof ev === 'string' ? ev === id : ev.id === id));
                if (foundEv && typeof foundEv !== 'string') {
                  summary = foundEv.summary || '';
                  if (foundEv.start) startStr = foundEv.start;
                  if (foundEv.htmlLink) htmlLink = foundEv.htmlLink;
                }
              }
            }

            if (!summary) summary = 'Takvim Etkinliği';
            if (!startStr) startStr = new Date().toISOString();
            if (!htmlLink) htmlLink = id.startsWith('http') ? id : 'https://calendar.google.com';

            return {
              id,
              summary,
              start: startStr,
              end: startStr,
              htmlLink,
            };
          })
          .filter(Boolean) as CalendarEvent[];

        const cardDriveIds = Array.from(
          new Set([
            ...(detailTask.linkedDriveFileIds || []),
            ...Array.from(cardTimelogDriveIds),
          ])
        );

        const cardLinkedDriveFilesList = cardDriveIds
          .map((id) => {
            const found = allDriveFilesMap.get(id);
            if (found) return found;

            let name = '';
            const logMatch = cardTimelogs.find(l => (l.linkId === id || l.entityId === id));
            if (logMatch) {
              name = logMatch.linkTitle || '';
            }

            if (!name) {
              const noteMatch = cardNotes.find(n => n.linkedDriveFiles?.some((f: any) => (typeof f === 'string' ? f === id : f.id === id)));
              if (noteMatch) {
                const foundF = noteMatch.linkedDriveFiles?.find((f: any) => (typeof f === 'string' ? f === id : f.id === id));
                if (foundF && typeof foundF !== 'string') {
                  name = foundF.name || '';
                }
              }
            }

            if (!name) name = 'Google Drive Dosyası';

            return {
              id,
              name,
              mimeType: 'application/vnd.google-apps.document',
              webViewLink: id.startsWith('http') ? id : `https://drive.google.com/file/d/${id}/view`,
              modifiedTime: new Date().toISOString(),
              isFolder: false,
            };
          })
          .filter(Boolean) as DriveFile[];

        const cardContactIds = Array.from(
          new Set([
            ...(detailTask.linkedContactResourceNames || []),
            ...Array.from(cardTimelogContactIds),
          ])
        );

        const cardLinkedContactsList = cardContactIds
          .map((resName) => {
            const found = allContactsMap.get(resName);
            if (found) return found;

            let displayName = '';
            const logMatch = cardTimelogs.find(l => (l.linkId === resName || l.entityId === resName));
            if (logMatch) {
              displayName = logMatch.linkTitle || '';
            }

            if (!displayName) {
              const noteMatch = cardNotes.find(n => n.contacts?.some((c: any) => (typeof c === 'string' ? c === resName : c.resourceName === resName)));
              if (noteMatch) {
                const foundC = noteMatch.contacts?.find((c: any) => (typeof c === 'string' ? c === resName : c.resourceName === resName));
                if (foundC && typeof foundC !== 'string') {
                  displayName = foundC.displayName || '';
                }
              }
            }

            if (!displayName) {
              displayName = resName.startsWith('people/')
                ? `Kişi (${resName.replace('people/', '')})`
                : resName;
            }

            return {
              resourceName: resName,
              displayName,
              email: '',
              phone: '',
            };
          })
          .filter(Boolean) as ContactItem[];

        return (
          <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-150">
            {/* Top Bar Navigation */}
            <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => handleSetDetailTask(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kanban Panosuna Dön</span>
                </button>
                <div className="h-4 w-px bg-slate-200" />
                <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-xs font-black rounded-lg shrink-0">
                  {activeProject.name}
                </span>
                <span className="text-xs text-slate-400 font-semibold truncate">/ Kart Detayı</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={async () => {
                    if (window.confirm('Bu kartı silmek istediğinizden emin misiniz?')) {
                      await onDeleteTask(detailTask.id);
                      handleSetDetailTask(null);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Kartı Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kartı Sil</span>
                </button>
                <button
                  onClick={() => handleSetDetailTask(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Content Area (2-Column Responsive Layout) */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50">
              
              {/* LEFT COLUMN (8 cols in lg: 66% width) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Card Title & Main Metadata Header Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                  {/* Title View / Edit */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">
                        Kart Başlığı
                      </span>
                      {!isEditingTitle && (
                        <button
                          onClick={() => {
                            setEditTitleText(detailTask.title);
                            setIsEditingTitle(true);
                          }}
                          className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Başlığı Düzenle
                        </button>
                      )}
                    </div>

                    {isEditingTitle ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={editTitleText}
                          onChange={(e) => setEditTitleText(e.target.value)}
                          className="flex-1 px-4 py-2 text-lg font-black bg-slate-50 border-2 border-purple-500 rounded-2xl text-slate-900 focus:outline-hidden"
                        />
                        <button
                          onClick={async () => {
                            if (!editTitleText.trim()) return;
                            const updated = { ...detailTask, title: editTitleText.trim() };
                            setDetailTask(updated);
                            await onUpdateTask(updated);
                            setIsEditingTitle(false);
                          }}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-xs flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5" /> Kaydet
                        </button>
                        <button
                          onClick={() => {
                            setEditTitleText(detailTask.title);
                            setIsEditingTitle(false);
                          }}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Vazgeç
                        </button>
                      </div>
                    ) : (
                      <h1 className="text-2xl font-black text-slate-900 leading-snug">
                        {detailTask.title}
                      </h1>
                    )}
                  </div>

                  {/* Status, Priority, Due Date Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                    {/* Sütun / Aşama */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                        Sütun / Aşama
                      </label>
                      <select
                        value={detailTask.columnId}
                        onChange={async (e) => {
                          const updated = { ...detailTask, columnId: e.target.value };
                          setDetailTask(updated);
                          await onUpdateTask(updated);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-hidden cursor-pointer"
                      >
                        {activeProject.columns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Öncelik */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                        Öncelik Seviyesi
                      </label>
                      <select
                        value={detailTask.priority || 'none'}
                        onChange={async (e) => {
                          const newPriority = e.target.value as TaskPriority;
                          const updated = {
                            ...detailTask,
                            priority: newPriority,
                            dueDate: newPriority === 'none' ? undefined : detailTask.dueDate,
                          };
                          setDetailTask(updated);
                          await onUpdateTask(updated);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-hidden cursor-pointer"
                      >
                        <option value="none">Önceliksiz</option>
                        <option value="low">Düşük Öncelik</option>
                        <option value="medium">Orta Öncelik</option>
                        <option value="high">Yüksek Öncelik</option>
                      </select>
                    </div>

                    {/* Son Tarih (Sadece önceliksiz değilse gösterilir) */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                        Son Tarih (Deadline)
                      </label>
                      {detailTask.priority !== 'none' ? (
                        <input
                          type="date"
                          value={detailTask.dueDate || ''}
                          onChange={async (e) => {
                            const newDate = e.target.value;
                            const updated = { ...detailTask, dueDate: newDate };
                            setDetailTask(updated);
                            await onUpdateTask(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-hidden cursor-pointer"
                        />
                      ) : (
                        <div className="text-xs text-slate-400 italic bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                          Önceliksiz (Tarih Yok)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Countdown Badge if set */}
                  {detailTask.priority !== 'none' && countdown && (
                    <div
                      className={`p-3 rounded-2xl font-black text-xs flex items-center justify-between gap-2 shadow-xs ${
                        countdown.status === 'expired'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : countdown.status === 'urgent'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Kalan Süre (Canlı)</span>
                      </span>
                      <span>{countdown.text}</span>
                    </div>
                  )}
                </div>

                {/* Description Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600" /> Açıklama & Detaylar
                    </h3>
                    {!isEditingDescription && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
                          (Çift tıklayarak düzenleyin)
                        </span>
                        <button
                          onClick={() => {
                            setEditDescriptionText(detailTask.description || '');
                            setIsEditingDescription(true);
                          }}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Düzenle</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditingDescription ? (
                    <div className="space-y-3">
                      <textarea
                        autoFocus
                        value={editDescriptionText}
                        onChange={(e) => setEditDescriptionText(e.target.value)}
                        placeholder="Açıklama veya detayları buraya yazabilirsiniz..."
                        className="w-full p-4 text-xs bg-slate-50 border-2 border-purple-500 rounded-2xl text-slate-900 font-medium resize-none h-36 focus:outline-hidden shadow-inner"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setIsEditingDescription(false)}
                          className="px-3.5 py-1.5 bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl hover:bg-slate-300 cursor-pointer"
                        >
                          Vazgeç
                        </button>
                        <button
                          onClick={async () => {
                            const updated = { ...detailTask, description: editDescriptionText };
                            setDetailTask(updated);
                            await onUpdateTask(updated);
                            setIsEditingDescription(false);
                          }}
                          className="px-4 py-1.5 bg-purple-600 text-white text-xs font-black rounded-xl hover:bg-purple-700 shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5" /> Kaydet
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDoubleClick={() => {
                        setEditDescriptionText(detailTask.description || '');
                        setIsEditingDescription(true);
                      }}
                      className="bg-slate-50 hover:bg-purple-50/40 p-4 rounded-2xl border border-slate-200 hover:border-purple-300 font-medium cursor-pointer transition-all min-h-[80px]"
                    >
                      {detailTask.description ? (
                        <MarkdownPreview content={detailTask.description} className="text-xs text-slate-800 leading-relaxed" />
                      ) : (
                        <span className="text-slate-400 italic text-xs">
                          Açıklama girilmemiş. Çift tıklayarak veya düzenle butonuna basarak açıklama yazabilirsiniz.
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* UNIFIED NOTES SECTION */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-amber-100 text-amber-800 rounded-2xl">
                        <FileText className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          Kart Notları ({filteredNotes.length})
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Bu kart ile ilişkili notlar ve zaman kayıtları
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        onOpenNoteModal({
                          id: '',
                          title: '',
                          content: '',
                          tags: [],
                          projectId: detailTask.id,
                          cardId: detailTask.id,
                          cardTitle: detailTask.title,
                          noteType: noteTypeFilter !== 'all' ? noteTypeFilter : 'note',
                          date: getNowDateTimeLocal(),
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        } as any)
                      }
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Yeni Not Ekle</span>
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Filter Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="flex flex-wrap items-center gap-2 flex-1">
                        {/* Note Type Filter */}
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                          <Filter className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="text-[10px] font-extrabold text-slate-400">Not Türü:</span>
                          <select
                            value={noteTypeFilter}
                            onChange={(e) => setNoteTypeFilter(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                          >
                            <option value="all">Tüm Not Türleri</option>
                            <option value="note">Düz Not</option>
                            <option value="timelog">Timelog (Zaman)</option>
                            {noteTypes.filter(nt => !nt.isSystem).map((nt) => (
                              <option key={nt.id} value={nt.id}>
                                {nt.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Tag Filter */}
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                          <Tag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <select
                            value={noteTagFilter}
                            onChange={(e) => setNoteTagFilter(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                          >
                            <option value="all">Tüm Etiketler</option>
                            {allNoteTags.map((tag) => (
                              <option key={tag} value={tag}>
                                #{tag}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Sort Order */}
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                        <span className="text-[10px] font-extrabold text-slate-400">Sırala:</span>
                        <select
                          value={noteSortOrder}
                          onChange={(e) => setNoteSortOrder(e.target.value as 'newest' | 'oldest' | 'title')}
                          className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                        >
                          <option value="newest">En Yeni</option>
                          <option value="oldest">En Eski</option>
                          <option value="title">Başlık (A-Z)</option>
                        </select>
                      </div>
                    </div>

                    {/* Notes List Cards */}
                    <div className="space-y-3">
                      {filteredNotes.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs italic">
                          {noteTypeFilter !== 'all' || noteTagFilter !== 'all'
                            ? 'Seçilen filtrelere uygun not bulunamadı.'
                            : 'Bu karta ait henüz eklenmiş not yok. "Yeni Not Ekle" butonu ile ekleyebilirsiniz.'}
                        </div>
                      ) : (
                        <>
                          {displayedCardNotes.map((note) => {
                            const isTimelog = note.noteType === 'timelog' || (note.durationMinutes && note.durationMinutes > 0);
                            const ntObj = noteTypes.find(t => t.id === note.noteType);

                            return (
                              <div
                                key={note.id}
                                className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                                  isTimelog
                                    ? 'bg-purple-50/40 hover:bg-purple-50/80 border-purple-200/80'
                                    : 'bg-amber-50/40 hover:bg-amber-50/80 border-amber-200/80'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md flex items-center gap-1 ${
                                        isTimelog
                                          ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                                      }`}
                                    >
                                      {isTimelog ? <Clock className="w-3 h-3 text-purple-600" /> : <FileText className="w-3 h-3 text-amber-600" />}
                                      <span>{ntObj ? ntObj.name : note.noteType === 'timelog' ? 'Timelog' : 'Düz Not'}</span>
                                    </span>

                                    {note.durationMinutes && note.durationMinutes > 0 && (
                                      <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-extrabold rounded-md shadow-2xs flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatMinutesToText(note.durationMinutes)}
                                      </span>
                                    )}

                                    <h4 className="font-extrabold text-slate-900 text-xs leading-snug">
                                      {note.title || 'Başlıksız Not'}
                                    </h4>
                                  </div>

                                  <button
                                    onClick={() => onOpenNoteModal(note)}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-extrabold rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0 shadow-2xs"
                                  >
                                    Görüntüle & Düzenle
                                  </button>
                                </div>

                                {/* Render Custom Fields if present */}
                                {note.customFields && Object.keys(note.customFields).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 p-2 bg-white/90 rounded-xl border border-slate-200/70 text-[11px]">
                                    {Object.entries(note.customFields).map(([k, v]) => {
                                      const fDef = ntObj?.fields?.find(f => f.id === k);
                                      const label = fDef ? fDef.name : k;
                                      return (
                                        <span key={k} className="px-2 py-0.5 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-md font-bold">
                                          {label}: <span className="font-extrabold">{String(v)}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}

                                <div className="text-xs text-slate-700 bg-white/80 p-3 rounded-xl border border-slate-200/60">
                                  <MarkdownPreview content={note.content} imgMaxHeight="max-h-60" />
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/40 text-[10px] text-slate-400">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {note.tags?.map((t) => (
                                      <span
                                        key={t}
                                        className="px-2 py-0.5 bg-slate-200/70 text-slate-800 font-bold rounded-md"
                                      >
                                        #{t}
                                      </span>
                                    ))}
                                  </div>
                                  <span>{formatNoteDateTime(note.date) || (note.startTime ? note.startTime.replace('T', ' ') : '')}</span>
                                </div>
                              </div>
                            );
                          })}

                          {cardNotesVisibleCount < filteredNotes.length && (
                            <div className="pt-3 flex flex-col items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setCardNotesVisibleCount((prev) => prev + 10)}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                              >
                                <ChevronDown className="w-4 h-4" />
                                <span>Devamını Yükle (+10)</span>
                              </button>
                              <span className="text-[11px] font-medium text-slate-500">
                                Gösterilen: {displayedCardNotes.length} / {filteredNotes.length} Not
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN (4 cols in lg: 33% width - Connected Items) */}
              <div className="lg:col-span-4 space-y-6">

                {/* Time Summary Widgets connected to Right Column top */}
                <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-xs space-y-3.5 border border-purple-800">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
                        <Clock className="w-4 h-4 text-purple-300" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">Kart Zaman Analizi</h4>
                        <p className="text-[10px] text-purple-200">Kart'a harcanan toplam ve ortalama süre</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
                      <div className="text-[10px] font-extrabold text-purple-200 uppercase tracking-wider">
                        Kart'la İlişkili Toplam Zaman
                      </div>
                      <div className="text-lg font-black text-white mt-0.5">
                        {formatMinutesToText(cardTotalMinutes)}
                      </div>
                    </div>

                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
                      <div className="text-[10px] font-extrabold text-indigo-200 uppercase tracking-wider">
                        Günlük Ortalama Süre
                      </div>
                      <div className="text-lg font-black text-white mt-0.5">
                        {formatMinutesToText(cardDailyAvgMinutes)}
                        <span className="text-[10px] font-normal text-purple-200 block sm:inline lg:block">
                          ({cardUniqueDays.size} aktif gün)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-600" />
                      Bağlanan Öğeler (Workspace)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Bu kart ve projeye bağlı e-posta, etkinlik, dosya ve görevler
                    </p>
                  </div>

                  {/* 0. Connected Google Tasks */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" /> Google Görevler ({cardFilteredGoogleTasksList.length})
                        </span>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-[10px] text-slate-500 bg-slate-100 hover:bg-slate-200/80 px-2 py-0.5 rounded-full transition-colors">
                          <input
                            type="checkbox"
                            checked={showCompletedGoogleTasks}
                            onChange={(e) => setShowCompletedGoogleTasks(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-5 h-3 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-2 after:w-2 after:transition-all peer-checked:bg-purple-600 relative"></div>
                          <span className="font-medium text-slate-600">
                            {showCompletedGoogleTasks ? 'Tamamlananlar Açık' : 'Tamamlananlar'}
                          </span>
                        </label>
                      </div>

                      <button
                        onClick={() => {
                          setLinkEntityType('task');
                          setIsLinkModalOpen(true);
                        }}
                        className="w-6 h-6 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        title="Görev Bağla"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {cardFilteredGoogleTasksList.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">
                          {cardLinkedGoogleTasksList.length > 0 && !showCompletedGoogleTasks
                            ? 'Tüm bağlı görevler tamamlanmış (görmek için tamamlananları açın).'
                            : 'Google Görevi bağlanmadı.'}
                        </p>
                      ) : (
                        cardFilteredGoogleTasksList.map((gTask) => {
                          const durationMins = getItemTimelogMinutes('task', gTask.id);
                          const taskKey = `task_${gTask.id}`;
                          const displayTitle = customItemTitles[taskKey] || gTask.title;
                          return (
                            <div
                              key={gTask.id}
                              className="p-2.5 bg-purple-50/50 border border-purple-200/60 rounded-xl flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <a
                                  href="https://tasks.google.com"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-slate-900 hover:text-purple-600 truncate flex items-center gap-1.5 group"
                                  title="Google Görevler'de Aç ↗"
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      gTask.status === 'completed'
                                        ? 'bg-emerald-500'
                                        : 'bg-amber-500'
                                    }`}
                                  />
                                  <span className={gTask.status === 'completed' ? 'line-through text-slate-400' : ''}>
                                    {displayTitle}
                                  </span>
                                  <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                                </a>
                                {gTask.due && (
                                  <p className="text-[10px] text-slate-500 truncate ml-3.5">
                                    Tarih: {gTask.due.split('T')[0]}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100/80 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-purple-600" />
                                  {formatMinutesToText(durationMins)}
                                </span>

                                {/* Quick Edit Name Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItemInfo({
                                      key: taskKey,
                                      type: 'task',
                                      typeLabel: 'Google Görevi',
                                      originalTitle: gTask.title,
                                      currentTitle: displayTitle,
                                      url: 'https://tasks.google.com',
                                    });
                                    setTempEditTitle(displayTitle);
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-100/60 rounded-md transition-colors cursor-pointer"
                                  title="Öğe İsmini Düzenle"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                </button>

                                {/* Filter in Advanced Search Shortcut */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onOpenSearchWithItem) {
                                      onOpenSearchWithItem({
                                        id: gTask.id,
                                        type: 'task',
                                        typeLabel: 'Kanban Kartı / Görev',
                                        title: displayTitle,
                                        url: 'https://tasks.google.com',
                                        connectedNotes: [],
                                        count: 0,
                                      });
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-100/60 rounded-md transition-colors cursor-pointer"
                                  title="Gelişmiş Not & İçerik Aramada Filtrele"
                                >
                                  <Search className="w-3.5 h-3.5 text-purple-600" />
                                </button>

                                <button
                                  onClick={() => handleToggleEntityLink('task', gTask.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded-md transition-colors cursor-pointer"
                                  title="Bağlantıyı Kaldır"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* 1. Connected Emails */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-rose-500" /> E-postalar ({cardLinkedEmailsList.length})
                      </span>
                      <button
                        onClick={() => {
                          setLinkEntityType('email');
                          setIsLinkModalOpen(true);
                        }}
                        className="w-6 h-6 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        title="E-posta Bağla"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {cardLinkedEmailsList.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">E-posta bağlanmadı.</p>
                      ) : (
                        cardLinkedEmailsList.map((email) => {
                          const durationMins = getItemTimelogMinutes('email', email.id);
                          const gmailUrl = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(email.subject)}`;
                          const emailKey = `email_${email.id}`;
                          const displayTitle = customItemTitles[emailKey] || email.subject;
                          return (
                            <div
                              key={email.id}
                              className="p-2.5 bg-rose-50/50 border border-rose-200/60 rounded-xl flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <a
                                  href={gmailUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-slate-900 hover:text-rose-600 truncate flex items-center gap-1 group"
                                  title="Gmail'de Aç ↗"
                                >
                                  <span className="truncate">{displayTitle}</span>
                                  <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </a>
                                <p className="text-[10px] text-slate-500 truncate">{email.sender}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-rose-600" />
                                  {formatMinutesToText(durationMins)}
                                </span>

                                {/* Quick Edit Name Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItemInfo({
                                      key: emailKey,
                                      type: 'email',
                                      typeLabel: 'E-posta',
                                      originalTitle: email.subject,
                                      currentTitle: displayTitle,
                                      url: gmailUrl,
                                    });
                                    setTempEditTitle(displayTitle);
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-100/60 rounded-md transition-colors cursor-pointer"
                                  title="Öğe İsmini Düzenle"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                </button>

                                {/* Filter in Advanced Search Shortcut */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onOpenSearchWithItem) {
                                      onOpenSearchWithItem({
                                        id: email.id,
                                        type: 'email',
                                        typeLabel: 'E-posta',
                                        title: displayTitle,
                                        url: gmailUrl,
                                        connectedNotes: [],
                                        count: 0,
                                      });
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded-md transition-colors cursor-pointer"
                                  title="Gelişmiş Not & İçerik Aramada Filtrele"
                                >
                                  <Search className="w-3.5 h-3.5 text-rose-600" />
                                </button>

                                <button
                                  onClick={() => handleToggleEntityLink('email', email.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded-md transition-colors cursor-pointer"
                                  title="Bağlantıyı Kaldır"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* 2. Connected Calendar Events */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" /> Takvim Etkinlikleri ({cardLinkedEventsList.length})
                      </span>
                      <button
                        onClick={() => {
                          setLinkEntityType('event');
                          setIsLinkModalOpen(true);
                        }}
                        className="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        title="Etkinlik Bağla"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {cardLinkedEventsList.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Takvim etkinliği bağlanmadı.</p>
                      ) : (
                        cardLinkedEventsList.map((evt) => {
                          const durationMins = getItemTimelogMinutes('event', evt.id);
                          const calUrl = evt.htmlLink || 'https://calendar.google.com';
                          const eventKey = `event_${evt.id}`;
                          const displayTitle = customItemTitles[eventKey] || evt.summary;
                          return (
                            <div
                              key={evt.id}
                              className="p-2.5 bg-blue-50/50 border border-blue-200/60 rounded-xl flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <a
                                  href={calUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-slate-900 hover:text-blue-600 truncate flex items-center gap-1 group"
                                  title="Google Takvim'de Aç ↗"
                                >
                                  <span className="truncate">{displayTitle}</span>
                                  <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </a>
                                <p className="text-[10px] text-slate-500 truncate">{new Date(evt.start).toLocaleString('tr-TR')}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-blue-600" />
                                  {formatMinutesToText(durationMins)}
                                </span>

                                {/* Quick Edit Name Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItemInfo({
                                      key: eventKey,
                                      type: 'event',
                                      typeLabel: 'Takvim Etkinliği',
                                      originalTitle: evt.summary,
                                      currentTitle: displayTitle,
                                      url: calUrl,
                                    });
                                    setTempEditTitle(displayTitle);
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-100/60 rounded-md transition-colors cursor-pointer"
                                  title="Öğe İsmini Düzenle"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                </button>

                                {/* Filter in Advanced Search Shortcut */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onOpenSearchWithItem) {
                                      onOpenSearchWithItem({
                                        id: evt.id,
                                        type: 'event',
                                        typeLabel: 'Takvim Etkinliği',
                                        title: displayTitle,
                                        url: calUrl,
                                        connectedNotes: [],
                                        count: 0,
                                      });
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100/60 rounded-md transition-colors cursor-pointer"
                                  title="Gelişmiş Not & İçerik Aramada Filtrele"
                                >
                                  <Search className="w-3.5 h-3.5 text-blue-600" />
                                </button>

                                <button
                                  onClick={() => handleToggleEntityLink('event', evt.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded-md transition-colors cursor-pointer"
                                  title="Bağlantıyı Kaldır"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* 3. Connected Drive Files */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-emerald-500" /> Drive Dosyaları ({cardLinkedDriveFilesList.length})
                      </span>
                      <button
                        onClick={() => {
                          setLinkEntityType('drive');
                          setIsLinkModalOpen(true);
                        }}
                        className="w-6 h-6 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        title="Dosya Bağla"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {cardLinkedDriveFilesList.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Drive dosyası bağlanmadı.</p>
                      ) : (
                        cardLinkedDriveFilesList.map((file) => {
                          const durationMins = getItemTimelogMinutes('drive', file.id);
                          const fileUrl = file.webViewLink && file.webViewLink !== '#' ? file.webViewLink : `https://drive.google.com/file/d/${file.id}/view`;
                          const driveKey = `drive_${file.id}`;
                          const displayTitle = customItemTitles[driveKey] || file.name;
                          return (
                            <div
                              key={file.id}
                              className="p-2.5 bg-emerald-50/50 border border-emerald-200/60 rounded-xl flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-slate-900 hover:text-emerald-600 truncate flex items-center gap-1 group"
                                  title="Google Drive'da Aç ↗"
                                >
                                  <span className="truncate">{displayTitle}</span>
                                  <ExternalLink className="w-3 h-3 text-emerald-600 shrink-0 inline ml-0.5" />
                                </a>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-emerald-600" />
                                  {formatMinutesToText(durationMins)}
                                </span>

                                {/* Quick Edit Name Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItemInfo({
                                      key: driveKey,
                                      type: 'drive',
                                      typeLabel: 'Drive Dosyası',
                                      originalTitle: file.name,
                                      currentTitle: displayTitle,
                                      url: fileUrl,
                                    });
                                    setTempEditTitle(displayTitle);
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-100/60 rounded-md transition-colors cursor-pointer"
                                  title="Öğe İsmini Düzenle"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                </button>

                                {/* Filter in Advanced Search Shortcut */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onOpenSearchWithItem) {
                                      onOpenSearchWithItem({
                                        id: file.id,
                                        type: 'drive',
                                        typeLabel: 'Drive Dosyası',
                                        title: displayTitle,
                                        url: fileUrl,
                                        connectedNotes: [],
                                        count: 0,
                                      });
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100/60 rounded-md transition-colors cursor-pointer"
                                  title="Gelişmiş Not & İçerik Aramada Filtrele"
                                >
                                  <Search className="w-3.5 h-3.5 text-emerald-600" />
                                </button>

                                <button
                                  onClick={() => handleToggleEntityLink('drive', file.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded-md transition-colors cursor-pointer"
                                  title="Bağlantıyı Kaldır"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* 4. Connected Contacts */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500" /> Kişiler ({cardLinkedContactsList.length})
                      </span>
                      <button
                        onClick={() => {
                          setLinkEntityType('contact');
                          setIsLinkModalOpen(true);
                        }}
                        className="w-6 h-6 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        title="Kişi Bağla"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {cardLinkedContactsList.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Kişi bağlanmadı.</p>
                      ) : (
                        cardLinkedContactsList.map((c) => {
                          const durationMins = getItemTimelogMinutes('contact', c.resourceName);
                          const contactUrl = c.email ? `mailto:${c.email}` : `https://contacts.google.com/search/${encodeURIComponent(c.displayName)}`;
                          const contactKey = `contact_${c.resourceName}`;
                          const displayTitle = customItemTitles[contactKey] || c.displayName;
                          return (
                            <div
                              key={c.resourceName}
                              className="p-2.5 bg-indigo-50/50 border border-indigo-200/60 rounded-xl flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <a
                                  href={contactUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-indigo-950 hover:text-indigo-600 truncate flex items-center gap-1 group"
                                  title="Kişiler / E-posta Gönder ↗"
                                >
                                  <span className="truncate">{displayTitle}</span>
                                  <ExternalLink className="w-3 h-3 text-indigo-500 shrink-0 inline ml-0.5" />
                                </a>
                                <span className="text-[10px] text-slate-500 block truncate">{c.email || c.phone}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-indigo-600" />
                                  {formatMinutesToText(durationMins)}
                                </span>

                                {/* Quick Edit Name Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItemInfo({
                                      key: contactKey,
                                      type: 'contact',
                                      typeLabel: 'Kişi / İletişim',
                                      originalTitle: c.displayName,
                                      currentTitle: displayTitle,
                                      url: contactUrl,
                                    });
                                    setTempEditTitle(displayTitle);
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-100/60 rounded-md transition-colors cursor-pointer"
                                  title="Öğe İsmini Düzenle"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                </button>

                                {/* Filter in Advanced Search Shortcut */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onOpenSearchWithItem) {
                                      onOpenSearchWithItem({
                                        id: c.resourceName,
                                        type: 'contact',
                                        typeLabel: 'Kişi / İletişim',
                                        title: displayTitle,
                                        url: contactUrl,
                                        connectedNotes: [],
                                        count: 0,
                                      });
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100/60 rounded-md transition-colors cursor-pointer"
                                  title="Gelişmiş Not & İçerik Aramada Filtrele"
                                >
                                  <Search className="w-3.5 h-3.5 text-indigo-600" />
                                </button>

                                <button
                                  onClick={() => handleToggleEntityLink('contact', c.resourceName)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded-md transition-colors cursor-pointer"
                                  title="Bağlantıyı Kaldır"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL 6: ENTITY LINKER MODAL (Google Task, Email, Event, Drive File, Contact) */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                {linkEntityType === 'task' && 'Google Görev Bağla'}
                {linkEntityType === 'email' && 'E-posta Bağla'}
                {linkEntityType === 'event' && 'Takvim Etkinliği Bağla'}
                {linkEntityType === 'drive' && 'Drive Dosyası Bağla'}
                {linkEntityType === 'contact' && 'Kişi Bağla'}
              </h3>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={entitySearch}
                onChange={(e) => setEntitySearch(e.target.value)}
                placeholder="Arama yapın..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-medium text-slate-800"
              />
            </div>

            {/* List for Selection */}
            <div className="flex-1 overflow-y-auto space-y-2 divide-y divide-slate-100">
              {linkEntityType === 'task' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-purple-800 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200/80 flex items-center justify-between">
                    <span>
                      {entitySearch.trim()
                        ? `"${entitySearch}" için Görev Sonuçları`
                        : 'Google Görevler Listesi'}
                    </span>
                    {isSearchingEntities && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                    )}
                  </div>

                  {isSearchingEntities && remoteGoogleTasks.length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      <span>Google Tasks'da aranıyor...</span>
                    </div>
                  )}

                  {!isSearchingEntities && remoteGoogleTasks.length === 0 && (
                    <p className="py-6 text-center text-slate-400 text-xs italic">
                      Görev bulunamadı.
                    </p>
                  )}

                  {remoteGoogleTasks.map((t) => {
                    const isLinked = activeProject?.linkedTaskIds?.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        className={`p-3 text-xs rounded-xl flex items-center justify-between transition-colors ${
                          isLinked
                            ? 'bg-purple-50 border border-purple-200 text-purple-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div
                          className="min-w-0 pr-2 flex-1 cursor-pointer"
                          onClick={() => handleToggleEntityLink('task', t.id)}
                        >
                          <div className="font-bold flex items-center gap-1.5 text-slate-900">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                t.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                            <span className={t.status === 'completed' ? 'line-through text-slate-400' : ''}>
                              {t.title}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                              t.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {t.status === 'completed' ? 'Tamamlandı' : 'Açık'}
                            </span>
                          </div>
                          {t.notes && (
                            <p className="text-[10px] text-slate-500 truncate mt-0.5 ml-4">
                              {t.notes}
                            </p>
                          )}
                          {t.due && (
                            <div className="text-[10px] text-slate-400 mt-0.5 ml-4">
                              Son Tarih: {t.due.split('T')[0]}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleEntityLink('task', t.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                              isLinked
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {isLinked ? 'Bağlı' : 'Bağla'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {linkEntityType === 'email' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-rose-800 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200/80 flex items-center justify-between">
                    <span>
                      {entitySearch.trim()
                        ? `"${entitySearch}" için E-posta Sonuçları`
                        : 'Son E-postalar (Gmail)'}
                    </span>
                    {isSearchingEntities && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                    )}
                  </div>

                  {isSearchingEntities && remoteEmails.length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                      <span>Gmail'de aranıyor...</span>
                    </div>
                  )}

                  {!isSearchingEntities && remoteEmails.length === 0 && (
                    <p className="py-6 text-center text-slate-400 text-xs italic">
                      E-posta bulunamadı.
                    </p>
                  )}

                  {remoteEmails.map((e) => {
                    const isLinked = detailTask
                      ? detailTask.linkedEmailIds?.includes(e.id)
                      : activeProject?.linkedEmailIds?.includes(e.id);
                    return (
                      <div
                        key={e.id}
                        className={`p-3 text-xs rounded-xl flex items-center justify-between transition-colors ${
                          isLinked
                            ? 'bg-rose-50 border border-rose-200 text-rose-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div
                          className="min-w-0 pr-2 flex-1 cursor-pointer"
                          onClick={() => handleToggleEntityLink('email', e.id)}
                        >
                          <div className="font-bold text-slate-900 truncate">{e.subject}</div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {e.sender} • {new Date(e.date).toLocaleDateString('tr-TR')}
                          </div>
                          {e.snippet && (
                            <div className="text-[10px] text-slate-400 truncate mt-0.5 italic">
                              {e.snippet}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={`https://mail.google.com/mail/u/0/#inbox/${e.id}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(ev) => ev.stopPropagation()}
                            className="p-1 text-rose-700 hover:bg-rose-100 rounded-md text-[11px] font-bold flex items-center gap-0.5"
                            title="Gmail'de Aç ↗"
                          >
                            <span>Aç</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleToggleEntityLink('email', e.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                              isLinked
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {isLinked ? 'Bağlı' : 'Bağla'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {linkEntityType === 'event' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200/80 flex items-center justify-between">
                    <span>
                      {entitySearch.trim()
                        ? `"${entitySearch}" için Etkinlik Sonuçları`
                        : 'Yaklaşan Google Takvim Etkinlikleri'}
                    </span>
                    {isSearchingEntities && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    )}
                  </div>

                  {isSearchingEntities && remoteEvents.length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Google Takvim'de aranıyor...</span>
                    </div>
                  )}

                  {!isSearchingEntities && remoteEvents.length === 0 && (
                    <p className="py-6 text-center text-slate-400 text-xs italic">
                      Etkinlik bulunamadı.
                    </p>
                  )}

                  {remoteEvents.map((ev) => {
                    const isLinked = detailTask
                      ? detailTask.linkedEventIds?.includes(ev.id)
                      : activeProject?.linkedEventIds?.includes(ev.id);
                    return (
                      <div
                        key={ev.id}
                        className={`p-3 text-xs rounded-xl flex items-center justify-between transition-colors ${
                          isLinked
                            ? 'bg-blue-50 border border-blue-200 text-blue-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div
                          className="min-w-0 pr-2 flex-1 cursor-pointer"
                          onClick={() => handleToggleEntityLink('event', ev.id)}
                        >
                          <div className="font-bold text-slate-900 truncate">{ev.summary}</div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {new Date(ev.start).toLocaleString('tr-TR')}
                            {ev.location ? ` • ${ev.location}` : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {ev.htmlLink && (
                            <a
                              href={ev.htmlLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-blue-700 hover:bg-blue-100 rounded-md text-[11px] font-bold flex items-center gap-0.5"
                              title="Google Takvim'de Aç ↗"
                            >
                              <span>Aç</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleEntityLink('event', ev.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                              isLinked
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {isLinked ? 'Bağlı' : 'Bağla'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {linkEntityType === 'drive' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                    <span>
                      {entitySearch.trim()
                        ? `"${entitySearch}" için Drive Sonuçları`
                        : 'Son Erişilen 10 Google Drive Dosyası'}
                    </span>
                    {isSearchingEntities && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    )}
                  </div>

                  {isSearchingEntities && remoteDriveFiles.length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Google Drive'da aranıyor...</span>
                    </div>
                  )}

                  {!isSearchingEntities && remoteDriveFiles.length === 0 && (
                    <p className="py-6 text-center text-slate-400 text-xs italic">
                      Drive dosyası bulunamadı.
                    </p>
                  )}

                  {remoteDriveFiles.map((f) => {
                    const isLinked = detailTask
                      ? detailTask.linkedDriveFileIds?.includes(f.id)
                      : activeProject?.linkedDriveFileIds?.includes(f.id);
                    const fileUrl =
                      f.webViewLink && f.webViewLink !== '#'
                        ? f.webViewLink
                        : `https://drive.google.com/file/d/${f.id}/view`;

                    return (
                      <div
                        key={f.id}
                        className={`p-3 text-xs rounded-xl flex items-center justify-between transition-colors ${
                          isLinked
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div
                          className="min-w-0 pr-2 flex-1 cursor-pointer"
                          onClick={() => handleToggleEntityLink('drive', f.id)}
                        >
                          <div className="font-bold text-slate-900 truncate">{f.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>
                              {f.modifiedTime
                                ? new Date(f.modifiedTime).toLocaleDateString('tr-TR')
                                : ''}
                            </span>
                            {f.mimeType && (
                              <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                                {f.mimeType.split('.').pop() || 'file'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-md text-[11px] font-bold flex items-center gap-0.5"
                            title="Google Drive'da Aç ↗"
                          >
                            <span>Aç</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleToggleEntityLink('drive', f.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                              isLinked
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {isLinked ? 'Bağlı' : 'Bağla'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {linkEntityType === 'contact' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200/80 flex items-center justify-between">
                    <span>
                      {entitySearch.trim()
                        ? `"${entitySearch}" için Google Contacts Sonuçları`
                        : 'Google Contacts Listesi'}
                    </span>
                    {isSearchingEntities && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    )}
                  </div>

                  {isSearchingEntities && remoteContacts.length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Google Contacts'da aranıyor...</span>
                    </div>
                  )}

                  {!isSearchingEntities && remoteContacts.length === 0 && (
                    <p className="py-6 text-center text-slate-400 text-xs italic">
                      Aramanıza uygun kişi bulunamadı.
                    </p>
                  )}

                  {remoteContacts.map((c) => {
                    const isLinked = detailTask
                      ? detailTask.linkedContactResourceNames?.includes(c.resourceName)
                      : activeProject?.linkedContactResourceNames?.includes(c.resourceName);
                    const contactUrl = c.email
                      ? `mailto:${c.email}`
                      : `https://contacts.google.com/search/${encodeURIComponent(c.displayName)}`;

                    return (
                      <div
                        key={c.resourceName}
                        className={`p-3 text-xs rounded-xl flex items-center justify-between transition-colors ${
                          isLinked
                            ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div
                          className="min-w-0 pr-2 flex-1 cursor-pointer"
                          onClick={() => handleToggleEntityLink('contact', c.resourceName)}
                        >
                          <div className="font-bold text-slate-900 truncate">{c.displayName}</div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {c.email} {c.phone ? `• ${c.phone}` : ''}{' '}
                            {c.organization ? `(${c.organization})` : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {c.email && (
                            <a
                              href={contactUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-indigo-700 hover:bg-indigo-100 rounded-md text-[11px] font-bold flex items-center gap-0.5"
                              title="E-posta Gönder / Kişiler'de Aç"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleEntityLink('contact', c.resourceName)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                              isLinked
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {isLinked ? 'Bağlı' : 'Bağla'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: ADD MANUAL TIMELOG MODAL */}
      {isAddTimelogModalOpen && detailTask && activeProject && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Manuel Zaman Kaydı Ekle
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    "{detailTask.title}" kartına özel zaman kaydı girin
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddTimelogModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) =>
                handleSaveManualTimelog(
                  e,
                  detailTask.id,
                  detailTask.title,
                  activeProject.id,
                  activeProject.name
                )
              }
              className="space-y-4"
            >
              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black text-slate-700">
                    Açıklama / Yapılan İş (Markdown Destekli)
                  </label>
                  <span className="text-[10px] text-slate-400 font-normal">**kalın**, *italik*, # başlık, - liste</span>
                </div>
                <textarea
                  rows={3}
                  required
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Örn: Tasarım incelemesi yapıldı ve revizyonlar girildi (**kalın**, *italik*, - liste vb. kullanılabilir)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              {/* Start & End Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Başlangıç Zamanı
                  </label>
                  <input
                    type="datetime-local"
                    value={manualStartTime}
                    onChange={(e) => {
                      setManualStartTime(e.target.value);
                      handleCalculateManualDuration(e.target.value, manualEndTime);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Bitiş Zamanı
                  </label>
                  <input
                    type="datetime-local"
                    value={manualEndTime}
                    onChange={(e) => {
                      setManualEndTime(e.target.value);
                      handleCalculateManualDuration(manualStartTime, e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                  />
                </div>
              </div>

              {/* Duration Minutes */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Süre (Dakika)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={manualDurationMinutes}
                    onChange={(e) => setManualDurationMinutes(Number(e.target.value))}
                    className="w-32 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-hidden"
                  />
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-2 rounded-xl border border-purple-200">
                    = {formatMinutesToText(manualDurationMinutes)}
                  </span>
                </div>
              </div>

              {/* Associated Service / Link (Optional) */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  İlişkili Servis / Öğe (İsteğe Bağlı)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={manualLinkType}
                    onChange={(e) => {
                      setManualLinkType(e.target.value);
                      setManualLinkId('');
                      setManualLinkTitle('');
                    }}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                  >
                    <option value="">İlişkili Öğesiz (Sadece Kart)</option>
                    <option value="calendar">Google Takvim Etkinliği</option>
                    <option value="gmail">Gmail E-postası</option>
                    <option value="drive">Drive Dosyası</option>
                    <option value="tasks">Google Görevi</option>
                  </select>

                  {manualLinkType === 'tasks' && (
                    <select
                      value={manualLinkId}
                      onChange={(e) => {
                        const sel = googleTasks.find((t) => t.id === e.target.value);
                        setManualLinkId(e.target.value);
                        setManualLinkTitle(sel?.title || '');
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      <option value="">Görev Seçin...</option>
                      {googleTasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  )}

                  {manualLinkType === 'gmail' && (
                    <select
                      value={manualLinkId}
                      onChange={(e) => {
                        const sel = emails.find((m) => m.id === e.target.value);
                        setManualLinkId(e.target.value);
                        setManualLinkTitle(sel?.subject || '');
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      <option value="">E-posta Seçin...</option>
                      {emails.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.subject}
                        </option>
                      ))}
                    </select>
                  )}

                  {manualLinkType === 'calendar' && (
                    <select
                      value={manualLinkId}
                      onChange={(e) => {
                        const sel = events.find((ev) => ev.id === e.target.value);
                        setManualLinkId(e.target.value);
                        setManualLinkTitle(sel?.summary || '');
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      <option value="">Etkinlik Seçin...</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.summary}
                        </option>
                      ))}
                    </select>
                  )}

                  {manualLinkType === 'drive' && (
                    <select
                      value={manualLinkId}
                      onChange={(e) => {
                        const sel = driveFiles.find((f) => f.id === e.target.value);
                        setManualLinkId(e.target.value);
                        setManualLinkTitle(sel?.name || '');
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      <option value="">Dosya Seçin...</option>
                      {driveFiles.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Etiketler
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={manualTagInput}
                    onChange={(e) => setManualTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (manualTagInput.trim() && !manualTags.includes(manualTagInput.trim())) {
                          setManualTags([...manualTags, manualTagInput.trim()]);
                          setManualTagInput('');
                        }
                      }
                    }}
                    placeholder="Etiket yazıp Enter'a basın..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualTagInput.trim() && !manualTags.includes(manualTagInput.trim())) {
                        setManualTags([...manualTags, manualTagInput.trim()]);
                        setManualTagInput('');
                      }
                    }}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Ekle
                  </button>
                </div>

                {manualTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {manualTags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 bg-purple-100 text-purple-900 text-xs font-bold rounded-lg flex items-center gap-1"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => setManualTags(manualTags.filter((x) => x !== t))}
                          className="hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTimelogModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSavingTimelog}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingTimelog ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Zaman Kaydını Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LINKED ITEM NAME MODAL */}
      {editingItemInfo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <Edit3 className="w-4 h-4 text-amber-600" />
                <span>Bağlanan Öğenin İsmini Düzenle</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingItemInfo(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">
                  Öğe Türü
                </label>
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-bold text-slate-700 inline-block">
                  {editingItemInfo.typeLabel}
                </span>
              </div>

              {editingItemInfo.originalTitle !== editingItemInfo.currentTitle && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-0.5">
                    Orijinal İsim
                  </label>
                  <p className="text-slate-500 font-medium italic bg-slate-50 p-2 rounded-lg border border-slate-100 truncate">
                    {editingItemInfo.originalTitle}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Özel Gösterim Adı
                </label>
                <input
                  type="text"
                  value={tempEditTitle}
                  onChange={(e) => setTempEditTitle(e.target.value)}
                  placeholder="Örn: Google Drive Özel Doküman Başlığı"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Bu isim Google Drive / sistem isminden farklı olarak gösterilir. Orijinal dosya veya bağlantı etkilenmez.
                </p>
              </div>

              {editingItemInfo.url && (
                <div className="pt-1">
                  <a
                    href={editingItemInfo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold inline-flex items-center gap-1 group"
                  >
                    <span>Google Drive / Sistem Bağlantısında Aç</span>
                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
              {editingItemInfo.currentTitle !== editingItemInfo.originalTitle && (
                <button
                  type="button"
                  onClick={() => {
                    setTempEditTitle(editingItemInfo.originalTitle);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors mr-auto cursor-pointer"
                >
                  Orijinal İse Sıfırla
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditingItemInfo(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveCustomTitle}
                className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
