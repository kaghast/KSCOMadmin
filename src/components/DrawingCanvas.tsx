import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  MousePointer,
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
  Move,
  PaintBucket,
} from 'lucide-react';

export type ToolType = 'select' | 'pen' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'text';

export interface DrawingElement {
  id: string;
  type: 'pen' | 'rectangle' | 'circle' | 'line' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string; // 'transparent' or hex
  strokeWidth: number;
  text?: string;
  points?: { x: number; y: number }[]; // Relative to (x, y)
}

interface Props {
  initialDataUrl?: string;
  initialElements?: DrawingElement[];
  onChange: (dataUrl: string, elements: DrawingElement[]) => void;
}

const PRESET_COLORS = [
  '#000000', // Siyah
  '#4f46e5', // İndigo
  '#dc2626', // Kırmızı
  '#2563eb', // Mavi
  '#16a34a', // Yeşil
  '#d97706', // Turuncu
  '#9333ea', // Mor
  '#ffffff', // Beyaz
];

export const getElementBounds = (elem: DrawingElement) => {
  if (elem.type === 'pen' && elem.points && elem.points.length > 0) {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    elem.points.forEach((p) => {
      const px = elem.x + p.x;
      const py = elem.y + p.y;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    });
    const w = Math.max(10, maxX - minX);
    const h = Math.max(10, maxY - minY);
    return { x: minX, y: minY, width: w, height: h };
  }

  const x1 = Math.min(elem.x, elem.x + elem.width);
  const y1 = Math.min(elem.y, elem.y + elem.height);
  const w = Math.max(10, Math.abs(elem.width));
  const h = Math.max(10, Math.abs(elem.height));
  return { x: x1, y: y1, width: w, height: h };
};

