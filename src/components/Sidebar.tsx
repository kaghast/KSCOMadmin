import React from 'react';
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  Clock,
  HardDrive,
  Mail,
  Calendar,
  CheckSquare,
  Users,
  ChevronLeft,
  ChevronRight,
  Database,
  Cloud,
  Settings,
  X,
  Sparkles,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'projects' | 'notes' | 'time' | 'drive' | 'gmail' | 'calendar' | 'tasks' | 'contacts' | 'settings';

interface Props {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  notesCount: number;
  projectsCount?: number;
  language?: 'tr' | 'en';
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  notesCount,
  projectsCount = 0,
  language = 'tr',
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const isTr = language === 'tr';

  const handleTabSelect = (tab: NavTab) => {
    onTabChange(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: isTr ? 'Genel Bakış' : 'Dashboard',
      description: isTr ? 'Workspace Paneli' : 'Workspace Overview',
      icon: LayoutDashboard,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      id: 'projects' as NavTab,
      label: isTr ? 'Projeler' : 'Projects',
      description: isTr ? 'Kanban & Drive Sync' : 'Kanban & Drive Sync',
      icon: FolderKanban,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      badge: projectsCount > 0 ? projectsCount : undefined,
    },
    {
      id: 'notes' as NavTab,
      label: isTr ? 'Not Yönetimi' : 'Notes Management',
      description: isTr ? 'Markdown & Lokasyon' : 'Markdown & Map Location',
      icon: FileText,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      badge: notesCount > 0 ? notesCount : undefined,
    },
    {
      id: 'time' as NavTab,
      label: isTr ? 'Zaman Yönetimi' : 'Time Management',
      description: isTr ? 'Kanban & Takvim Timelog' : 'Kanban & Calendar Timelog',
      icon: Clock,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      id: 'settings' as NavTab,
      label: isTr ? 'Ayarlar' : 'Settings',
      description: isTr ? 'Tema & Dil Seçimi' : 'Theme & Language',
      icon: Settings,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-950/60',
    },
  ];

  const quickWorkspaceItems = [
    { id: 'gmail' as NavTab, label: 'Gmail', icon: Mail, color: 'text-rose-500', desc: 'Gelen Kutusu & Yıldızlı' },
    { id: 'calendar' as NavTab, label: 'Takvim', icon: Calendar, color: 'text-blue-500', desc: 'Google Etkinlikleri & Timelog' },
    { id: 'drive' as NavTab, label: 'Drive (adminspace)', icon: HardDrive, color: 'text-amber-500', desc: 'SQLite & Doküman Deposu' },
    { id: 'tasks' as NavTab, label: 'Görevler', icon: CheckSquare, color: 'text-indigo-500', desc: 'Google Tasks Entegrasyonu' },
    { id: 'contacts' as NavTab, label: 'Kişiler', icon: Users, color: 'text-emerald-500', desc: 'Google Contacts Bağlantısı' },
  ];

  return (
    <>
      {/* 1. DESKTOP FIXED SIDEBAR */}
      <aside
        className={`hidden md:flex bg-slate-900 text-slate-300 border-r border-slate-800 flex-col justify-between transition-all duration-300 z-30 shrink-0 ${
          isCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        {/* Top Branding & Collapse Button */}
        <div>
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-bold text-white text-sm tracking-wide truncate">AdminSpace</h1>
                  <p className="text-[10px] text-slate-400 truncate">SQLite & Drive Storage</p>
                </div>
              </div>
            )}

            {isCollapsed && (
              <div className="mx-auto p-2 bg-indigo-600 text-white rounded-xl">
                <Database className="w-5 h-5" />
              </div>
            )}

            <button
              onClick={onToggleCollapse}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title={isCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Main Navigation List */}
          <div className="p-3 space-y-1">
            <p
              className={`text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2 ${
                isCollapsed ? 'text-center text-[9px]' : ''
              }`}
            >
              {isCollapsed ? '---' : 'Ana Modüller'}
            </p>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabSelect(item.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div
                    className={`p-2 rounded-lg transition-colors shrink-0 ${
                      isActive ? 'bg-indigo-500 text-white' : `${item.bgColor} ${item.color}`
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {!isCollapsed && (
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-bold truncate">{item.label}</div>
                      <div className="text-[10px] opacity-70 truncate font-normal">
                        {item.description}
                      </div>
                    </div>
                  )}

                  {!isCollapsed && item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive ? 'bg-white text-indigo-700' : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Workspace Modules */}
          <div className="p-3 border-t border-slate-800/80 space-y-1 mt-2">
            <p
              className={`text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1 ${
                isCollapsed ? 'text-center text-[9px]' : ''
              }`}
            >
              {isCollapsed ? '---' : 'Workspace Servisleri'}
            </p>

            {quickWorkspaceItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white font-bold'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Storage & Google Drive info */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/50">
          {!isCollapsed ? (
            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Cloud className="w-3.5 h-3.5" />
                <span>adminspace</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Veriler local SQLite <code className="text-amber-300">/adminspace</code> ve Google Drive klasörüne senkronize edilir.
              </p>
            </div>
          ) : (
            <div className="p-2 bg-slate-800 rounded-lg text-center text-emerald-400" title="adminspace Google Drive Folder">
              <Cloud className="w-4 h-4 mx-auto" />
            </div>
          )}
        </div>
      </aside>

      {/* 2. MOBILE FULL-SCREEN DRAWER OVERLAY */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-xl text-slate-200 flex flex-col justify-between overflow-y-auto animate-in fade-in duration-200">
          {/* Top Mobile Menu Header */}
          <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-extrabold text-white text-base tracking-wide flex items-center gap-1.5">
                  AdminSpace <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                </h2>
                <p className="text-xs text-indigo-300 font-medium">SQLite & Google Drive Hub</p>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="p-2.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-2xl border border-slate-700/80 transition-all cursor-pointer"
              aria-label="Menüyü Kapat"
            >
              <X className="w-6 h-6 text-slate-200" />
            </button>
          </div>

          {/* Menu Sections Container */}
          <div className="p-5 space-y-6 flex-1">
            {/* Primary Modules */}
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 px-1">
                Ana Modüller
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabSelect(item.id)}
                      className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg ring-2 ring-indigo-400/30'
                          : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-xl shrink-0 ${
                          isActive ? 'bg-indigo-500 text-white' : `${item.bgColor} ${item.color}`
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm leading-tight flex items-center justify-between gap-2">
                          <span className="truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                isActive ? 'bg-white text-indigo-700' : 'bg-amber-500 text-slate-950'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-xs opacity-75 truncate font-normal mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Google Workspace Services */}
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 px-1">
                Workspace Servisleri
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickWorkspaceItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabSelect(item.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-800 border-indigo-500/80 text-white font-bold ring-1 ring-indigo-500/30'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="p-2 bg-slate-800 rounded-xl shrink-0">
                        <Icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-100 truncate">{item.label}</div>
                        <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Sync Banner */}
          <div className="p-5 border-t border-slate-800 bg-slate-900/80 shrink-0">
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-400">SQLite & Google Drive Hub</p>
                <p className="text-[11px] text-slate-300">
                  Verileriniz yerel SQLite veritabanında ve Google Drive <code className="text-amber-300 font-mono">adminspace</code> klasöründe güvenle senkronize edilir.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
