import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { auditFinalQuality, uploadToGoogleFileAPI } from '../../services/geminiService';
import { LoadingSkeleton } from '../LoadingSkeleton';
import type { FinalQualityResult } from '../../types';
import {
  Rocket,
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  Bookmark,
  Film,
  Play
} from 'lucide-react';

export const TabFinalQuality: React.FC = () => {
  const {
    currentVideo,
    creatorProfile,
    setCurrentVideoFinalQuality,
    updateVideoStatus,
    showToast,
    startBackgroundTask,
    finishBackgroundTask,
    backgroundTasks,
    setIsApiKeyModalOpen,
    isKeyConfigured
  } = useApp();

  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoDescription, setVideoDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [latestResult, setLatestResult] = useState<FinalQualityResult | null>(currentVideo.finalQuality);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setLatestResult(currentVideo.finalQuality);
  }, [currentVideo.id, currentVideo.finalQuality]);

  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      const url = URL.createObjectURL(selectedFile);
      setVideoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoPreviewUrl(null);
    }
  }, [selectedFile]);

  const isEvaluating = backgroundTasks.some(
    (t) => t.type === 'final_quality' && t.status === 'running'
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'file' && !selectedFile) {
      showToast('Selecciona el video final para control de calidad', 'error');
      return;
    }
    if (mode === 'text' && !videoDescription.trim()) {
      showToast('Describe el video final para evaluar', 'error');
      return;
    }

    if (!isKeyConfigured) {
      showToast('Configura tu Gemini API Key antes de evaluar', 'error');
      setIsApiKeyModalOpen(true);
      return;
    }

    const inputSummary =
      mode === 'file' ? `Video Final: ${selectedFile?.name}` : `Video Final: "${videoDescription.slice(0, 25)}..."`;

    const taskId = startBackgroundTask('final_quality', inputSummary);

    try {
      showToast('Ejecutando Control de Calidad Pre-Lanzamiento...', 'info');

      let fileUri: string | undefined;
      let mimeType: string | undefined;

      if (mode === 'file' && selectedFile) {
        if (selectedFile.size > 15 * 1024 * 1024) {
          setUploadProgress(15);
          showToast('Subiendo video final a Google File API...', 'info');
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

      const result = await auditFinalQuality(
        {
          text: mode === 'text' ? videoDescription : undefined,
          file: mode === 'file' && !fileUri ? selectedFile! : undefined,
          fileUri,
          mimeType
        },
        creatorProfile
      );

      setLatestResult(result);
      setCurrentVideoFinalQuality(result);
      if (result.verdict === 'LISTO_PARA_PUBLICAR') {
        updateVideoStatus(currentVideo.id, 'published');
      }
      finishBackgroundTask(taskId, true);
      showToast(`¡Dictamen de calidad guardado en "${currentVideo.title}"!`, 'success');
    } catch (err: any) {
      console.error(err);
      setUploadProgress(null);
      finishBackgroundTask(taskId, false, err.message);
      showToast(err.message || 'Error en el control de calidad', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <Rocket className="w-4 h-4" />
            </span>
            <h1 className="text-xl md:text-2xl font-black text-zinc-100 tracking-tight">
              Control de Calidad (Video Final / Pre-Lanzamiento)
            </h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Auditando versión final de:</span>
            <strong className="text-zinc-200 font-bold">{currentVideo.title}</strong>
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleEvaluate} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-2">
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
            <span>Subir Video Terminado (.mp4 / .mov)</span>
          </button>

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
            <span>Describir Edición y Gancho Final</span>
          </button>
        </div>

        {mode === 'file' ? (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-6 text-center bg-zinc-950/60 transition-colors">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
                id="final-file-upload"
              />
              <label
                htmlFor="final-file-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                  <Film className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-zinc-200">
                  {selectedFile ? selectedFile.name : 'Haz click para subir tu video editado final'}
                </span>
                <span className="text-[11px] text-zinc-500">
                  {selectedFile
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                    : 'Admite videos pesados mediante Google AI File API'}
                </span>
              </label>
            </div>

            {uploadProgress !== null && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Subiendo video a Google File API...</span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Detalle del video editado (Gancho inicial, música, remate y loop)
            </label>
            <textarea
              rows={4}
              value={videoDescription}
              onChange={(e) => setVideoDescription(e.target.value)}
              placeholder="Ejemplo: Video de 32 segundos. Inicia con un zoom rápido a un plato y la frase 'No cometas este error'. En el segundo 15 hago un cambio de ángulo..."
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl p-3.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors"
            />
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isEvaluating || (mode === 'file' && !selectedFile) || (mode === 'text' && !videoDescription.trim())}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Rocket className="w-4 h-4" />
            <span>{isEvaluating ? 'Evaluando calidad...' : 'Emitir Veredicto de Calidad'}</span>
          </button>
        </div>
      </form>

      {/* Loading Skeleton */}
      {isEvaluating && (
        <LoadingSkeleton
          label="Sometiendo Video al Control de Calidad Pre-Lanzamiento..."
          sublabel="Verificando fuerza del gancho de 3s, consistencia de retención media y potencial viral de guardado"
        />
      )}

      {/* Results View */}
      {latestResult && !isEvaluating && (
        <div className="space-y-6">
          {/* Video Preview Player Panel */}
          {videoPreviewUrl && (
            <div className="p-4 md:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                <Play className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                  Reproductor de Verificación Final
                </h3>
              </div>
              <div className="relative aspect-video max-h-[380px] w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-zinc-800">
                <video
                  ref={videoPlayerRef}
                  src={videoPreviewUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Main Verdict Hero Card */}
          <div
            className={`p-6 md:p-8 rounded-3xl border shadow-2xl relative overflow-hidden ${
              latestResult.verdict === 'LISTO_PARA_PUBLICAR'
                ? 'bg-emerald-950/20 border-emerald-500/50 shadow-emerald-950/20'
                : 'bg-rose-950/20 border-rose-500/50 shadow-rose-950/20'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                  Veredicto del Director
                </span>
                <div className="flex items-center gap-3">
                  {latestResult.verdict === 'LISTO_PARA_PUBLICAR' ? (
                    <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-rose-400 shrink-0" />
                  )}
                  <h2
                    className={`text-2xl md:text-3xl font-black tracking-tight ${
                      latestResult.verdict === 'LISTO_PARA_PUBLICAR'
                        ? 'text-emerald-300'
                        : 'text-rose-300'
                    }`}
                  >
                    {latestResult.verdict.replace(/_/g, ' ')}
                  </h2>
                </div>
                <p className="text-xs md:text-sm text-zinc-300 max-w-xl font-medium pt-1">
                  💡 <strong className="text-zinc-100 font-bold">Consejo de último minuto:</strong>{' '}
                  {latestResult.finalLaunchTip}
                </p>
              </div>

              {/* Overall Score Circle/Badge */}
              <div className="flex items-center gap-6 shrink-0 bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800">
                <div className="text-center">
                  <div className="text-3xl font-black font-mono text-zinc-100">
                    {latestResult.overallScore}
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                    Puntaje Global
                  </span>
                </div>

                <div className="h-10 w-px bg-zinc-800" />

                <div className="text-center">
                  <div className="text-3xl font-black font-mono text-cyan-400">
                    ~{latestResult.predictedRetentionRate}%
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                    Retención Predicha
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Bars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-300 uppercase tracking-wider">
                  1. Gancho Inicial (0-3s)
                </span>
                <span className="font-mono font-bold text-violet-400">
                  {latestResult.hookScore}/100
                </span>
              </div>
              <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                <div
                  className="bg-violet-500 h-full transition-all duration-300"
                  style={{ width: `${latestResult.hookScore}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                {latestResult.hookFeedback}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-300 uppercase tracking-wider">
                  2. Ritmo Medio & Variación
                </span>
                <span className="font-mono font-bold text-cyan-400">
                  {latestResult.midRetentionScore}/100
                </span>
              </div>
              <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                <div
                  className="bg-cyan-500 h-full transition-all duration-300"
                  style={{ width: `${latestResult.midRetentionScore}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                {latestResult.midRetentionFeedback}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-300 uppercase tracking-wider">
                  3. Cierre & Loop Infinito
                </span>
                <span className="font-mono font-bold text-amber-400">
                  {latestResult.loopScore}/100
                </span>
              </div>
              <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{ width: `${latestResult.loopScore}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                {latestResult.loopFeedback}
              </p>
            </div>
          </div>

          {/* Viral Potential */}
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                  Potencial Viral: Guardados & Compartidos
                </h3>
              </div>

              <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-bold font-mono">
                Probabilidad: {latestResult.shareSaveProbability}
              </span>
            </div>

            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed font-medium">
              {latestResult.shareSaveAnalysis}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
