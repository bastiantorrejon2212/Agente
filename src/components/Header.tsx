import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Film,
  Sparkles,
  Key,
  Sliders,
  ChevronDown,
  Loader2,
  Plus,
  Brain
} from 'lucide-react';
import { ProjectManagerModal } from './ProjectManagerModal';

export const Header: React.FC = () => {
  const {
    currentVideo,
    creatorProfile,
    backgroundTasks,
    setIsApiKeyModalOpen,
    isSidebarOpen,
    setIsSidebarOpen,
    openAdvisorForVideo,
    createVideoWithAdvisor
  } = useApp();

  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);

  const hasApiKey = Boolean(creatorProfile.apiKey && creatorProfile.apiKey.trim().length > 5);
  const runningTasks = backgroundTasks.filter((t) => t.status === 'running');
  const hasRunningTasks = runningTasks.length > 0;

  const getStatusBadge = () => {
    switch (currentVideo.status) {
      case 'idea':
        return { label: 'En Idea', color: 'bg-zinc-800 text-zinc-300 border-zinc-700' };
      case 'ready_to_record':
        return { label: 'Listo para Grabar', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
      case 'editing':
        return { label: 'Editando', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'published':
        return { label: 'Publicado', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <>
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Brand + Active Video Switcher */}
        <div className="flex items-center gap-3 md:gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-0.5 shadow-md shadow-violet-950/50">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm md:text-base tracking-tight text-zinc-100">
                  Agente IA TikTok
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-600/20 text-violet-400 border border-violet-500/30">
                  VibeDirector
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 hidden sm:block">
                Estratega Senior & Psicología de la Atención
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-800 hidden md:block" />

          {/* Active Video Project Selector Pill */}
          <button
            onClick={() => setIsProjectsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-850 text-xs text-zinc-200 transition-all shadow-sm group"
          >
            <Film className="w-3.5 h-3.5 text-violet-400 group-hover:text-cyan-400 transition-colors" />
            <div className="flex items-center gap-1.5 max-w-[150px] md:max-w-[220px]">
              <span className="text-zinc-500 text-[11px] hidden lg:inline">Video:</span>
              <span className="font-semibold truncate text-zinc-100">
                {currentVideo.title}
              </span>
            </div>
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border hidden sm:inline ${statusBadge.color}`}
            >
              {statusBadge.label}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 ml-1" />
          </button>
        </div>

        {/* Center: Background tasks notification pill */}
        {hasRunningTasks && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs animate-pulse shadow-sm shadow-cyan-950/30">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span className="font-medium hidden sm:inline">
              {runningTasks[0]?.title || 'Procesando en segundo plano...'}
            </span>
            <span className="font-mono text-[10px] bg-cyan-500/20 px-1.5 py-0.5 rounded-full">
              {runningTasks.length} {runningTasks.length === 1 ? 'tarea' : 'tareas'}
            </span>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Asesor de Contenido Button */}
          <button
            onClick={() => openAdvisorForVideo()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600/30 to-cyan-600/30 hover:from-violet-600/50 hover:to-cyan-600/50 border border-violet-500/40 text-xs text-zinc-100 font-bold shadow-md shadow-violet-950/20 transition-all active:scale-95 group"
            title="Abrir Asesor Estratégico de Contenido (VibeDirector)"
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Asesor de Contenido</span>
          </button>

          {/* Quick Add Video Button */}
          <button
            onClick={() => createVideoWithAdvisor()}
            className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-950/30 active:scale-95"
            title="Crear un nuevo video con entrevista del Asesor"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nuevo Video</span>
          </button>

          {/* API Key Status Pill */}
          <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              hasApiKey
                ? 'bg-zinc-900 border-zinc-800 hover:border-emerald-500/40 text-zinc-300'
                : 'bg-amber-950/30 border-amber-500/50 text-amber-300 animate-pulse'
            }`}
            title={hasApiKey ? 'Gemini API Key configurada' : 'Configurar Gemini API Key'}
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {hasApiKey ? 'Gemini Conectado' : 'Conectar API Key'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                hasApiKey ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400'
              }`}
            />
          </button>

          {/* Toggle Sidebar ADN */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-xl border transition-all ${
              isSidebarOpen
                ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="ADN del Creador (Configuración Global)"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      <ProjectManagerModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
      />
    </>
  );
};
