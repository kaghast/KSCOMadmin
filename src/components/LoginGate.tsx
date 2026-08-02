import React from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Calendar,
  HardDrive,
  Users,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  onLogin: () => void;
  language?: 'tr' | 'en';
}

export const LoginGate: React.FC<Props> = ({ onLogin, language = 'tr' }) => {
  const isTr = language === 'tr';

  const permissions = [
    {
      icon: Mail,
      title: isTr ? 'Gmail Erişimi' : 'Gmail Access',
      desc: isTr
        ? 'E-posta maillerini okuma, yanıtlama ve notlar ile ilişkilendirme'
        : 'Read, reply to emails and link them with notes',
      color: 'text-rose-500 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800',
    },
    {
      icon: Calendar,
      title: isTr ? 'Google Takvim Erişimi' : 'Google Calendar Access',
      desc: isTr
        ? 'Etkinlik ve randevu senkronizasyonu, not bağlantısı'
        : 'Event synchronization and note connection',
      color: 'text-blue-500 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800',
    },
    {
      icon: HardDrive,
      title: isTr ? 'Google Drive Erişimi' : 'Google Drive Access',
      desc: isTr
        ? 'Dosya yönetimi ve AdminSpace veritabanı yedekleme'
        : 'File management and database backups',
      color: 'text-emerald-500 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800',
    },
    {
      icon: Users,
      title: isTr ? 'Google Rehber (Contacts)' : 'Google Contacts Access',
      desc: isTr
        ? 'Kişi listenize erişim ve çoklu kişi etiketleme'
        : 'Access contact list and multi-person tagging',
      color: 'text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative z-10 space-y-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Icon & Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-2xl shadow-lg ring-4 ring-indigo-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {isTr ? 'Google Hesabı ile Giriş Yapın' : 'Sign In with Google Account'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            {isTr
              ? 'AdminSpace Workspace uygulamasına erişmek için Google hesabınız ile oturum açmanız gerekmektedir.'
              : 'You must sign in with your Google account to access AdminSpace Workspace.'}
          </p>
        </div>

        {/* Permissions Grid */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isTr ? 'Gerekli İzinler ve Entegrasyonlar' : 'Required Scopes & Permissions'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {permissions.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-start gap-3"
                >
                  <div className={`p-2 rounded-xl border shrink-0 ${p.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1">
                      {p.title}
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Login CTA Button */}
        <div className="space-y-3 pt-2">
          <button
            onClick={onLogin}
            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-3 cursor-pointer group active:scale-[0.99]"
          >
            {/* Google SVG Icon */}
            <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>

            <span>{isTr ? 'Google Hesabı ile Giriş Yap' : 'Sign In with Google Account'}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-2 pt-2 border-t border-slate-700/50">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              {isTr ? 'Güvenli OAuth 2.0 Doğrulaması' : 'Secure OAuth 2.0 Authorization'}
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              AdminSpace Workspace
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
