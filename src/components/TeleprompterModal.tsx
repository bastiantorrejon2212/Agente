import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Play,
  Pause,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Type,
  X,
  Sliders,
  Volume2,
  Clock,
  Eye
} from 'lucide-react';

export const TeleprompterModal: React.FC = () => {
  const { teleprompterScript, setTeleprompterScript } = useApp();

  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const [fontSize, setFontSize] = useState(36);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEyeline, setShowEyeline] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!teleprompterScript) return;
      if (e.key === 'Escape') {
        setTeleprompterScript(null);
      } else if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [teleprompterScript, isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const scrollContainer = containerRef.current;
    if (!scrollContainer) return;

    let lastTime = performance.now();

    const step = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const pixelsPerSecond = scrollSpeed * 28;
      scrollContainer.scrollTop += pixelsPerSecond * delta;

      const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      if (maxScroll > 0) {
        setScrollProgress(Math.min(100, Math.round((scrollContainer.scrollTop / maxScroll) * 100)));
      }

      if (
        scrollContainer.scrollTop + scrollContainer.clientHeight >=
        scrollContainer.scrollHeight - 5
      ) {
        setIsPlaying(false);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, scrollSpeed]);

  if (!teleprompterScript) return null;

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            setIsPlaying(true);
            return null;
          }
          return prev - 1;
        });
      }, 700);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setElapsedSeconds(0);
    setScrollProgress(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  };

  const getTransformClass = () => {
    if (flipH && flipV) return 'flip-both';
    if (flipH) return 'flip-horizontal';
    if (flipV) return 'flip-vertical';
    return '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden animate-fade-in">
      {/* Top Scroll Progress Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-900 z-30">
        <div
          className="h-full bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Central Eyeline Reference Line */}
      {showEyeline && (
        <div className="pointer-events-none absolute top-1/2 left-0 right-0 -translate-y-1/2 z-10 flex items-center justify-between px-8 opacity-40">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 px-3 select-none">
            Nivel de Mirada a Lente
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
        </div>
      )}

      {/* Top Floating Controls Bar */}
      <div className="bg-zinc-950/90 border-b border-zinc-800 px-4 py-3 flex items-center justify-between gap-4 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100 truncate max-w-[180px] md:max-w-md">
              {teleprompterScript.title || 'Teleprompter Pro'}
            </h2>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Espacio: Play/Pausa • Esc: Salir
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Live Elapsed Stopwatch */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className={elapsedSeconds > 50 ? 'text-amber-400' : 'text-zinc-200'}>
              00:{elapsedSeconds < 10 ? '0' : ''}{elapsedSeconds}s
            </span>
          </div>

          {/* Eyeline Guide Toggle */}
          <button
            onClick={() => setShowEyeline(!showEyeline)}
            className={`p-2 rounded-xl border text-xs transition-colors ${
              showEyeline
                ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title="Alternar Guía de Mirada Central (Lente)"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Speed Slider */}
          <div className="hidden sm:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs text-zinc-300">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono">{scrollSpeed.toFixed(1)}x</span>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
              className="w-20 accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Font Size Adjusters */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-xl text-xs">
            <Type className="w-3.5 h-3.5 text-zinc-400 mr-1" />
            <button
              onClick={() => setFontSize((f) => Math.max(20, f - 4))}
              className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold"
            >
              -
            </button>
            <span className="w-6 text-center font-mono text-[11px] text-zinc-300">{fontSize}</span>
            <button
              onClick={() => setFontSize((f) => Math.min(72, f + 4))}
              className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold"
            >
              +
            </button>
          </div>

          {/* Mirror Flip Buttons */}
          <button
            onClick={() => setFlipH(!flipH)}
            className={`p-2 rounded-xl border text-xs transition-colors ${
              flipH
                ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Espejo Horizontal (Cristal Teleprompter)"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={() => setFlipV(!flipV)}
            className={`p-2 rounded-xl border text-xs transition-colors ${
              flipV
                ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Espejo Vertical"
          >
            <FlipVertical className="w-4 h-4" />
          </button>

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors"
            title="Reiniciar al inicio"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Play / Pause Main CTA */}
          <button
            onClick={togglePlay}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="hidden sm:inline">{isPlaying ? 'Pausar' : 'Iniciar'}</span>
          </button>

          {/* Close */}
          <button
            onClick={() => setTeleprompterScript(null)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="text-8xl md:text-9xl font-black text-cyan-400 animate-ping">
            {countdown}
          </div>
        </div>
      )}

      {/* Scrolling Text Viewport */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto px-6 md:px-24 lg:px-48 py-20 scrollbar-none transition-transform duration-200 ${getTransformClass()}`}
        style={{ scrollBehavior: isPlaying ? 'auto' : 'smooth' }}
      >
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Header info */}
          <div className="text-center pb-8 border-b border-zinc-900">
            <span className="text-xs uppercase font-bold tracking-widest text-cyan-400">
              {teleprompterScript.targetDuration}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-100 mt-2">
              {teleprompterScript.title}
            </h1>
            {teleprompterScript.infiniteLoopTrick && (
              <p className="text-xs text-zinc-500 mt-2 max-w-md mx-auto">
                Bucle infinito: {teleprompterScript.infiniteLoopTrick}
              </p>
            )}
          </div>

          {/* Script Blocks */}
          {teleprompterScript.blocks.map((block, idx) => (
            <div
              key={block.id || idx}
              className="p-6 md:p-8 rounded-3xl bg-zinc-950/60 border border-zinc-900 hover:border-zinc-800 transition-all space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-900/80">
                <span className="px-3 py-1 rounded-full bg-violet-600/20 text-violet-400 text-xs font-mono font-bold border border-violet-500/30">
                  {block.timeRange}
                </span>

                <span className="text-xs font-medium text-cyan-400/90 italic">
                  📹 {block.cameraAction}
                </span>
              </div>

              <p
                className="font-bold text-zinc-50 leading-relaxed tracking-wide selection:bg-cyan-500 selection:text-black"
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.45 }}
              >
                {block.spokenText || '(Pausa de respiración / Solo acción física)'}
              </p>

              {block.overlayTextSfx && (
                <div className="pt-2 flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800/80">
                  <span className="text-amber-400 font-bold">⚡ PANTALLA & SFX:</span>
                  <span>{block.overlayTextSfx}</span>
                </div>
              )}
            </div>
          ))}

          <div className="h-64 flex items-center justify-center text-zinc-700 text-sm font-mono">
            — Fin del Guion —
          </div>
        </div>
      </div>
    </div>
  );
};
