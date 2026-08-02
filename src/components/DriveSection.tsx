import React, { useState } from 'react';
import { HardDrive, Star, Plus, ExternalLink, FileText, FileSpreadsheet, Presentation, File, RefreshCw, FolderKanban, Search, X } from 'lucide-react';
import { DriveFile, Project, ProjectTask } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Props {
  files: DriveFile[];
  projects?: Project[];
  projectTasks?: ProjectTask[];
  onAddDriveDoc: () => void;
  onRefresh: () => void;
  onToggleLinkToProject?: (type: 'drive', itemId: string, projectId: string) => Promise<void>;
  isLoading: boolean;
}

export const DriveSection: React.FC<Props> = ({
  files,
  projects = [],
  projectTasks = [],
  onAddDriveDoc,
  onRefresh,
  onToggleLinkToProject,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('document')) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    if (mimeType.includes('spreadsheet')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    if (mimeType.includes('presentation')) {
      return <Presentation className="w-5 h-5 text-amber-600" />;
    }
    return <File className="w-5 h-5 text-slate-500" />;
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-base">Google Drive</h2>
            <p className="text-xs text-slate-500">Yıldızlı Dokümanlar & Dosyalar</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            title="Yenile"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <button
            onClick={onAddDriveDoc}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Doküman Ekle
          </button>
        </div>
      </div>

      {/* Real-time Search Bar */}
      <div className="p-3 bg-slate-50/40 border-b border-slate-100">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Yıldızlı dosyalar içinde gerçek zamanlı ara..."
            className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Files List */}
      <div className="p-3 overflow-y-auto max-h-[380px] space-y-2 flex-1">
        {filteredFiles.length === 0 ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <HardDrive className="w-8 h-8 stroke-1 text-slate-300" />
            <p className="text-xs font-medium">
              {searchQuery
                ? `"${searchQuery}" aramasına uygun yıldızlı dosya bulunamadı.`
                : "Drive'da yıldızlı doküman bulunamadı."}
            </p>
          </div>
        ) : (
          filteredFiles.map((file) => (
            <div
              key={file.id}
              className="p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-white rounded-xl shadow-2xs border border-slate-100">
                  {getFileIcon(file.mimeType)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-semibold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                      {file.name}
                    </h4>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 mb-1.5">
                    <span>
                      {formatDistanceToNow(new Date(file.modifiedTime), { addSuffix: true, locale: tr })} güncellendi
                    </span>
                    {file.size && <span>• {file.size}</span>}
                  </div>

                  {/* Project Links & Selector */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {projects
                        .filter((p) => p.linkedDriveFileIds?.includes(file.id))
                        .map((p) => (
                          <span
                            key={p.id}
                            className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md flex items-center gap-1"
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
                            onToggleLinkToProject('drive', file.id, e.target.value);
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
                              const isLinked = p.linkedDriveFileIds?.includes(file.id);
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

              <a
                href={file.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs"
              >
                Aç <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
