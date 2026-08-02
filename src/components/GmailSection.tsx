import React, { useState } from 'react';
import { Mail, Star, Plus, RefreshCw, Inbox, CheckCircle2, Search, FolderKanban } from 'lucide-react';
import { EmailItem, Project, ProjectTask } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Props {
  emails: EmailItem[];
  projects?: Project[];
  projectTasks?: ProjectTask[];
  activeTab: 'inbox' | 'starred';
  onTabChange: (tab: 'inbox' | 'starred') => void;
  onCompose: () => void;
  onToggleStar: (id: string, currentStarred: boolean) => Promise<void>;
  onRefresh: () => void;
  onToggleLinkToProject?: (type: 'email', itemId: string, projectId: string) => Promise<void>;
  isLoading: boolean;
}

export const GmailSection: React.FC<Props> = ({
  emails,
  projects = [],
  projectTasks = [],
  activeTab,
  onTabChange,
  onCompose,
  onToggleStar,
  onRefresh,
  onToggleLinkToProject,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmails = emails.filter(
    (e) =>
      e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.snippet.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Card Header */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-red-100 text-red-600 rounded-xl">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-base">Gmail E-postalarım</h2>
            <p className="text-xs text-slate-500">Gelen Kutusu & Yıldızlı Mesajlar</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            title="Yenile"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-red-600' : ''}`} />
          </button>
          <button
            onClick={onCompose}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Yeni Mail
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/30">
        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-xs font-medium">
          <button
            onClick={() => onTabChange('inbox')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'inbox'
                ? 'bg-white text-red-600 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" /> Gelen Kutusu
          </button>
          <button
            onClick={() => onTabChange('starred')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'starred'
                ? 'bg-white text-amber-600 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" /> Yıldızlı
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Mail ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
        </div>
      </div>

      {/* List Content */}
      <div className="p-3 overflow-y-auto max-h-[380px] divide-y divide-slate-100 flex-1">
        {filteredEmails.length === 0 ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Inbox className="w-8 h-8 stroke-1 text-slate-300" />
            <p className="text-xs font-medium">Bu sekmede e-posta bulunamadı.</p>
          </div>
        ) : (
          filteredEmails.map((email) => (
            <div
              key={email.id}
              className={`py-3 px-2 rounded-xl transition-all hover:bg-slate-50 flex items-start gap-3 group ${
                !email.isRead ? 'bg-red-50/20 font-medium' : ''
              }`}
            >
              <button
                onClick={() => onToggleStar(email.id, email.isStarred)}
                className="mt-0.5 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                title={email.isStarred ? 'Yıldızı Kaldır' : 'Yıldızla'}
              >
                <Star
                  className={`w-4 h-4 ${
                    email.isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                  }`}
                />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {email.sender}
                  </span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {formatDistanceToNow(new Date(email.date), { addSuffix: true, locale: tr })}
                  </span>
                </div>
                <h4 className="text-xs font-medium text-slate-900 truncate mb-1">
                  {!email.isRead && (
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />
                  )}
                  {email.subject}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                  {email.snippet}
                </p>

                {/* Project Links & Selector */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {projects
                      .filter((p) => p.linkedEmailIds?.includes(email.id))
                      .map((p) => (
                        <span
                          key={p.id}
                          className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-extrabold rounded-md flex items-center gap-1"
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
                          onToggleLinkToProject('email', email.id, e.target.value);
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
                            const isLinked = p.linkedEmailIds?.includes(email.id);
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
            </div>
          ))
        )}
      </div>
    </div>
  );
};
