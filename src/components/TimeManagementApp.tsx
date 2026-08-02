import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Clock,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  CheckCircle,
  Plus,
  Trash2,
  Flame,
  Zap,
  Target,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TimeCategory, TimeLog, EisenhowerTask, TimeBlock } from '../types';

export const TimeManagementApp: React.FC = () => {
  // ================= POMODORO TIMER STATE =================
  const [timerMode, setTimerMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(3);
  const [activeCategory, setActiveCategory] = useState<TimeCategory>('deep_work');
  const [currentTaskTitle, setCurrentTaskTitle] = useState('Google Workspace Entegrasyon Kodlaması');

  const modeMinutes = {
    work: 25,
    shortBreak: 5,
    longBreak: 15,
  };

  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (timerMode === 'work') {
        setCompletedPomodoros((p) => p + 1);
        // Log focus session automatically
        const newLog: TimeLog = {
          id: `log-${Date.now()}`,
          title: currentTaskTitle || 'Pomodoro Çalışma Seansı',
          category: activeCategory,
          durationMinutes: 25,
          date: new Date().toISOString().slice(0, 10),
          startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setTimeLogs((prev) => [newLog, ...prev]);
        setTimerMode('shortBreak');
        setTimeLeft(5 * 60);
      } else {
        setTimerMode('work');
        setTimeLeft(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, timerMode, activeCategory, currentTaskTitle]);

  const handleStartPause = () => setIsRunning(!isRunning);

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(modeMinutes[timerMode] * 60);
  };

  const handleSwitchMode = (mode: 'work' | 'shortBreak' | 'longBreak') => {
    setIsRunning(false);
    setTimerMode(mode);
    setTimeLeft(modeMinutes[mode] * 60);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalModeSeconds = modeMinutes[timerMode] * 60;
  const progressPercent = ((totalModeSeconds - timeLeft) / totalModeSeconds) * 100;

  // ================= TIME LOGS & CHARTS STATE =================
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([
    {
      id: 'log-1',
      title: 'Gmail & Drive API İncelemesi',
      category: 'deep_work',
      durationMinutes: 50,
      date: new Date().toISOString().slice(0, 10),
      startTime: '09:00',
    },
    {
      id: 'log-2',
      title: 'Haftalık Sprint Planlama Toplantısı',
      category: 'meeting',
      durationMinutes: 45,
      date: new Date().toISOString().slice(0, 10),
      startTime: '11:00',
    },
    {
      id: 'log-3',
      title: 'E-posta & Görev Temizliği',
      category: 'admin',
      durationMinutes: 30,
      date: new Date().toISOString().slice(0, 10),
      startTime: '14:00',
    },
    {
      id: 'log-4',
      title: 'TypeScript & Node.js Dokümantasyonu',
      category: 'learning',
      durationMinutes: 60,
      date: new Date().toISOString().slice(0, 10),
      startTime: '15:30',
    },
  ]);

  const [newLogTitle, setNewLogTitle] = useState('');
  const [newLogCategory, setNewLogCategory] = useState<TimeCategory>('deep_work');
  const [newLogMinutes, setNewLogMinutes] = useState(30);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogTitle) return;
    const log: TimeLog = {
      id: `log-${Date.now()}`,
      title: newLogTitle,
      category: newLogCategory,
      durationMinutes: Number(newLogMinutes),
      date: new Date().toISOString().slice(0, 10),
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setTimeLogs([log, ...timeLogs]);
    setNewLogTitle('');
  };

  const categoryLabels: Record<TimeCategory, string> = {
    deep_work: 'Derin Çalışma',
    meeting: 'Toplantı',
    admin: 'İdari & E-posta',
    learning: 'Öğrenme',
    break: 'Mola',
  };

  const categoryColors: Record<TimeCategory, string> = {
    deep_work: '#6366f1', // Indigo
    meeting: '#3b82f6', // Blue
    admin: '#f59e0b', // Amber
    learning: '#10b981', // Emerald
    break: '#94a3b8', // Slate
  };

  // Recharts aggregated data
  const pieDataMap: Record<string, number> = {};
  timeLogs.forEach((l) => {
    const label = categoryLabels[l.category];
    pieDataMap[label] = (pieDataMap[label] || 0) + l.durationMinutes;
  });

  const pieChartData = Object.keys(pieDataMap).map((key) => ({
    name: key,
    value: pieDataMap[key],
  }));

  const barChartData = [
    { day: 'Pzt', dakikalar: 210 },
    { day: 'Sal', dakikalar: 240 },
    { day: 'Çar', dakikalar: 180 },
    { day: 'Per', dakikalar: 300 },
    { day: 'Cum', dakikalar: 225 },
    { day: 'Cmt', dakikalar: 120 },
    { day: 'Paz', dakikalar: 90 },
  ];

  // ================= EISENHOWER MATRIX STATE =================
  const [eisenhowerTasks, setEisenhowerTasks] = useState<EisenhowerTask[]>([
    {
      id: 'e1',
      title: 'Kritik Müşteri Sunumu Hazırlığı',
      quadrant: 'do_first',
      completed: false,
    },
    {
      id: 'e2',
      title: 'Çeyreklik Stratejik Hedef Planlaması',
      quadrant: 'schedule',
      completed: false,
    },
    {
      id: 'e3',
      title: 'Haftalık Faturalama & E-posta Yanıtları',
      quadrant: 'delegate',
      completed: false,
    },
    {
      id: 'e4',
      title: 'Eski Dosyaları Arşivleme',
      quadrant: 'eliminate',
      completed: true,
    },
  ]);

  const [newMatrixTaskTitle, setNewMatrixTaskTitle] = useState('');
  const [newMatrixQuadrant, setNewMatrixQuadrant] = useState<EisenhowerTask['quadrant']>('do_first');

  const handleAddMatrixTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatrixTaskTitle) return;
    const task: EisenhowerTask = {
      id: `e-${Date.now()}`,
      title: newMatrixTaskTitle,
      quadrant: newMatrixQuadrant,
      completed: false,
    };
    setEisenhowerTasks([...eisenhowerTasks, task]);
    setNewMatrixTaskTitle('');
  };

  const handleToggleMatrixTask = (id: string) => {
    setEisenhowerTasks(
      eisenhowerTasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteMatrixTask = (id: string) => {
    setEisenhowerTasks(eisenhowerTasks.filter((t) => t.id !== id));
  };

  // ================= TIME BLOCKING HOURLY SCHEDULER =================
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([
    { id: 'tb-8', hour: 8, title: 'Sabah E-posta & Gün Planı', category: 'admin', completed: true },
    { id: 'tb-9', hour: 9, title: 'Derin Çalışma: Kodlama Seansı 1', category: 'deep_work', completed: true },
    { id: 'tb-10', hour: 10, title: 'Derin Çalışma: Kodlama Seansı 2', category: 'deep_work', completed: true },
    { id: 'tb-11', hour: 11, title: 'Google Calendar Ekip Toplantısı', category: 'meeting', completed: false },
    { id: 'tb-12', hour: 12, title: 'Öğle Yemeği & Mola', category: 'break', completed: true },
    { id: 'tb-13', hour: 13, title: 'Drive Doküman Taslağı İnceleme', category: 'learning', completed: false },
    { id: 'tb-14', hour: 14, title: 'Google Tasks Öncelikli İşler', category: 'deep_work', completed: false },
    { id: 'tb-15', hour: 15, title: 'İdari İşler & E-posta Takibi', category: 'admin', completed: false },
  ]);

  const handleToggleBlock = (id: string) => {
    setTimeBlocks(
      timeBlocks.map((b) => (b.id === id ? { ...b, completed: !b.completed } : b))
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Time Management Hero Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-purple-200 border border-white/10">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> ODAK VE VERİMLİLİK SİSTEMİ
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Zaman Yönetimi & Odak Merkezi
            </h1>
            <p className="text-sm text-indigo-200/80 max-w-xl">
              Pomodoro seansları, saatlik zaman bloklama ve Eisenhower matrisi ile gününüzü en üst düzey verimlilikle yönetin.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
            <div className="text-center px-3 border-r border-white/10">
              <div className="text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 fill-amber-400 text-amber-400" /> {completedPomodoros}
              </div>
              <div className="text-[10px] uppercase font-semibold text-indigo-200">Pomodoro</div>
            </div>
            <div className="text-center px-3">
              <div className="text-2xl font-black text-emerald-400">
                {(timeLogs.reduce((acc, curr) => acc + curr.durationMinutes, 0) / 60).toFixed(1)}s
              </div>
              <div className="text-[10px] uppercase font-semibold text-indigo-200">Bugünkü Çalışma</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Pomodoro & Hourly Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Pomodoro Timer (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-6 h-6 text-indigo-600" />
                <h2 className="font-bold text-slate-900 text-lg">Pomodoro Odağı</h2>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                {timerMode === 'work' ? '🎯 Odaklanma Zamanı' : '☕ Mola Zamanı'}
              </span>
            </div>

            {/* Mode Selector */}
            <div className="flex items-center justify-center p-1.5 bg-slate-100 rounded-2xl max-w-md mx-auto mb-8 text-xs font-semibold">
              <button
                onClick={() => handleSwitchMode('work')}
                className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
                  timerMode === 'work'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                25dk Odak
              </button>
              <button
                onClick={() => handleSwitchMode('shortBreak')}
                className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
                  timerMode === 'shortBreak'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                5dk Kısa Mola
              </button>
              <button
                onClick={() => handleSwitchMode('longBreak')}
                className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
                  timerMode === 'longBreak'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                15dk Uzun Mola
              </button>
            </div>

            {/* Circular Timer Visual */}
            <div className="relative w-64 h-64 mx-auto my-4 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-slate-100"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeDasharray="263.89"
                  strokeDashoffset={263.89 - (263.89 * progressPercent) / 100}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ${
                    timerMode === 'work'
                      ? 'text-indigo-600'
                      : timerMode === 'shortBreak'
                      ? 'text-emerald-500'
                      : 'text-blue-500'
                  }`}
                  fill="transparent"
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-5xl font-black tracking-tight text-slate-900 font-mono">
                  {formatTimer(timeLeft)}
                </span>
                <span className="text-xs text-slate-500 mt-2 font-medium px-3 py-1 bg-slate-100 rounded-full">
                  {currentTaskTitle || 'Çalışma Seansı'}
                </span>
              </div>
            </div>

            {/* Task Title Input & Category */}
            <div className="mt-6 space-y-3 max-w-md mx-auto">
              <input
                type="text"
                placeholder="Şu an ne üzerinde çalışıyorsunuz?..."
                value={currentTaskTitle}
                onChange={(e) => setCurrentTaskTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs text-center font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />

              <div className="flex items-center justify-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Kategori:</span>
                <select
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value as TimeCategory)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="deep_work">Derin Çalışma</option>
                  <option value="meeting">Toplantı</option>
                  <option value="admin">İdari İşler</option>
                  <option value="learning">Öğrenme</option>
                </select>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={handleReset}
              title="Sıfırla"
              className="p-3 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={handleStartPause}
              className={`px-8 py-3.5 rounded-2xl font-bold text-white shadow-lg flex items-center gap-2 transition-all cursor-pointer ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-white" /> Duraklat
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-white" /> Başlat
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsRunning(false);
                setTimeLeft(0);
              }}
              title="Atla"
              className="p-3 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all cursor-pointer"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Saatlik Zaman Bloklama (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-slate-900 text-base">Saatlik Zaman Bloklama</h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Günlük Akış</span>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Gününüzü saatlik zaman bloklarına ayırarak odak dağınıklığını önleyin.
          </p>

          <div className="space-y-2.5 overflow-y-auto max-h-[440px] pr-1 flex-1">
            {timeBlocks.map((block) => (
              <div
                key={block.id}
                onClick={() => handleToggleBlock(block.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  block.completed
                    ? 'bg-slate-50 border-slate-200/60 opacity-60'
                    : 'bg-indigo-50/30 border-indigo-100 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-indigo-900 bg-indigo-100/80 px-2 py-1 rounded-lg">
                    {block.hour.toString().padStart(2, '0')}:00
                  </span>
                  <div>
                    <h4
                      className={`text-xs font-semibold ${
                        block.completed ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {block.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {categoryLabels[block.category]}
                    </span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                    block.completed
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {block.completed && <CheckCircle className="w-3.5 h-3.5" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Eisenhower Matrix Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-6 h-6 text-indigo-600" />
              <h2 className="font-bold text-slate-900 text-lg">Eisenhower Önceliklendirme Matrisi</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Görevleri aciliyet ve önem seviyelerine göre 4 çeyreğe ayırarak zamanı etkili yönetin.
            </p>
          </div>

          <form onSubmit={handleAddMatrixTask} className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Yeni matris görevi..."
              value={newMatrixTaskTitle}
              onChange={(e) => setNewMatrixTaskTitle(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-64"
            />
            <select
              value={newMatrixQuadrant}
              onChange={(e) => setNewMatrixQuadrant(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white"
            >
              <option value="do_first">🔴 Acil & Önemli (Hemen Yap)</option>
              <option value="schedule">🔵 Acil Değil & Önemli (Planla)</option>
              <option value="delegate">🟡 Acil & Önemli Değil (Devret)</option>
              <option value="eliminate">⚪ Acil Değil & Değil (Ele)</option>
            </select>
            <button
              type="submit"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Ekle
            </button>
          </form>
        </div>

        {/* 4 Quadrants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Q1: Do First */}
          <div className="p-4 rounded-2xl bg-red-50/50 border border-red-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                🔴 1. Acil & Önemli (Hemen Yap)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                Yüksek Öncelik
              </span>
            </div>
            <div className="space-y-2">
              {eisenhowerTasks
                .filter((t) => t.quadrant === 'do_first')
                .map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-white rounded-xl border border-red-100 shadow-2xs flex items-center justify-between gap-2"
                  >
                    <span
                      onClick={() => handleToggleMatrixTask(t.id)}
                      className={`text-xs font-semibold cursor-pointer ${
                        t.completed ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {t.title}
                    </span>
                    <button
                      onClick={() => handleDeleteMatrixTask(t.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Q2: Schedule */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                🔵 2. Acil Değil & Önemli (Planla)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                Stratejik
              </span>
            </div>
            <div className="space-y-2">
              {eisenhowerTasks
                .filter((t) => t.quadrant === 'schedule')
                .map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-white rounded-xl border border-blue-100 shadow-2xs flex items-center justify-between gap-2"
                  >
                    <span
                      onClick={() => handleToggleMatrixTask(t.id)}
                      className={`text-xs font-semibold cursor-pointer ${
                        t.completed ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {t.title}
                    </span>
                    <button
                      onClick={() => handleDeleteMatrixTask(t.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Q3: Delegate */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                🟡 3. Acil & Önemli Değil (Devret)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                Otomasyon / Ekip
              </span>
            </div>
            <div className="space-y-2">
              {eisenhowerTasks
                .filter((t) => t.quadrant === 'delegate')
                .map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-white rounded-xl border border-amber-100 shadow-2xs flex items-center justify-between gap-2"
                  >
                    <span
                      onClick={() => handleToggleMatrixTask(t.id)}
                      className={`text-xs font-semibold cursor-pointer ${
                        t.completed ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {t.title}
                    </span>
                    <button
                      onClick={() => handleDeleteMatrixTask(t.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Q4: Eliminate */}
          <div className="p-4 rounded-2xl bg-slate-100/60 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                ⚪ 4. Acil Değil & Önemli Değil (Ele)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full">
                Düşük Değer
              </span>
            </div>
            <div className="space-y-2">
              {eisenhowerTasks
                .filter((t) => t.quadrant === 'eliminate')
                .map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2"
                  >
                    <span
                      onClick={() => handleToggleMatrixTask(t.id)}
                      className={`text-xs font-semibold cursor-pointer ${
                        t.completed ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {t.title}
                    </span>
                    <button
                      onClick={() => handleDeleteMatrixTask(t.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics & Time Log Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pie Chart */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Bugünkü Çalışma Dağılımı</h3>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={categoryColors[entry.name as keyof typeof categoryColors] || '#6366f1'}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value} dakika`, 'Süre']} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Haftalık Odaklanma Trendi (Dk)</h3>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip formatter={(value: any) => [`${value} dk`, 'Çalışma']} />
                <Bar dataKey="dakikalar" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
