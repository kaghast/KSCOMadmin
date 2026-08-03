import React, { useRef, useState, useEffect } from 'react';
import {
  Pencil,
  Eraser,
  Square,
  Circle as CircleIcon,
  Minus,
  Type,
  RotateCcw,
  Trash2,
  Check,
  Palette,
} from 'lucide-react';

interface Props {
  initialDataUrl?: string;
  onChange: (dataUrl: string) => void;
}

export type ToolType = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'text';

const PRESET_COLORS = [
  '#000000', // Siyah
  '#4f46e5', // İndigo
  '#dc2626', // Kırmızı
  '#2563eb', // Mavi
  '#16a34a', // Yeşil
  '#d97706', // Turuncu / Sarı
  '#9333ea', // Mor
  '#ffffff', // Beyaz
];

export const DrawingCanvas: React.FC<Props> = ({ initialDataUrl, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);

  // Undo History
  const [history, setHistory] = useState<ImageData[]>([]);

  // Text Tool State
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvas.parentElement?.clientWidth || 600;
    canvas.height = 360;

    // Fill white background default
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save initial state to history
    const initSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initSnapshot]);

    // If initialDataUrl exists, load it
    if (initialDataUrl && initialDataUrl.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const loadedSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([loadedSnapshot]);
      };
      img.src = initialDataUrl;
    }
  }, []);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-15), currentData]); // Max 15 undo steps
    onChange(canvas.toDataURL('image/png'));
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = history.slice(0, history.length - 1);
    const lastSnapshot = newHistory[newHistory.length - 1];
    ctx.putImageData(lastSnapshot, 0, 0);
    setHistory(newHistory);
    onChange(canvas.toDataURL('image/png'));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  // Canvas Mouse / Touch Event Handlers
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    if (activeTool === 'text') {
      setTextPos({ x, y });
      setShowTextInput(true);
      setTextInput('');
      return;
    }

    setIsDrawing(true);
    setStartX(x);
    setStartY(y);

    // Save snapshot before shape drawing
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : selectedColor;
    ctx.lineWidth = activeTool === 'eraser' ? strokeWidth * 4 : strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    if (activeTool === 'pen' || activeTool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (snapshot) {
      // Put snapshot back to preview clean shapes
      ctx.putImageData(snapshot, 0, 0);
      ctx.beginPath();
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = strokeWidth;

      if (activeTool === 'rectangle') {
        const width = x - startX;
        const height = y - startY;
        ctx.strokeRect(startX, startY, width, height);
      } else if (activeTool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (activeTool === 'line') {
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const stopDraw = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const handleAddText = () => {
    if (!textInput.trim() || !textPos) {
      setShowTextInput(false);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = `bold ${strokeWidth * 4 + 10}px sans-serif`;
    ctx.fillStyle = selectedColor;
    ctx.fillText(textInput.trim(), textPos.x, textPos.y);

    setShowTextInput(false);
    setTextInput('');
    saveToHistory();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
      {/* Canvas Toolbar */}
      <div className="p-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
        {/* Tool Selectors */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-semibold ${
              activeTool === 'pen' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Serbest Kalem"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-semibold ${
              activeTool === 'eraser' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Silgi"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-300 mx-0.5" />
          <button
            type="button"
            onClick={() => setActiveTool('rectangle')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              activeTool === 'rectangle' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Dikdörtgen"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('circle')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              activeTool === 'circle' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Daire"
          >
            <CircleIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('line')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              activeTool === 'line' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Düz Çizgi"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('text')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              activeTool === 'text' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Metin Ekle"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={`w-5 h-5 rounded-full border border-black/10 transition-transform cursor-pointer ${
                  selectedColor === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-1' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <label className="relative flex items-center justify-center p-1 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer text-slate-700" title="Özel Renk Seç">
            <Palette className="w-4 h-4" />
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </label>
        </div>

        {/* Stroke Width Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[2, 4, 8, 14].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setStrokeWidth(w)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                strokeWidth === w ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {w === 2 ? 'İnce' : w === 4 ? 'Orta' : w === 8 ? 'Kalın' : 'Çok Kalın'}
            </button>
          ))}
        </div>

        {/* Actions: Undo & Clear */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors cursor-pointer"
            title="Geri Al"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Tuvali Temizle"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 bg-white flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          className={`w-full h-full ${
            activeTool === 'pen'
              ? 'cursor-crosshair'
              : activeTool === 'eraser'
              ? 'cursor-cell'
              : activeTool === 'text'
              ? 'cursor-text'
              : 'cursor-crosshair'
          }`}
        />

        {/* Text Input Overlay Popup */}
        {showTextInput && textPos && (
          <div
            className="absolute z-20 bg-white p-2 border border-indigo-400 rounded-xl shadow-xl flex items-center gap-1.5 animate-in fade-in duration-100"
            style={{ left: Math.min(textPos.x, 380), top: Math.min(textPos.y, 280) }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddText();
                if (e.key === 'Escape') setShowTextInput(false);
              }}
              autoFocus
              placeholder="Metin yazın..."
              className="px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-semibold"
            />
            <button
              type="button"
              onClick={handleAddText}
              className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
              title="Metni Ekle"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="px-3 py-1 bg-slate-100 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
        <span>🎨 Tuval Modu: Kalem, Silgi, Şekiller & Metin kullanın.</span>
        <span>Çizimler otomatik olarak nota eklenir.</span>
      </div>
    </div>
  );
};
