import React, { useRef, useEffect, useState } from 'react';
import {
  PenTool,
  FileCode,
  Eraser,
  Trash2,
  Copy,
  Check,
  X,
  Sparkles,
  Download
} from 'lucide-react';

interface CollaborativeBoardProps {
  isOpen: boolean;
  onClose: () => void;
  onDraw: (data: DrawStroke) => void;
  onNotesChange: (notes: string) => void;
  initialStrokes?: DrawStroke[];
  remoteStroke: DrawStroke | null;
  remoteNotes: string | null;
  currentUser: { name: string };
  roomTitle: string;
}

export interface DrawStroke {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  size: number;
  isClear?: boolean;
}

const COLORS = ['#10b981', '#38bdf8', '#a855f7', '#f59e0b', '#ef4444', '#ffffff'];

export const CollaborativeBoard: React.FC<CollaborativeBoardProps> = ({
  isOpen,
  onClose,
  onDraw,
  onNotesChange,
  initialStrokes = [],
  remoteStroke,
  remoteNotes,
  currentUser,
  roomTitle,
}) => {
  const [activeTab, setActiveTab] = useState<'whiteboard' | 'notes'>('whiteboard');

  // Whiteboard states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesHistory = useRef<DrawStroke[]>([...initialStrokes]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#10b981');
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const prevPos = useRef<{ x: number; y: number } | null>(null);

  // Sync initialStrokes when received from room initialization
  useEffect(() => {
    if (initialStrokes && initialStrokes.length > 0 && strokesHistory.current.length === 0) {
      strokesHistory.current = [...initialStrokes];
      redrawCanvas();
    }
  }, [initialStrokes]);

  // Notes state
  const [notes, setNotes] = useState<string>(
    `# Technical Interview: ${roomTitle}\nParticipant: ${currentUser.name}\nDate: ${new Date().toLocaleDateString()}\n\n## 1. System Architecture / Algorithmic Plan\n- Key Components:\n- Data Flow & Constraints:\n\n## 2. Live Implementation Snippet\nfunction executeWorkflow() {\n  // Code collaboratively here in real time\n}\n`
  );
  const [copied, setCopied] = useState(false);

  // Update notes if remote peer typed
  useEffect(() => {
    if (remoteNotes !== null) {
      setNotes(remoteNotes);
    }
  }, [remoteNotes]);

  // Redraw full stroke history on canvas
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokesHistory.current) {
      if (s.isClear) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.beginPath();
        ctx.moveTo(s.x0 * canvas.width, s.y0 * canvas.height);
        ctx.lineTo(s.x1 * canvas.width, s.y1 * canvas.height);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
  };

  // Handle remote drawing strokes directly on canvas
  useEffect(() => {
    if (!remoteStroke) return;

    if (remoteStroke.isClear) {
      strokesHistory.current = [];
    } else {
      strokesHistory.current.push(remoteStroke);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (remoteStroke.isClear) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(remoteStroke.x0 * canvas.width, remoteStroke.y0 * canvas.height);
    ctx.lineTo(remoteStroke.x1 * canvas.width, remoteStroke.y1 * canvas.height);
    ctx.strokeStyle = remoteStroke.color;
    ctx.lineWidth = remoteStroke.size;
    ctx.lineCap = 'round';
    ctx.stroke();
  }, [remoteStroke]);

  // Setup canvas resolution and immediately redraw existing strokes
  useEffect(() => {
    if (activeTab === 'whiteboard' && isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        redrawCanvas();
      }
    }
  }, [activeTab, isOpen]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    prevPos.current = getCanvasCoords(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !prevPos.current || !canvasRef.current) return;

    const currentPos = getCanvasCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const strokeColor = isEraser ? '#0f172a' : color;
    const strokeWidth = isEraser ? brushSize * 4 : brushSize;

    ctx.beginPath();
    ctx.moveTo(prevPos.current.x * canvas.width, prevPos.current.y * canvas.height);
    ctx.lineTo(currentPos.x * canvas.width, currentPos.y * canvas.height);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    const newStroke: DrawStroke = {
      x0: prevPos.current.x,
      y0: prevPos.current.y,
      x1: currentPos.x,
      y1: currentPos.y,
      color: strokeColor,
      size: strokeWidth,
    };

    strokesHistory.current.push(newStroke);

    // Broadcast stroke to remote participant
    onDraw(newStroke);

    prevPos.current = currentPos;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    prevPos.current = null;
  };

  const clearCanvas = () => {
    strokesHistory.current = [];
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      onDraw({ x0: 0, y0: 0, x1: 0, y1: 0, color: '#000', size: 0, isClear: true });
    }
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    onNotesChange(val);
  };

  const handleCopyNotes = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 sm:w-[480px] h-full bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between shadow-2xl z-30 animate-in slide-in-from-right duration-200">
      {/* Top Header & Tab Switcher */}
      <div className="pb-3 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Collaborative Workspace</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/50 text-xs">
          <button
            onClick={() => setActiveTab('whiteboard')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'whiteboard'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Whiteboard</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'notes'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Live Notes / Code</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 my-3 overflow-hidden flex flex-col">
        {/* WHITEBOARD TAB */}
        {activeTab === 'whiteboard' && (
          <div className="flex-1 flex flex-col space-y-3">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-950/70 rounded-xl border border-slate-800">
              {/* Colors */}
              <div className="flex items-center gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      setIsEraser(false);
                    }}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      color === c && !isEraser
                        ? 'border-white scale-110 shadow-sm'
                        : 'border-transparent hover:scale-105'
                    }`}
                  />
                ))}
              </div>

              {/* Stroke Size & Tools */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEraser(!isEraser)}
                  className={`p-1.5 rounded-lg transition-colors text-xs ${
                    isEraser
                      ? 'bg-amber-500 text-white'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                  title="Eraser"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={clearCanvas}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-800 transition-colors"
                  title="Clear Whiteboard"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative shadow-inner cursor-crosshair">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-full block"
              />
              <div className="pointer-events-none absolute bottom-2 right-2 text-[9px] font-mono text-slate-500 uppercase">
                Real-Time Synced Canvas
              </div>
            </div>
          </div>
        )}

        {/* SHARED NOTES / LIVE CODE TAB */}
        {activeTab === 'notes' && (
          <div className="flex-1 flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Synchronized Technical Pad</span>
              <button
                onClick={handleCopyNotes}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy All'}</span>
              </button>
            </div>

            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-emerald-300 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed shadow-inner"
              placeholder="// Type shared technical thoughts, code snippets, or system requirements..."
            />
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
        <span>WebRTC & Socket Data Sync</span>
        <span className="text-emerald-400 font-bold">● Active Session</span>
      </div>
    </div>
  );
};
