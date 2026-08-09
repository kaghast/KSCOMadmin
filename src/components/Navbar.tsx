import React from 'react';
import { LogIn, LogOut, Sparkles, Menu, X } from 'lucide-react';
import { AuthStatus } from '../types';

interface Props {
  authStatus: AuthStatus;
  onLogin: () => void;
  onLogout: () => void;
  activeScreen?: 'workspace' | 'timeManagement';
  onScreenChange?: (screen: 'workspace' | 'timeManagement') => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<Props> = ({
  authStatus,
  onLogin,
  onLogout,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Mobile Hamburger Button + Brand / Logo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {onToggleMobileMenu && (
              <button
                onClick={onToggleMobileMenu}
                className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
                aria-label="Mobil Menü"
                title="Menüyü Aç / Kapat"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-rose-400" />
                ) : (
                  <Menu className="w-6 h-6 text-indigo-400" />
                )}
              </button>
            )}

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-md shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-xs sm:text-base tracking-tight text-white flex items-center gap-1 truncate">
                <span>Google Workspace</span> <span className="text-indigo-400 font-medium text-[10px] sm:text-xs">&</span> <span>Zaman Hub</span>
              </h1>
            </div>
          </div>

          {/* User Auth & Status Badge (Right Aligned) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {!authStatus.isAuthenticated ? (
              <button
                onClick={onLogin}
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" /> <span className="hidden xs:inline sm:inline">Google Hesabını Bağla</span><span className="xs:hidden sm:hidden">Giriş</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 bg-slate-800 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700">
                  {authStatus.user?.picture && authStatus.user.picture.trim() !== '' ? (
                    <img
                      src={authStatus.user.picture}
                      alt="Avatar"
                      className="w-6 h-6 rounded-full border border-slate-600 shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      {(authStatus.user?.email || 'K')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="text-left hidden md:block">
                    <p className="text-xs font-semibold text-slate-200 leading-tight">
                      {authStatus.user?.name || 'Kemal Şahin'}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-none">
                      {authStatus.user?.email || 'kemalsahin@gmail.com'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  title="Oturumu Kapat"
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Çıkış</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

