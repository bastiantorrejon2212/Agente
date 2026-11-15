import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { generateScript } from '../../services/geminiService';
import { calculateSpeed, parseDurationSeconds } from '../../utils/speedMeter';
import { LoadingSkeleton } from '../LoadingSkeleton';
import type { Script, ScriptBlock, BrollItem } from '../../types';
import {
  Clapperboard,
  Zap,
  Play,
  Copy,
  Save,
  Plus,
  Trash2,
  Repeat,
  CheckSquare,
  Square,
  Clock,
  Film,
  Brain
} from 'lucide-react';

export const TabScriptArchitect: React.FC = () => {
  const {
    currentVideo,
    creatorProfile,
    setCurrentVideoScript,
    setTeleprompterScript,
    showToast,
    startBackgroundTask,
    finishBackgroundTask,
    backgroundTasks,
    setIsApiKeyModalOpen,
    openAdvisorForVideo
  } = useApp();

  const [hookInput, setHookInput] = useState(currentVideo.selectedHook || '');
  const [duration, setDuration] = useState(currentVideo.targetDuration || '30-40s');
  const [shotIdeas, setShotIdeas] = useState('');
  
  const [currentScript, setCurrentScript] = useState<Script | null>(currentVideo.script);

  useEffect(() => {
    setHookInput(currentVideo.selectedHook || '');
    setDuration(currentVideo.targetDuration || '30-40s');
    setCurrentScript(currentVideo.script);
    if (currentVideo.recordedClipsNotes) {
      setShotIdeas(currentVideo.recordedClipsNotes);
    }
  }, [currentVideo.id, currentVideo.selectedHook, currentVideo.script, currentVideo.recordedClipsNotes]);

  const isGenerating = backgroundTasks.some(
    (t) => t.type === 'script' && t.status === 'running'
  );

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hookInput.trim()) {
      showToast('Por favor escribe o selecciona un hook de partida', 'error');
      return;
    }

    if (!creatorProfile.apiKey) {
      showToast('Configura tu Gemini API Key antes de generar', 'error');
      setIsApiKeyModalOpen(true);
      return;
    }

    const taskId = startBackgroundTask('script', `Construyendo Guion: "${hookInput.slice(0, 25)}..."`);

    try {
      showToast('Diseñando guion segundo a segundo en segundo plano...', 'info');
      const result = await generateScript(hookInput, duration, shotIdeas, creatorProfile);
      
      const newScript: Script = {
        ...result,
        id: 'scr_' + Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      setCurrentScript(newScript);
      setCurrentVideoScript(newScript);
      finishBackgroundTask(taskId, true);
      showToast(`¡Guion estructurado y guardado en "${currentVideo.title}"!`, 'success');
    } catch (err: any) {
      console.error(err);
      finishBackgroundTask(taskId, false, err.message);
      showToast(err.message || 'Error al construir el guion', 'error');
    }
  };

  const handleUpdateBlockField = (
    blockId: string,
    field: 'timeRange' | 'cameraAction' | 'spokenText' | 'overlayTextSfx',
    value: string
  ) => {
    if (!currentScript) return;

    const updatedBlocks = currentScript.blocks.map((b) => {
      if (b.id !== blockId) return b;
      
      const newBlock = { ...b, [field]: value };
      
      if (field === 'timeRange' || field === 'spokenText') {
        const dur = parseDurationSeconds(newBlock.timeRange);
        const speed = calculateSpeed(newBlock.spokenText, dur);
        newBlock.durationSeconds = dur;
        newBlock.wordsCount = speed.wordsCount;
        newBlock.wordsPerSecond = speed.wordsPerSecond;
        newBlock.speedStatus = speed.status;
      }

      return newBlock;
    });

    const updatedScript: Script = {
      ...currentScript,
      blocks: updatedBlocks,
      updatedAt: Date.now()
    };

    setCurrentScript(updatedScript);
    setCurrentVideoScript(updatedScript);
  };

  const handleAddBlock = () => {
    if (!currentScript) return;
    const lastBlock = currentScript.blocks[currentScript.blocks.length - 1];
    let nextStart = 0;
    if (lastBlock) {
      const match = lastBlock.timeRange.match(/(\d+):?(\d+)?$/);
      if (match) {
        nextStart = parseInt(match[2] || match[1] || '0', 10);
      }
    }
    const nextEnd = nextStart + 4;
    const newTime = `0:${nextStart < 10 ? '0' : ''}${nextStart} - 0:${nextEnd < 10 ? '0' : ''}${nextEnd}`;

    const newBlock: ScriptBlock = {
      id: 'blk_user_' + Date.now(),
      timeRange: newTime,
      durationSeconds: 4,
      cameraAction: 'Plano detalle / Reacción rápida',
      spokenText: '',
      overlayTextSfx: 'SFX Whoosh',
      wordsCount: 0,
      wordsPerSecond: 0,
      speedStatus: 'optimal'
    };

    const updatedScript: Script = {
      ...currentScript,
      blocks: [...currentScript.blocks, newBlock],
      updatedAt: Date.now()
    };

    setCurrentScript(updatedScript);
    setCurrentVideoScript(updatedScript);
    showToast('Nuevo bloque agregado', 'info');
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!currentScript) return;
    if (currentScript.blocks.length <= 1) {
      showToast('El guion debe tener al menos un bloque', 'error');
      return;
    }
    const updatedScript: Script = {
      ...currentScript,
      blocks: currentScript.blocks.filter((b) => b.id !== blockId),
      updatedAt: Date.now()
    };

    setCurrentScript(updatedScript);
    setCurrentVideoScript(updatedScript);
    showToast('Bloque eliminado', 'info');
  };

  const handleToggleBroll = (brollId: string) => {
    if (!currentScript) return;
    const updated = currentScript.brollChecklist.map((item) =>
      item.id === brollId ? { ...item, completed: !item.completed } : item
    );
    const updatedScript: Script = {
      ...currentScript,
      brollChecklist: updated,
      updatedAt: Date.now()
    };
    setCurrentScript(updatedScript);
    setCurrentVideoScript(updatedScript);
  };

  const handleAddBrollItem = () => {
    if (!currentScript) return;
    const newItem: BrollItem = {
      id: 'broll_' + Date.now(),
      shotDescription: 'Nueva toma de recurso (B-Roll)',
      cameraAngle: 'POV / Plano detalle',
      completed: false
    };
    const updatedScript: Script = {
      ...currentScript,
      brollChecklist: [...currentScript.brollChecklist, newItem],
      updatedAt: Date.now()
    };
    setCurrentScript(updatedScript);
    setCurrentVideoScript(updatedScript);
  };

  const handleManualSave = () => {
    if (!currentScript) return;
    setCurrentVideoScript(currentScript);
    showToast(`Guion guardado en "${currentVideo.title}"`, 'success');
  };

  const handleOpenTeleprompter = () => {
    if (!currentScript) return;
    setTeleprompterScript(currentScript);
  };

  const handleCopyAll = () => {
    if (!currentScript) return;
    const text = `VIDEO: ${currentVideo.title}
GANCHO: ${currentScript.hookSummary}
DURACIÓN: ${currentScript.targetDuration}
MÚSICA: ${currentScript.musicAtmosphere}
ESTRUCTURA: ${currentScript.narrativeStructure}

GUION SEGUNDO A SEGUNDO:
${currentScript.blocks
  .map(
    (b) =>
      `[${b.timeRange}] (${b.wordsPerSecond} pal/s - ${b.speedStatus.toUpperCase()})\n- CÁMARA: ${b.cameraAction}\n- VOZ: ${b.spokenText}\n- PANTALLA/SFX: ${b.overlayTextSfx}\n`
  )
  .join('\n')}

TRUCO LOOP INFINITO:
${currentScript.infiniteLoopTrick}

CHECKLIST B-ROLL:
${currentScript.brollChecklist.map((br) => `[${br.completed ? 'X' : ' '}] ${br.cameraAngle}: ${br.shotDescription}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    showToast('Guion completo copiado al portapapeles', 'success');
  };

  const brollCompletedCount = currentScript?.brollChecklist.filter((b) => b.completed).length || 0;
  const brollTotalCount = currentScript?.brollChecklist.length || 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <Clapperboard className="w-4 h-4" />
            </span>
            <h1 className="text-xl md:text-2xl font-black text-zinc-100 tracking-tight">
              Arquitecto de Guiones Segundo a Segundo
            </h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Guion del Video:</span>
            <strong className="text-zinc-200 font-bold">{currentVideo.title}</strong>
          </p>
        </div>

        {currentScript && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenTeleprompter}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-cyan-400" />
              <span>Modo Teleprompter</span>
            </button>

            <button
              onClick={handleManualSave}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-violet-950/40 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Guion</span>
            </button>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleGenerate} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
        <div>
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
            Gancho Inicial / Premisa de este Video
          </label>
          <textarea
            rows={2}
            value={hookInput}
            onChange={(e) => setHookInput(e.target.value)}
            placeholder="Pega aquí el hook ganador del Laboratorio o redacta la premisa..."
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Duración Objetivo
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 outline-none transition-colors cursor-pointer"
            >
              <option value="15-20s (Ultrarrápido / Retención pura)">15-20s (Ultrarrápido / Retención pura)</option>
              <option value="30-40s (Equilibrado / Estándar TikTok)">30-40s (Equilibrado / Estándar TikTok)</option>
              <option value="45-60s (Storytelling profundo)">45-60s (Storytelling profundo)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Tomas o Planos Disponibles
              </label>
              <button
                type="button"
                onClick={() => openAdvisorForVideo()}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors"
                title="Consultar al Asesor sobre qué tomas grabar"
              >
                <Brain className="w-3 h-3" />
                <span>¿Qué tomas grabar?</span>
              </button>
            </div>
            <input
              type="text"
              value={shotIdeas}
              onChange={(e) => setShotIdeas(e.target.value)}
              placeholder="Ej. Caminando en la calle, manos abriendo paquete, selfie con luz natural..."
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-[11px] text-zinc-500">
            ⚡ Los cambios y bloques que edites quedarán vinculados directamente a este proyecto de video.
          </p>
          <button
            type="submit"
            disabled={isGenerating || !hookInput.trim()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Zap className="w-4 h-4" />
            <span>{isGenerating ? 'Generando en segundo plano...' : 'Arquitecturar Guion de este Video'}</span>
          </button>
        </div>
      </form>

      {/* Loading Skeleton */}
      {isGenerating && (
        <LoadingSkeleton
          label="Arquitecturando Guion Segundo a Segundo..."
          sublabel="Calculando ritmo de locución, cortes de plano y la ilusión de bucle infinito"
        />
      )}

      {/* Script View / Editor */}
      {currentScript && !isGenerating && (
        <div className="space-y-6">
          {/* Script Summary Card */}
          <div className="p-5 md:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                  {currentScript.targetDuration}
                </span>
                <h2 className="text-xl font-extrabold text-zinc-100 mt-1">
                  {currentScript.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyAll}
                  className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Todo</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-500 uppercase font-bold text-[10px] block mb-1">
                  Estructura Narrativa
                </span>
                <p className="text-zinc-200 font-medium">{currentScript.narrativeStructure}</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-500 uppercase font-bold text-[10px] block mb-1">
                  Música / Ambiente Sugerido
                </span>
                <p className="text-zinc-200 font-medium">{currentScript.musicAtmosphere}</p>
              </div>
            </div>
          </div>

          {/* Interactive Timeline Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-zinc-850 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs md:text-sm font-bold text-zinc-100 uppercase tracking-wider">
                  Timeline Segundo a Segundo (Edición Inline en Tiempo Real)
                </h3>
              </div>
              <button
                onClick={handleAddBlock}
                className="px-3 py-1.5 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-300 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Bloque</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3 w-28">Tiempo</th>
                    <th className="py-3 px-3 w-56">Cámara y Acción Física</th>
                    <th className="py-3 px-4">Voz en Off / Locución</th>
                    <th className="py-3 px-3 w-48">Velocidad Hablada</th>
                    <th className="py-3 px-3 w-64">Texto Pantalla + SFX</th>
                    <th className="py-3 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {currentScript.blocks.map((block) => {
                    const speed = calculateSpeed(block.spokenText, block.durationSeconds);

                    return (
                      <tr key={block.id} className="hover:bg-zinc-850/40 transition-colors group">
                        <td className="py-3 px-3 align-top">
                          <input
                            type="text"
                            value={block.timeRange}
                            onChange={(e) =>
                              handleUpdateBlockField(block.id, 'timeRange', e.target.value)
                            }
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-lg px-2 py-1 text-xs font-mono font-bold text-violet-300 outline-none"
                          />
                        </td>

                        <td className="py-3 px-3 align-top">
                          <textarea
                            rows={2}
                            value={block.cameraAction}
                            onChange={(e) =>
                              handleUpdateBlockField(block.id, 'cameraAction', e.target.value)
                            }
                            placeholder="Acción física..."
                            className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-cyan-500 rounded-lg p-2 text-xs text-zinc-200 outline-none resize-none"
                          />
                        </td>

                        <td className="py-3 px-4 align-top">
                          <textarea
                            rows={3}
                            value={block.spokenText}
                            onChange={(e) =>
                              handleUpdateBlockField(block.id, 'spokenText', e.target.value)
                            }
                            placeholder="Escribe la locución exacta..."
                            className="w-full bg-zinc-950/90 border border-zinc-800 focus:border-violet-500 rounded-lg p-2 text-xs font-medium text-zinc-100 outline-none resize-none leading-relaxed"
                          />
                        </td>

                        <td className="py-3 px-3 align-top">
                          <div className="space-y-1.5">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${speed.badgeColor}`}
                            >
                              {speed.wordsPerSecond} pal/s ({speed.wordsCount} p.)
                            </span>
                            <p className="text-[10px] text-zinc-400 leading-tight">
                              {speed.label}
                            </p>
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top">
                          <textarea
                            rows={2}
                            value={block.overlayTextSfx}
                            onChange={(e) =>
                              handleUpdateBlockField(block.id, 'overlayTextSfx', e.target.value)
                            }
                            placeholder="Texto y efectos..."
                            className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-amber-500 rounded-lg p-2 text-xs text-zinc-300 font-mono outline-none resize-none"
                          />
                        </td>

                        <td className="py-3 px-2 align-top text-center">
                          <button
                            onClick={() => handleDeleteBlock(block.id)}
                            className="p-1.5 text-zinc-600 hover:text-rose-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Eliminar bloque"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Loop Trick */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 shrink-0 mt-0.5">
              <Repeat className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="text-xs uppercase font-bold text-violet-400 tracking-wider">
                Truco de Loop Infinito (Bucle de Reproducción)
              </span>
              <p className="text-xs text-zinc-200 mt-1 font-medium leading-relaxed">
                {currentScript.infiniteLoopTrick}
              </p>
            </div>
          </div>

          {/* Checklist B-Roll */}
          <div className="p-5 md:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-100">
                  Checklist de Rodaje B-Roll ({brollCompletedCount}/{brollTotalCount} tomas listas)
                </h3>
              </div>
              <button
                onClick={handleAddBrollItem}
                className="px-3 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Agregar Toma</span>
              </button>
            </div>

            <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
              <div
                className="bg-gradient-to-r from-violet-500 to-emerald-400 h-full transition-all duration-300"
                style={{
                  width: `${brollTotalCount > 0 ? (brollCompletedCount / brollTotalCount) * 100 : 0}%`
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {currentScript.brollChecklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleBroll(item.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    item.completed
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                      : 'bg-zinc-950 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="mt-0.5 shrink-0 text-emerald-400">
                    {item.completed ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                  <div className="flex-1 text-xs">
                    <span className="font-semibold block text-zinc-200">
                      {item.shotDescription}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      Ángulo: {item.cameraAngle}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
