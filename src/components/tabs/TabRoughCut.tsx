import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { auditRoughCut, uploadToGoogleFileAPI } from '../../services/geminiService';
import { LoadingSkeleton } from '../LoadingSkeleton';
import type { RoughCutResult } from '../../types';
import {
  Stethoscope,
  UploadCloud,
  FileText,
  Scissors,
  Sparkles,
  ArrowRightLeft,
  Volume2,
  ZoomIn,
  Film
} from 'lucide-react';

export const TabRoughCut: React.FC = () => {
  const {
    currentVideo,
    creatorProfile,
    setCurrentVideoRoughCut,
    showToast,
    startBackgroundTask,
    finishBackgroundTask,
    backgroundTasks,
    setIsApiKeyModalOpen
  } = useApp();

  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [timelineDescription, setTimelineDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [latestResult, setLatestResult] = useState<RoughCutResult | null>(currentVideo.roughCut);

  useEffect(() => {
    setLatestResult(currentVideo.roughCut);
  }, [currentVideo.id, currentVideo.roughCut]);

  const isAnalyzing = backgroundTasks.some(
    (t) => t.type === 'rough_cut' && t.status === 'running'
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'file' && !selectedFile) {
      showToast('Selecciona un archivo de video del corte rudo', 'error');
      return;
    }
    if (mode === 'text' && !timelineDescription.trim()) {
      showToast('Describe las tomas o timeline de tu corte rudo', 'error');
      return;
    }

    if (!creatorProfile.apiKey) {
      showToast('Configura tu Gemini API Key antes de analizar', 'error');
      setIsApiKeyModalOpen(true);
      return;
    }

    const inputSummary =
      mode === 'file' ? `Corte Rudo: ${selectedFile?.name}` : `Corte Rudo: "${timelineDescription.slice(0, 25)}..."`;

    const taskId = startBackgroundTask('rough_cut', inputSummary);

    try {
      showToast('Analizando montaje y edición del corte rudo...', 'info');

      let fileUri: string | undefined;
      let mimeType: string | undefined;

      if (mode === 'file' && selectedFile) {
        if (selectedFile.size > 15 * 1024 * 1024) {
          setUploadProgress(15);
          showToast('Subiendo video pesado a Google File API...', 'info');
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

      const result = await auditRoughCut(
        {
          text: mode === 'text' ? timelineDescription : undefined,
          file: mode === 'file' && !fileUri ? selectedFile! : undefined,
          fileUri,
          mimeType
        },
        creatorProfile
      );

      setLatestResult(result);
      setCurrentVideoRoughCut(result);
      finishBackgroundTask(taskId, true);
      showToast(`¡Diagnóstico guardado en "${currentVideo.title}"!`, 'success');
    } catch (err: any) {
      console.error(err);
      setUploadProgress(null);
      finishBackgroundTask(taskId, false, err.message);
      showToast(err.message || 'Error al analizar el corte rudo', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <Stethoscope className="w-4 h-4" />
            </span>
            <h1 className="text-xl md:text-2xl font-black text-zinc-100 tracking-tight">
              Doctor de Edición (Corte Rudo / Rough Cut)
            </h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Optimizando montaje preliminar de:</span>
            <strong className="text-zinc-200 font-bold">{currentVideo.title}</strong>
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleAnalyze} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
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
            <span>Subir Video en Bruto (.mp4 / .mov)</span>
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
            <span>Describir Tomas o Secuencia</span>
          </button>
        </div>

        {mode === 'file' ? (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-zinc-800 hover:border-cyan-500/50 rounded-2xl p-6 text-center bg-zinc-950/60 transition-colors">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
                id="rough-file-upload"
              />
              <label
                htmlFor="rough-file-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                  <Film className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-zinc-200">
                  {selectedFile ? selectedFile.name : 'Haz click para subir tu corte preliminar (Video)'}
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
                    className="bg-cyan-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Descripción de las tomas y secuencia actual
            </label>
            <textarea
              rows={4}
              value={timelineDescription}
              onChange={(e) => setTimelineDescription(e.target.value)}
              placeholder="Ejemplo: Comienzo saludando y explicando de qué va el video (0-5s). Luego corto a la toma donde camino hacia el local (5-15s)..."
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors"
            />
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isAnalyzing || (mode === 'file' && !selectedFile) || (mode === 'text' && !timelineDescription.trim())}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Stethoscope className="w-4 h-4" />
            <span>{isAnalyzing ? 'Diagnosticando corte...' : 'Diagnosticar Corte Rudo'}</span>
          </button>
        </div>
      </form>

      {/* Loading Skeleton */}
      {isAnalyzing && (
        <LoadingSkeleton
          label="Examinando Montaje y Ritmo del Corte Rudo..."
          sublabel="Calculando timestamps de cortes, muletillas e inserción de pattern interrupts"
        />
      )}

      {/* Results */}
      {latestResult && !isAnalyzing && (
        <div className="space-y-6">
          <div className="p-5 md:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Directriz General de Montaje
              </span>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Score Actual: {latestResult.retentionScore} / 100
              </span>
            </div>
            <p className="text-sm font-semibold text-zinc-100 leading-relaxed">
              {latestResult.summaryAdvice}
            </p>
          </div>

          {/* 1. Timestamps de Tijera */}
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Scissors className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                1. Línea de Tiempo: Cortes de Silencio & Errores
              </h3>
            </div>

            <div className="space-y-2.5">
              {latestResult.silenceCuts.map((cut, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold px-2 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {cut.timestamp}
                    </span>
                    <span className="text-zinc-300 font-medium">{cut.issue}</span>
                  </div>
                  <span className="text-rose-400 font-bold shrink-0">
                    ✂️ {cut.cutSuggestion}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Inserciones */}
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                2. Inserciones Sugeridas: B-Roll, Zooms & SFX
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {latestResult.insertions.map((ins, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start gap-3 text-xs"
                >
                  <div className="mt-0.5 shrink-0">
                    {ins.type === 'broll' && <Film className="w-4 h-4 text-cyan-400" />}
                    {ins.type === 'zoom' && <ZoomIn className="w-4 h-4 text-violet-400" />}
                    {ins.type === 'sfx' && <Volume2 className="w-4 h-4 text-amber-400" />}
                    {ins.type === 'transition' && <Sparkles className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-400">{ins.timestamp}</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                        {ins.type}
                      </span>
                    </div>
                    <p className="text-zinc-200 font-medium">{ins.instruction}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Reordenamiento */}
          {latestResult.sceneReordering.length > 0 && (
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                  3. Reordenamiento de Escenas (Potenciar Gancho Inicial)
                </h3>
              </div>

              <div className="space-y-3">
                {latestResult.sceneReordering.map((reorder, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-zinc-950 border border-amber-500/30 text-xs space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-zinc-400">
                        Posición Actual: {reorder.currentPosition}
                      </span>
                      <span className="text-amber-400 font-bold">➜</span>
                      <span className="font-mono font-bold text-amber-300">
                        Mover a: {reorder.suggestedPosition}
                      </span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed font-medium">
                      {reorder.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
