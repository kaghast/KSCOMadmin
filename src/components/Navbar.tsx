import React from 'react';
import { LogIn, LogOut, Sparkles } from 'lucide-react';
import { AuthStatus } from '../types';

interface Props {
  authStatus: AuthStatus;
  onLogin: () => void;
  onLogout: () => void;
  activeScreen?: 'workspace' | 'timeManagement';
  onScreenChange?: (screen: 'workspace' | 'timeManagement') => void;
}

export const Navbar: React.FC<Props> = ({
  authStatus,
  onLogin,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand / Logo (Left Aligned) */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-md">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-white">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                Google Workspace <span className="text-indigo-400 font-medium text-xs">&</span> Zaman Hub
              </h1>
            </div>
          </div>

          {/* User Auth & Status Badge (Right Aligned) */}
          <div className="flex items-center gap-3">
            {!authStatus.isAuthenticated ? (
              <button
                onClick={onLogin}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" /> Google Hesabını Bağla
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                  {authStatus.user?.picture && authStatus.user.picture.trim() !== '' ? (
                    <img
                      src={authStatus.user.picture}
                      alt="Avatar"
                      className="w-6 h-6 rounded-full border border-slate-600"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center">
                      {(authStatus.user?.email || 'K')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="text-left hidden sm:block">
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
                  <span className="hidden sm:inline">Çıkış Yap</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

