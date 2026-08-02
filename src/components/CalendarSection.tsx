import React from 'react';
import { Calendar, Plus, MapPin, Clock, ExternalLink, RefreshCw, FolderKanban } from 'lucide-react';
import { CalendarEvent, Project, ProjectTask } from '../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Props {
  events: CalendarEvent[];
  projects?: Project[];
  projectTasks?: ProjectTask[];
  onAddEvent: () => void;
  onRefresh: () => void;
  onToggleLinkToProject?: (type: 'event', itemId: string, projectId: string) => Promise<void>;
  isLoading: boolean;
}

export const CalendarSection: React.FC<Props> = ({
  events,
  projects = [],
  projectTasks = [],
  onAddEvent,
  onRefresh,
  onToggleLinkToProject,
  isLoading,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-base">Google Calendar</h2>
            <p className="text-xs text-slate-500">Gelecek Etkinlikler & Randevular</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            title="Yenile"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button
            onClick={onAddEvent}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Etkinlik Ekle
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="p-3 overflow-y-auto max-h-[380px] space-y-3 flex-1">
        {events.length === 0 ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Calendar className="w-8 h-8 stroke-1 text-slate-300" />
            <p className="text-xs font-medium">Yaklaşan etkinlik bulunmuyor.</p>
          </div>
        ) : (
          events.map((evt) => {
            const startDate = new Date(evt.start);
            const endDate = new Date(evt.end);

            return (
              <div
                key={evt.id}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex items-start gap-3 group"
              >
                {/* Date Badge */}
                <div className="flex flex-col items-center justify-center px-2.5 py-1.5 bg-blue-50 border border-blue-200/60 text-blue-700 rounded-xl min-w-[54px] text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {format(startDate, 'MMM', { locale: tr })}
                  </span>
                  <span className="text-lg font-extrabold leading-none">
                    {format(startDate, 'dd')}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {evt.summary}
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-blue-500" />
                      {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                    </span>
                    {evt.location && (
                      <span className="flex items-center gap-1 truncate max-w-[180px]">
                        <MapPin className="w-3 h-3 text-red-400" />
                        {evt.location}
                      </span>
                    )}
                  </div>

                  {evt.description && (
                    <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">
                      {evt.description}
                    </p>
                  )}

                  {/* Project Links & Selector */}
                  <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {projects
                        .filter((p) => p.linkedEventIds?.includes(evt.id))
                        .map((p) => (
                          <span
                            key={p.id}
                            className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-md flex items-center gap-1"
                          >
                            <FolderKanban className="w-3 h-3" /> {p.name}
                          </span>
                        ))}
                    </div>

                    {(projects.length > 0 || projectTasks.length > 0) && onToggleLinkToProject && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            onToggleLinkToProject('event', evt.id, e.target.value);
                          }
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-hidden cursor-pointer"
                      >
                        <option value="">+ Karta Bağla</option>
                        {projectTasks && projectTasks.length > 0
                          ? projectTasks.map((t) => (
                              <option key={t.id} value={t.projectId || projects[0]?.id}>
                                + {t.title}
                              </option>
                            ))
                          : projects.map((p) => {
                              const isLinked = p.linkedEventIds?.includes(evt.id);
                              return (
                                <option key={p.id} value={p.id}>
                                  {isLinked ? '✓ ' : '+ '} {p.name}
                                </option>
                              );
                            })}
                      </select>
                    )}
                  </div>
                </div>

                {evt.htmlLink && (
                  <a
                    href={evt.htmlLink}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-300 hover:text-blue-600 transition-colors"
                    title="Takvimde Aç"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
