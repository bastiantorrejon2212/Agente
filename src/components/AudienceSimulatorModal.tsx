import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { simulateAudience } from '../services/geminiService';
import { LoadingSkeleton } from './LoadingSkeleton';
import type { AudienceSimulationResult, PersonaFeedback } from '../types';
import {
  Users,
  X,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  FileText
} from 'lucide-react';

export const AudienceSimulatorModal: React.FC = () => {
  const {
    isSimulatorOpen,
    setIsSimulatorOpen,
    currentVideo,
    creatorProfile,
    setCurrentVideoSimulation,
    setCurrentVideoSelectedHook,
    showToast,
    startBackgroundTask,
    finishBackgroundTask,
    backgroundTasks,
    setIsApiKeyModalOpen,
    setActiveTab,
    isKeyConfigured
  } = useApp();

  const [hookInput, setHookInput] = useState(currentVideo.selectedHook || '');
  const [scriptInput, setScriptInput] = useState('');
  const [topicInput, setTopicInput] = useState(currentVideo.rawIdea || currentVideo.title || '');

  const simulation: AudienceSimulationResult | null = currentVideo.audienceSimulation || null;

  useEffect(() => {
    setHookInput(currentVideo.selectedHook || '');
    setTopicInput(currentVideo.rawIdea || currentVideo.title || '');
    if (currentVideo.script && currentVideo.script.blocks.length > 0) {
      const fullScript = currentVideo.script.blocks
        .map((b) => `[${b.timeRange}] ${b.cameraAction} — ${b.spokenText}`)
        .join('\n');
      setScriptInput(fullScript);
    } else {
      setScriptInput('');
    }
  }, [currentVideo.id, isSimulatorOpen]);

  const isSimulating = backgroundTasks.some(
    (t) => t.type === 'simulation' && t.status === 'running'
  );

  if (!isSimulatorOpen) return null;

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hookInput.trim() && !scriptInput.trim() && !topicInput.trim()) {
      showToast('Introduce al menos el gancho o guion para simular', 'error');
      return;
    }

    if (!isKeyConfigured) {
      showToast('Configura tu Gemini API Key para correr el simulador', 'error');
      setIsApiKeyModalOpen(true);
      return;
    }

    const taskId = startBackgroundTask('simulation', `Focus Group: "${currentVideo.title}"`);

    try {
      showToast('Corriendo Focus Group con 3 arquetipos de audiencia...', 'info');
      const result = await simulateAudience(
        {
          hook: hookInput,
          scriptText: scriptInput,
          topic: topicInput
        },
        creatorProfile
      );

      setCurrentVideoSimulation(result);
      finishBackgroundTask(taskId, true);
    } catch (err: any) {
      console.error(err);
      finishBackgroundTask(taskId, false, err.message);
      showToast(err.message || 'Error durante la simulación de audiencia', 'error');
    }
  };

  const handleLoadCurrentScript = () => {
    if (currentVideo.script && currentVideo.script.blocks.length > 0) {
      const fullScript = currentVideo.script.blocks
        .map((b) => `[${b.timeRange}] ${b.cameraAction} — ${b.spokenText}`)
        .join('\n');
      setScriptInput(fullScript);
      setHookInput(currentVideo.script.hookSummary || currentVideo.selectedHook);
      showToast('Guion del proyecto cargado para la simulación', 'info');
    } else {
      showToast('Este video aún no tiene guion generado', 'error');
    }
  };

  const handleApplyHookTweak = (tweak: string) => {
    setCurrentVideoSelectedHook(tweak);
    setHookInput(tweak);
    showToast('Ajuste aplicado como Hook principal', 'success');
  };

  const getPersonaBadge = (persona: PersonaFeedback) => {
    switch (persona.actionTaken) {
      case 'Se Quedó (Stay)':
      case 'Compartió (Share)':
      case 'Guardó (Save)':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Comentó (Comment)':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'Deslizó (Swipe)':
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full h-[92vh] md:h-[88vh] shadow-2xl flex flex-col relative overflow-hidden">
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-cyan-400 to-emerald-400" />

        {/* Modal Header */}
        <div className="p-4 md:px-6 md:py-4 border-b border-zinc-800 flex items-center justify-between gap-3 bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 via-cyan-500 to-emerald-400 p-0.5 shadow-lg shadow-violet-950/40">
              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-zinc-100 tracking-tight">
                  Simulador de Audiencia Sintética
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Focus Group TikTok
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <span>Evaluando proyecto:</span>
                <strong className="text-zinc-200 truncate max-w-[220px]">{currentVideo.title}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSimulatorOpen(false)}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin">
          {/* Input Form Card */}
          <form
            onSubmit={handleSimulate}
            className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Material a Evaluar por el Focus Group
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
                  1. Gancho Inicial (Segundo 0.0 a 2.0)
                </label>
                <textarea
                  rows={2}
                  value={hookInput}
                  onChange={(e) => setHookInput(e.target.value)}
                  placeholder="La primera frase hablada y acción visual que verá la persona..."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  2. Premisa o Tema Central
                </label>
                <textarea
                  rows={2}
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="De qué trata el video y qué conflicto o curiosidad plantea..."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                3. Guion Completo o Resumen de Escenas (Opcional pero recomendado)
              </label>
              <textarea
                rows={3}
                value={scriptInput}
                onChange={(e) => setScriptInput(e.target.value)}
                placeholder="Pega aquí el guion segundo a segundo para que el Focus Group evalúe el ritmo medio y el final..."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-500 hidden sm:inline">
                Simula 3 cerebros reales: scroller impulsivo, hater de comentarios y compartidor.
              </span>
              <button
                type="submit"
                disabled={isSimulating}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-violet-950/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Zap className="w-4 h-4" />
                <span>{isSimulating ? 'Simulando Reacciones...' : 'Ejecutar Focus Group'}</span>
              </button>
            </div>
          </form>

          {/* Loading Skeleton */}
          {isSimulating && (
            <LoadingSkeleton
              label="Simulando Comportamiento Psicológico de 3 Espectadores..."
              sublabel="Midiendo milisegundos de abandono, detección de clickbait y propensión a compartir por DM"
            />
          )}

          {/* Simulation Results View */}
          {simulation && !isSimulating && (
            <div className="space-y-6 animate-fade-in">
              {/* Survival Hero Card */}
              <div className="p-5 md:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-cyan-400">
                      Veredicto de Supervivencia Algorítmica
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-zinc-100 tracking-tight">
                    {simulation.overallSurvivalScore >= 75
                      ? '🔥 Alto Potencial de Retención'
                      : simulation.overallSurvivalScore >= 50
                      ? '⚠️ Riesgo Medio de Fuga al Inicio'
                      : '🚨 Alto Riesgo de Deslizamiento Inmediato'}
                  </h2>
                  <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                    {simulation.verdictSummary}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="text-center">
                    <div
                      className={`text-3xl font-black font-mono tracking-tight ${
                        simulation.overallSurvivalScore >= 75
                          ? 'text-emerald-400'
                          : simulation.overallSurvivalScore >= 50
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {simulation.overallSurvivalScore}%
                    </div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mt-0.5">
                      Supervivencia
                    </span>
                  </div>
                </div>
              </div>

              {/* The 3 Personas Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {simulation.personas.map((persona, pIdx) => {
                  const badgeClass = getPersonaBadge(persona);

                  return (
                    <div
                      key={pIdx}
                      className="p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800 hover:border-zinc-700/80 shadow-lg flex flex-col justify-between space-y-4 group transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{persona.avatarEmoji}</span>
                            <div>
                              <h4 className="text-xs font-bold text-zinc-100 leading-none">
                                {persona.personaName}
                              </h4>
                              <span className="text-[10px] text-zinc-500 mt-0.5 block">
                                {persona.demographic}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Taken Pill */}
                        <div className="pt-1">
                          <span
                            className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full border ${badgeClass}`}
                          >
                            {persona.actionTaken}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono ml-2">
                            ({persona.timestampOrTrigger})
                          </span>
                        </div>

                        {/* Quote bubble */}
                        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 text-xs italic text-zinc-200 leading-relaxed font-medium">
                          "{persona.quote}"
                        </div>

                        {/* Psychological reasoning */}
                        <div className="space-y-1 text-xs">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                            Reacción Inmediata:
                          </span>
                          <p className="text-zinc-300 text-[11px] leading-relaxed">
                            {persona.immediateReaction}
                          </p>
                        </div>
                      </div>

                      {/* Improvement Tip */}
                      <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-500/20 text-xs space-y-1">
                        <span className="text-[10px] uppercase font-bold text-violet-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          Cómo atraparlo:
                        </span>
                        <p className="text-zinc-300 text-[11px] leading-relaxed">
                          {persona.improvementTip}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actionable Tweaks & Vulnerabilities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Vulnerabilities */}
                <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                      Puntos Ciegos Detectados
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {simulation.keyVulnerabilities.map((vuln, vIdx) => (
                      <li
                        key={vIdx}
                        className="text-xs text-zinc-300 flex items-start gap-2 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80"
                      >
                        <span className="text-amber-400 font-bold shrink-0">⚠️</span>
                        <span>{vuln}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tweaks */}
                <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                      Ajustes Recomendados por VibeDirector
                    </h4>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Hook Tweak */}
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-violet-400 block mb-0.5">
                          Ajuste al Gancho (0-2s):
                        </span>
                        <p className="text-zinc-200 font-medium text-[11px]">
                          {simulation.actionableTweaks.hookTweak}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyHookTweak(simulation.actionableTweaks.hookTweak)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-850 hover:bg-violet-600 text-zinc-300 hover:text-white text-[10px] font-bold shrink-0 transition-colors"
                      >
                        Aplicar
                      </button>
                    </div>

                    {/* Pacing Tweak */}
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-0.5">
                        Ajuste al Ritmo de Montaje:
                      </span>
                      <p className="text-zinc-200 font-medium text-[11px]">
                        {simulation.actionableTweaks.bodyPacingTweak}
                      </p>
                    </div>

                    {/* CTA / Loop Tweak */}
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">
                        Ajuste al Remate en Bucle:
                      </span>
                      <p className="text-zinc-200 font-medium text-[11px]">
                        {simulation.actionableTweaks.ctaOrLoopTweak}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsSimulatorOpen(false);
                setActiveTab('script');
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Ir al Arquitecto de Guiones ➜
            </button>
          </div>

          <button
            onClick={() => setIsSimulatorOpen(false)}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
