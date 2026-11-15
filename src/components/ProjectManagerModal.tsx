import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Film, Plus, Trash2, Edit2, Check, X, ArrowRight, Clock, Brain, Sparkles } from 'lucide-react';
import type { ScriptStatus } from '../types';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({ isOpen, onClose }) => {
  const {
    videoProjects,
    currentProjectId,
    selectVideoProject,
    createVideoProject,
    updateVideoProject,
    deleteVideoProject,
    setActiveTab,
    createVideoWithAdvisor,
    openAdvisorForVideo
  } = useApp();

  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoIdea, setNewVideoIdea] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoTitle.trim()) return;
    createVideoProject(newVideoTitle.trim(), newVideoIdea.trim());
    setNewVideoTitle('');
    setNewVideoIdea('');
    onClose();
  };

  const handleStartEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditTitle(title);
  };

  const handleSaveEdit = (id: string) => {
    if (editTitle.trim()) {
      updateVideoProject(id, { title: editTitle.trim() });
    }
    setEditingId(null);
  };

  const getStatusBadge = (status: ScriptStatus) => {
    switch (status) {
      case 'idea':
        return { label: 'En Idea', color: 'bg-zinc-800 text-zinc-300' };
      case 'ready_to_record':
        return { label: 'Listo para Grabar', color: 'bg-cyan-500/20 text-cyan-300' };
      case 'editing':
        return { label: 'Editando', color: 'bg-amber-500/20 text-amber-300' };
      case 'published':
        return { label: 'Publicado', color: 'bg-emerald-500/20 text-emerald-300' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
        {/* Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-cyan-500 to-violet-600" />

        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100">Mis Videos en Producción</h3>
              <p className="text-xs text-zinc-400">Cada video es un proyecto completo independiente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Advisor Proactive Card */}
        <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-violet-950/40 via-zinc-950 to-cyan-950/40 border border-violet-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 shrink-0">
              <Brain className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-zinc-100 truncate">¿Nuevo video en mente?</h4>
              <p className="text-[11px] text-zinc-400 truncate">VibeDirector te entrevista, evalúa tus tomas o sugiere qué grabar.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              createVideoWithAdvisor();
              onClose();
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-violet-950/40 flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Crear con Asesor</span>
          </button>
        </div>

        {/* Create new video form (Quick mode) */}
        <form onSubmit={handleCreate} className="pt-3 pb-1 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newVideoTitle}
              onChange={(e) => setNewVideoTitle(e.target.value)}
              placeholder="O escribe un título rápido (ej. Mi café en Providencia)..."
              className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!newVideoTitle.trim()}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Rápido</span>
            </button>
          </div>
        </form>

        {/* Video projects list */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 mt-2">
          {videoProjects.map((vid) => {
            const isCurrent = vid.id === currentProjectId;
            const isEditing = editingId === vid.id;
            const badge = getStatusBadge(vid.status);

            return (
              <div
                key={vid.id}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-violet-950/20 border-violet-500/40 shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      isCurrent
                        ? 'bg-violet-500/20 text-violet-400'
                        : 'bg-zinc-800/50 text-zinc-400'
                    }`}
                  >
                    <Film className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-100 outline-none focus:border-violet-500 w-full"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(vid.id)}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-zinc-400 hover:text-zinc-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-100 truncate">
                            {vid.title}
                          </span>
                          <span
                            className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5 flex items-center gap-2">
                          <span>{vid.script ? `${vid.script.blocks.length} bloques` : 'Sin guion aún'}</span>
                          <span>•</span>
                          <span>{vid.hooksPackage ? 'Hooks listos' : 'Sin hooks'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(vid.updatedAt).toLocaleDateString()}
                          </span>
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!isEditing && (
                    <>
                      <button
                        onClick={() => {
                          openAdvisorForVideo(vid.id);
                          onClose();
                        }}
                        className="p-1.5 text-zinc-400 hover:text-cyan-400 rounded-lg hover:bg-zinc-800 transition-colors"
                        title="Abrir Asesor de Contenido para este video"
                      >
                        <Brain className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleStartEdit(vid.id, vid.title)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
                        title="Renombrar video"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {videoProjects.length > 1 && (
                        <button
                          onClick={() => deleteVideoProject(vid.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors"
                          title="Eliminar video"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!isCurrent && (
                        <button
                          onClick={() => {
                            selectVideoProject(vid.id);
                            onClose();
                          }}
                          className="ml-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-violet-600 text-zinc-200 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>Abrir</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => {
              setActiveTab('boveda');
              onClose();
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            Ver Tablero Kanban General ➜
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
