import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { auditDraft, uploadToGoogleFileAPI } from '../../services/geminiService';
import { LoadingSkeleton } from '../LoadingSkeleton';
import { RetentionCurveGraph } from '../RetentionCurveGraph';
import type { AuditorResult, Script } from '../../types';
import {
  Scissors,
  UploadCloud,
  FileText,
  AlertTriangle,
  Play,
  Save,
  TrendingDown,
  ShieldAlert,
  Film,
  TrendingUp
} from 'lucide-react';

export const TabDraftAuditor: React.FC = () => {
  const {
    currentVideo,
    creatorProfile,
    setCurrentVideoDraftAudit,
    setCurrentVideoScript,
    setTeleprompterScript,
    showToast,
    startBackgroundTask,
    finishBackgroundTask,
    backgroundTasks,
    setIsApiKeyModalOpen,
    openRetentionModal
  } = useApp();

  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [textDraft, setTextDraft] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [latestResult, setLatestResult] = useState<AuditorResult | null>(currentVideo.draftAudit);

  useEffect(() => {
    setLatestResult(currentVideo.draftAudit);
  }, [currentVideo.id, currentVideo.draftAudit]);

  const isAuditing = backgroundTasks.some(
    (t) => t.type === 'audit' && t.status === 'running'
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'text' && !textDraft.trim()) {
      showToast('Por favor introduce el texto del borrador a auditar', 'error');
      return;
    }

    if (mode === 'file' && !selectedFile) {
      showToast('Por favor selecciona un archivo de video o audio', 'error');
      return;
    }

    if (!creatorProfile.apiKey) {
      showToast('Configura tu Gemini API Key antes de auditar', 'error');
      setIsApiKeyModalOpen(true);
      return;
    }

    const inputLabel =
      mode === 'text'
        ? `Auditoría: "${textDraft.slice(0, 20)}..."`
        : `Auditoría de archivo: ${selectedFile?.name}`;

    const taskId = startBackgroundTask('audit', inputLabel);

    try {
      showToast('Iniciando auditoría implacable de retención...', 'info');

      let fileUri: string | undefined;
      let mimeType: string | undefined;

      if (mode === 'file' && selectedFile) {
        if (selectedFile.size > 15 * 1024 * 1024) {
          setUploadProgress(10);
          showToast('Subiendo archivo pesado a Google File API...', 'info');
          const uploaded = await uploadToGoogleFileAPI(
            selectedFile,
            creatorProfile.apiKey,
            (pct) => setUploadProgress(pct)
          );
          fileUri = uploaded.fileUri;
          mimeType = uploaded.mimeType;
          setUploadProgress(null);
        }
      }

      const result = await auditDraft(
        {
          text: mode === 'text' ? textDraft : undefined,
          file: mode === 'file' && !fileUri ? selectedFile! : undefined,
          fileUri,
          mimeType
        },
        creatorProfile
      );

      setLatestResult(result);
      setCurrentVideoDraftAudit(result);
      finishBackgroundTask(taskId, true);
      showToast(`¡Auditoría guardada en "${currentVideo.title}"!`, 'success');
    } catch (err: any) {
      console.error(err);
      setUploadProgress(null);
      finishBackgroundTask(taskId, false, err.message);
      showToast(err.message || 'Error durante la auditoría', 'error');
    }
  };

  const handleSendTijeraToVideo = () => {
    if (!latestResult) return;
    const { reEngineeredScript } = latestResult;

    const newScript: Script = {
      id: 'script_tijera_' + Date.now(),
      title: `${currentVideo.title} (Versión Tijera)`,
      hookSummary: reEngineeredScript.blocks[0]?.spokenText || 'Hook reingenierizado',
      targetDuration: `${reEngineeredScript.blocks.length * 4}s aprox`,
      narrativeStructure: reEngineeredScript.narrativeSummary,
      musicAtmosphere: 'Edición rápida, cortes en seco y SFX constantes',
      blocks: reEngineeredScript.blocks,
      infiniteLoopTrick: reEngineeredScript.infiniteLoopTrick,
      brollChecklist: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setCurrentVideoScript(newScript);
    showToast(`Versión Tijera guardada como guion principal de "${currentVideo.title}"`, 'success');
  };

  const handleOpenTijeraInTeleprompter = () => {
    if (!latestResult) return;
    const { reEngineeredScript } = latestResult;

    const script: Script = {
      id: 'tele_tijera_' + Date.now(),
      title: `${currentVideo.title} (Versión Tijera)`,
      hookSummary: reEngineeredScript.blocks[0]?.spokenText || '',
      targetDuration: `${reEngineeredScript.blocks.length * 4}s`,
      narrativeStructure: reEngineeredScript.narrativeSummary,
      musicAtmosphere: 'Ritmo rápido',
      blocks: reEngineeredScript.blocks,
      infiniteLoopTrick: reEngineeredScript.infiniteLoopTrick,
      brollChecklist: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setTeleprompterScript(script);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30">
              <Scissors className="w-4 h-4" />
            </span>
            <h1 className="text-xl md:text-2xl font-black text-zinc-100 tracking-tight">
              Destrozador de Borradores (Auditor Multimodal)
            </h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Auditando borrador de:</span>
            <strong className="text-zinc-200 font-bold">{currentVideo.title}</strong>
          </p>
        </div>
      </div>

      {/* Input Mode Selector & Form */}
      <form onSubmit={handleAudit} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-2">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              mode === 'text'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Guion en Texto</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('file')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              mode === 'file'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Subir Video / Audio (.mp4, .mov, etc.)</span>
          </button>
        </div>

        {mode === 'text' ? (
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Pega tu borrador o transcripción
            </label>
            <textarea
              rows={5}
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              placeholder="Pega aquí el guion tal como lo tienes redactado actualmente..."
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl p-3.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Seleccionar Archivo Multimedia
            </label>
            <div className="border-2 border-dashed border-zinc-800 hover:border-violet-500/50 rounded-2xl p-6 text-center bg-zinc-950/60 transition-colors">
              <input
                type="file"
                accept="video/*,audio/*"
                onChange={handleFileChange}
                className="hidden"
                id="draft-file-upload"
              />
              <label
                htmlFor="draft-file-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-zinc-200">
                  {selectedFile ? selectedFile.name : 'Haz click para seleccionar un video o audio'}
                </span>
                <span className="text-[11px] text-zinc-500">
                  {selectedFile
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                    : 'Formatos soportados: MP4, MOV, WEBM, MP3, WAV, M4A'}
                </span>
              </label>
            </div>

            {uploadProgress !== null && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Subiendo a Google AI File API...</span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isAuditing || (mode === 'text' && !textDraft.trim()) || (mode === 'file' && !selectedFile)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Scissors className="w-4 h-4" />
            <span>{isAuditing ? 'Auditando en segundo plano...' : 'Destrozar Borrador'}</span>
          </button>
        </div>
      </form>

      {/* Loading Skeleton */}
      {isAuditing && (
        <LoadingSkeleton
          label="Destrozando Borrador y Buscando Puntos de Fuga..."
          sublabel="Localizando segundos muertos, muletillas y reconstruyendo la Versión Tijera"
        />
      )}

      {/* Results View */}
      {latestResult && !isAuditing && (
        <div className="space-y-6">
          {/* Score & Filterless Diagnosis */}
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Diagnóstico Implacable
                </span>
                <h2 className="text-xl font-extrabold text-zinc-100 mt-1 flex items-center gap-2">
                  <span>Auditoría de Retención</span>
                </h2>
              </div>

              {/* Retention Score Gauge & Quick Retention Curve Button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => openRetentionModal()}
                  className="px-3.5 py-2.5 rounded-2xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-200 text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
                  title="Simular la Curva Predictiva Segundo a Segundo (TikTok Studio)"
                >
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>Curva Predictiva</span>
                </button>

                <div
                  className={`px-4 py-2 rounded-2xl border flex items-center gap-3 ${getScoreColor(
                    latestResult.retentionScore
                  )}`}
                >
                  <TrendingDown className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="text-2xl font-black font-mono leading-none">
                      {latestResult.retentionScore} / 100
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      Score de Retención
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Brutally Honest Diagnosis */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>Diagnóstico Sin Filtro (Primeros 3s & Ritmo)</span>
              </span>
              <p className="text-xs md:text-sm text-zinc-200 leading-relaxed font-medium">
                {latestResult.filterlessDiagnosis}
              </p>
            </div>

            {/* Scroll Alerts */}
            {latestResult.scrollAlerts.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Puntos de Fuga & Alertas de Scroll (Tijera Obligatoria)</span>
                </span>
                <div className="space-y-2">
                  {latestResult.scrollAlerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-zinc-950/70 border border-amber-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <span className="font-mono font-bold text-amber-400">
                          {alert.timestampOrPhrase}
                        </span>
                        <p className="text-zinc-300">{alert.reason}</p>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-semibold text-[11px] shrink-0">
                        ✂️ {alert.cutRecommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Predictive Retention Graph Inline */}
            {currentVideo.predictiveRetention && (
              <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between pb-3">
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

          {/* Re-Engineered Script ("Versión Tijera") */}
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Solución Inmediata
                </span>
                <h3 className="text-lg font-black text-zinc-100 mt-1">
                  Guion Re-ingenierizado ("Versión Tijera")
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {latestResult.reEngineeredScript.narrativeSummary}
                </p>
              </div>

              {/* Action Buttons for Versión Tijera */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenTijeraInTeleprompter}
                  className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Teleprompter</span>
                </button>

                <button
                  onClick={handleSendTijeraToVideo}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/40"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar como Guion del Video</span>
                </button>
              </div>
            </div>

            {/* Blocks of Versión Tijera */}
            <div className="space-y-3">
              {latestResult.reEngineeredScript.blocks.map((block, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-violet-400 bg-violet-950/40 px-2 py-0.5 rounded border border-violet-500/30">
                      {block.timeRange}
                    </span>
                    <span className="text-cyan-400 text-[11px] italic">
                      📹 {block.cameraAction}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-zinc-100">
                    "{block.spokenText}"
                  </p>

                  <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2 pt-1 border-t border-zinc-900">
                    <span className="text-amber-400 font-bold">⚡ PANTALLA:</span>
                    <span>{block.overlayTextSfx}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Loop trick */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs text-zinc-300">
              <strong className="text-violet-400 font-bold block mb-1">
                🔄 Cierre en Bucle Infinito:
              </strong>
              {latestResult.reEngineeredScript.infiniteLoopTrick}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
