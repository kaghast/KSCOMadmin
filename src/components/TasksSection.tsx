import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  RefreshCw,
  Calendar,
  AlertTriangle,
  Check,
  Pencil,
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from 'lucide-react';
import { TaskItem, TaskPriority, Project, ProjectTask } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Props {
  tasks: TaskItem[];
  projects?: Project[];
  projectTasks?: ProjectTask[];
  onAddTask: () => void;
  onToggleTaskStatus: (id: string, currentStatus: 'needsAction' | 'completed') => Promise<void>;
  onUpdateTask?: (
    id: string,
    updates: {
      title?: string;
      notes?: string;
      due?: string;
      priority?: TaskPriority;
      status?: 'needsAction' | 'completed';
    }
  ) => Promise<void>;
  onRefresh: () => void;
  onToggleLinkToProject?: (type: 'task', itemId: string, projectId: string) => Promise<void>;
  isLoading: boolean;
  requiresReauth?: boolean;
  onReauth?: () => void;
}

export const TasksSection: React.FC<Props> = ({
  tasks,
  projects = [],
  projectTasks = [],
  onAddTask,
  onToggleTaskStatus,
  onUpdateTask,
  onRefresh,
  onToggleLinkToProject,
  isLoading,
  requiresReauth,
  onReauth,
}) => {
  // Tamamlananlar ilk açılışta gelmesin (default false)
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'priority' | 'due' | 'custom'>('priority');
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  // Task inline editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDue, setEditDue] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');

  const priorityWeight: Record<TaskPriority, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  // Reordering logic
  const getSortedTasks = () => {
    const list = [...tasks];

    if (sortBy === 'priority') {
      list.sort((a, b) => {
        const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
        if (pDiff !== 0) return pDiff;
        if (a.status !== b.status) return a.status === 'needsAction' ? -1 : 1;
        return 0;
      });
    } else if (sortBy === 'due') {
      list.sort((a, b) => {
        const dateA = a.due ? new Date(a.due).getTime() : Infinity;
        const dateB = b.due ? new Date(b.due).getTime() : Infinity;
        return dateA - dateB;
      });
    } else if (sortBy === 'custom' && customOrder.length > 0) {
      list.sort((a, b) => {
        const indexA = customOrder.indexOf(a.id);
        const indexB = customOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }

    return list;
  };

  const sortedTasks = getSortedTasks();

  // Filter completed tasks based on showCompleted switch
  const visibleTasks = sortedTasks.filter((t) => {
    if (!showCompleted && t.status === 'completed') {
      return false;
    }
    return true;
  });

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const pendingCount = tasks.filter((t) => t.status === 'needsAction').length;

  const handleMoveTask = (taskId: string, direction: 'up' | 'down') => {
    const currentList = visibleTasks.map((t) => t.id);
    const index = currentList.indexOf(taskId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentList.length) return;

    const updatedList = [...currentList];
    const [movedId] = updatedList.splice(index, 1);
    updatedList.splice(newIndex, 0, movedId);

    setCustomOrder(updatedList);
    setSortBy('custom');
  };

  const handleStartEdit = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditNotes(task.notes || '');
    setEditDue(task.due ? task.due.substring(0, 10) : '');
    setEditPriority(task.priority || 'medium');
  };

  const handleSaveEdit = async (taskId: string) => {
    if (!editTitle.trim()) {
      setEditingTaskId(null);
      return;
    }

    if (onUpdateTask) {
      await onUpdateTask(taskId, {
        title: editTitle.trim(),
        notes: editNotes.trim(),
        due: editDue ? new Date(editDue).toISOString() : undefined,
        priority: editPriority,
      });
    }
    setEditingTaskId(null);
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1">
            🔴 Yüksek Öncelik
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
            🟡 Orta Öncelik
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 flex items-center gap-1">
            🟢 Düşük Öncelik
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-base flex items-center gap-2">
              Google Tasks
              <span className="text-xs font-normal text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                {pendingCount} aktif görev
              </span>
            </h2>
            <p className="text-xs text-slate-500">Görev Takibi, Düzenleme ve Sıralama</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            title="Yenile"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button
            onClick={onAddTask}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Görev Ekle
          </button>
        </div>
      </div>

      {/* Reauth Warning */}
      {requiresReauth && (
        <div className="m-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Google Tasks izni henüz verilmedi veya süresi doldu. Görev senkronizasyonu için lütfen izinleri yenileyin.</span>
          </div>
          {onReauth && (
            <button
              onClick={onReauth}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shrink-0 cursor-pointer text-xs"
            >
              Google ile İzinleri Yenile
            </button>
          )}
        </div>
      )}

      {/* Control Bar: Switch + Sorting Controls */}
      <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Toggle Switch for Completed Tasks */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2.5 cursor-pointer select-none group">
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              {showCompleted ? <Eye className="w-3.5 h-3.5 text-indigo-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              Tamamlananları Göster ({completedCount})
            </span>
          </label>
        </div>

        {/* Sorting controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" /> Sırala:
          </span>
          <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg">
            <button
              onClick={() => setSortBy('priority')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                sortBy === 'priority'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚡ Önem
            </button>
            <button
              onClick={() => setSortBy('due')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                sortBy === 'due'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Tarih
            </button>
            <button
              onClick={() => setSortBy('custom')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                sortBy === 'custom'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Özel Sıralama (Yön okları ile değiştirilir)"
            >
              ↕️ Özel
            </button>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="p-3 overflow-y-auto max-h-[420px] space-y-2 flex-1">
        {visibleTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <CheckSquare className="w-9 h-9 stroke-1 text-slate-300" />
            <p className="text-xs font-medium">
              {!showCompleted && completedCount > 0
                ? `${completedCount} tamamlanan görev var. Görmek için switch'i açabilirsiniz.`
                : 'Kayıtlı görev bulunamadı.'}
            </p>
          </div>
        ) : (
          visibleTasks.map((task, index) => {
            const isCompleted = task.status === 'completed';
            const isEditing = editingTaskId === task.id;

            return (
              <div
                key={task.id}
                className={`p-3 rounded-xl border transition-all flex items-start gap-3 group ${
                  isCompleted
                    ? 'bg-slate-50/60 border-slate-200/60 opacity-60'
                    : 'bg-white border-slate-100 hover:border-indigo-200 shadow-2xs'
                }`}
              >
                {/* Reorder Buttons */}
                <div className="flex flex-col gap-0.5 mt-0.5 shrink-0">
                  <button
                    onClick={() => handleMoveTask(task.id, 'up')}
                    disabled={index === 0}
                    className="p-0.5 text-slate-300 hover:text-indigo-600 disabled:opacity-20 transition-colors cursor-pointer"
                    title="Yukarı Taşı"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveTask(task.id, 'down')}
                    disabled={index === visibleTasks.length - 1}
                    className="p-0.5 text-slate-300 hover:text-indigo-600 disabled:opacity-20 transition-colors cursor-pointer"
                    title="Aşağı Taşı"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Checkbox */}
                <button
                  onClick={() => onToggleTaskStatus(task.id, task.status)}
                  className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 hover:border-indigo-500 bg-white'
                  }`}
                >
                  {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                {/* Content area / Inline editing */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2.5 bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-200/80">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Görev Adı</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs font-semibold bg-white border border-indigo-300 rounded-lg focus:outline-hidden"
                          placeholder="Görev adı..."
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Notlar / Açıklama</label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={2}
                          className="w-full px-2.5 py-1 text-xs bg-white border border-indigo-300 rounded-lg focus:outline-hidden resize-none"
                          placeholder="Görev notları..."
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Öncelik</label>
                          <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                            className="bg-white border border-indigo-300 text-xs font-semibold rounded-lg px-2 py-1 focus:outline-hidden"
                          >
                            <option value="high">🔴 Yüksek</option>
                            <option value="medium">🟡 Orta</option>
                            <option value="low">🟢 Düşük</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Son Tarih</label>
                          <input
                            type="date"
                            value={editDue}
                            onChange={(e) => setEditDue(e.target.value)}
                            className="bg-white border border-indigo-300 text-xs rounded-lg px-2 py-1 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-indigo-100">
                        <button
                          onClick={() => setEditingTaskId(null)}
                          className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> İptal
                        </button>
                        <button
                          onClick={() => handleSaveEdit(task.id)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Kaydet
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4
                            className={`text-xs font-semibold ${
                              isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </h4>
                          <button
                            onClick={() => handleStartEdit(task)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Görevi Düzenle"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {getPriorityBadge(task.priority)}
                      </div>

                      {task.notes && (
                        <p
                          className={`text-[11px] mb-1.5 line-clamp-2 ${
                            isCompleted ? 'text-slate-400' : 'text-slate-600'
                          }`}
                        >
                          {task.notes}
                        </p>
                      )}

                      {task.due && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mb-1.5">
                          <Calendar className="w-3 h-3 text-indigo-400" />
                          <span>
                            Son Tarih: {formatDistanceToNow(new Date(task.due), { addSuffix: true, locale: tr })}
                          </span>
                        </div>
                      )}

                      {/* Project Selector */}
                      {(projects.length > 0 || projectTasks.length > 0) && onToggleLinkToProject && (
                        <div className="flex items-center justify-end pt-1 border-t border-slate-100">
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                onToggleLinkToProject('task', task.id, e.target.value);
                              }
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-hidden cursor-pointer"
                          >
                            <option value="">+ Kanban Kartına Aktar / Bağla</option>
                            {projectTasks && projectTasks.length > 0
                              ? projectTasks.map((t) => (
                                  <option key={t.id} value={t.projectId || projects[0]?.id}>
                                    + {t.title}
                                  </option>
                                ))
                              : projects.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    + {p.name}
                                  </option>
                                ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
