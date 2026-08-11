import React, { useState } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Globe,
  Check,
  Palette,
  Languages,
  Sparkles,
  Tag,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Layers,
  FileText,
  Clock,
  X,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  HardDrive,
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Folder,
  FolderPlus,
  FolderCheck,
} from 'lucide-react';
import { NoteType, NoteTypeField, AuthStatus } from '../types';

interface Props {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  language: 'tr' | 'en';
  onLanguageChange: (language: 'tr' | 'en') => void;
  timezone?: string;
  onTimezoneChange?: (tz: string) => void;
  driveFolderName?: string;
  onDriveFolderNameChange?: (folderName: string) => void;
  noteTypes?: NoteType[];
  onSaveNoteType?: (typeData: NoteType) => Promise<void> | void;
  onDeleteNoteType?: (id: string) => Promise<void> | void;
  authStatus?: AuthStatus;
  onSyncToDrive?: () => Promise<void>;
  onRestoreFromDrive?: () => Promise<void>;
  isSyncingDrive?: boolean;
  driveSyncMessage?: string | null;
  onLogin?: () => void;
}

interface EditableField extends NoteTypeField {
  _optionsRaw?: string;
}

export const SettingsSection: React.FC<Props> = ({
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  timezone = 'Europe/Istanbul',
  onTimezoneChange,
  driveFolderName = 'adminspace',
  onDriveFolderNameChange,
  noteTypes = [
    { id: 'note', name: 'Düz Not', isSystem: true },
    { id: 'timelog', name: 'Timelog', isSystem: true },
  ],
  onSaveNoteType,
  onDeleteNoteType,
  authStatus = { isAuthenticated: false },
  onSyncToDrive,
  onRestoreFromDrive,
  isSyncingDrive = false,
  driveSyncMessage = null,
  onLogin,
}) => {
  const isTr = language === 'tr';

  // Google Drive Folder Selection State
  const [folderInput, setFolderInput] = React.useState(driveFolderName || 'adminspace');
  const [driveFoldersList, setDriveFoldersList] = React.useState<Array<{ id: string; name: string; link?: string }>>([]);
  const [isLoadingFolders, setIsLoadingFolders] = React.useState(false);
  const [folderSaveStatus, setFolderSaveStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFolderInput(driveFolderName || 'adminspace');
  }, [driveFolderName]);

  React.useEffect(() => {
    if (authStatus.isAuthenticated) {
      setIsLoadingFolders(true);
      fetch('/api/adminspace/drive-folders')
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.folders)) {
            setDriveFoldersList(data.folders);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingFolders(false));
    }
  }, [authStatus.isAuthenticated]);

  const handleApplyFolderName = (selectedName: string) => {
    const trimmed = selectedName.trim();
    if (!trimmed) return;
    setFolderInput(trimmed);
    if (onDriveFolderNameChange) {
      onDriveFolderNameChange(trimmed);
    }
    setFolderSaveStatus(`Senkronizasyon klasörü "${trimmed}" olarak güncellendi.`);
    setTimeout(() => setFolderSaveStatus(null), 4000);
  };

  // Custom Note Type Editor Modal State
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<NoteType | null>(null);
  const [typeName, setTypeName] = useState('');
  const [fields, setFields] = useState<EditableField[]>([]);
  const [isSavingType, setIsSavingType] = useState(false);

  const handleOpenNewTypeModal = () => {
    setEditingType(null);
    setTypeName('');
    setFields([]);
    setIsTypeModalOpen(true);
  };

  const handleOpenEditTypeModal = (nt: NoteType) => {
    if (nt.isSystem) return;
    setEditingType(nt);
    setTypeName(nt.name);
    const preparedFields: EditableField[] = (nt.fields || []).map((f) => ({
      ...f,
      _optionsRaw: f.options ? f.options.join('; ') : '',
    }));
    setFields(preparedFields);
    setIsTypeModalOpen(true);
  };

  const handleAddField = () => {
    setFields([
      ...fields,
      {
        id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: '',
        type: 'number',
        required: false,
        options: [],
        _optionsRaw: '',
      },
    ]);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const handleFieldChange = (id: string, key: keyof EditableField, val: any) => {
    setFields(
      fields.map((f) => {
        if (f.id === id) {
          const updated = { ...f, [key]: val };
          if (key === 'type' && val === 'select' && !updated._optionsRaw && updated.options?.length) {
            updated._optionsRaw = updated.options.join('; ');
          }
          return updated;
        }
        return f;
      })
    );
  };

  const handleOptionsRawChange = (fieldId: string, rawText: string) => {
    const parsedOptions = rawText
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setFields((prev) =>
      prev.map((f) => {
        if (f.id === fieldId) {
          return {
            ...f,
            _optionsRaw: rawText,
            options: parsedOptions,
          };
        }
        return f;
      })
    );
  };

  const handleSaveTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;
    setIsSavingType(true);

    try {
      const cleanedFields: NoteTypeField[] = fields
        .filter((f) => f.name.trim() !== '')
        .map(({ _optionsRaw, ...f }) => ({
          ...f,
          options: f.type === 'select' ? (f.options && f.options.length > 0 ? f.options : []) : undefined,
        }));

      const typeData: NoteType = {
        id: editingType ? editingType.id : `type-${Date.now()}`,
        name: typeName.trim(),
        isSystem: false,
        fields: cleanedFields,
      };

      if (onSaveNoteType) {
        await onSaveNoteType(typeData);
      }
      setIsTypeModalOpen(false);
    } catch (err) {
      console.error('Save Note Type Error:', err);
    } finally {
      setIsSavingType(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-150">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-md">
            <Settings className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              {isTr ? 'Sistem Ayarları' : 'System Settings'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isTr
                ? 'Tema (Koyu/Açık), Uygulama Dili ve Google Drive Bulut Senkronizasyon Ayarları'
                : 'Customize theme, language, and Google Drive cloud sync preferences'}
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span>{isTr ? 'Anında Uygulanır' : 'Applies Instantly'}</span>
        </div>
      </div>

      {/* 0. GOOGLE DRIVE BULUT SENKRONİZASYONU & YEDEKLEME CARD */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <span>Google Drive Bulut Senkronizasyonu & Veritabanı Yedeği</span>
                {authStatus.isAuthenticated ? (
                  <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Google Oturumu Açık
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Oturum Kapalı
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Veritabanınız (SQLite), Notlarınız, Projeleriniz ve Görselleriniz Google Drive hesabınızdaki <code className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-indigo-600 font-mono text-[11px]">{driveFolderName || 'adminspace'}</code> klasörüne otomatik senkronize edilir.
              </p>
            </div>
          </div>
        </div>

        {/* GOOGLE DRIVE SYNC FOLDER SELECTOR */}
        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                Google Drive Senkronizasyon Klasörü Seçimi
              </h4>
            </div>
            <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-extrabold rounded-lg flex items-center gap-1.5">
              <FolderCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Etkin Klasör: {driveFolderName || 'adminspace'}</span>
            </span>
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Google Drive hesabınızda verilerinizin senkronize edileceği klasör adını özelleştirin veya mevcut Drive klasörlerinizden seçin.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Folder className="w-4 h-4 text-indigo-500" />
              </div>
              <input
                type="text"
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                placeholder="Örn: adminspace, ProjeVerileri, Notlarim..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={() => handleApplyFolderName(folderInput)}
              disabled={!folderInput.trim() || folderInput.trim() === driveFolderName}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>Klasörü Ayarla</span>
            </button>
          </div>

          {/* Quick Folder Select Chips from user's Google Drive */}
          {authStatus.isAuthenticated && (
            <div className="space-y-1.5 pt-2 border-t border-indigo-100/60 dark:border-indigo-900/40">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                <span>Google Drive Hesabınızdaki Klasörler:</span>
                {isLoadingFolders && (
                  <span className="text-[10px] text-indigo-500 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Yükleniyor...
                  </span>
                )}
              </div>

              {driveFoldersList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 rounded-xl">
                  {driveFoldersList.map((f) => {
                    const isSelected = f.name === driveFolderName;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleApplyFolderName(f.name)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600'
                        }`}
                      >
                        <Folder className="w-3 h-3 shrink-0" />
                        <span>{f.name}</span>
                        {isSelected && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                !isLoadingFolders && (
                  <div className="text-[10px] text-slate-400 italic">
                    Drive'ınızdaki klasörler listelendi. Yeni bir klasör adı yazıp "Klasörü Ayarla" butonuna basarak özel klasör oluşturabilirsiniz.
                  </div>
                )
              )}
            </div>
          )}

          {folderSaveStatus && (
            <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{folderSaveStatus}</span>
            </div>
          )}
        </div>

        {authStatus.isAuthenticated ? (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Bağlı Google Hesabı:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{authStatus.user?.email || 'Aktif Oturum'}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Verileriniz Google Drive’daki <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">{driveFolderName || 'adminspace'}</code> klasörünüzde saklanır. Değişiklik yaptığınızda üst menüdeki <strong>Eşitle</strong> butonu parlar. Butona basarak verilerinizi kolayca eşitleyebilirsiniz.
                </p>
              </div>

              <button
                type="button"
                onClick={onSyncToDrive}
                disabled={isSyncingDrive}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingDrive ? 'animate-spin' : ''}`} />
                <span>{isSyncingDrive ? 'Eşitleniyor...' : 'Google Drive ile Eşitle'}</span>
              </button>
            </div>

            {driveSyncMessage && (
              <div className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-2.5 border ${
                driveSyncMessage.includes('hatası') || driveSyncMessage.includes('başarısız')
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}>
                {driveSyncMessage.includes('hatası') || driveSyncMessage.includes('başarısız') ? (
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  {driveSyncMessage}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" /> Google Drive Senkronizasyonu İçin Giriş Yapın
              </h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Google Hesabınızla giriş yapmadığınızda verileriniz yalnızca bu tarayıcı oturumunda lokal olarak saklanır. Google hesabınızı bağlayarak tüm verilerinizi Drive'da güvenle saklayın.
              </p>
            </div>

            {onLogin && (
              <button
                type="button"
                onClick={onLogin}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Cloud className="w-4 h-4 fill-white" /> Canlı Google Hesabı ile Giriş Yap
              </button>
            )}
          </div>
        )}
      </div>

      {/* 1. TEMA SEÇİMİ (THEME SELECTION) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-xl">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {isTr ? 'Görünüm ve Tema Seçimi' : 'Appearance & Theme Selection'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTr
                  ? 'Göz sağlığınıza uygun Açık veya Koyu görünüm modunu seçin'
                  : 'Choose Light or Dark mode according to your visual comfort'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Light Theme Card */}
          <div
            onClick={() => onThemeChange('light')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between space-y-4 ${
              theme === 'light'
                ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {isTr ? 'Açık Tema (Light Mode)' : 'Light Theme'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isTr ? 'Yüksek kontrastlı ferah beyaz görünüm' : 'High contrast clean white canvas'}
                  </p>
                </div>
              </div>
              {theme === 'light' && (
                <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xs">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </div>

            {/* Mock Mini Layout Preview */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
              <div className="h-2.5 w-1/3 bg-slate-200 rounded-md" />
              <div className="h-2 w-full bg-slate-100 rounded-md" />
              <div className="h-2 w-2/3 bg-indigo-100 rounded-md" />
            </div>
          </div>

          {/* Dark Theme Card */}
          <div
            onClick={() => onThemeChange('dark')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between space-y-4 ${
              theme === 'dark'
                ? 'border-indigo-500 bg-slate-900 text-white shadow-md'
                : 'border-slate-200 dark:border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-sm">
                    {isTr ? 'Koyu Tema (Dark Mode)' : 'Dark Theme'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {isTr ? 'Gece kullanımı için gözü yormayan koyu renkler' : 'Eye-friendly dark colors for night use'}
                  </p>
                </div>
              </div>
              {theme === 'dark' && (
                <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-xs">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </div>

            {/* Mock Mini Layout Preview */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 shadow-inner">
              <div className="h-2.5 w-1/3 bg-slate-700 rounded-md" />
              <div className="h-2 w-full bg-slate-800 rounded-md" />
              <div className="h-2 w-2/3 bg-indigo-900 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. DİL SEÇİMİ (LANGUAGE SELECTION) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-xl">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {isTr ? 'Uygulama Dil Seçimi' : 'Application Language'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTr
                  ? 'Arayüz metinleri için kullanmak istediğiniz dili seçin'
                  : 'Select the interface language you want to use'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Turkish Card */}
          <div
            onClick={() => onLanguageChange('tr')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
              language === 'tr'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 shadow-xs'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="Turkey Flag">
                🇹🇷
              </span>
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Türkçe</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Varsayılan dil (Tr)</p>
              </div>
            </div>
            {language === 'tr' && (
              <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xs">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
          </div>

          {/* English Card */}
          <div
            onClick={() => onLanguageChange('en')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
              language === 'en'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 shadow-xs'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="UK Flag">
                🇬🇧
              </span>
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">English</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">English language (En)</p>
              </div>
            </div>
            {language === 'en' && (
              <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xs">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2.5 ZAMAN DİLİMİ (TIMEZONE PARAMETER) SELECTION */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {isTr ? 'Zaman Dilimi (Timezone) Parametresi' : 'Timezone Parameter'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTr
                  ? 'https://app.kemalsahin.com/ adresindeki Zaman Damgası ile senkronizasyon için zaman dilimini tanımlayın'
                  : 'Set timezone parameter to match timestamps with app.kemalsahin.com'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'Europe/Istanbul', label: 'İstanbul (Türkiye / UTC+3)', flag: '🇹🇷' },
              { id: 'UTC', label: 'UTC (Coordinated Universal Time)', flag: '🌐' },
              { id: 'Europe/London', label: 'Londra (İngiltere / UTC+0)', flag: '🇬🇧' },
              { id: 'Europe/Berlin', label: 'Berlin (Almanya / UTC+1)', flag: '🇩🇪' },
              { id: 'America/New_York', label: 'New York (ABD / UTC-5)', flag: '🇺🇸' },
              { id: 'Asia/Dubai', label: 'Dubai (BAE / UTC+4)', flag: '🇦🇪' },
            ].map((item) => (
              <div
                key={item.id}
                onClick={() => onTimezoneChange && onTimezoneChange(item.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  timezone === item.id
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl" role="img">{item.flag}</span>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">{item.label}</h4>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{item.id}</p>
                  </div>
                </div>
                {timezone === item.id && (
                  <div className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {isTr ? 'Özel IANA Zaman Dilimi kodu girin:' : 'Enter custom IANA Timezone ID:'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={timezone}
                onChange={(e) => onTimezoneChange && onTimezoneChange(e.target.value)}
                placeholder="Örn: Europe/Istanbul veya UTC"
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5 pt-1">
              <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>
                {isTr ? 'Mevcut Zaman Damgası: ' : 'Current Timestamp: '}
                <strong>
                  {(() => {
                    try {
                      return new Date().toLocaleString(isTr ? 'tr-TR' : 'en-US', {
                        timeZone: timezone,
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });
                    } catch {
                      return 'Geçersiz Zaman Dilimi';
                    }
                  })()}
                </strong>
                <span className="font-mono text-[10px] ml-1 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded text-emerald-800 dark:text-emerald-300">
                  ({timezone})
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. NOT TÜRLERİ VE ÖZEL PARAMETRE YÖNETİMİ */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {isTr ? 'Not Türleri ve Özel Parametreler' : 'Note Types & Custom Parameters'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTr
                  ? 'Sabit türler (Düz Not, Timelog) haricinde yeni not türleri ekleyin ve sayı, metin, tarih gibi özel alanlar tanımlayın'
                  : 'Define custom note types and custom fields like numbers, text, or dates'}
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenNewTypeModal}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isTr ? 'Yeni Not Türü Ekle' : 'Add Note Type'}</span>
          </button>
        </div>

        {/* Note Types List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {noteTypes.map((nt) => (
            <div
              key={nt.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                nt.isSystem
                  ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'
                  : 'bg-white dark:bg-slate-800 border-purple-200 dark:border-purple-800/80 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-xl text-white font-black text-xs flex items-center justify-center ${
                      nt.id === 'timelog'
                        ? 'bg-purple-600'
                        : nt.id === 'note'
                        ? 'bg-slate-700'
                        : 'bg-indigo-600'
                    }`}
                  >
                    {nt.id === 'timelog' ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <span>{nt.name}</span>
                      {nt.isSystem && (
                        <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black rounded-md flex items-center gap-1">
                          <Shield className="w-3 h-3 text-amber-500" /> Sabit / Silinemez
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {nt.id === 'timelog'
                        ? 'Zaman takibi için başlangıç & bitiş zamanı içeren standart not'
                        : nt.id === 'note'
                        ? 'Genel serbest metin ve çizim notu'
                        : `${nt.fields?.length || 0} adet özel parametre alanı`}
                    </p>
                  </div>
                </div>

                {!nt.isSystem && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditTypeModal(nt)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Düzenle"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteNoteType && onDeleteNoteType(nt.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Render Fields Pills for Custom Types */}
              {nt.fields && nt.fields.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-1.5">
                  {nt.fields.map((f) => (
                    <span
                      key={f.id}
                      className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 rounded-md text-[10px] font-bold"
                    >
                      {f.name} ({f.type === 'number' ? 'Sayı' : f.type === 'text' ? 'Metin' : f.type === 'date' ? 'Tarih' : f.type === 'boolean' ? 'Evet/Hayır' : 'Seçim'})
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: NOT TÜRÜ OLUŞTURMA / DÜZENLEME MODALI */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {editingType ? 'Not Türünü Düzenle' : 'Yeni Not Türü Tanımla'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Not türü adı ve not oluştururken istenecek özel parametre alanlarını belirleyin
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTypeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTypeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Not Türü Adı <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  placeholder="Örn: Fiyat Notu, Müşteri Teklifi, Saha Faturası"
                  required
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                />
              </div>

              {/* Dynamic Parameter Fields Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Özel Parametre Alanları (Veri Tipleri)
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Örn: 'Fiyat' adı verip 'Sayı' tipini seçerseniz not girerken sayı istenir.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Parametre Ekle
                  </button>
                </div>

                {fields.length === 0 ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center text-slate-400 text-xs italic">
                    Henüz özel parametre alanı eklenmedi. Standart not metnine ek özel alanlar için "Parametre Ekle" butonuna basın.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {fields.map((f, idx) => (
                      <div
                        key={f.id}
                        className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2"
                      >
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <div className="flex-1 min-w-[140px]">
                            <input
                              type="text"
                              value={f.name}
                              onChange={(e) => handleFieldChange(f.id, 'name', e.target.value)}
                              placeholder={`Parametre Adı (Örn: Fiyat)`}
                              required
                              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-white"
                            />
                          </div>

                          <div className="w-36">
                            <select
                              value={f.type}
                              onChange={(e) => handleFieldChange(f.id, 'type', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-800 dark:text-white"
                            >
                              <option value="number">Sayı (Number)</option>
                              <option value="text">Metin (Text)</option>
                              <option value="date">Tarih (Date)</option>
                              <option value="boolean">Evet/Hayır (Bool)</option>
                              <option value="select">Seçim Listesi</option>
                            </select>
                          </div>

                          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-600 dark:text-slate-300 select-none">
                            <input
                              type="checkbox"
                              checked={!!f.required}
                              onChange={(e) => handleFieldChange(f.id, 'required', e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600"
                            />
                            Zorunlu
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveField(f.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer shrink-0 ml-auto sm:ml-0"
                            title="Parametreyi Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Options Input for 'select' type */}
                        {f.type === 'select' && (
                          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                            <label className="block text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400">
                              Seçenek Listesi (Noktalı virgül ';' ile ayırarak yazın) <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={f._optionsRaw ?? (f.options ? f.options.join('; ') : '')}
                              onChange={(e) => handleOptionsRawChange(f.id, e.target.value)}
                              placeholder="Örn: Seçenek 1; Seçenek 2; Seçenek 3"
                              required
                              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/80 rounded-lg font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
                            />
                            {f.options && f.options.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {f.options.map((opt, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold rounded-md"
                                  >
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSavingType}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingType ? 'Güncelle' : 'Kaydet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
