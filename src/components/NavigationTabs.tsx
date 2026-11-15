import React from 'react';
import { useApp } from '../context/AppContext';
import type { ActiveTab } from '../types';
import {
  Sparkles,
  Clapperboard,
  Scissors,
  Stethoscope,
  Rocket,
  Search,
  FolderKanban
} from 'lucide-react';

interface TabItem {
  id: ActiveTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  tag?: string;
}

const TABS: TabItem[] = [
  { id: 'hooks', label: 'Laboratorio de Hooks (A/B)', shortLabel: 'Hooks A/B', icon: Sparkles },
  { id: 'script', label: 'Arquitecto de Guiones', shortLabel: 'Guion 2a2', icon: Clapperboard },
  { id: 'audit', label: 'Destrozador de Borradores', shortLabel: 'Auditor', icon: Scissors },
  { id: 'rough_cut', label: 'Doctor de Edición (Corte Rudo)', shortLabel: 'Corte Rudo', icon: Stethoscope, tag: 'Nuevo' },
  { id: 'final_quality', label: 'Control de Calidad (Video Final)', shortLabel: 'Control Final', icon: Rocket, tag: 'Nuevo' },
  { id: 'seo', label: 'Estrategia SEO & Comentarios', shortLabel: 'SEO & Copy', icon: Search },
  { id: 'boveda', label: 'Bóveda de Guiones (Kanban)', shortLabel: 'Bóveda', icon: FolderKanban }
];

export const NavigationTabs: React.FC = () => {
  const { activeTab, setActiveTab, backgroundTasks, videoProjects } = useApp();

  return (
    <div className="bg-zinc-950 border-b border-zinc-800/80 px-4 lg:px-6 overflow-x-auto scrollbar-none">
      <nav className="flex items-center gap-1.5 md:gap-2 py-2 min-w-max">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const isTaskRunning = backgroundTasks.some(
            (t) => t.type === (tab.id === 'script' ? 'script' : tab.id) && t.status === 'running'
          );

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 select-none ${
                isActive
                  ? 'bg-zinc-850 text-white border border-violet-500/50 shadow-md shadow-violet-950/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  isActive ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-300'
                }`}
              />

              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">{tab.shortLabel}</span>

              {tab.tag && (
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  {tab.tag}
                </span>
              )}

              {/* Video projects count in Boveda */}
              {tab.id === 'boveda' && videoProjects.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-violet-600/30 text-violet-300 text-[10px] font-mono font-bold">
                  {videoProjects.length}
                </span>
              )}

              {/* Active task dot */}
              {isTaskRunning && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
              )}

              {/* Bottom active line */}
              {isActive && (
                <div className="absolute -bottom-2 left-3 right-3 h-0.5 bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
