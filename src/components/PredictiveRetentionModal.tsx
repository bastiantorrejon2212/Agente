import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { generatePredictiveRetentionCurve } from '../services/geminiService';
import { LoadingSkeleton } from './LoadingSkeleton';
import { RetentionCurveGraph } from './RetentionCurveGraph';
import type { PredictiveRetentionReport } from '../types';
import {
  TrendingUp,
  X,
  Zap,
  Sparkles,
  FileText,
  ArrowRight
} from 'lucide-react';

export const PredictiveRetentionModal: React.FC = () => {
  const {
    isRetentionModalOpen,
    setIsRetentionModalOpen,
    currentVideo,
    creatorProfile,
    setCurrentVideoPredictiveRetention,
    showToast,
    startBackgroundTask,
    finishBackgroundTask,
    backgroundTasks,
    setIsApiKeyModalOpen,
    setActiveTab
  } = useApp();

  const [scriptInput, setScriptInput] = useState('');
  const [hookInput, setHookInput] = useState(currentVideo.selectedHook || '');
  const [durationInput, setDurationInput] = useState(currentVideo.targetDuration || '30-40s');

  const report: PredictiveRetentionReport | null = currentVideo.predictiveRetention || null;

  // Sync inputs with current video when modal opens or video changes
  useEffect(() => {
    setHookInput(currentVideo.selectedHook || '');
    setDurationInput(currentVideo.targetDuration || '30-40s');
    if (currentVideo.script && currentVideo.script.blocks.length > 0) {
      const fullScript = currentVideo.script.blocks
        .map((b) => `[${b.timeRange}] ${b.cameraAction} — ${b.spokenText}`)
        .join('\n');
      setScriptInput(fullScript);
    } else {
      setScriptInput('');
    }
  }, [currentVideo.id, isRetentionModalOpen]);

  const isCalculating = backgroundTasks.some(
    (t) => t.type === 'retention_curve' && t.status === 'running'
  );

  if (!isRetentionModalOpen) return null;

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scriptInput.trim() && !hookInput.trim()) {
      showToast('Introduce al menos el guion o gancho para simular la retención', 'error');
      return;
    }

    if (!creatorProfile.apiKey) {
      showToast('Configura tu Gemini API Key antes de calcular la curva', 'error');
      setIsApiKeyModalOpen(true);
      return;
    }

    const taskId = startBackgroundTask(
      'retention_curve',
      `Curva de Retención: "${currentVideo.title}"`
    );

    try {
      showToast('Calculando curva predictiva segundo a segundo con Gemini 3.8 Flash...', 'info');

      const result = await generatePredictiveRetentionCurve(
        {
          scriptText: scriptInput,
          hook: hookInput,
          title: currentVideo.title,
          duration: durationInput
        },
        creatorProfile
      );

      setCurrentVideoPredictiveRetention(result);
      finishBackgroundTask(taskId, true);
    } catch (err: any) {
      console.error(err);
      finishBackgroundTask(taskId, false, err.message);
      showToast(err.message || 'Error al calcular la curva de retención', 'error');
    }
  };

  const handleLoadCurrentScript = () => {
    if (currentVideo.script && currentVideo.script.blocks.length > 0) {
      const fullScript = currentVideo.script.blocks
        .map((b) => `[${b.timeRange}] ${b.cameraAction} — ${b.spokenText}`)
        .join('\n');
      setScriptInput(fullScript);
      showToast('Guion del proyecto cargado en el simulador', 'info');
    } else {
      showToast('No hay guion estructurado en este proyecto aún', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 md:px-6 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-zinc-100 tracking-tight">
                  Curva Predictiva de Retención Segundo a Segundo
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  TikTok Studio Simulado
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <span>Proyecto activo:</span>
                <strong className="text-zinc-200 truncate max-w-[220px]">{currentVideo.title}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsRetentionModalOpen(false)}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin">
          {/* Input Form Card */}
          <form
            onSubmit={handleCalculate}
            className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Guion a Analizar Algorítmicamente
                </span>
              </div>

              {currentVideo.script && (
                <button
                  type="button"
                  onClick={handleLoadCurrentScript}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-semibold transition-colors self-start sm:self-auto"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Cargar Guion de "{currentVideo.title}"</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Gancho de Entrada (Segundo 0.0 a 2.0)
                </label>
                <input
                  type="text"
                  value={hookInput}
                  onChange={(e) => setHookInput(e.target.value)}
                  placeholder="Ej: Lo que nadie te cuenta de..."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Duración Estimada
                </label>
                <input
                  type="text"
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  placeholder="30-40s"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Guion Completo o Transcripción Segundo a Segundo
              </label>
              <textarea
                rows={4}
                value={scriptInput}
                onChange={(e) => setScriptInput(e.target.value)}
                placeholder="Pega el guion con marcas de tiempo o acciones para predecir caídas de atención..."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-500 hidden sm:inline">
                Simula el algoritmo de retención y compara contra millones de videos virales.
              </span>
              <button
                type="submit"
                disabled={isCalculating}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Zap className="w-4 h-4" />
                <span>{isCalculating ? 'Calculando Curva...' : 'Generar Curva de Retención'}</span>
              </button>
            </div>
          </form>

          {/* Loading Skeleton */}
          {isCalculating && (
            <LoadingSkeleton
              label="Simulando Retención Segundo a Segundo..."
              sublabel="Localizando valles de fuga, momentos de rewatch y midiendo la efectividad del bucle"
            />
          )}

          {/* Retention Chart View */}
          {report && !isCalculating && (
            <RetentionCurveGraph report={report} />
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <button
            onClick={() => {
              setIsRetentionModalOpen(false);
              setActiveTab('script');
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1.5"
          >
            <span>Ir al Arquitecto de Guiones</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsRetentionModalOpen(false)}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
