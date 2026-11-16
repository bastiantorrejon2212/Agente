import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { VideoProject, ScriptStatus } from '../../types';
import {
  FolderKanban,
  Play,
  Trash2,
  MoveRight,
  Search,
  Clock,
  ArrowRight,
  Plus,
  Film,
  Brain
} from 'lucide-react';

interface ColumnDef {
  id: ScriptStatus;
  title: string;
  color: string;
  badgeBg: string;
}

const COLUMNS: ColumnDef[] = [
  { id: 'idea', title: 'En Idea', color: 'border-zinc-700', badgeBg: 'bg-zinc-800 text-zinc-300' },
  { id: 'ready_to_record', title: 'Listo para Grabar', color: 'border-cyan-500/40', badgeBg: 'bg-cyan-500/20 text-cyan-300' },
  { id: 'editing', title: 'Editando', color: 'border-amber-500/40', badgeBg: 'bg-amber-500/20 text-amber-300' },
  { id: 'published', title: 'Publicado', color: 'border-emerald-500/40', badgeBg: 'bg-emerald-500/20 text-emerald-300' }
];

export const TabBovedaKanban: React.FC = () => {
  const {
    videoProjects,
    currentProjectId,
    selectVideoProject,
    updateVideoStatus,
    deleteVideoProject,
    createVideoProject,
    setTeleprompterScript,
    setActiveTab,
    showToast,
    openAdvisorForVideo
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [quickTitle, setQuickTitle] = useState('');

  const filteredVideos = videoProjects.filter(
    (v) =>
      v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.rawIdea.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.selectedHook && v.selectedHook.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleLaunchTeleprompter = (video: VideoProject) => {
    if (!video.script) {
      showToast('Este video aún no tiene un guion generado', 'error');
      return;
    }
    setTeleprompterScript(video.script);
  };

  const handleOpenVideoProject = (video: VideoProject, tab: 'hooks' | 'script' = 'script') => {
    selectVideoProject(video.id);
    setActiveTab(tab);
  };

  const getNextStatus = (current: ScriptStatus): ScriptStatus => {
    switch (current) {
      case 'idea':
        return 'ready_to_record';
      case 'ready_to_record':
        return 'editing';
      case 'editing':
        return 'published';
      case 'published':
        return 'idea';
    }
  };

  const handleQuickCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    createVideoProject(quickTitle.trim());
    setQuickTitle('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <FolderKanban className="w-4 h-4" />
            </span>
            <h1 className="text-xl md:text-2xl font-black text-zinc-100 tracking-tight">
              Bóveda de Videos (Kanban de Producción)
            </h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Cada video es un proyecto independiente con sus propios hooks, guion, auditorías y SEO.
          </p>
        </div>

        {/* Quick Add Video Bar */}
        <form onSubmit={handleQuickCreate} className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Título del nuevo video..."
            className="bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none w-full md:w-64 transition-colors"
          />
          <button
            type="submit"
            disabled={!quickTitle.trim()}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-md shadow-violet-950/40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Video</span>
          </button>
        </form>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar entre tus videos..."
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none transition-colors"
          />
        </div>

        <span className="text-xs text-zinc-500 font-mono">
          Total: {videoProjects.length} {videoProjects.length === 1 ? 'video' : 'videos'}
        </span>
      </div>

      {/* Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const columnVideos = filteredVideos.filter((v) => v.status === col.id);

          return (
            <div
              key={col.id}
              className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 flex flex-col min-h-[520px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-200">
                    {col.title}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${col.badgeBg}`}
                  >
                    {columnVideos.length}
                  </span>
                </div>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {columnVideos.map((video) => {
                  const isCurrent = video.id === currentProjectId;
                  const hasScript = Boolean(video.script);
                  const hasHooks = Boolean(video.hooksPackage);

                  return (
                    <div
                      key={video.id}
                      className={`p-4 rounded-xl border transition-all duration-200 shadow-sm space-y-3 group ${
                        isCurrent
                          ? 'bg-violet-950/20 border-violet-500/50 shadow-violet-950/20'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <Film className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          <h4 className="text-xs font-bold text-zinc-100 truncate">
                            {video.title}
                          </h4>
                        </div>
                        {isCurrent && (
                          <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.2 rounded bg-violet-600/30 text-violet-300 border border-violet-500/30 shrink-0">
                            Activo
                          </span>
                        )}
                      </div>

                      {/* Hook or Idea preview */}
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {video.selectedHook || video.rawIdea || 'Sin gancho definido todavía.'}
                      </p>

                      {/* Pipeline Badges */}
                      <div className="flex flex-wrap gap-1.5 text-[10px] pt-1">
                        <span
                          className={`px-2 py-0.5 rounded font-mono ${
                            hasHooks
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-900 text-zinc-500'
                          }`}
                        >
                          {hasHooks ? '✓ Hooks' : '○ Hooks'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-mono ${
                            hasScript
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                              : 'bg-zinc-900 text-zinc-500'
                          }`}
                        >
                          {hasScript ? `✓ Guion (${video.script!.blocks.length}b)` : '○ Guion'}
                        </span>
                        {video.seo && (
                          <span className="px-2 py-0.5 rounded font-mono bg-violet-500/10 text-violet-400 border border-violet-500/30">
                            ✓ SEO
                          </span>
                        )}
                      </div>

                      {/* Date & Metadata */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-900">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {video.targetDuration}
                        </span>
                        <span>{new Date(video.updatedAt).toLocaleDateString()}</span>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center justify-between gap-1 pt-2">
                        <div className="flex items-center gap-1">
                          {hasScript && (
                            <button
                              onClick={() => handleLaunchTeleprompter(video)}
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-300 transition-colors"
                              title="Abrir en Teleprompter"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => openAdvisorForVideo(video.id)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 transition-colors"
                            title="Consultar al Asesor de Contenido"
                          >
                            <Brain className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenVideoProject(video, hasScript ? 'script' : 'hooks')}
                            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-violet-600 text-zinc-200 hover:text-white text-[10px] font-semibold flex items-center gap-1 transition-colors"
                            title="Abrir espacio de trabajo de este video"
                          >
                            <span>Abrir</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          {videoProjects.length > 1 && (
                            <button
                              onClick={() => deleteVideoProject(video.id)}
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition-colors"
                              title="Eliminar video"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Move to next stage */}
                        <button
                          onClick={() => updateVideoStatus(video.id, getNextStatus(video.status))}
                          className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-violet-300 border border-zinc-800 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                          title="Avanzar de estado"
                        >
                          <MoveRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {columnVideos.length === 0 && (
                  <div className="h-32 border border-dashed border-zinc-800/80 rounded-xl flex items-center justify-center text-[11px] text-zinc-600 font-medium">
                    Sin videos en este estado
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
