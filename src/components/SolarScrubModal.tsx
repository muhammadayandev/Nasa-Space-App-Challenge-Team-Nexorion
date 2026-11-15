import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Sparkles, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface SolarScrubModalProps {
  initialDust: number;
  onCompleteClean: () => void;
  onClose: () => void;
}

const GRID_COLS = 14;
const GRID_ROWS = 7;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;
const TARGET_CLEAN_PCT = 95;

export const SolarScrubModal: React.FC<SolarScrubModalProps> = ({
  initialDust,
  onCompleteClean,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dustOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const cleanedCellsRef = useRef<Uint8Array>(new Uint8Array(TOTAL_CELLS));
  const isDraggingRef = useRef<boolean>(false);
  const lastSoundTimeRef = useRef<number>(0);
  const completedRef = useRef<boolean>(false);

  const [cleanPct, setCleanPct] = useState<number>(0);
  const [done, setDone] = useState<boolean>(false);
  const [brushPos, setBrushPos] = useState<{ x: number; y: number } | null>(null);

  const drawPanelScene = useCallback(() => {
    const canvas = canvasRef.current;
    const dustCanvas = dustOverlayRef.current;
    if (!canvas || !dustCanvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // 1. Dark metallic photovoltaic frame & blue solar cells underneath
    ctx.fillStyle = '#0c1528';
    ctx.fillRect(0, 0, w, h);

    const pad = 12;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;
    const cellW = innerW / 7;
    const cellH = innerH / 3;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 7; c++) {
        const cx = pad + c * cellW;
        const cy = pad + r * cellH;
        const grad = ctx.createLinearGradient(cx, cy, cx + cellW, cy + cellH);
        grad.addColorStop(0, '#0c3b7a');
        grad.addColorStop(0.5, '#1357ad');
        grad.addColorStop(1, '#0b2d63');
        ctx.fillStyle = grad;
        ctx.fillRect(cx + 2, cy + 2, cellW - 4, cellH - 4);

        // Fine silver finger busbars across each cell
        ctx.strokeStyle = 'rgba(148, 210, 255, 0.36)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + cellW * 0.5, cy + 3);
        ctx.lineTo(cx + cellW * 0.5, cy + cellH - 3);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(186, 230, 253, 0.2)';
        for (let b = 1; b <= 3; b++) {
          ctx.beginPath();
          ctx.moveTo(cx + 3, cy + (cellH * b) / 4);
          ctx.lineTo(cx + cellW - 3, cy + (cellH * b) / 4);
          ctx.stroke();
        }
      }
    }

    // 2. Red Mars dust layer on top (erased as player drags mouse!)
    ctx.drawImage(dustCanvas, 0, 0);
  }, []);

  // Initialize offscreen Mars dust layer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = w;
    dustCanvas.height = h;
    const dctx = dustCanvas.getContext('2d');
    if (!dctx) return;

    // Base rusty Martian dust coating
    const opacity = Math.max(0.75, Math.min(0.97, initialDust / 100 + 0.25));
    const grad = dctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, `rgba(176, 82, 44, ${opacity})`);
    grad.addColorStop(0.5, `rgba(150, 66, 33, ${opacity})`);
    grad.addColorStop(1, `rgba(186, 92, 48, ${opacity})`);
    dctx.fillStyle = grad;
    dctx.fillRect(0, 0, w, h);

    // Textured wind-blown Martian silt streaks & grit
    for (let i = 0; i < 650; i++) {
      const rx = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const ry = (Math.sin(i * 78.233) * 28471.331) % 1;
      const rr = (Math.sin(i * 41.71) * 19831.11) % 1;
      const x = Math.abs(rx) * w;
      const y = Math.abs(ry) * h;
      const size = 2 + Math.abs(rr) * 14;
      dctx.fillStyle = i % 2 === 0 ? 'rgba(116, 46, 22, 0.45)' : 'rgba(222, 134, 86, 0.35)';
      dctx.beginPath();
      dctx.ellipse(x, y, size * 1.4, size * 0.65, 0.28, 0, Math.PI * 2);
      dctx.fill();
    }

    dustOverlayRef.current = dustCanvas;
    cleanedCellsRef.current.fill(0);
    completedRef.current = false;
    drawPanelScene();
  }, [initialDust, drawPanelScene]);

  const scrubAt = useCallback(
    (clientX: number, clientY: number) => {
      if (completedRef.current) return;
      const canvas = canvasRef.current;
      const dustCanvas = dustOverlayRef.current;
      if (!canvas || !dustCanvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * canvas.width;
      const y = ((clientY - rect.top) / rect.height) * canvas.height;
      setBrushPos({
        x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
        y: Math.max(0, Math.min(rect.height, clientY - rect.top)),
      });

      const dctx = dustCanvas.getContext('2d');
      if (!dctx) return;

      const brushRadius = 32;
      dctx.save();
      dctx.globalCompositeOperation = 'destination-out';
      const eraseGrad = dctx.createRadialGradient(x, y, brushRadius * 0.25, x, y, brushRadius);
      eraseGrad.addColorStop(0, 'rgba(0,0,0,1)');
      eraseGrad.addColorStop(0.75, 'rgba(0,0,0,0.92)');
      eraseGrad.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = eraseGrad;
      dctx.beginPath();
      dctx.arc(x, y, brushRadius, 0, Math.PI * 2);
      dctx.fill();
      dctx.restore();

      // Update cleaned coverage cells inside brush radius
      const cells = cleanedCellsRef.current;
      const cellW = canvas.width / GRID_COLS;
      const cellH = canvas.height / GRID_ROWS;
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const cx = (c + 0.5) * cellW;
          const cy = (r + 0.5) * cellH;
          if (Math.hypot(cx - x, cy - y) <= brushRadius * 0.96) {
            cells[r * GRID_COLS + c] = 1;
          }
        }
      }

      let cleanCount = 0;
      for (let i = 0; i < TOTAL_CELLS; i++) {
        cleanCount += cells[i];
      }
      const nextPct = Math.round((cleanCount / TOTAL_CELLS) * 100);
      setCleanPct(nextPct);
      drawPanelScene();

      // Subtle brush feedback sound throttled cleanly
      const now = performance.now();
      if (now - lastSoundTimeRef.current > 150) {
        lastSoundTimeRef.current = now;
        soundEngine.playClick(540 + nextPct * 3);
      }

      if (nextPct >= TARGET_CLEAN_PCT && !completedRef.current) {
        completedRef.current = true;
        setCleanPct(100);
        setDone(true);
        dctx.clearRect(0, 0, dustCanvas.width, dustCanvas.height);
        drawPanelScene();
        soundEngine.playSuccess();
        window.setTimeout(() => {
          onCompleteClean();
        }, 420);
      }
    },
    [drawPanelScene, onCompleteClean]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="solar-scrub-title"
    >
      <div className="w-full max-w-xl rounded-3xl border-4 border-amber-400 bg-[#081020] p-5 sm:p-6 shadow-2xl animate-[popupSlideUp_0.22s_ease-out]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
              12-Panel Solar Farm Maintenance
            </p>
            <h2
              id="solar-scrub-title"
              className="mt-0.5 font-display text-xl sm:text-2xl font-extrabold text-white"
            >
              Clean Mars Dust Off Solar Panels
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel Cleaning"
            className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:border-white hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-xs sm:text-sm font-medium text-slate-300">
          Hold click and drag your mouse back and forth across the solar panel window until all dust is removed!
        </p>

        {/* Cleanliness Progress Bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800 border border-slate-700">
            <div
              className={`h-full transition-all duration-150 ${
                done ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              style={{ width: `${cleanPct}%` }}
            />
          </div>
          <span className="w-16 text-right font-mono-tabular text-sm font-extrabold text-amber-300">
            {cleanPct}%
          </span>
        </div>

        {/* Interactive Rectangular Solar Panel Window */}
        <div className="relative mt-4 overflow-hidden rounded-2xl border-2 border-sky-400/60 shadow-inner select-none touch-none">
          <canvas
            ref={canvasRef}
            width={520}
            height={250}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              isDraggingRef.current = true;
              scrubAt(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (isDraggingRef.current || e.buttons === 1) {
                scrubAt(e.clientX, e.clientY);
              }
            }}
            onPointerUp={() => {
              isDraggingRef.current = false;
            }}
            onPointerCancel={() => {
              isDraggingRef.current = false;
            }}
            className="block h-56 sm:h-64 w-full cursor-grab active:cursor-grabbing"
          />

          {brushPos && !done && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300 bg-cyan-400/20 shadow-[0_0_16px_rgba(34,211,238,0.45)]"
              style={{ left: brushPos.x, top: brushPos.y, width: 46, height: 46 }}
            />
          )}

          {done && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/60 backdrop-blur-[2px]">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 animate-bounce" />
              <p className="mt-2 inline-flex items-center gap-1.5 font-display text-xl font-extrabold text-white">
                <Sparkles className="h-5 w-5 text-amber-300" />
                <span>Solar Panels Clean! Power Restored!</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
