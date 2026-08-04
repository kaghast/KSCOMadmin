import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Edit2,
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
} from 'lucide-react';
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
} from '../types';

interface Props {
  projects: Project[];
  tasks: ProjectTask[];
  notes: NoteItem[];
  emails: EmailItem[];
  events: CalendarEvent[];
  driveFiles: DriveFile[];
  contacts: ContactItem[];
  onUpdateProject: (project: Project) => Promise<void>;
  onCreateProject: (projectData: Partial<Project>) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onCreateTask: (projectId: string, taskData: Partial<ProjectTask>) => Promise<void>;
  onUpdateTask: (task: ProjectTask) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onOpenNoteModal: (note?: NoteItem) => void;
  language?: 'tr' | 'en';
}

export const ProjectsSection: React.FC<Props> = ({
  projects,
  tasks,
  notes,
  emails,
  events,
  driveFiles,
  contacts,
  onUpdateProject,
  onCreateProject,
  onDeleteProject,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onOpenNoteModal,
  language = 'tr',
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects[0]?.id || ''
  );

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

  // Detail View Title & Description Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleText, setEditTitleText] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescriptionText, setEditDescriptionText] = useState('');

  // Note Filtering & Sorting State in Card Detail View
  const [noteTagFilter, setNoteTagFilter] = useState<string>('all');
  const [noteSortOrder, setNoteSortOrder] = useState<'newest' | 'oldest' | 'title'>('newest');

  // Live Timer for Deadline Countdown
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (detailTask) {
      setEditDescriptionText(detailTask.description || '');
      setIsEditingDescription(false);
      setEditTitleText(detailTask.title || '');
      setIsEditingTitle(false);
    }
  }, [detailTask?.id]);

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

  // Link Modals
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkEntityType, setLinkEntityType] = useState<
    'email' | 'event' | 'drive' | 'contact'
  >('email');
  const [entitySearch, setEntitySearch] = useState('');

  const activeProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0];

  const projectTasks = tasks.filter(
    (t) => t.projectId === (activeProject?.id || '')
  );

  const projectNotes = notes.filter(
    (n) =>
      n.projectId === activeProject?.id ||
      activeProject?.linkedNoteIds?.includes(n.id)
  );

  const linkedEmailsList = emails.filter((e) =>
    activeProject?.linkedEmailIds?.includes(e.id)
  );

  const linkedEventsList = events.filter((evt) =>
    activeProject?.linkedEventIds?.includes(evt.id)
  );

  const linkedDriveFilesList = driveFiles.filter((f) =>
    activeProject?.linkedDriveFileIds?.includes(f.id)
  );

  const linkedContactsList = contacts.filter((c) =>
    activeProject?.linkedContactResourceNames?.includes(c.resourceName)
  );

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
    type: 'email' | 'event' | 'drive' | 'contact',
    idOrResource: string
  ) => {
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
                            onClick={() => setDetailTask(task)}
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
                                    setDetailTask(task);
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

      {/* MODAL 6: ENTITY LINKER MODAL (Email, Event, Drive File, Contact) */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
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
              {linkEntityType === 'email' &&
                emails
                  .filter(
                    (e) =>
                      e.subject.toLowerCase().includes(entitySearch.toLowerCase()) ||
                      e.sender.toLowerCase().includes(entitySearch.toLowerCase())
                  )
                  .map((e) => {
                    const isLinked = activeProject.linkedEmailIds?.includes(e.id);
                    return (
                      <div
                        key={e.id}
                        onClick={() => handleToggleEntityLink('email', e.id)}
                        className={`p-3 text-xs rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                          isLinked
                            ? 'bg-rose-50 border border-rose-200 text-rose-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold">{e.subject}</div>
                          <div className="text-[10px] text-slate-400">
                            {e.sender} ({e.date})
                          </div>
                        </div>
                        {isLinked && (
                          <Check className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}

              {linkEntityType === 'event' &&
                events
                  .filter((ev) =>
                    ev.summary.toLowerCase().includes(entitySearch.toLowerCase())
                  )
                  .map((ev) => {
                    const isLinked = activeProject.linkedEventIds?.includes(ev.id);
                    return (
                      <div
                        key={ev.id}
                        onClick={() => handleToggleEntityLink('event', ev.id)}
                        className={`p-3 text-xs rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                          isLinked
                            ? 'bg-blue-50 border border-blue-200 text-blue-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold">{ev.summary}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(ev.start).toLocaleString('tr-TR')}
                          </div>
                        </div>
                        {isLinked && (
                          <Check className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}

              {linkEntityType === 'drive' &&
                driveFiles
                  .filter((f) =>
                    f.name.toLowerCase().includes(entitySearch.toLowerCase())
                  )
                  .map((f) => {
                    const isLinked = activeProject.linkedDriveFileIds?.includes(f.id);
                    return (
                      <div
                        key={f.id}
                        onClick={() => handleToggleEntityLink('drive', f.id)}
                        className={`p-3 text-xs rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                          isLinked
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold">{f.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {f.mimeType}
                          </div>
                        </div>
                        {isLinked && (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}

              {linkEntityType === 'contact' &&
                contacts
                  .filter((c) =>
                    c.displayName.toLowerCase().includes(entitySearch.toLowerCase())
                  )
                  .map((c) => {
                    const isLinked = activeProject.linkedContactResourceNames?.includes(
                      c.resourceName
                    );
                    return (
                      <div
                        key={c.resourceName}
                        onClick={() =>
                          handleToggleEntityLink('contact', c.resourceName)
                        }
                        className={`p-3 text-xs rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                          isLinked
                            ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold">{c.displayName}</div>
                          <div className="text-[10px] text-slate-400">
                            {c.email || c.phone}
                          </div>
                        </div>
                        {isLinked && (
                          <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
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

      {/* 5. FULL PAGE CARD DETAIL VIEW */}
      {detailTask && activeProject && (() => {
        const countdown = detailTask.dueDate ? getCountdown(detailTask.dueDate) : null;

        // Extract note tags for this project
        const allNoteTags = Array.from(
          new Set(
            projectNotes.flatMap((n) => n.tags || []).filter(Boolean)
          )
        );

        // Filter notes by tag
        let filteredNotes = projectNotes.filter((n) => {
          if (noteTagFilter === 'all') return true;
          return n.tags?.includes(noteTagFilter);
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

        return (
          <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-150">
            {/* Top Bar Navigation */}
            <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setDetailTask(null)}
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
                      setDetailTask(null);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Kartı Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kartı Sil</span>
                </button>
                <button
                  onClick={() => setDetailTask(null)}
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
                      <span className="text-[10px] text-slate-400 font-bold">
                        (Çift tıklayarak düzenleyin)
                      </span>
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
                      className="text-xs text-slate-800 leading-relaxed bg-slate-50 hover:bg-purple-50/40 p-4 rounded-2xl border border-slate-200 hover:border-purple-300 font-medium whitespace-pre-wrap cursor-pointer transition-all min-h-[80px]"
                    >
                      {detailTask.description ? (
                        detailTask.description
                      ) : (
                        <span className="text-slate-400 italic">
                          Açıklama girilmemiş. Çift tıklayarak açıklama yazabilirsiniz.
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Left Side Notes Listing Section with Tag Filtering & Sorting */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          Notlar ({filteredNotes.length})
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Bu projeye veya karta eklenen notlar
                        </p>
                      </div>
                    </div>

                    {/* Filter & Sort Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Tag Filter */}
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                        <Tag className="w-3 h-3 text-amber-600 shrink-0" />
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

                      {/* Sort Order */}
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                        <span className="text-[10px] font-extrabold text-slate-400">Sırala:</span>
                        <select
                          value={noteSortOrder}
                          onChange={(e) =>
                            setNoteSortOrder(
                              e.target.value as 'newest' | 'oldest' | 'title'
                            )
                          }
                          className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                        >
                          <option value="newest">En Yeni</option>
                          <option value="oldest">En Eski</option>
                          <option value="title">Başlık (A-Z)</option>
                        </select>
                      </div>

                      {/* New Note Button */}
                      <button
                        onClick={() =>
                          onOpenNoteModal({
                            id: '',
                            title: '',
                            content: '',
                            tags: [],
                            projectId: activeProject.id,
                            date: new Date().toISOString().split('T')[0],
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          })
                        }
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Yeni Not Ekle</span>
                      </button>
                    </div>
                  </div>

                  {/* Notes Cards Container */}
                  <div className="space-y-3">
                    {filteredNotes.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs italic">
                        {noteTagFilter !== 'all'
                          ? `"#${noteTagFilter}" etiketine sahip not bulunamadı.`
                          : 'Henüz not eklenmemiş.'}
                      </div>
                    ) : (
                      filteredNotes.map((note) => (
                        <div
                          key={note.id}
                          className="p-4 bg-amber-50/40 hover:bg-amber-50/80 border border-amber-200/80 rounded-2xl transition-all space-y-2 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-extrabold text-slate-900 text-xs leading-snug">
                              {note.title || 'Başlıksız Not'}
                            </h4>
                            <button
                              onClick={() => onOpenNoteModal(note)}
                              className="px-2.5 py-1 bg-amber-200/60 hover:bg-amber-200 text-amber-900 text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              Görüntüle & Düzenle
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                            {note.content}
                          </p>

                          <div className="flex items-center justify-between pt-1 border-t border-amber-200/40 text-[10px] text-slate-400">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {note.tags?.map((t) => (
                                <span
                                  key={t}
                                  className="px-2 py-0.5 bg-amber-200/60 text-amber-900 font-bold rounded-md"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                            <span>{note.date}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN (4 cols in lg: 33% width - Connected Items) */}
              <div className="lg:col-span-4 space-y-6">
                
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-600" />
                      Bağlanan Öğeler (Workspace)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Bu kart ve projeye bağlı e-posta, etkinlik ve dosyalar
                    </p>
                  </div>

                  {/* 1. Connected Emails */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-rose-500" /> E-postalar ({linkedEmailsList.length})
                      </span>
                      <button
                        onClick={() => {
                          setLinkEntityType('email');
                          setIsLinkModalOpen(true);
                        }}
                        className="text-[10px] font-extrabold text-purple-600 hover:underline cursor-pointer"
                      >
                        + E-posta Bağla
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {linkedEmailsList.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">E-posta bağlanmadı.</p>
                      ) : (
                        linkedEmailsList.map((email) => (
                          <div
                            key={email.id}
                            className="p-2.5 bg-rose-50/50 border border-rose-200/60 rounded-xl flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="font-bold text-slate-900 truncate">{email.subject}</p>
                              <p className="text-[10px] text-slate-500 truncate">{email.sender}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 2. Connected Calendar Events */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" /> Takvim Etkinlikleri ({linkedEventsList.length})
                      </span>
                      <button
                        onClick={() => {
                          setLinkEntityType('event');
                          setIsLinkModalOpen(true);
                        }}
                        className="text-[10px] font-extrabold text-purple-600 hover:underline cursor-pointer"
                      >
                        + Etkinlik Bağla
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {linkedEventsList.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Takvim etkinliği bağlanmadı.</p>
                      ) : (
                        linkedEventsList.map((evt) => (
                          <div
                            key={evt.id}
                            className="p-2.5 bg-blue-50/50 border border-blue-200/60 rounded-xl flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="font-bold text-slate-900 truncate">{evt.summary}</p>
                              <p className="text-[10px] text-slate-500 truncate">{new Date(evt.start).toLocaleString('tr-TR')}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 3. Connected Drive Files */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-emerald-500" /> Drive Dosyaları ({linkedDriveFilesList.length})
                      </span>
                      <button
                        onClick={() => {
                          setLinkEntityType('drive');
                          setIsLinkModalOpen(true);
                        }}
                        className="text-[10px] font-extrabold text-purple-600 hover:underline cursor-pointer"
                      >
                        + Dosya Bağla
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {linkedDriveFilesList.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Drive dosyası bağlanmadı.</p>
                      ) : (
                        linkedDriveFilesList.map((file) => (
                          <div
                            key={file.id}
                            className="p-2.5 bg-emerald-50/50 border border-emerald-200/60 rounded-xl flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-slate-900 truncate">{file.name}</span>
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 font-bold hover:underline text-[10px] shrink-0 ml-2"
                              >
                                Aç
                              </a>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 4. Connected Contacts */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500" /> Kişiler ({linkedContactsList.length})
                      </span>
                      <button
                        onClick={() => {
                          setLinkEntityType('contact');
                          setIsLinkModalOpen(true);
                        }}
                        className="text-[10px] font-extrabold text-purple-600 hover:underline cursor-pointer"
                      >
                        + Kişi Bağla
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {linkedContactsList.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Kişi bağlanmadı.</p>
                      ) : (
                        linkedContactsList.map((c) => (
                          <div
                            key={c.resourceName}
                            className="p-2.5 bg-indigo-50/50 border border-indigo-200/60 rounded-xl flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-indigo-950 truncate">{c.displayName}</span>
                            <span className="text-[10px] text-slate-500">{c.email || c.phone}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
