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
  ChevronLeft,
  FolderKanban,
  Filter,
  Pencil,
  Check,
  AlertTriangle,
  ShieldAlert,
  LogIn,
  FileCode,
  FileEdit,
  Save,
  ArrowLeft,
  Code,
  Eye,
  Edit3,
  BookOpen,
  Tag,
  MessageSquare,
  Bookmark,
  Sparkles,
} from 'lucide-react';
import { DriveFile, Project, ProjectTask, NoteItem } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MarkdownPreview } from './MarkdownPreview';

export interface PdfAnnotationNote {
  id: string;
  page: number;
  type: 'important' | 'idea' | 'question' | 'task' | 'highlight' | 'general';
  text: string;
  createdAt: string;
}

interface Props {
  projects?: Project[];
  projectTasks?: ProjectTask[];
  notes?: NoteItem[];
  onRefreshNotes?: () => void;
  onToggleLinkToProject?: (type: 'drive', itemId: string, projectId: string) => Promise<void>;
  onAddDriveDoc?: () => void;
  isAuthenticated: boolean;
  onLogin?: () => void;
}

export const DriveFileManager: React.FC<Props> = ({
  projects = [],
  projectTasks = [],
  notes = [],
  onRefreshNotes,
  onToggleLinkToProject,
  onAddDriveDoc,
  isAuthenticated,
  onLogin,
}) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'folders' | 'docs' | 'sheets' | 'slides' | 'pdf' | 'markdown' | 'starred'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentFolderId, setCurrentFolderId] = useState<string>('all');
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([
    { id: 'all', name: 'Drive Dosyalarım' },
  ]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requiresReauth, setRequiresReauth] = useState(false);

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [isCreatingNewMd, setIsCreatingNewMd] = useState(false);
  const [newMdName, setNewMdName] = useState('');

  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState<string>('');

  // Markdown Editor State
  const [activeEditingMdFile, setActiveEditingMdFile] = useState<DriveFile | null>(null);
  const [mdContent, setMdContent] = useState<string>('');
  const [isMdLoading, setIsMdLoading] = useState<boolean>(false);
  const [isMdSaving, setIsMdSaving] = useState<boolean>(false);
  const [mdSaveSuccess, setMdSaveSuccess] = useState<boolean>(false);
  const [mdViewMode, setMdViewMode] = useState<'split' | 'edit' | 'preview'>('split');

  // PDF Viewer & Annotator State
  const [activeViewingPdfFile, setActiveViewingPdfFile] = useState<DriveFile | null>(null);
  const [pdfCurrentPage, setPdfCurrentPage] = useState<number>(1);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(10);
  const [pdfZoomLevel, setPdfZoomLevel] = useState<number>(100);
  const [pdfAnnotations, setPdfAnnotations] = useState<PdfAnnotationNote[]>([]);
  const [newPdfNotePage, setNewPdfNotePage] = useState<number>(1);
  const [newPdfNoteType, setNewPdfNoteType] = useState<'important' | 'idea' | 'question' | 'task' | 'highlight' | 'general'>('important');
  const [newPdfNoteText, setNewPdfNoteText] = useState<string>('');
  const [isSavingPdfNotes, setIsSavingPdfNotes] = useState<boolean>(false);
  const [pdfNotesSaveSuccess, setPdfNotesSaveSuccess] = useState<boolean>(false);
  const [pdfFilterPage, setPdfFilterPage] = useState<string>('all');
  const [pdfSearchQuery, setPdfSearchQuery] = useState<string>('');
  const [editingPdfNoteId, setEditingPdfNoteId] = useState<string | null>(null);
  const [editingPdfNoteText, setEditingPdfNoteText] = useState<string>('');

  const isMarkdownFile = (file: DriveFile) => {
    if (!file) return false;
    const name = file.name.toLowerCase();
    return (
      name.endsWith('.md') ||
      name.endsWith('.markdown') ||
      file.mimeType?.includes('markdown') ||
      file.mimeType === 'text/x-markdown'
    );
  };

  const isPdfFile = (file: DriveFile) => {
    if (!file) return false;
    const name = file.name.toLowerCase();
    return (
      name.endsWith('.pdf') ||
      file.mimeType === 'application/pdf' ||
      file.mimeType?.includes('pdf')
    );
  };

  const getNoteTypeConfig = (type: string) => {
    switch (type) {
      case 'important':
        return { label: '📌 Önemli Not', badgeBg: 'bg-red-500/20 text-red-300 border-red-500/30' };
      case 'idea':
        return { label: '💡 Fikir / Yorum', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'question':
        return { label: '❓ Soru / Şüphe', badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'task':
        return { label: '🎯 Görev / Aksiyon', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'highlight':
        return { label: '🏷️ Vurgulanan Metin', badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      default:
        return { label: '📝 Genel Not', badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    }
  };

  const handleOpenPdfViewer = (file: DriveFile) => {
    setActiveViewingPdfFile(file);
    setPdfCurrentPage(1);
    setNewPdfNotePage(1);
    setNewPdfNoteText('');
    setPdfNotesSaveSuccess(false);

    // Search if system note already exists for this PDF file
    const linkedNote = notes.find((n) =>
      n.linkedDriveFiles?.some((df) => df.id === file.id || df.name === file.name) ||
      (n.title && n.title.toLowerCase().includes(file.name.toLowerCase()))
    );

    if (linkedNote && linkedNote.content) {
      const lines = linkedNote.content.split('\n');
      const parsed: PdfAnnotationNote[] = [];
      let currentPage = 1;

      lines.forEach((line) => {
        const pageMatch = line.match(/Sayfa\s+(\d+)/i);
        if (pageMatch) {
          currentPage = parseInt(pageMatch[1], 10);
        }
        if (line.trim().startsWith('- **[')) {
          const typeMatch = line.match(/\[(.*?)\]/);
          const textParts = line.split('**:');
          const textContent = textParts.length > 1 ? textParts[1].replace(/_\(Tarih:.*?\)_/, '').trim() : line;

          let noteType: any = 'general';
          if (typeMatch) {
            const t = typeMatch[1];
            if (t.includes('Önemli')) noteType = 'important';
            else if (t.includes('Fikir')) noteType = 'idea';
            else if (t.includes('Soru')) noteType = 'question';
            else if (t.includes('Görev')) noteType = 'task';
            else if (t.includes('Vurgulanan')) noteType = 'highlight';
          }

          parsed.push({
            id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            page: currentPage,
            type: noteType,
            text: textContent,
            createdAt: new Date().toISOString(),
          });
        }
      });

      if (parsed.length > 0) {
        setPdfAnnotations(parsed);
        return;
      }
    }

    // Default starter sample note
    setPdfAnnotations([
      {
        id: `ann-${Date.now()}-1`,
        page: 1,
        type: 'important',
        text: `${file.name} belgesi açıldı ve sayfa bazlı notlandırma başlatıldı.`,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleAddPdfAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPdfNoteText.trim()) return;

    const newAnn: PdfAnnotationNote = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      page: Number(newPdfNotePage) || 1,
      type: newPdfNoteType,
      text: newPdfNoteText.trim(),
      createdAt: new Date().toISOString(),
    };

    setPdfAnnotations((prev) => [...prev, newAnn]);
    setNewPdfNoteText('');
  };

  const handleDeletePdfAnnotation = (id: string) => {
    setPdfAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSavePdfNotesToDriveAndSystem = async () => {
    if (!activeViewingPdfFile) return;
    setIsSavingPdfNotes(true);
    setPdfNotesSaveSuccess(false);

    try {
      const sortedAnns = [...pdfAnnotations].sort((a, b) => a.page - b.page);
      let md = `# 📄 PDF Notları: ${activeViewingPdfFile.name}\n\n`;
      md += `> **Google Drive Dosyası:** [${activeViewingPdfFile.name}](${activeViewingPdfFile.webViewLink})\n`;
      md += `> **Son Güncelleme:** ${new Date().toLocaleString('tr-TR')}\n`;
      md += `> **Toplam Anotasyon:** ${pdfAnnotations.length} adet\n\n`;
      md += `---\n\n`;
      md += `## 📌 Sayfa Bazlı Notlar ve Anotasyonlar\n\n`;

      let lastPage = -1;
      sortedAnns.forEach((ann) => {
        if (ann.page !== lastPage) {
          md += `\n### 📑 Sayfa ${ann.page}\n`;
          lastPage = ann.page;
        }
        const config = getNoteTypeConfig(ann.type);
        md += `- **[${config.label}]**: ${ann.text} _(Tarih: ${new Date(ann.createdAt).toLocaleDateString('tr-TR')})_\n`;
      });

      const mdFileName = activeViewingPdfFile.name.toLowerCase().endsWith('.pdf')
        ? `${activeViewingPdfFile.name.slice(0, -4)}_Notlari.md`
        : `${activeViewingPdfFile.name}_Notlari.md`;

      // 1. Create/Save Markdown File in Google Drive
      await fetch('/api/drive/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mdFileName,
          mimeType: 'text/markdown',
          content: md,
          parentId: currentFolderId === 'all' ? 'root' : currentFolderId,
        }),
      });

      // 2. Add or Update System Note (/api/notes)
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `PDF Notları: ${activeViewingPdfFile.name}`,
          content: md,
          linkedDriveFiles: [
            {
              id: activeViewingPdfFile.id,
              name: activeViewingPdfFile.name,
              webViewLink: activeViewingPdfFile.webViewLink,
              mimeType: activeViewingPdfFile.mimeType,
            },
          ],
          tags: ['PDF', 'Anotasyon', 'Google Drive'],
          date: new Date().toISOString().split('T')[0],
        }),
      });

      setPdfNotesSaveSuccess(true);
      fetchDriveFiles(currentFolderId, searchQuery, activeFilter);
      onRefreshNotes?.();

      setTimeout(() => {
        setPdfNotesSaveSuccess(false);
      }, 4000);
    } catch (err) {
      console.error('Error saving PDF notes to drive and system:', err);
      alert('PDF notları kaydedilirken hata oluştu.');
    } finally {
      setIsSavingPdfNotes(false);
    }
  };

  const handleOpenMarkdownEditor = async (file: DriveFile) => {
    setActiveEditingMdFile(file);
    setMdContent('');
    setIsMdLoading(true);
    setMdSaveSuccess(false);

    try {
      const res = await fetch(`/api/drive/files/${file.id}/content`);
      if (res.ok) {
        const data = await res.json();
        setMdContent(data.content || '');
      } else {
        setMdContent(`# ${file.name}\n\nİçerik çekilemedi veya boş.`);
      }
    } catch (err) {
      console.error('Error fetching markdown content:', err);
      setMdContent(`# ${file.name}\n\nİçerik çekilirken hata oluştu.`);
    } finally {
      setIsMdLoading(false);
    }
  };

  const handleSaveMarkdown = async () => {
    if (!activeEditingMdFile) return;
    setIsMdSaving(true);
    setMdSaveSuccess(false);

    try {
      const res = await fetch(`/api/drive/files/${activeEditingMdFile.id}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: mdContent }),
      });

      if (res.ok) {
        setMdSaveSuccess(true);
        setTimeout(() => setMdSaveSuccess(false), 3000);
        fetchDriveFiles(currentFolderId, searchQuery, activeFilter);
      } else {
        alert('Markdown dosyası Google Drive üzerine kaydedilemedi.');
      }
    } catch (err) {
      console.error('Error saving markdown content:', err);
      alert('Kaydedilirken ağ hatası oluştu.');
    } finally {
      setIsMdSaving(false);
    }
  };

  const handleCreateNewMdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMdName.trim()) return;

    const fileName = newMdName.trim().endsWith('.md') ? newMdName.trim() : `${newMdName.trim()}.md`;

    try {
      const res = await fetch('/api/drive/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fileName,
          mimeType: 'text/markdown',
          content: `# ${fileName.replace('.md', '')}\n\nYeni Markdown Notu.\n\n`,
          parentId: currentFolderId === 'all' ? 'root' : currentFolderId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewMdName('');
        setIsCreatingNewMd(false);
        fetchDriveFiles(currentFolderId, searchQuery, activeFilter);

        if (data.file) {
          const createdFile: DriveFile = {
            id: data.file.id,
            name: data.file.name || fileName,
            mimeType: 'text/markdown',
            webViewLink: data.file.webViewLink || 'https://drive.google.com',
            modifiedTime: new Date().toISOString(),
            isFolder: false,
            starred: true,
            parents: [],
          };
          handleOpenMarkdownEditor(createdFile);
        }
      }
    } catch (err) {
      console.error('Error creating markdown file:', err);
    }
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    setMdContent((prev) => prev + `${prefix}Metin${suffix}`);
  };

  const handleStartRename = (file: DriveFile) => {
    setEditingFileId(file.id);
    setEditingFileName(file.name);
  };

  const handleSaveRename = async (fileId: string) => {
    if (!editingFileName.trim()) {
      setEditingFileId(null);
      return;
    }
    const newName = editingFileName.trim();
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, name: newName } : f))
    );
    setEditingFileId(null);

    try {
      const res = await fetch(`/api/drive/files/${fileId}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        fetchDriveFiles(currentFolderId, searchQuery, activeFilter);
      }
    } catch (err) {
      console.error('Error renaming file:', err);
      fetchDriveFiles(currentFolderId, searchQuery, activeFilter);
    }
  };

  // Fetch Drive Files from API
  const fetchDriveFiles = async (folderId = currentFolderId, search = searchQuery, filter = activeFilter) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const queryParams = new URLSearchParams();
      if (folderId && folderId !== 'all' && filter !== 'starred' && filter !== 'pdf' && filter !== 'markdown') {
        queryParams.append('folderId', folderId);
      }
      if (search) queryParams.append('search', search);
      if (filter === 'starred') queryParams.append('starredOnly', 'true');
      if (filter !== 'all') queryParams.append('fileType', filter);

      const res = await fetch(`/api/drive/files?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.requiresReauth) {
          setRequiresReauth(true);
        } else {
          setRequiresReauth(false);
        }
        if (data.error) {
          setErrorMsg(data.error);
        }
        if (data.files) {
          setFiles(data.files);
        }
      }
    } catch (err: any) {
      console.error('Error fetching drive files:', err);
      setErrorMsg('Drive dosyaları çekilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDriveFiles(currentFolderId, searchQuery, activeFilter);
  }, [currentFolderId, searchQuery, activeFilter]);

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
          parentId: currentFolderId === 'all' ? 'root' : currentFolderId,
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
    if (isMarkdownFile(file)) {
      return <FileCode className="w-6 h-6 text-purple-600" />;
    }
    if (file.mimeType.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
      return <FileText className="w-6 h-6 text-red-600" />;
    }
    if (file.mimeType.includes('document') || file.mimeType.includes('word') || file.mimeType.includes('text')) {
      return <FileText className="w-6 h-6 text-blue-600" />;
    }
    if (file.mimeType.includes('spreadsheet') || file.mimeType.includes('excel') || file.mimeType.includes('csv') || file.mimeType.includes('sheet')) {
      return <FileSpreadsheet className="w-6 h-6 text-emerald-600" />;
    }
    if (file.mimeType.includes('presentation') || file.mimeType.includes('powerpoint')) {
      return <Presentation className="w-6 h-6 text-purple-600" />;
    }
    return <File className="w-6 h-6 text-slate-500" />;
  };

  // Client Filter by Category
  const filteredFiles = files.filter((f) => {
    if (activeFilter === 'folders') return f.isFolder || f.mimeType.includes('folder');
    if (activeFilter === 'markdown') return isMarkdownFile(f);
    if (activeFilter === 'pdf')
      return f.mimeType.includes('pdf') || f.name.toLowerCase().endsWith('.pdf');
    if (activeFilter === 'docs')
      return (
        (f.mimeType.includes('document') ||
          f.mimeType.includes('word') ||
          f.mimeType.includes('text') ||
          f.name.endsWith('.doc') ||
          f.name.endsWith('.docx') ||
          f.name.endsWith('.gdoc')) &&
        !isMarkdownFile(f)
      );
    if (activeFilter === 'sheets')
      return (
        f.mimeType.includes('spreadsheet') ||
        f.mimeType.includes('excel') ||
        f.mimeType.includes('sheet') ||
        f.mimeType.includes('csv') ||
        f.name.endsWith('.xls') ||
        f.name.endsWith('.xlsx') ||
        f.name.endsWith('.gsheet')
      );
    if (activeFilter === 'slides')
      return (
        f.mimeType.includes('presentation') ||
        f.mimeType.includes('powerpoint') ||
        f.name.endsWith('.ppt') ||
        f.name.endsWith('.pptx') ||
        f.name.endsWith('.gslides')
      );
    if (activeFilter === 'starred') return f.starred;
    return true;
  });

  // Render Full Screen PDF Interactive Viewer & Annotator
  if (activeViewingPdfFile) {
    const filteredAnnotations = pdfAnnotations.filter((ann) => {
      if (pdfFilterPage !== 'all' && ann.page !== Number(pdfFilterPage)) return false;
      if (pdfSearchQuery.trim()) {
        const q = pdfSearchQuery.toLowerCase();
        return (
          ann.text.toLowerCase().includes(q) ||
          ann.page.toString().includes(q) ||
          getNoteTypeConfig(ann.type).label.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return (
      <div className="bg-slate-900 min-h-[88vh] rounded-2xl text-slate-100 flex flex-col shadow-2xl border border-slate-800 overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-slate-950 border-b border-slate-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveViewingPdfFile(null)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700 shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-red-400" /> Dosyalara Dön
            </button>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  {activeViewingPdfFile.name}
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-mono font-bold">
                    PDF Görüntüleyici
                  </span>
                </h2>
                <p className="text-[10px] text-slate-400">
                  Canlı PDF İnceleme, Sayfa Notları ve Drive .MD Senkronizasyonu
                </p>
              </div>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            <a
              href={activeViewingPdfFile.webViewLink}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              title="Drive Sekmesinde Aç"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" /> Drive'da Aç
            </a>

            <button
              onClick={handleSavePdfNotesToDriveAndSystem}
              disabled={isSavingPdfNotes}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                pdfNotesSaveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white'
              }`}
            >
              {isSavingPdfNotes ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Drive & Sistem .MD Kaydediliyor...
                </>
              ) : pdfNotesSaveSuccess ? (
                <>
                  <Check className="w-4 h-4" /> .MD Notlar Kaydedildi!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Drive'a .MD Kaydet & Sisteme Ekle
                </>
              )}
            </button>
          </div>
        </div>

        {/* Saved Success Alert Banner */}
        {pdfNotesSaveSuccess && (
          <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-4 py-2.5 text-xs text-emerald-200 flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              Anotasyonlar Google Drive'a <strong>.md</strong> dosyası olarak eklendi ve Sistem Notları ile ilişkilendirildi!
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">Otomatik Senkronize Edildi</span>
          </div>
        )}

        {/* Main 2-Column Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 min-h-[600px]">
          {/* Left Column (7 cols): PDF Viewer Stage & Page Controls */}
          <div className="lg:col-span-7 xl:col-span-7 p-4 flex flex-col space-y-3 bg-slate-950/40">
            {/* Toolbar */}
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPdfCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={pdfCurrentPage <= 1}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg transition-all cursor-pointer"
                  title="Önceki Sayfa"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 font-mono text-slate-300">
                  <span className="text-red-400 font-bold">Sayfa</span>
                  <input
                    type="number"
                    min={1}
                    max={pdfTotalPages}
                    value={pdfCurrentPage}
                    onChange={(e) => setPdfCurrentPage(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-10 bg-transparent text-center font-bold text-white focus:outline-none"
                  />
                  <span className="text-slate-500">/ {pdfTotalPages}</span>
                </div>

                <button
                  onClick={() => setPdfCurrentPage((p) => Math.min(pdfTotalPages, p + 1))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all cursor-pointer"
                  title="Sonraki Sayfa"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Add Note to Current Page Button */}
              <button
                onClick={() => {
                  setNewPdfNotePage(pdfCurrentPage);
                  const el = document.getElementById('pdf-note-textarea');
                  if (el) el.focus();
                }}
                className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/30 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-red-400" /> Sayfa {pdfCurrentPage}'ye Not Ekle
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setPdfZoomLevel((z) => Math.max(50, z - 10))}
                  className="px-2 py-0.5 text-slate-400 hover:text-white font-bold cursor-pointer"
                >
                  -
                </button>
                <span className="text-[11px] font-mono text-slate-300 px-1">{pdfZoomLevel}%</span>
                <button
                  onClick={() => setPdfZoomLevel((z) => Math.min(200, z + 10))}
                  className="px-2 py-0.5 text-slate-400 hover:text-white font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Embedded PDF Viewer Frame */}
            <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative min-h-[500px] flex flex-col">
              <iframe
                src={`https://drive.google.com/file/d/${activeViewingPdfFile.id}/preview`}
                className="w-full flex-1 min-h-[520px] border-none"
                title={activeViewingPdfFile.name}
              />
            </div>

            {/* Current Page Annotation Pins */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Bookmark className="w-4 h-4 text-red-400" />
                Sayfa {pdfCurrentPage} üzerinde{' '}
                <strong className="text-white">
                  {pdfAnnotations.filter((a) => a.page === pdfCurrentPage).length}
                </strong>{' '}
                anotasyon mevcut.
              </span>
              {pdfAnnotations.filter((a) => a.page === pdfCurrentPage).length > 0 && (
                <span className="text-[10px] text-red-400 font-mono bg-red-950/60 border border-red-800/50 px-2 py-0.5 rounded-full">
                  • Sayfa Notları Aktif
                </span>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): PDF Annotations & Note Taking Panel */}
          <div className="lg:col-span-5 xl:col-span-5 p-4 flex flex-col space-y-4 bg-slate-900">
            {/* Panel Title */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  PDF Notları & Anotasyonlar
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                {pdfAnnotations.length} Not Kayıtlı
              </span>
            </div>

            {/* Form to Add New PDF Note */}
            <form onSubmit={handleAddPdfAnnotation} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-24">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Sayfa No:</label>
                  <input
                    type="number"
                    min={1}
                    max={pdfTotalPages}
                    value={newPdfNotePage}
                    onChange={(e) => setNewPdfNotePage(parseInt(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Not Tipi:</label>
                  <select
                    value={newPdfNoteType}
                    onChange={(e) => setNewPdfNoteType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 focus:border-red-500 focus:outline-none cursor-pointer"
                  >
                    <option value="important">📌 Önemli Not</option>
                    <option value="idea">💡 Fikir / Yorum</option>
                    <option value="question">❓ Soru / Şüphe</option>
                    <option value="task">🎯 Görev / Aksiyon</option>
                    <option value="highlight">🏷️ Vurgulanan Metin</option>
                    <option value="general">📝 Genel Not</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Not / Açıklama:</label>
                <textarea
                  id="pdf-note-textarea"
                  value={newPdfNoteText}
                  onChange={(e) => setNewPdfNoteText(e.target.value)}
                  placeholder={`Sayfa ${newPdfNotePage} için notunuzu giriniz... (Markdown destekler)`}
                  rows={3}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:border-red-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={!newPdfNoteText.trim()}
                className="w-full py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" /> Sayfa {newPdfNotePage}'ye Not Ekle
              </button>
            </form>

            {/* Filter & Search Bar for Annotations */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={pdfSearchQuery}
                  onChange={(e) => setPdfSearchQuery(e.target.value)}
                  placeholder="Notlarda ara..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <select
                value={pdfFilterPage}
                onChange={(e) => setPdfFilterPage(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">Tüm Sayfalar</option>
                {Array.from(new Set(pdfAnnotations.map((a) => a.page)))
                  .sort((a, b) => a - b)
                  .map((p) => (
                    <option key={p} value={p}>
                      Sayfa {p}
                    </option>
                  ))}
              </select>
            </div>

            {/* Annotations List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[380px] pr-1">
              {filteredAnnotations.length === 0 ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                  <MessageSquare className="w-8 h-8 text-slate-700" />
                  <p className="text-xs">Henüz bu filtreye uygun not eklenmedi.</p>
                </div>
              ) : (
                filteredAnnotations.map((ann) => {
                  const cfg = getNoteTypeConfig(ann.type);
                  const isEditing = editingPdfNoteId === ann.id;

                  return (
                    <div
                      key={ann.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setPdfCurrentPage(ann.page)}
                            className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800/60 text-[10px] font-bold font-mono hover:bg-red-900 transition-colors cursor-pointer"
                            title="Sayfaya Git"
                          >
                            Sayfa {ann.page}
                          </button>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.badgeBg}`}
                          >
                            {cfg.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={() => {
                              setEditingPdfNoteId(ann.id);
                              setEditingPdfNoteText(ann.text);
                            }}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Düzenle"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeletePdfAnnotation(ann.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-1.5">
                          <textarea
                            value={editingPdfNoteText}
                            onChange={(e) => setEditingPdfNoteText(e.target.value)}
                            className="w-full p-2 bg-slate-900 border border-red-500/50 rounded-lg text-xs text-white focus:outline-none"
                            rows={2}
                          />
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => {
                                setPdfAnnotations((prev) =>
                                  prev.map((a) => (a.id === ann.id ? { ...a, text: editingPdfNoteText } : a))
                                );
                                setEditingPdfNoteId(null);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg cursor-pointer"
                            >
                              Tamam
                            </button>
                            <button
                              onClick={() => setEditingPdfNoteId(null)}
                              className="px-2 py-1 bg-slate-800 text-slate-300 font-semibold text-[10px] rounded-lg cursor-pointer"
                            >
                              İptal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                          {ann.text}
                        </p>
                      )}

                      <div className="text-[9px] text-slate-500 font-mono text-right">
                        {new Date(ann.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Integration Footer Box */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 leading-normal flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  Alınan tüm notlar <strong>Markdown (.md)</strong> biçiminde Google Drive klasörünüze kaydedilir ve Sistem Notları'nda listelenir.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Full Screen Markdown Editor View
  if (activeEditingMdFile) {
    return (
      <div className="bg-slate-900 min-h-[85vh] rounded-2xl text-slate-100 flex flex-col shadow-2xl border border-slate-800 overflow-hidden space-y-0">
        {/* Editor Header Bar */}
        <div className="bg-slate-950 border-b border-slate-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveEditingMdFile(null)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700 shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-purple-400" /> Dosyalara Dön
            </button>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  {activeEditingMdFile.name}
                </h2>
                <p className="text-[10px] text-slate-400">Google Drive Markdown Editörü & Canlı Önizleme</p>
              </div>
            </div>
          </div>

          {/* Action Controls & Save */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* View Mode Toggle for Editor */}
            <div className="flex items-center p-1 bg-slate-800 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setMdViewMode('split')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  mdViewMode === 'split' ? 'bg-purple-600 text-white font-bold shadow-2xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                İkili Ekran
              </button>
              <button
                onClick={() => setMdViewMode('edit')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  mdViewMode === 'edit' ? 'bg-purple-600 text-white font-bold shadow-2xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sadece Editör
              </button>
              <button
                onClick={() => setMdViewMode('preview')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  mdViewMode === 'preview' ? 'bg-purple-600 text-white font-bold shadow-2xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sadece Önizleme
              </button>
            </div>

            <a
              href={activeEditingMdFile.webViewLink}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer border border-slate-700"
              title="Google Drive'da Aç"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={handleSaveMarkdown}
              disabled={isMdSaving}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                mdSaveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
              }`}
            >
              {isMdSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Drive'a Kaydediliyor...
                </>
              ) : mdSaveSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Kaydedildi!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Drive'a Kaydet
                </>
              )}
            </button>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[11px] font-bold text-slate-500 mr-1.5 shrink-0">Biçimlendir:</span>
          <button
            onClick={() => insertFormatting('**', '**')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all cursor-pointer shrink-0"
            title="Kalın Yazı"
          >
            B
          </button>
          <button
            onClick={() => insertFormatting('*', '*')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg italic font-serif transition-all cursor-pointer shrink-0"
            title="İtalik Yazı"
          >
            I
          </button>
          <button
            onClick={() => insertFormatting('\n# ', '')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all cursor-pointer shrink-0"
            title="Başlık 1"
          >
            H1
          </button>
          <button
            onClick={() => insertFormatting('\n## ', '')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all cursor-pointer shrink-0"
            title="Başlık 2"
          >
            H2
          </button>
          <button
            onClick={() => insertFormatting('\n- ', '')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all cursor-pointer shrink-0"
            title="Madde İşaretli Liste"
          >
            • Liste
          </button>
          <button
            onClick={() => insertFormatting('\n- [ ] ', '')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all cursor-pointer shrink-0"
            title="Görev Kutusu"
          >
            ☑ Görev
          </button>
          <button
            onClick={() => insertFormatting('\n```typescript\n', '\n```')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-mono text-[11px] transition-all cursor-pointer shrink-0"
            title="Kod Bloğu"
          >
            &lt;/&gt; Kod
          </button>
          <button
            onClick={() => insertFormatting('\n> ', '')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all cursor-pointer shrink-0"
            title="Alıntı Blok"
          >
            “ Alıntı
          </button>
          <button
            onClick={() => insertFormatting('\n| Başlık 1 | Başlık 2 |\n| --- | --- |\n| Veri 1 | Veri 2 |\n', '')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all cursor-pointer shrink-0"
            title="Tablo Ekle"
          >
            田 Tablo
          </button>
        </div>

        {/* Editor Body */}
        {isMdLoading ? (
          <div className="flex-1 py-28 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-xs font-medium">Google Drive'dan Markdown içeriği çekiliyor...</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 min-h-[550px]">
            {/* Left Column: Code Editor */}
            {(mdViewMode === 'split' || mdViewMode === 'edit') && (
              <div className={`p-4 flex flex-col ${mdViewMode === 'edit' ? 'col-span-2' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5" /> Markdown Kod Editörü
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {mdContent.length} Karakter • {mdContent.split('\n').length} Satır
                  </span>
                </div>
                <textarea
                  value={mdContent}
                  onChange={(e) => setMdContent(e.target.value)}
                  placeholder="Markdown içeriğinizi buraya yazın..."
                  className="w-full flex-1 min-h-[480px] p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-purple-500 resize-none shadow-inner"
                />
              </div>
            )}

            {/* Right Column: Live Rendered Preview */}
            {(mdViewMode === 'split' || mdViewMode === 'preview') && (
              <div className={`p-4 flex flex-col bg-slate-900/60 overflow-y-auto ${mdViewMode === 'preview' ? 'col-span-2' : ''}`}>
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Canlı Önizleme (Preview)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">GFM Markdown Output</span>
                </div>
                <div className="p-5 bg-white rounded-xl text-slate-900 min-h-[480px] shadow-sm border border-slate-200/80 overflow-y-auto">
                  <MarkdownPreview content={mdContent} className="text-xs" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

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
              Google Drive dosyalarınızı gerçek zamanlı arayın, yönetin, Markdown editörü ile düzenleyin.
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

          <button
            onClick={() => setIsCreatingNewMd(true)}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileCode className="w-4 h-4 text-purple-600" /> + Yeni .md Oluştur
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

      {/* Auth & Scope Status Warning Banner */}
      {!isAuthenticated ? (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/15 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-700 rounded-xl">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">Google Hesabınız Bağlı Değil</p>
              <p className="text-[11px] text-amber-800/90 mt-0.5">
                Kendi Google Drive hesabınızdaki dosyaları ve Markdown belgelerini görüntülemek için giriş yapın.
              </p>
            </div>
          </div>
          {onLogin && (
            <button
              onClick={onLogin}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" /> Google Hesabını Bağla
            </button>
          )}
        </div>
      ) : requiresReauth || errorMsg ? (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/15 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-800 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">Google Drive Bağlantı veya İzin İkazı</p>
              <p className="text-[11px] text-amber-800/90 mt-0.5">
                {errorMsg || 'Google Drive dosyalarını çekebilmek için hesabınızın iznini tazeleyin.'}
              </p>
            </div>
          </div>
          {onLogin && (
            <button
              onClick={onLogin}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Hesabı Bağla / Yetki Yenile
            </button>
          )}
        </div>
      ) : null}

      {/* Real-time Search Bar & Filter Options */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
        {/* Large Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Google Drive'da dosya, klasör veya .md belgesi ara (gerçek zamanlı)..."
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
              { id: 'markdown', label: '📝 Markdown (.md)' },
              { id: 'folders', label: 'Klasörler' },
              { id: 'docs', label: 'Dokümanlar' },
              { id: 'sheets', label: 'E-Tablolar' },
              { id: 'slides', label: 'Sunumlar' },
              { id: 'pdf', label: '📄 PDF' },
              { id: 'starred', label: '⭐ Yıldızlılar' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeFilter === cat.id
                    ? cat.id === 'markdown'
                      ? 'bg-purple-600 text-white font-bold shadow-2xs'
                      : 'bg-amber-500 text-white font-bold shadow-2xs'
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

      {/* Create Folder Form Popup */}
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

      {/* Create Markdown File Popup */}
      {isCreatingNewMd && (
        <form onSubmit={handleCreateNewMdSubmit} className="bg-purple-50 border border-purple-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <FileCode className="w-5 h-5 text-purple-600 shrink-0" />
          <input
            type="text"
            value={newMdName}
            onChange={(e) => setNewMdName(e.target.value)}
            placeholder="Yeni Markdown Dosya Adı Giriniz (örn: Notlar.md)..."
            autoFocus
            className="flex-1 px-3 py-1.5 bg-white border border-purple-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/30"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-2xs"
          >
            Oluştur ve Düzenle
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingNewMd(false)}
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
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <HardDrive className="w-12 h-12 stroke-1 text-amber-500/80" />
          <h3 className="text-base font-bold text-slate-800">
            {!isAuthenticated
              ? 'Google Hesabınız Bağlı Değil'
              : errorMsg
              ? 'Google Drive Bağlantı Uyarısı'
              : searchQuery
              ? 'Arama Sonucu Bulunamadı'
              : activeFilter === 'markdown'
              ? 'Henüz Markdown (.md) Dosyası Bulunamadı'
              : 'Henüz Dosya veya Klasör Yok'}
          </h3>
          <p className="text-xs max-w-md text-slate-500 leading-relaxed">
            {!isAuthenticated
              ? 'Kendi Google Drive hesabınızdaki gerçek dosyaları listelemek ve senkronize etmek için lütfen Google hesabınız ile giriş yapın.'
              : errorMsg
              ? errorMsg
              : searchQuery
              ? `"${searchQuery}" aramasına uygun hiçbir dosya veya klasör bulunamadı.`
              : activeFilter === 'markdown'
              ? 'Google Drive hesabınızda uzantısı .md olan bir belge bulunamadı. Hemen yeni bir markdown dosyası oluşturup düzenleyebilirsiniz.'
              : 'Google Drive hesabınızda bu bölümde kayıtlı dosya bulunmuyor. Yeni klasör oluşturabilir veya yeni doküman ekleyebilirsiniz.'}
          </p>

          {!isAuthenticated && onLogin && (
            <button
              onClick={onLogin}
              className="mt-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" /> Google Hesabını Bağla
            </button>
          )}

          {isAuthenticated && (requiresReauth || errorMsg) && onLogin && (
            <button
              onClick={onLogin}
              className="mt-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Google İzinlerini Yenile
            </button>
          )}

          {isAuthenticated && !errorMsg && !searchQuery && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setIsCreatingNewMd(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileCode className="w-4 h-4" /> + Yeni .md Oluştur
              </button>
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
              >
                <FolderPlus className="w-4 h-4 text-amber-600" /> Yeni Klasör
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className={`bg-white rounded-2xl border p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group relative ${
                file.isFolder || file.mimeType.includes('folder')
                  ? 'border-amber-200 bg-gradient-to-br from-amber-50/30 to-white'
                  : isMarkdownFile(file)
                  ? 'border-purple-200 bg-gradient-to-br from-purple-50/20 to-white hover:border-purple-400'
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
                      } else if (isMarkdownFile(file)) {
                        handleOpenMarkdownEditor(file);
                      } else if (isPdfFile(file)) {
                        handleOpenPdfViewer(file);
                      }
                    }}
                    className={`p-2.5 rounded-xl transition-all ${
                      file.isFolder || file.mimeType.includes('folder')
                        ? 'bg-amber-100/80 cursor-pointer group-hover:bg-amber-200/80'
                        : isMarkdownFile(file)
                        ? 'bg-purple-100/80 cursor-pointer group-hover:bg-purple-200/80'
                        : isPdfFile(file)
                        ? 'bg-red-100/80 cursor-pointer group-hover:bg-red-200/80'
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

                {editingFileId === file.id ? (
                  <div className="flex items-center gap-1 my-1">
                    <input
                      type="text"
                      value={editingFileName}
                      onChange={(e) => setEditingFileName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(file.id);
                        if (e.key === 'Escape') setEditingFileId(null);
                      }}
                      autoFocus
                      className="flex-1 px-2 py-1 text-xs font-semibold bg-white border border-amber-400 rounded-lg focus:outline-hidden"
                    />
                    <button
                      onClick={() => handleSaveRename(file.id)}
                      className="p-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors cursor-pointer shrink-0"
                      title="Kaydet"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingFileId(null)}
                      className="p-1 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors cursor-pointer shrink-0"
                      title="İptal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <h4
                    onClick={() => {
                      if (file.isFolder || file.mimeType.includes('folder')) {
                        handleOpenFolder(file.id, file.name);
                      } else if (isMarkdownFile(file)) {
                        handleOpenMarkdownEditor(file);
                      } else if (isPdfFile(file)) {
                        handleOpenPdfViewer(file);
                      }
                    }}
                    className={`font-semibold text-xs text-slate-900 line-clamp-2 transition-colors ${
                      file.isFolder || file.mimeType.includes('folder')
                        ? 'cursor-pointer hover:text-amber-600'
                        : isMarkdownFile(file)
                        ? 'cursor-pointer hover:text-purple-700'
                        : isPdfFile(file)
                        ? 'cursor-pointer hover:text-red-600'
                        : 'group-hover:text-amber-600'
                    }`}
                    title={file.name}
                  >
                    {file.name}
                  </h4>
                )}

                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>
                    {formatDistanceToNow(new Date(file.modifiedTime), { addSuffix: true, locale: tr })}
                    {file.size && ` • ${file.size}`}
                  </span>
                  {isMarkdownFile(file) ? (
                    <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold">
                      .MD
                    </span>
                  ) : isPdfFile(file) ? (
                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-bold">
                      .PDF
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Bottom Actions & Kanban Link */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {/* Linked Projects & Notes Badges */}
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

                  {isPdfFile(file) && notes.some((n) => n.linkedDriveFiles?.some((df) => df.id === file.id)) && (
                    <button
                      onClick={() => handleOpenPdfViewer(file)}
                      className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-800 text-[9px] font-bold rounded-md flex items-center gap-1 hover:bg-red-100 cursor-pointer"
                      title="İlişkili Notları Gör"
                    >
                      <BookOpen className="w-2.5 h-2.5 text-red-600" /> Not İlişkili (.md)
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  {isPdfFile(file) ? (
                    <button
                      onClick={() => handleOpenPdfViewer(file)}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                      title="PDF Görüntüle ve Not Al"
                    >
                      <Eye className="w-3.5 h-3.5" /> PDF Görüntüle & Not Al
                    </button>
                  ) : isMarkdownFile(file) ? (
                    <button
                      onClick={() => handleOpenMarkdownEditor(file)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                      title="Markdown Editör ve Preview Ekranını Aç"
                    >
                      <FileEdit className="w-3.5 h-3.5" /> Editör
                    </button>
                  ) : (projects.length > 0 || projectTasks.length > 0) && onToggleLinkToProject ? (
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
                  ) : <div />}

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => handleStartRename(file)}
                      className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      title="Yeniden Adlandır"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
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

                      <div className={`p-1.5 rounded-lg shrink-0 ${isMarkdownFile(file) ? 'bg-purple-100' : 'bg-slate-100'}`}>
                        {getFileIcon(file)}
                      </div>

                      <div className="min-w-0 flex-1">
                        {editingFileId === file.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editingFileName}
                              onChange={(e) => setEditingFileName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(file.id);
                                if (e.key === 'Escape') setEditingFileId(null);
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-xs font-semibold bg-white border border-amber-400 rounded-lg focus:outline-hidden"
                            />
                            <button
                              onClick={() => handleSaveRename(file.id)}
                              className="p-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors cursor-pointer shrink-0"
                              title="Kaydet"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingFileId(null)}
                              className="p-1 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors cursor-pointer shrink-0"
                              title="İptal"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              onClick={() => {
                                if (file.isFolder || file.mimeType.includes('folder')) {
                                  handleOpenFolder(file.id, file.name);
                                } else if (isMarkdownFile(file)) {
                                  handleOpenMarkdownEditor(file);
                                } else if (isPdfFile(file)) {
                                  handleOpenPdfViewer(file);
                                }
                              }}
                              className={`font-semibold text-slate-900 truncate block ${
                                file.isFolder || file.mimeType.includes('folder')
                                  ? 'cursor-pointer hover:text-amber-600'
                                  : isMarkdownFile(file)
                                  ? 'cursor-pointer hover:text-purple-700'
                                  : isPdfFile(file)
                                  ? 'cursor-pointer hover:text-red-600'
                                  : 'group-hover:text-amber-600'
                              }`}
                            >
                              {file.name}
                            </span>
                            {isMarkdownFile(file) ? (
                              <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[9px] font-bold shrink-0">
                                .MD
                              </span>
                            ) : isPdfFile(file) ? (
                              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[9px] font-bold shrink-0">
                                .PDF
                              </span>
                            ) : null}
                          </div>
                        )}
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
                      {isPdfFile(file) ? (
                        <button
                          onClick={() => handleOpenPdfViewer(file)}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 shadow-2xs transition-all cursor-pointer mr-1"
                          title="PDF Görüntüle ve Not Al"
                        >
                          <Eye className="w-3.5 h-3.5" /> PDF Görüntüle
                        </button>
                      ) : isMarkdownFile(file) ? (
                        <button
                          onClick={() => handleOpenMarkdownEditor(file)}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 shadow-2xs transition-all cursor-pointer mr-1"
                          title="Markdown Editör ve Preview Ekranını Aç"
                        >
                          <FileEdit className="w-3.5 h-3.5" /> Editör
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleStartRename(file)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Yeniden Adlandır"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
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
