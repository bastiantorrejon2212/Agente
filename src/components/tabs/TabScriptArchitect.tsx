import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { generateScript } from '../../services/geminiService';
import { calculateSpeed, parseDurationSeconds } from '../../utils/speedMeter';
import { LoadingSkeleton } from '../LoadingSkeleton';
import { RetentionCurveGraph } from '../RetentionCurveGraph';
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
  Brain,
  ArrowUp,
  ArrowDown,
  CopyPlus,
  Download,
  CheckCircle2,
  Users,
  TrendingUp
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
    openAdvisorForVideo,
    openAudienceSimulator,
    openRetentionModal
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
    setCurrentVideoScript(updatedScript, true);
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
    setCurrentVideoScript(updatedScript, true);
    showToast('Nuevo bloque agregado', 'info');
  };

  const recalculateTimeRanges = (blocks: ScriptBlock[]): ScriptBlock[] => {
    let currentSecond = 0;
    return blocks.map((b) => {
      const dur = b.durationSeconds || 4;
      const start = currentSecond;
      const end = start + dur;
      currentSecond = end;
      const formatSec = (s: number) => `0:${s < 10 ? '0' : ''}${s}`;
      return {
        ...b,
        durationSeconds: dur,
        timeRange: `${formatSec(start)} - ${formatSec(end)}`
      };
    });
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    if (!currentScript) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentScript.blocks.length) return;

    const newBlocks = [...currentScript.blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;

    const reTimedBlocks = recalculateTimeRanges(newBlocks);
    const updatedScript: Script = {
      ...currentScript,
      blocks: reTimedBlocks,
      updatedAt: Date.now()
    };

    setCurrentScript(updatedScript);
    setCurrentVideoScript(updatedScript, true);
    showToast(`Bloque movido hacia ${direction === 'up' ? 'arriba' : 'abajo'}`, 'info');
  };

  const handleDuplicateBlock = (blockId: string) => {
    if (!currentScript) return;
    const idx = currentScript.blocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    const original = currentScript.blocks[idx];
    const duplicated: ScriptBlock = {
      ...original,
      id: 'blk_dup_' + Date.now(),
      spokenText: `${original.spokenText}`
    };
    const newBlocks = [...currentScript.blocks];
    newBlocks.splice(idx + 1, 0, duplicated);

    const reTimedBlocks = recalculateTimeRanges(newBlocks);
    const updatedScript: Script = {
      ...currentScript,
      blocks: reTimedBlocks,
      updatedAt: Date.now()
    };

    setCurrentScript(updatedScript);
    setCurrentVideoScript(updatedScript, true);
    showToast('Bloque duplicado', 'info');
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!currentScript) return;
    if (currentScript.blocks.length <= 1) {
      showToast('El guion debe tener al menos un bloque', 'error');
      return;
    }
    const filtered = currentScript.blocks.filter((b) => b.id !== blockId);
    const reTimedBlocks = recalculateTimeRanges(filtered);
    const updatedScript: Script = {
      ...currentScript,
      blocks: reTimedBlocks,
      updatedAt: Date.now()
    };

    setCurrentScript(updatedScript);
    setCurrentVideoScript(updatedScript, true);
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
    setCurrentVideoScript(updatedScript, true);
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
    setCurrentVideoScript(updatedScript, true);
  };

  const handleManualSave = () => {
    if (!currentScript) return;
    setCurrentVideoScript(currentScript, false);
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

  const totalDurationSeconds = currentScript
    ? currentScript.blocks.reduce((acc, b) => acc + (b.durationSeconds || 4), 0)
    : 0;
  const totalWords = currentScript
    ? currentScript.blocks.reduce((acc, b) => acc + (b.wordsCount || 0), 0)
    : 0;
  const avgWordsPerSec = totalDurationSeconds > 0
    ? (totalWords / totalDurationSeconds).toFixed(1)
    : '0';

  const handleDownloadProductionSheet = () => {
    if (!currentScript) return;
    const markdown = `# FICHA DE PRODUCCIÓN TIKTOK — ${currentVideo.title}
Fecha: ${new Date().toLocaleDateString()}
Duración Total Estimada: ${totalDurationSeconds}s (${currentScript.blocks.length} bloques)
Ritmo Promedio: ${avgWordsPerSec} palabras/segundo
Atmósfera Musical: ${currentScript.musicAtmosphere}

## 1. TRINIDAD DEL GANCHO (0.0s - 0.03s)
- Resumen del Gancho: ${currentScript.hookSummary}
- Premisa Inicial: ${currentVideo.rawIdea || 'No especificada'}

## 2. GUION SEGUNDO A SEGUNDO
${currentScript.blocks
  .map(
    (b, i) => `
### Bloque ${i + 1} [${b.timeRange}] (${b.durationSeconds}s — ${b.speedStatus.toUpperCase()})
- 🎥 Cámara y Acción: ${b.cameraAction}
- 🎙️ Locución / Voz: "${b.spokenText}"
- ⚡ Pantalla y SFX: ${b.overlayTextSfx}
`
  )
  .join('')}

## 3. REMATE EN BUCLE (LOOP)
${currentScript.infiniteLoopTrick}

## 4. CHECKLIST DE TOMAS B-ROLL
${currentScript.brollChecklist
  .map((item, i) => `- [${item.completed ? 'X' : ' '}] Toma ${i + 1}: ${item.cameraAngle} — ${item.shotDescription}`)
  .join('\n')}

---
Generado con Agente IA TikTok (VibeDirector Pro)
`;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ficha_Produccion_${currentVideo.title.replace(/\s+/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Ficha de producción descargada (.md)', 'success');
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
              onClick={() => openRetentionModal()}
              className="px-3.5 py-2 rounded-xl bg-violet-950/40 hover:bg-violet-900/50 border border-violet-500/40 text-violet-200 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              title="Calcular o ver la Curva Predictiva de Retención (TikTok Studio Simulado)"
            >
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Curva de Retención</span>
            </button>

            <button
              onClick={() => openAudienceSimulator()}
              className="px-3.5 py-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-200 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              title="Testear guion con Focus Group de 3 espectadores"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Simular Audiencia</span>
            </button>

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
                  onClick={handleDownloadProductionSheet}
                  className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs text-violet-300 hover:text-violet-200 font-semibold flex items-center gap-1.5 transition-colors"
                  title="Descargar ficha completa de producción en Markdown"
                >
                  <Download className="w-3.5 h-3.5 text-violet-400" />
                  <span>Ficha de Producción (.md)</span>
                </button>
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

          {/* Live Duration & Speech Velocity Metrics Bar */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-5 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-zinc-400">Duración Real:</span>
                <strong className={`text-sm font-mono font-bold ${
                  totalDurationSeconds > 60 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {totalDurationSeconds}s
                </strong>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Bloques:</span>
                <span className="text-xs font-mono font-semibold text-zinc-200">
                  {currentScript.blocks.length} cortes
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Total Palabras:</span>
                <span className="text-xs font-mono font-semibold text-zinc-200">
                  {totalWords} palabras
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Ritmo Medio:</span>
                <span className="text-xs font-mono font-bold text-violet-400">
                  {avgWordsPerSec} pal/s
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {totalDurationSeconds >= 20 && totalDurationSeconds <= 55 ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Duración ideal para TikTok</span>
                </span>
              ) : totalDurationSeconds > 55 ? (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
                  ⚠️ Cuidado: +55s exige retención extrema
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold">
                  ⚡ Formato ultrarrápido (alta retención)
                </span>
              )}
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
                    <th className="py-3 px-3 w-28 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {currentScript.blocks.map((block, idx) => {
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

                        <td className="py-3 px-3 align-top text-center">
                          <div className="flex items-center justify-center gap-1 pt-1">
                            <button
                              onClick={() => handleMoveBlock(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 rounded text-zinc-500 hover:text-cyan-400 disabled:opacity-20 transition-colors"
                              title="Subir bloque"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveBlock(idx, 'down')}
                              disabled={idx === currentScript.blocks.length - 1}
                              className="p-1 rounded text-zinc-500 hover:text-cyan-400 disabled:opacity-20 transition-colors"
                              title="Bajar bloque"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicateBlock(block.id)}
                              className="p-1 rounded text-zinc-500 hover:text-violet-400 transition-colors"
                              title="Duplicar bloque"
                            >
                              <CopyPlus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBlock(block.id)}
                              className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors"
                              title="Eliminar bloque"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

          {/* Predictive Retention Curve Section */}
          {currentVideo.predictiveRetention && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-zinc-100">
                    Curva Predictiva de Retención Algorítmica (TikTok Studio)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => openRetentionModal()}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  Recalcular o Expandir ➜
                </button>
              </div>
              <RetentionCurveGraph report={currentVideo.predictiveRetention} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
