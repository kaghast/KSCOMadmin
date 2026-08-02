import React, { useState } from 'react';
import { CheckSquare, Plus, ArrowUpDown, Check, RefreshCw, Flag, Calendar, FolderKanban, AlertTriangle } from 'lucide-react';
import { TaskItem, TaskPriority, Project, ProjectTask } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Props {
  tasks: TaskItem[];
  projects?: Project[];
  projectTasks?: ProjectTask[];
  onAddTask: () => void;
  onToggleTaskStatus: (id: string, currentStatus: 'needsAction' | 'completed') => Promise<void>;
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
  onRefresh,
  onToggleLinkToProject,
  isLoading,
  requiresReauth,
  onReauth,
}) => {
  const [sortBy, setSortBy] = useState<'priority' | 'due'>('priority');

  const priorityWeight: Record<TaskPriority, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === 'priority') {
      const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (pDiff !== 0) return pDiff;
      // Secondary sort by completed status (uncompleted first)
      if (a.status !== b.status) return a.status === 'needsAction' ? -1 : 1;
      return 0;
    } else {
      // Sort by due date
      const dateA = a.due ? new Date(a.due).getTime() : Infinity;
      const dateB = b.due ? new Date(b.due).getTime() : Infinity;
      return dateA - dateB;
    }
  });

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
      <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-base">Google Tasks</h2>
            <p className="text-xs text-slate-500">Önem Sırasına Göre Görev Listesi</p>
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
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
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

      {/* Sorting Control */}
      <div className="px-4 py-2 bg-slate-50/40 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium text-[11px] text-slate-500">Sıralama Ölçütü:</span>
        <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg">
          <button
            onClick={() => setSortBy('priority')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
              sortBy === 'priority'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚡ Önem Sırası
          </button>
          <button
            onClick={() => setSortBy('due')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
              sortBy === 'due'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📅 Tarihe Göre
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="p-3 overflow-y-auto max-h-[380px] space-y-2 flex-1">
        {sortedTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <CheckSquare className="w-8 h-8 stroke-1 text-slate-300" />
            <p className="text-xs font-medium">Kayıtlı görev bulunamadı.</p>
          </div>
        ) : (
          sortedTasks.map((task) => {
            const isCompleted = task.status === 'completed';

            return (
              <div
                key={task.id}
                className={`p-3 rounded-xl border transition-all flex items-start gap-3 group ${
                  isCompleted
                    ? 'bg-slate-50/60 border-slate-200/60 opacity-60'
                    : 'bg-white border-slate-100 hover:border-indigo-200 shadow-2xs'
                }`}
              >
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

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                    <h4
                      className={`text-xs font-semibold ${
                        isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </h4>
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
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