export const DrawingCanvas: React.FC<Props> = ({
  initialDataUrl,
  initialElements,
  onChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const lastExportedUrlRef = useRef<string | null>(null);

  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [fillColor, setFillColor] = useState<string>('transparent');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);

  // Vector Elements List & Selection
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const elementsRef = useRef<DrawingElement[]>(elements);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  // Undo History
  const [history, setHistory] = useState<DrawingElement[][]>([[]]);

  // Interaction State
  const [isInteracting, setIsInteracting] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'drawing' | 'moving' | 'resizing' | null>(
    null
  );
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);

  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialElemState, setInitialElemState] = useState<DrawingElement | null>(null);

  // Text Tool State
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);

  // Current element being drawn
  const currentDrawingElemRef = useRef<DrawingElement | null>(null);

  // Load Initial Data or Vector Elements
  useEffect(() => {
    if (initialElements && Array.isArray(initialElements) && initialElements.length > 0) {
      setElements(initialElements);
      setHistory([initialElements]);
      bgImgRef.current = null;
      return;
    }

    if (!initialDataUrl) {
      return;
    }

    // Ignore if initialDataUrl is the exact same URL exported by this component
    if (initialDataUrl === lastExportedUrlRef.current) {
      return;
    }

    if (initialDataUrl.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        bgImgRef.current = img;
        redrawCanvas();
      };
      img.src = initialDataUrl;
    }
  }, [initialDataUrl, initialElements]);

  // Save history state and trigger onChange
  const pushHistory = (newElements: DrawingElement[]) => {
    setHistory((prev) => [...prev.slice(-20), newElements]);
    setElements(newElements);
    triggerCanvasExport(newElements);
  };

  const triggerCanvasExport = (elemsToRender: DrawingElement[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create an offscreen canvas to export clean PNG without removing selection outline from screen
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width || 600;
    offscreen.height = canvas.height || 360;
    renderAll(offscreen, elemsToRender, null);

    const dataUrl = offscreen.toDataURL('image/png');
    lastExportedUrlRef.current = dataUrl;
    onChange(dataUrl, elemsToRender);

    // Keep active canvas rendered with active selection highlight
    renderAll(canvas, elemsToRender, selectedElementId);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const newHistory = history.slice(0, history.length - 1);
    const lastElements = newHistory[newHistory.length - 1];
    setHistory(newHistory);
    setElements(lastElements);
    setSelectedElementId(null);
    triggerCanvasExport(lastElements);
  };

  const handleClear = () => {
    if (confirm('Tüm çizimleri temizlemek istediğinize emin misiniz?')) {
      pushHistory([]);
      setSelectedElementId(null);
    }
  };

  // Canvas Coordinates Helper
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Render Pipeline
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderAll(canvas, elements, selectedElementId);
  }, [elements, selectedElementId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;

    const updateSize = () => {
      if (!canvas || !parent) return;
      const newW = parent.clientWidth || 600;
      const newH = parent.clientHeight || 360;
      if (canvas.width !== newW || canvas.height !== newH) {
        canvas.width = newW;
        canvas.height = newH;
      }
      redrawCanvas();
    };

    updateSize();

    if (parent && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => updateSize());
      ro.observe(parent);
      return () => ro.disconnect();
    }
  }, [redrawCanvas]);

  const renderAll = (
    canvas: HTMLCanvasElement,
    elems: DrawingElement[],
    selectedId: string | null
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background image if loaded
    if (bgImgRef.current) {
      ctx.drawImage(bgImgRef.current, 0, 0, canvas.width, canvas.height);
    }

    // Render each element
    elems.forEach((elem) => {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (elem.type === 'pen' && elem.points && elem.points.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = elem.strokeColor;
        ctx.lineWidth = elem.strokeWidth;

        const firstPt = elem.points[0];
        ctx.moveTo(elem.x + firstPt.x, elem.y + firstPt.y);

        for (let i = 1; i < elem.points.length; i++) {
          const pt = elem.points[i];
          ctx.lineTo(elem.x + pt.x, elem.y + pt.y);
        }
        ctx.stroke();
      } else if (elem.type === 'rectangle') {
        if (elem.fillColor && elem.fillColor !== 'transparent') {
          ctx.fillStyle = elem.fillColor;
          ctx.fillRect(elem.x, elem.y, elem.width, elem.height);
        }
        ctx.strokeStyle = elem.strokeColor;
        ctx.lineWidth = elem.strokeWidth;
        ctx.strokeRect(elem.x, elem.y, elem.width, elem.height);
      } else if (elem.type === 'circle') {
        ctx.beginPath();
        const rx = Math.max(1, Math.abs(elem.width) / 2);
        const ry = Math.max(1, Math.abs(elem.height) / 2);
        const cx = elem.x + elem.width / 2;
        const cy = elem.y + elem.height / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);

        if (elem.fillColor && elem.fillColor !== 'transparent') {
          ctx.fillStyle = elem.fillColor;
          ctx.fill();
        }
        ctx.strokeStyle = elem.strokeColor;
        ctx.lineWidth = elem.strokeWidth;
        ctx.stroke();
      } else if (elem.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(elem.x, elem.y);
        ctx.lineTo(elem.x + elem.width, elem.y + elem.height);
        ctx.strokeStyle = elem.strokeColor;
        ctx.lineWidth = elem.strokeWidth;
        ctx.stroke();
      } else if (elem.type === 'text' && elem.text) {
        const fontSize = Math.max(12, elem.strokeWidth * 4 + 10);
        ctx.font = `bold ${fontSize}px sans-serif`;
        if (elem.fillColor && elem.fillColor !== 'transparent') {
          ctx.fillStyle = elem.fillColor;
          ctx.fillText(elem.text, elem.x, elem.y + fontSize);
        }
        ctx.fillStyle = elem.strokeColor;
        ctx.fillText(elem.text, elem.x, elem.y + fontSize);
      }
      ctx.restore();
    });

    // Render High-Contrast Selection Outline & Resize Handles if selectedId exists
    if (selectedId) {
      const target = elems.find((e) => e.id === selectedId);
      if (target) {
        const bounds = getElementBounds(target);
        const pad = Math.max(6, target.strokeWidth / 2 + 3);
        const x1 = bounds.x - pad;
        const y1 = bounds.y - pad;
        const w = bounds.width + pad * 2;
        const h = bounds.height + pad * 2;

        ctx.save();

        // 1. Light translucent accent fill over the selected element bounds
        ctx.fillStyle = 'rgba(79, 70, 229, 0.08)';
        ctx.fillRect(x1, y1, w, h);

        // 2. White outer stroke for high contrast on dark backgrounds
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([]);
        ctx.strokeRect(x1, y1, w, h);

        // 3. Vibrant Indigo dashed main selection border
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x1, y1, w, h);
        ctx.restore();

        // 4. Render Floating Selection Badge / Label Chip above top-left
        ctx.save();
        const typeLabels: Record<string, string> = {
          pen: 'Serbest Çizim',
          rectangle: 'Dikdörtgen',
          circle: 'Daire',
          line: 'Çizgi',
          text: 'Metin',
        };
        const badgeText = `✓ Seçili: ${typeLabels[target.type] || target.type}`;
        ctx.font = 'bold 10px sans-serif';
        const badgeW = ctx.measureText(badgeText).width + 12;
        const badgeH = 18;
        const badgeX = x1;
        const badgeY = Math.max(2, y1 - badgeH - 4);

        // Badge Background
        ctx.fillStyle = '#4f46e5';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fill();

        // Badge Text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(badgeText, badgeX + 6, badgeY + 12);
        ctx.restore();

        // 5. Render Corner & Midpoint Handles
        const handles = [
          { x: x1, y: y1 }, // nw
          { x: x1 + w / 2, y: y1 }, // n
          { x: x1 + w, y: y1 }, // ne
          { x: x1, y: y1 + h / 2 }, // w
          { x: x1 + w, y: y1 + h / 2 }, // e
          { x: x1, y: y1 + h }, // sw
          { x: x1 + w / 2, y: y1 + h }, // s
          { x: x1 + w, y: y1 + h }, // se
        ];

        handles.forEach((hPos) => {
          ctx.save();
          // White fill
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#3730a3';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(hPos.x, hPos.y, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
      }
    }
  };

  // Helper to check handle hit
  const getHitHandle = (
    target: DrawingElement,
    x: number,
    y: number
  ): 'nw' | 'ne' | 'sw' | 'se' | null => {
    const bounds = getElementBounds(target);
    const pad = Math.max(6, target.strokeWidth / 2 + 3);
    const x1 = bounds.x - pad;
    const y1 = bounds.y - pad;
    const w = bounds.width + pad * 2;
    const h = bounds.height + pad * 2;

    const handles: { handle: 'nw' | 'ne' | 'sw' | 'se'; hx: number; hy: number }[] = [
      { handle: 'nw', hx: x1, hy: y1 },
      { handle: 'ne', hx: x1 + w, hy: y1 },
      { handle: 'sw', hx: x1, hy: y1 + h },
      { handle: 'se', hx: x1 + w, hy: y1 + h },
    ];

    for (const hPos of handles) {
      if (Math.abs(x - hPos.hx) <= 8 && Math.abs(y - hPos.hy) <= 8) {
        return hPos.handle;
      }
    }
    return null;
  };

  // Helper to check element hit
  const isPointInElement = (target: DrawingElement, x: number, y: number): boolean => {
    const bounds = getElementBounds(target);
    const pad = Math.max(8, target.strokeWidth);

    return (
      x >= bounds.x - pad &&
      x <= bounds.x + bounds.width + pad &&
      y >= bounds.y - pad &&
      y <= bounds.y + bounds.height + pad
    );
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCoordinates(e);

    if (activeTool === 'text') {
      setTextPos({ x, y });
      setShowTextInput(true);
      setTextInput('');
      return;
    }

    if (activeTool === 'select') {
      // Check if clicking resize handle on selected element first
      if (selectedElementId) {
        const target = elements.find((e) => e.id === selectedElementId);
        if (target) {
          const handle = getHitHandle(target, x, y);
          if (handle) {
            setIsInteracting(true);
            setInteractionMode('resizing');
            setResizeHandle(handle);
            setStartPos({ x, y });
            setInitialElemState({ ...target });
            return;
          }
        }
      }

      // Check if clicking any element (from top to bottom)
      for (let i = elements.length - 1; i >= 0; i--) {
        const elem = elements[i];
        if (isPointInElement(elem, x, y)) {
          setSelectedElementId(elem.id);
          setIsInteracting(true);
          setInteractionMode('moving');
          setStartPos({ x, y });
          setDragOffset({ x: x - elem.x, y: y - elem.y });
          setInitialElemState({ ...elem });

          // Update current palette to match selected element's properties
          setSelectedColor(elem.strokeColor);
          if (elem.fillColor) setFillColor(elem.fillColor);
          if (elem.strokeWidth) setStrokeWidth(elem.strokeWidth);
          return;
        }
      }

      // Clicked on empty space -> Deselect
      setSelectedElementId(null);
      return;
    }

    if (activeTool === 'eraser') {
      // Erase clicked element
      for (let i = elements.length - 1; i >= 0; i--) {
        if (isPointInElement(elements[i], x, y)) {
          const updated = elements.filter((_, idx) => idx !== i);
          pushHistory(updated);
          if (selectedElementId === elements[i].id) setSelectedElementId(null);
          return;
        }
      }
      return;
    }

    // Creating new element ('pen', 'rectangle', 'circle', 'line')
    setIsInteracting(true);
    setInteractionMode('drawing');
    setStartPos({ x, y });

    const newId = `elem_${Date.now()}`;
    const newElem: DrawingElement = {
      id: newId,
      type: activeTool,
      x,
      y,
      width: 1,
      height: 1,
      strokeColor: selectedColor,
      fillColor: activeTool === 'pen' ? 'transparent' : fillColor,
      strokeWidth,
      points: activeTool === 'pen' ? [{ x: 0, y: 0 }] : undefined,
    };

    currentDrawingElemRef.current = newElem;
    setElements((prev) => [...prev, newElem]);
    setSelectedElementId(newId);
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isInteracting) return;
    const { x, y } = getCoordinates(e);

    if (interactionMode === 'moving' && selectedElementId && initialElemState) {
      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;

      setElements((prev) =>
        prev.map((elem) => (elem.id === selectedElementId ? { ...elem, x: newX, y: newY } : elem))
      );
    } else if (interactionMode === 'resizing' && selectedElementId && initialElemState && resizeHandle) {
      const dx = x - startPos.x;
      const dy = y - startPos.y;

      setElements((prev) =>
        prev.map((elem) => {
          if (elem.id !== selectedElementId) return elem;

          let newX = initialElemState.x;
          let newY = initialElemState.y;
          let newW = initialElemState.width;
          let newH = initialElemState.height;

          if (resizeHandle === 'se') {
            newW = Math.max(10, initialElemState.width + dx);
            newH = Math.max(10, initialElemState.height + dy);
          } else if (resizeHandle === 'sw') {
            const rawW = initialElemState.width - dx;
            if (rawW >= 10) {
              newX = initialElemState.x + dx;
              newW = rawW;
            }
            newH = Math.max(10, initialElemState.height + dy);
          } else if (resizeHandle === 'ne') {
            newW = Math.max(10, initialElemState.width + dx);
            const rawH = initialElemState.height - dy;
            if (rawH >= 10) {
              newY = initialElemState.y + dy;
              newH = rawH;
            }
          } else if (resizeHandle === 'nw') {
            const rawW = initialElemState.width - dx;
            if (rawW >= 10) {
              newX = initialElemState.x + dx;
              newW = rawW;
            }
            const rawH = initialElemState.height - dy;
            if (rawH >= 10) {
              newY = initialElemState.y + dy;
              newH = rawH;
            }
          }

          return { ...elem, x: newX, y: newY, width: newW, height: newH };
        })
      );
    } else if (interactionMode === 'drawing' && currentDrawingElemRef.current) {
      const curElem = currentDrawingElemRef.current;

      if (curElem.type === 'pen') {
        const relX = x - curElem.x;
        const relY = y - curElem.y;
        const newPoints = [...(curElem.points || []), { x: relX, y: relY }];

        let minPx = 0,
          maxPx = 0,
          minPy = 0,
          maxPy = 0;
        newPoints.forEach((p) => {
          if (p.x < minPx) minPx = p.x;
          if (p.x > maxPx) maxPx = p.x;
          if (p.y < minPy) minPy = p.y;
          if (p.y > maxPy) maxPy = p.y;
        });

        const updatedPen: DrawingElement = {
          ...curElem,
          width: Math.max(10, maxPx - minPx),
          height: Math.max(10, maxPy - minPy),
          points: newPoints,
        };
        currentDrawingElemRef.current = updatedPen;

        setElements((prev) =>
          prev.map((e) => (e.id === curElem.id ? updatedPen : e))
        );
      } else {
        const w = x - startPos.x;
        const h = y - startPos.y;

        const updatedShape: DrawingElement = {
          ...curElem,
          width: w,
          height: h,
        };
        currentDrawingElemRef.current = updatedShape;

        setElements((prev) =>
          prev.map((e) => (e.id === curElem.id ? updatedShape : e))
        );
      }
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    if (isInteracting) {
      setIsInteracting(false);
      setInteractionMode(null);
      setResizeHandle(null);
      currentDrawingElemRef.current = null;
      setInitialElemState(null);

      const latestElements = elementsRef.current;
      pushHistory(latestElements);
    }
  };

  // Text Add Handler
  const handleAddText = () => {
    if (!textInput.trim() || !textPos) {
      setShowTextInput(false);
      return;
    }

    const newId = `elem_${Date.now()}`;
    const fontSize = Math.max(12, strokeWidth * 4 + 10);

    const canvas = canvasRef.current;
    let approxWidth = textInput.trim().length * (fontSize * 0.6);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = `bold ${fontSize}px sans-serif`;
        approxWidth = ctx.measureText(textInput.trim()).width;
      }
    }

    const textElem: DrawingElement = {
      id: newId,
      type: 'text',
      x: textPos.x,
      y: textPos.y,
      width: Math.max(20, approxWidth),
      height: fontSize + 6,
      strokeColor: selectedColor,
      fillColor: fillColor,
      strokeWidth,
      text: textInput.trim(),
    };

    const updated = [...elements, textElem];
    pushHistory(updated);
    setSelectedElementId(newId);

    setShowTextInput(false);
    setTextInput('');
  };

  // Update selected element property directly
  const updateSelectedElementProp = (patch: Partial<DrawingElement>) => {
    if (!selectedElementId) return;

    const updated = elements.map((elem) =>
      elem.id === selectedElementId ? { ...elem, ...patch } : elem
    );
    pushHistory(updated);
  };

  // Delete Selected Element
  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    const updated = elements.filter((e) => e.id !== selectedElementId);
    pushHistory(updated);
    setSelectedElementId(null);
  };

  const selectedElement = elements.find((e) => e.id === selectedElementId);

  return (
    <div className="flex flex-col h-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
      {/* Primary Toolbar */}
      <div className="p-2 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
        {/* Main Tools */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {/* Taşı / Seçim Aracı */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('select');
            }}
            className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-semibold ${
              activeTool === 'select'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Taşı & Seç (Öğeleri sürükle, boyutlandır)"
          >
            <Move className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px]">Taşı & Seç</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-300 mx-0.5" />

          <button
            type="button"
            onClick={() => {
              setActiveTool('pen');
            }}
            className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-semibold ${
              activeTool === 'pen'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Serbest Kalem"
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('eraser');
            }}
            className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-semibold ${
              activeTool === 'eraser'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Silgi (Öğelere tıkla)"
          >
            <Eraser className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-300 mx-0.5" />

          <button
            type="button"
            onClick={() => {
              setActiveTool('rectangle');
            }}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              activeTool === 'rectangle'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Dikdörtgen"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('circle');
            }}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              activeTool === 'circle'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Daire"
          >
            <CircleIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('line');
            }}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              activeTool === 'line'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Düz Çizgi"
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('text');
            }}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              activeTool === 'text'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Metin Ekle"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>

        {/* Color Controls */}
        <div className="flex items-center gap-2">
          {/* Stroke Color */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl" title="Çizgi Rengi">
            <span className="text-[10px] text-slate-500 font-bold px-1 hidden md:inline">
              Çizgi:
            </span>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setSelectedColor(c);
                  if (selectedElement) updateSelectedElementProp({ strokeColor: c });
                }}
                className={`w-4 h-4 rounded-full border border-black/10 transition-transform cursor-pointer ${
                  selectedColor === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-1' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <label
              className="relative flex items-center justify-center p-0.5 rounded-lg bg-slate-200 hover:bg-slate-300 cursor-pointer text-slate-700"
              title="Özel Çizgi Rengi"
            >
              <Palette className="w-3.5 h-3.5" />
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedColor(val);
                  if (selectedElement) updateSelectedElementProp({ strokeColor: val });
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>

          {/* Fill Color */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl" title="Dolgu Rengi">
            <span className="text-[10px] text-slate-500 font-bold px-1 hidden md:inline">
              Dolgu:
            </span>
            <button
              type="button"
              onClick={() => {
                setFillColor('transparent');
                if (selectedElement) updateSelectedElementProp({ fillColor: 'transparent' });
              }}
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer ${
                fillColor === 'transparent'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
              title="Şeffaf Dolgu"
            >
              Şeffaf
            </button>
            {PRESET_COLORS.slice(0, 5).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setFillColor(c);
                  if (selectedElement) updateSelectedElementProp({ fillColor: c });
                }}
                className={`w-4 h-4 rounded-full border border-black/10 transition-transform cursor-pointer ${
                  fillColor === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-1' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <label
              className="relative flex items-center justify-center p-0.5 rounded-lg bg-slate-200 hover:bg-slate-300 cursor-pointer text-slate-700"
              title="Özel Dolgu Rengi"
            >
              <PaintBucket className="w-3.5 h-3.5" />
              <input
                type="color"
                value={fillColor === 'transparent' ? '#ffffff' : fillColor}
                onChange={(e) => {
                  const val = e.target.value;
                  setFillColor(val);
                  if (selectedElement) updateSelectedElementProp({ fillColor: val });
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Stroke Width Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[2, 4, 8, 14].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => {
                setStrokeWidth(w);
                if (selectedElement) updateSelectedElementProp({ strokeWidth: w });
              }}
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

      {/* Selected Element Property Inspector Sub-Bar */}
      {selectedElement && (
        <div className="px-3 py-1.5 bg-indigo-50/90 border-b border-indigo-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-950 font-medium animate-in fade-in duration-100">
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-700 flex items-center gap-1">
              <MousePointer className="w-3.5 h-3.5" /> Seçili Öğeyi Düzenle:
            </span>
            <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-md text-[10px] uppercase font-bold">
              {selectedElement.type}
            </span>
          </div>

          {/* Width & Height numeric controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-indigo-800 font-bold">Genişlik (W):</span>
              <input
                type="number"
                min={10}
                max={1200}
                value={Math.round(Math.abs(selectedElement.width))}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 10;
                  const sign = selectedElement.width < 0 ? -1 : 1;
                  updateSelectedElementProp({ width: val * sign });
                }}
                className="w-16 px-1.5 py-0.5 text-xs bg-white border border-indigo-300 rounded-md text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold"
              />
              <span className="text-[10px] text-slate-500">px</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-indigo-800 font-bold">Yükseklik (H):</span>
              <input
                type="number"
                min={10}
                max={1200}
                value={Math.round(Math.abs(selectedElement.height))}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 10;
                  const sign = selectedElement.height < 0 ? -1 : 1;
                  updateSelectedElementProp({ height: val * sign });
                }}
                className="w-16 px-1.5 py-0.5 text-xs bg-white border border-indigo-300 rounded-md text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold"
              />
              <span className="text-[10px] text-slate-500">px</span>
            </div>

            <button
              type="button"
              onClick={handleDeleteSelected}
              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Seçili Öğeyi Sil"
            >
              <Trash2 className="w-3.5 h-3.5" /> Sil
            </button>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div className="relative flex-1 bg-white flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`w-full h-full ${
            activeTool === 'select'
              ? 'cursor-move'
              : activeTool === 'pen'
              ? 'cursor-crosshair'
              : activeTool === 'eraser'
              ? 'cursor-pointer'
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
        <span>
          🖐️ <strong>Taşı & Seç</strong> aracıyla öğeleri sürükleyip boyutlandırabilir, çizgi/dolgu renklerini ve W/H boyutlarını değiştirebilirsiniz.
        </span>
        <span>Çizimler otomatik kaydedilir.</span>
      </div>
    </div>
  );
};
