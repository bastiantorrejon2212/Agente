import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { generateSEO } from '../../services/geminiService';
import { LoadingSkeleton } from '../LoadingSkeleton';
import type { SEOResult } from '../../types';
import {
  Search,
  Hash,
  Key,
  Copy,
  Check,
  Zap,
  Pin,
  FileText,
  Sparkles,
  Video
} from 'lucide-react';

export const TabSEO: React.FC = () => {
  const {
    currentVideo,
    creatorProfile,
    setCurrentVideoSEO,
    showToast,
    startBackgroundTask,
    finishBackgroundTask,
    backgroundTasks,
    setIsApiKeyModalOpen,
    isKeyConfigured
  } = useApp();

  const [topicInput, setTopicInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync with current video
  useEffect(() => {
    if (currentVideo.seo) {
      // If current video already has SEO and no topic input is written, we can prefill with video title or raw idea
      if (!topicInput) {
        setTopicInput(currentVideo.rawIdea || currentVideo.title || '');
      }
    } else if (currentVideo.script) {
      const fullSpoken = currentVideo.script.blocks.map(b => b.spokenText).join(' ');
      if (!topicInput) {
        setTopicInput(fullSpoken || currentVideo.rawIdea || currentVideo.title);
      }
    } else if (currentVideo.rawIdea && !topicInput) {
      setTopicInput(currentVideo.rawIdea);
    }
  }, [currentVideo.id]);

  const isGenerating = backgroundTasks.some(
    (t) => t.type === 'seo' && t.status === 'running'
  );

  const seoResult: SEOResult | null = currentVideo.seo || null;

  const handleUseCurrentScript = () => {
    if (currentVideo.script && currentVideo.script.blocks.length > 0) {
      const spoken = currentVideo.script.blocks
        .map((b, i) => `[Bloque ${i + 1}] ${b.spokenText}`)
        .join('\n');
      setTopicInput(`TÍTULO: ${currentVideo.script.title}\nGANCHO: ${currentVideo.script.hookSummary}\n\nGUION:\n${spoken}`);
      showToast('Guion del proyecto cargado en el campo de análisis', 'info');
    } else if (currentVideo.rawIdea) {
      setTopicInput(currentVideo.rawIdea);
      showToast('Idea del proyecto cargada', 'info');
    } else {
      showToast('Este video aún no tiene guion ni idea redactada', 'error');
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim()) {
      showToast('Introduce el tema, guion o premisa para extraer SEO', 'error');
      return;
    }

    if (!isKeyConfigured) {
      showToast('Configura tu Gemini API Key antes de generar SEO', 'error');
      setIsApiKeyModalOpen(true);
      return;
    }

    const taskId = startBackgroundTask('seo', `SEO: "${topicInput.slice(0, 25)}..."`);

    try {
      showToast('Diseñando estrategia SEO y comentarios anclados...', 'info');
      const result = await generateSEO(topicInput, creatorProfile);
      setCurrentVideoSEO(result);
      finishBackgroundTask(taskId, true);
      showToast(`¡Estrategia SEO guardada en "${currentVideo.title}"!`, 'success');
    } catch (err: any) {
      console.error(err);
      finishBackgroundTask(taskId, false, err.message);
      showToast(err.message || 'Error al generar SEO', 'error');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copiado al portapapeles', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Search className="w-4 h-4" />
            </span>
            <h1 className="text-xl md:text-2xl font-black text-zinc-100 tracking-tight">
              Estrategia SEO & Comentarios de Debate
            </h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Posiciona tu video en la barra de búsqueda de TikTok y desata debate con <strong className="text-violet-400 font-semibold">Comentarios Anclados</strong> para que el video corra en bucle mientras la gente lee y responde.
          </p>
        </div>

        {/* Current Video Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 self-start md:self-auto">
          <Video className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs text-zinc-400">Video activo:</span>
          <span className="text-xs font-semibold text-zinc-200 truncate max-w-[180px]">
            {currentVideo.title}
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleGenerate} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Tema, Premisa o Guion del Video
          </label>
          {currentVideo.script && (
            <button
              type="button"
              onClick={handleUseCurrentScript}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1.5 transition-colors self-start sm:self-auto font-medium"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Cargar guion de "{currentVideo.title}"</span>
            </button>
          )}
        </div>

        <textarea
          rows={4}
          value={topicInput}
          onChange={(e) => setTopicInput(e.target.value)}
          placeholder="Pega aquí el tema, título o guion completo para extraer palabras clave exactas, descripciones y comentarios de debate..."
          className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl p-3.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors"
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <span className="text-[11px] text-zinc-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            Optimizado con VibeDirector para el algoritmo de búsqueda de TikTok
          </span>
          <button
            type="submit"
            disabled={isGenerating || !topicInput.trim()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-violet-950/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Zap className="w-4 h-4" />
            <span>{isGenerating ? 'Generando SEO...' : 'Generar Estrategia SEO & Copy'}</span>
          </button>
        </div>
      </form>

      {/* Loading Skeleton */}
      {isGenerating && (
        <LoadingSkeleton
          label="Indexando Términos de Búsqueda y Psicología de Comentarios..."
          sublabel="Analizando patrones de búsqueda de TikTok e ideando ganchos para comentarios anclados"
        />
      )}

      {/* Results */}
      {seoResult && !isGenerating && (
        <div className="space-y-6">
          {/* 1. Descriptions / Copies */}
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Search className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                1. Opciones de Copy / Descripción SEO (Motor de Búsqueda TikTok)
              </h3>
            </div>

            <div className="space-y-3">
              {seoResult.copies.map((copy, idx) => {
                const id = `copy_${idx}`;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start justify-between gap-4 text-xs group hover:border-zinc-700 transition-colors"
                  >
                    <p className="text-zinc-200 leading-relaxed font-medium flex-1">
                      {copy}
                    </p>
                    <button
                      onClick={() => copyToClipboard(copy, id)}
                      className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 shrink-0 transition-colors"
                      title="Copiar descripción"
                    >
                      {copiedId === id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Micro Keywords & Hashtags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 md:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                    2. Micro-Keywords Ocultas
                  </h4>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(seoResult.microKeywords.join(', '), 'all_keywords')
                  }
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-medium transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copiar Todas</span>
                </button>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                💡 <em>Truco de indexación:</em> Inserta estas frases en texto pequeño transparente o fuera de marco en CapCut/TikTok para que el algoritmo indexe el video inmediatamente en los resultados de búsqueda.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {seoResult.microKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-amber-500/30 text-amber-300 font-mono text-xs font-semibold"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-5 md:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                    3. Hashtags Estratégicos
                  </h4>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(seoResult.hashtags.join(' '), 'all_hashtags')
                  }
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-medium transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copiar Todos</span>
                </button>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Mezcla calculada entre autoridad de nicho y volumen de búsqueda medio (evita quemar el video en hashtags saturados de millones de posts).
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {seoResult.hashtags.map((ht, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold"
                  >
                    {ht.startsWith('#') ? ht : `#${ht}`}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Pinned Comments */}
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Pin className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                4. Comentarios Anclados (Pinned Comments de Debate)
              </h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Publica uno de estos comentarios en tu propio video inmediatamente tras subirlo y márcalo como <strong>"Fijar/Pin"</strong>. El debate resultante mantendrá el video reproduciéndose en bucle mientras la gente responde y argumenta.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {seoResult.pinnedComments.map((comment, idx) => {
                const id = `pinned_${idx}`;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-3 text-xs group hover:border-zinc-700 transition-colors"
                  >
                    <p className="text-zinc-200 font-medium italic leading-relaxed">
                      "{comment}"
                    </p>
                    <button
                      onClick={() => copyToClipboard(comment, id)}
                      className="self-end px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-800"
                    >
                      {copiedId === id ? (
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
