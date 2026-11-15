import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { generateHooks } from '../../services/geminiService';
import { LoadingSkeleton } from '../LoadingSkeleton';
import {
  Sparkles,
  Zap,
  Eye,
  Type,
  Volume2,
  Copy,
  ArrowRight,
  TrendingUp,
  Brain,
  Check,
  Film
} from 'lucide-react';
import type { HookItem } from '../../types';

export const TabHooks: React.FC = () => {
  const {
    currentVideo,
    creatorProfile,
    setCurrentVideoHooks,
    setCurrentVideoSelectedHook,
    setActiveTab,
    showToast,
    startBackgroundTask,
    finishBackgroundTask,
    backgroundTasks,
    setIsApiKeyModalOpen,
    openAdvisorForVideo
  } = useApp();

  const [rawIdea, setRawIdea] = useState(currentVideo.rawIdea || '');
  const [format, setFormat] = useState(currentVideo.format || 'Vlog de aventura / salida');
  const [energyLevel, setEnergyLevel] = useState(currentVideo.energyLevel || 'Rápido / Frenético');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync inputs when active video changes
  useEffect(() => {
    setRawIdea(currentVideo.rawIdea || '');
    setFormat(currentVideo.format || 'Vlog de aventura / salida');
    setEnergyLevel(currentVideo.energyLevel || 'Rápido / Frenético');
  }, [currentVideo.id]);

  const isGenerating = backgroundTasks.some(
    (t) => t.type === 'hooks' && t.status === 'running'
  );

  const latestPackage = currentVideo.hooksPackage;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawIdea.trim()) {
      showToast('Por favor escribe tu idea o tema bruto', 'error');
      return;
    }

    if (!creatorProfile.apiKey) {
      showToast('Configura tu Gemini API Key antes de generar', 'error');
      setIsApiKeyModalOpen(true);
      return;
    }

    const taskId = startBackgroundTask('hooks', `Generando Hooks: "${rawIdea.slice(0, 25)}..."`);

    try {
      showToast('Creando hooks en segundo plano con Gemini...', 'info');
      const result = await generateHooks(rawIdea, format, energyLevel, creatorProfile);
      setCurrentVideoHooks(result);
      finishBackgroundTask(taskId, true);
      showToast('¡4 Hooks de Alta Retención listos para este video!', 'success');
    } catch (err: any) {
      console.error(err);
      finishBackgroundTask(taskId, false, err.message);
      showToast(err.message || 'Error al generar hooks con Gemini', 'error');
    }
  };

  const handleBuildScriptWithHook = (hook: HookItem) => {
    const combinedHookText = `VISUAL: ${hook.visualHook} | TEXTO: ${hook.textHook} | VOZ: ${hook.audioHook}`;
    setCurrentVideoSelectedHook(combinedHookText);
    setActiveTab('script');
    showToast(`Hook transferido al guion de "${currentVideo.title}"`, 'success');
  };

  const copyHookToClipboard = (hook: HookItem, cardIndex: number) => {
    const textToCopy = `Ángulo: ${hook.angleTitle}
- Visual (0.0s): ${hook.visualHook}
- Texto en pantalla: ${hook.textHook}
- Gancho auditivo: ${hook.audioHook}
- Retención predicha: ${hook.retentionPrediction}%
- Psicología: ${hook.psychologicalReasoning}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(`card_${cardIndex}`);
    showToast('Hook copiado al portapapeles', 'info');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getAngleBadgeColor = (type: HookItem['angleType']) => {
    switch (type) {
      case 'curiosity':
        return 'bg-violet-500/20 text-violet-300 border-violet-500/40';
      case 'conflict':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'pov':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'polemic':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <h1 className="text-xl md:text-2xl font-black text-zinc-100 tracking-tight">
              Laboratorio de Hooks (A/B Testing)
            </h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span>Proyecto de Video actual:</span>
            <strong className="text-zinc-200 font-bold">{currentVideo.title}</strong>
          </p>
        </div>

        {/* Pro Model Tag */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
          <Brain className="w-3.5 h-3.5 text-cyan-400" />
          <span>Motor:</span>
          <span className="font-mono text-cyan-400 font-semibold">
            {creatorProfile.aiModel === 'custom' && creatorProfile.customModelId
              ? creatorProfile.customModelId
              : (creatorProfile.aiModel || 'gemini-3.8-flash')}
          </span>
        </div>
      </div>

      {/* Advisor Quick Assist Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-950/40 via-zinc-900/60 to-cyan-950/40 border border-violet-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 shrink-0">
            <Brain className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-200">¿No sabes cómo enfocar la idea o qué tomas grabar?</h4>
            <p className="text-[11px] text-zinc-400">VibeDirector te asesora paso a paso analizando tus tomas o sugiriéndote qué grabar.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openAdvisorForVideo()}
          className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
        >
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Consultar Asesor</span>
        </button>
      </div>

      {/* Input Form */}
      <form onSubmit={handleGenerate} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
        <div>
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
            Idea Bruta del Video / Tema
          </label>
          <textarea
            rows={3}
            value={rawIdea}
            onChange={(e) => setRawIdea(e.target.value)}
            placeholder="Ejemplo: Fui a la cafetería secreta más escondida de la ciudad y me cobraron una fortuna por un café..."
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl p-3.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Formato de Contenido
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 outline-none transition-colors cursor-pointer"
            >
              <option value="Vlog de aventura / salida">Vlog de aventura / salida</option>
              <option value="Storytelling / Anécdota real">Storytelling / Anécdota real</option>
              <option value="Tutorial / Tip práctico y accionable">Tutorial / Tip práctico y accionable</option>
              <option value="Reflexión / Opinión contraintuitiva">Reflexión / Opinión contraintuitiva</option>
              <option value="POV Inmersivo / Experiencia en primera persona">POV Inmersivo / Experiencia en primera persona</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Nivel de Energía
            </label>
            <select
              value={energyLevel}
              onChange={(e) => setEnergyLevel(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 outline-none transition-colors cursor-pointer"
            >
              <option value="Rápido / Frenético (Cortes cada 2 seg)">Rápido / Frenético (Cortes cada 2 seg)</option>
              <option value="Chill / Estético con buen ritmo">Chill / Estético con buen ritmo</option>
              <option value="Tensión creciente / Suspenso">Tensión creciente / Suspenso</option>
              <option value="Conversacional directo al grano">Conversacional directo al grano</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-[11px] text-zinc-500">
            💡 Los hooks generados quedarán guardados permanentemente dentro de este proyecto de video.
          </p>
          <button
            type="submit"
            disabled={isGenerating || !rawIdea.trim()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-violet-950/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Zap className="w-4 h-4" />
            <span>{isGenerating ? 'Generando en segundo plano...' : 'Diseñar 4 Hooks A/B'}</span>
          </button>
        </div>
      </form>

      {/* Loading Skeleton */}
      {isGenerating && (
        <LoadingSkeleton
          label="Forjando 4 Hooks con Psicología de la Atención..."
          sublabel="Desglosando en Trinidad del Gancho y evaluando retención en el segundo 2.0"
        />
      )}

      {/* Latest Hooks Results */}
      {latestPackage && !isGenerating && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <span>Hooks diseñados para este video:</span>
              <span className="text-zinc-400 font-normal italic truncate max-w-md">
                "{latestPackage.rawIdea}"
              </span>
            </h2>
            <span className="text-[11px] text-zinc-500">
              {new Date(latestPackage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* 4 Comparative Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {latestPackage.hooks.map((hook, index) => {
              const isCopied = copiedId === `card_${index}`;

              return (
                <div
                  key={index}
                  className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col justify-between transition-all duration-200 group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet-500/40 to-transparent group-hover:via-cyan-400 transition-all" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getAngleBadgeColor(
                          hook.angleType
                        )}`}
                      >
                        {hook.angleTitle}
                      </span>

                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                        <TrendingUp className="w-3 h-3" />
                        <span>~{hook.retentionPrediction}% Retención</span>
                      </div>
                    </div>

                    {/* Trinidad del Gancho */}
                    <div className="space-y-2.5 pt-2">
                      <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-violet-400 uppercase tracking-wider">
                          <Eye className="w-3.5 h-3.5" />
                          <span>a) Gancho Visual (Segundo 0.0)</span>
                        </div>
                        <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                          {hook.visualHook}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                          <Type className="w-3.5 h-3.5" />
                          <span>b) Texto en Pantalla (4-7 palabras)</span>
                        </div>
                        <p className="text-xs font-bold text-zinc-100 tracking-wide">
                          "{hook.textHook}"
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>c) Gancho Auditivo (Primera frase)</span>
                        </div>
                        <p className="text-xs text-zinc-200 italic leading-relaxed">
                          "{hook.audioHook}"
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-850/60 border border-zinc-800 text-[11px] text-zinc-400 leading-relaxed">
                      <strong className="text-zinc-300 font-semibold">¿Por qué funciona?:</strong>{' '}
                      {hook.psychologicalReasoning}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-zinc-800/80">
                    <button
                      onClick={() => copyHookToClipboard(hook, index)}
                      className="px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Copiar detalles del hook"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleBuildScriptWithHook(hook)}
                      className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-violet-950/30 transition-all group-hover:scale-[1.02]"
                    >
                      <span>Armar Guion de este Video</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
