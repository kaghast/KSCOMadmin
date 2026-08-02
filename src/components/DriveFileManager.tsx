import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Folder,
  FileText,
  FileSpreadsheet,
  Presentation,
  File,
  Search,
  X,
  Star,
  Plus,
  RefreshCw,
  ExternalLink,
  Trash2,
  FolderPlus,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  FolderKanban,
  Filter,
} from 'lucide-react';
import { DriveFile, Project, ProjectTask } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Props {
  projects?: Project[];
  projectTasks?: ProjectTask[];
  onToggleLinkToProject?: (type: 'drive', itemId: string, projectId: string) => Promise<void>;
  onAddDriveDoc?: () => void;
  isAuthenticated: boolean;
  onLogin?: () => void;
}

export const DriveFileManager: React.FC<Props> = ({
  projects = [],
  projectTasks = [],
  onToggleLinkToProject,
  onAddDriveDoc,
  isAuthenticated,
  onLogin,
}) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'folders' | 'docs' | 'sheets' | 'slides' | 'starred'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'Drive Dosyalarım' },
  ]);

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Fetch Drive Files from API
  const fetchDriveFiles = async (folderId = currentFolderId, search = searchQuery) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (folderId && folderId !== 'all') queryParams.append('folderId', folderId);
      if (search) queryParams.append('search', search);

      const res = await fetch(`/api/drive/files?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.files) {
          setFiles(data.files);
        }
      }
    } catch (err) {
      console.error('Error fetching drive files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDriveFiles(currentFolderId, searchQuery);
  }, [currentFolderId, searchQuery]);

  // Handle Folder Navigation
  const handleOpenFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setFolderPath((prev) => [...prev, { id: folderId, name: folderName }]);
    setSearchQuery('');
  };

  const handleNavigateBreadcrumb = (index: number) => {
    const target = folderPath[index];
    setFolderPath(folderPath.slice(0, index + 1));
    setCurrentFolderId(target.id);
    setSearchQuery('');
  };

  // Toggle Star Status
  const handleToggleStar = async (fileId: string, currentStarred: boolean) => {
    // Optimistic update
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, starred: !currentStarred } : f))
    );

    try {
      await fetch(`/api/drive/files/${fileId}/star`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: !currentStarred }),
      });
    } catch (err) {
      console.error('Error toggling star:', err);
      // Revert if error
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, starred: currentStarred } : f))
      );
    }
  };

  // Create New Folder
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: currentFolderId,
        }),
      });

      if (res.ok) {
        setNewFolderName('');
        setIsCreatingFolder(false);
        fetchDriveFiles(currentFolderId, searchQuery);
      }
    } catch (err) {
      console.error('Error creating folder:', err);
    }
  };

  // Delete/Trash File
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Bu dosyayı Google Drive çöpe taşımak istediğinizden emin misiniz?')) return;

    setFiles((prev) => prev.filter((f) => f.id !== fileId));

    try {
      await fetch(`/api/drive/files/${fileId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error deleting file:', err);
      fetchDriveFiles(currentFolderId, searchQuery);
    }
  };

  // File Icon Helper
  const getFileIcon = (file: DriveFile) => {
    if (file.isFolder || file.mimeType.includes('folder')) {
      return <Folder className="w-6 h-6 text-amber-500 fill-amber-100" />;
    }
    if (file.mimeType.includes('document')) {
      return <FileText className="w-6 h-6 text-blue-600" />;
    }
    if (file.mimeType.includes('spreadsheet')) {
      return <FileSpreadsheet className="w-6 h-6 text-emerald-600" />;
    }
    if (file.mimeType.includes('presentation')) {
      return <Presentation className="w-6 h-6 text-purple-600" />;
    }
    return <File className="w-6 h-6 text-slate-500" />;
  };

  // Client Filter by Category
  const filteredFiles = files.filter((f) => {
    if (activeFilter === 'folders') return f.isFolder || f.mimeType.includes('folder');
    if (activeFilter === 'docs') return f.mimeType.includes('document');
    if (activeFilter === 'sheets') return f.mimeType.includes('spreadsheet');
    if (activeFilter === 'slides') return f.mimeType.includes('presentation');
    if (activeFilter === 'starred') return f.starred;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl shadow-xs">
            <HardDrive className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Google Drive Dosya Yöneticisi
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Google Drive dosyalarınızı gerçek zamanlı arayın, yönetin ve Kanban projelerine bağlayın.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchDriveFiles(currentFolderId, searchQuery)}
            title="Yenile"
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreatingFolder(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
          >
            <FolderPlus className="w-4 h-4 text-amber-600" /> Yeni Klasör
          </button>

          {onAddDriveDoc && (
            <button
              onClick={onAddDriveDoc}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Yeni Doküman
            </button>
          )}
        </div>
      </div>

      {/* Real-time Search Bar & Filter Options */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
        {/* Large Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Google Drive'da dosya veya klasör ismi ara (gerçek zamanlı)..."
            className="w-full pl-11 pr-10 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories & View Mode Control */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          {/* Category Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtre:
            </span>
            {[
              { id: 'all', label: 'Tüm Dosyalar' },
              { id: 'folders', label: 'Klasörler' },
              { id: 'docs', label: 'Dokümanlar' },
              { id: 'sheets', label: 'E-Tablolar' },
              { id: 'slides', label: 'Sunumlar' },
              { id: 'starred', label: '⭐ Yıldızlılar' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeFilter === cat.id
                    ? 'bg-amber-500 text-white font-bold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Izgara Görünümü"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Liste Görünümü"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Folder Modal / Form Popup */}
      {isCreatingFolder && (
        <form onSubmit={handleCreateFolderSubmit} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <FolderPlus className="w-5 h-5 text-amber-600 shrink-0" />
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Klasör Adı Giriniz..."
            autoFocus
            className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-2xs"
          >
            Oluştur
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingFolder(false)}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
          >
            İptal
          </button>
        </form>
      )}

      {/* Breadcrumb Navigation Trail */}
      <div className="flex items-center gap-2 text-xs text-slate-600 overflow-x-auto pb-1">
        {folderPath.map((item, idx) => (
          <React.Fragment key={item.id}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            <button
              onClick={() => handleNavigateBreadcrumb(idx)}
              className={`hover:text-amber-600 font-medium transition-colors cursor-pointer shrink-0 ${
                idx === folderPath.length - 1 ? 'font-bold text-slate-900 underline decoration-amber-500 underline-offset-4' : 'text-slate-500'
              }`}
            >
              {item.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Files List / Grid View */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-xs font-medium">Google Drive dosyaları yükleniyor...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <HardDrive className="w-10 h-10 stroke-1 text-slate-300" />
          <h3 className="text-sm font-semibold text-slate-700">Dosya Bulunamadı</h3>
          <p className="text-xs max-w-sm">
            {searchQuery
              ? `"${searchQuery}" aramasına uygun dosya bulunamadı.`
              : 'Bu klasörde henüz herhangi bir dosya veya klasör bulunmuyor.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className={`bg-white rounded-2xl border p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group relative ${
                file.isFolder || file.mimeType.includes('folder')
                  ? 'border-amber-200 bg-gradient-to-br from-amber-50/30 to-white'
                  : 'border-slate-200/80 hover:border-amber-300'
              }`}
            >
              {/* Top Row: Icon, Name & Star */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div
                    onClick={() => {
                      if (file.isFolder || file.mimeType.includes('folder')) {
                        handleOpenFolder(file.id, file.name);
                      }
                    }}
                    className={`p-2.5 rounded-xl transition-all ${
                      file.isFolder || file.mimeType.includes('folder')
                        ? 'bg-amber-100/80 cursor-pointer group-hover:bg-amber-200/80'
                        : 'bg-slate-100'
                    }`}
                  >
                    {getFileIcon(file)}
                  </div>

                  <button
                    onClick={() => handleToggleStar(file.id, file.starred)}
                    className="p-1.5 text-slate-300 hover:text-amber-500 rounded-lg transition-all cursor-pointer"
                    title={file.starred ? 'Yıldızı Kaldır' : 'Yıldız Ekle'}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        file.starred ? 'fill-amber-400 text-amber-500' : 'hover:fill-amber-200'
                      }`}
                    />
                  </button>
                </div>

                <h4
                  onClick={() => {
                    if (file.isFolder || file.mimeType.includes('folder')) {
                      handleOpenFolder(file.id, file.name);
                    }
                  }}
                  className={`font-semibold text-xs text-slate-900 line-clamp-2 transition-colors ${
                    file.isFolder || file.mimeType.includes('folder')
                      ? 'cursor-pointer hover:text-amber-600'
                      : 'group-hover:text-amber-600'
                  }`}
                  title={file.name}
                >
                  {file.name}
                </h4>

                <div className="text-[10px] text-slate-400 mt-1">
                  {formatDistanceToNow(new Date(file.modifiedTime), { addSuffix: true, locale: tr })}
                  {file.size && ` • ${file.size}`}
                </div>
              </div>

              {/* Bottom Actions & Kanban Link */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {/* Linked Projects Badges */}
                <div className="flex items-center gap-1 flex-wrap">
                  {projects
                    .filter((p) => p.linkedDriveFileIds?.includes(file.id))
                    .map((p) => (
                      <span
                        key={p.id}
                        className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[9px] font-bold rounded-md flex items-center gap-1"
                      >
                        <FolderKanban className="w-2.5 h-2.5" /> {p.name}
                      </span>
                    ))}
                </div>

                <div className="flex items-center justify-between gap-1.5">
                  {(projects.length > 0 || projectTasks.length > 0) && onToggleLinkToProject && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          onToggleLinkToProject('drive', file.id, e.target.value);
                        }
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-hidden cursor-pointer max-w-[110px] truncate"
                    >
                      <option value="">+ Projeye Bağla</option>
                      {projects.map((p) => {
                        const isLinked = p.linkedDriveFileIds?.includes(file.id);
                        return (
                          <option key={p.id} value={p.id}>
                            {isLinked ? '✓ ' : '+ '} {p.name}
                          </option>
                        );
                      })}
                    </select>
                  )}

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      title="Google Drive'da Aç"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-3 px-4">Dosya Adı</th>
                <th className="py-3 px-4 hidden sm:table-cell">Son Güncelleme</th>
                <th className="py-3 px-4 hidden md:table-cell">Boyut</th>
                <th className="py-3 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredFiles.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleStar(file.id, file.starred)}
                        className="text-slate-300 hover:text-amber-500 cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            file.starred ? 'fill-amber-400 text-amber-500' : ''
                          }`}
                        />
                      </button>

                      <div className="p-1.5 bg-slate-100 rounded-lg shrink-0">
                        {getFileIcon(file)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span
                          onClick={() => {
                            if (file.isFolder || file.mimeType.includes('folder')) {
                              handleOpenFolder(file.id, file.name);
                            }
                          }}
                          className={`font-semibold text-slate-900 truncate block ${
                            file.isFolder || file.mimeType.includes('folder')
                              ? 'cursor-pointer hover:text-amber-600'
                              : 'group-hover:text-amber-600'
                          }`}
                        >
                          {file.name}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 hidden sm:table-cell text-slate-500 text-[11px]">
                    {formatDistanceToNow(new Date(file.modifiedTime), { addSuffix: true, locale: tr })}
                  </td>

                  <td className="py-3 px-4 hidden md:table-cell text-slate-500 text-[11px]">
                    {file.size || '-'}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Google Drive'da Aç"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
