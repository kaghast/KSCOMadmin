import React from 'react';
import { Settings, Moon, Sun, Globe, Check, Palette, Languages, Sparkles } from 'lucide-react';

interface Props {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  language: 'tr' | 'en';
  onLanguageChange: (language: 'tr' | 'en') => void;
}

export const SettingsSection: React.FC<Props> = ({
  theme,
  onThemeChange,
  language,
  onLanguageChange,
}) => {
  const isTr = language === 'tr';

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
                ? 'Tema (Koyu/Açık) ve Uygulama Dili (Türkçe/İngilizce) Tercihlerinizi Özelleştirin'
                : 'Customize your theme (Dark/Light) and Application Language (Turkish/English) preferences'}
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span>{isTr ? 'Anında Uygulanır' : 'Applies Instantly'}</span>
        </div>
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
    </div>
  );
};
