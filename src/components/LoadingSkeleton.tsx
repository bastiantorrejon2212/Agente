import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Cpu } from 'lucide-react';

interface LoadingSkeletonProps {
  label?: string;
  sublabel?: string;
}

const PSYCHOLOGICAL_TIPS = [
  'Analizando psicología de retención con Gemini 3.8 Flash...',
  'Calculando puntos de fuga en el segundo 2.5...',
  'Optimizando la Trinidad del Gancho (Visual, Textual, Auditivo)...',
  'Eliminando muletillas e introducciones lentas...',
  'Inyectando Pattern Interrupts cada 3.5 segundos...',
  'Diseñando bucle continuo para reproducción infinita...',
  'Maximizando probabilidad de guardados y compartidos...'
];

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  label = 'Procesando con VibeDirector...',
  sublabel = 'Gemini 3.8 Flash está ejecutando razonamiento profundo...'
}) => {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % PSYCHOLOGICAL_TIPS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full p-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center text-center py-6">
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-500 p-0.5 animate-spin-slow">
            <div className="w-full h-full bg-zinc-950 rounded-2xl flex items-center justify-center">
              <Brain className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 p-1 bg-violet-600 rounded-lg shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-white animate-bounce" />
          </div>
        </div>

        <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          {label}
        </h3>
        <p className="text-sm text-zinc-400 mt-1 max-w-md">
          {sublabel}
        </p>

        {/* Dynamic strategic quote */}
        <div className="mt-5 px-4 py-2 rounded-full bg-zinc-950/80 border border-violet-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2 animate-pulse">
          <Cpu className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span>{PSYCHOLOGICAL_TIPS[tipIndex]}</span>
        </div>

        {/* Skeleton lines */}
        <div className="w-full max-w-lg mt-8 space-y-3">
          <div className="h-4 bg-zinc-800/80 rounded-lg w-full animate-pulse" />
          <div className="h-4 bg-zinc-800/60 rounded-lg w-5/6 mx-auto animate-pulse" />
          <div className="h-4 bg-zinc-800/40 rounded-lg w-4/6 mx-auto animate-pulse" />
        </div>
      </div>
    </div>
  );
};
