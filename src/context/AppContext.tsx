import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {
  VideoProject,
  CreatorADN,
  ActiveTab,
  Script,
  HookPackage,
  AuditorResult,
  RoughCutResult,
  FinalQualityResult,
  SEOResult,
  BackgroundTask,
  ScriptStatus,
  AdvisorMessage,
  AdvisorSynthesis,
  BrollItem,
  AudienceSimulationResult,
  PredictiveRetentionReport
} from '../types';
import confetti from 'canvas-confetti';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  // Global Creator ADN (shared across all video projects)
  creatorProfile: CreatorADN;
  updateCreatorProfile: (partial: Partial<CreatorADN>) => void;

  // Video Projects (each video is an independent project)
  videoProjects: VideoProject[];
  currentVideo: VideoProject;
  currentProjectId: string;
  createVideoProject: (title?: string, rawIdea?: string) => VideoProject;
  selectVideoProject: (id: string) => void;
  updateVideoProject: (id: string, partial: Partial<VideoProject>) => void;
  updateVideoStatus: (id: string, status: ScriptStatus) => void;
  deleteVideoProject: (id: string) => void;
  duplicateVideoProject: (id: string) => VideoProject | null;
  exportBackupJSON: () => void;
  importBackupJSON: (jsonString: string) => boolean;

  // Active Video Pipeline Updaters
  setCurrentVideoHooks: (pkg: HookPackage) => void;
  setCurrentVideoSelectedHook: (hook: string) => void;
  setCurrentVideoScript: (script: Script | null, silent?: boolean) => void;
  setCurrentVideoDraftAudit: (audit: AuditorResult) => void;
  setCurrentVideoRoughCut: (roughCut: RoughCutResult) => void;
  setCurrentVideoFinalQuality: (finalQuality: FinalQualityResult) => void;
  setCurrentVideoSEO: (seo: SEOResult) => void;

  // Navigation & UI
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  backgroundTasks: BackgroundTask[];
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;

  // Teleprompter Modal
  teleprompterScript: Script | null;
  setTeleprompterScript: (script: Script | null) => void;
  openTeleprompterWithBlocks: (title: string, blocks: Script['blocks']) => void;

  // Background Task Engine
  startBackgroundTask: (type: BackgroundTask['type'], title: string) => string;
  finishBackgroundTask: (taskId: string, success: boolean, errorMsg?: string) => void;

  // Content Advisor Interactive Session
  isAdvisorOpen: boolean;
  setIsAdvisorOpen: (open: boolean) => void;
  openAdvisorForVideo: (videoId?: string) => void;
  createVideoWithAdvisor: () => VideoProject;
  addAdvisorMessage: (videoId: string, message: AdvisorMessage) => void;
  resetAdvisorChat: (videoId: string, greeting: AdvisorMessage) => void;
  applyAdvisorSynthesis: (
    videoId: string,
    synthesis: AdvisorSynthesis,
    hasClips?: boolean | null,
    clipsNotes?: string
  ) => void;

  // Audience Simulator (Focus Group)
  isSimulatorOpen: boolean;
  setIsSimulatorOpen: (open: boolean) => void;
  openAudienceSimulator: (videoId?: string) => void;
  setCurrentVideoSimulation: (result: AudienceSimulationResult) => void;

  // Predictive Retention Curve (TikTok Studio Simulado)
  isRetentionModalOpen: boolean;
  setIsRetentionModalOpen: (open: boolean) => void;
  openRetentionModal: (videoId?: string) => void;
  setCurrentVideoPredictiveRetention: (report: PredictiveRetentionReport) => void;

  // Modals & Panels
  isApiKeyModalOpen: boolean;
  setIsApiKeyModalOpen: (open: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

const STORAGE_CREATOR_KEY = 'tiktok_vibe_creator_profile_v3';
const STORAGE_VIDEOS_KEY = 'tiktok_vibe_video_projects_v3';
const STORAGE_CURRENT_VIDEO_KEY = 'tiktok_vibe_current_video_id_v3';

const DEFAULT_CREATOR: CreatorADN = {
  creatorHandle: '@torr3ji',
  nicheStyle: 'Vlogs cotidianos dinámicos, salidas/aventuras, estilo de vida, historias reales contadas con buen ritmo visual y estética cuidada',
  voiceTone: 'Chileno natural, cercano, auténtico, conversacional, cero impostado',
  equipment: 'Smartphone gama alta, cámara de acción, planos en primera persona (POV) y voz en off',
  aiModel: 'gemini-3.8-flash',
  customModelId: '',
  apiKey: ''
};

function createInitialVideo(title = 'Mi Primer Video', rawIdea = ''): VideoProject {
  return {
    id: 'vid_' + Date.now(),
    title: title.trim() || 'Nuevo Video',
    status: 'idea',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    rawIdea: rawIdea.trim(),
    format: 'Vlog de aventura / salida',
    energyLevel: 'Rápido / Frenético',
    targetDuration: '30-40s',
    hooksPackage: null,
    selectedHook: '',
    script: null,
    draftAudit: null,
    roughCut: null,
    finalQuality: null,
    seo: null,
    audienceSimulation: null,
    predictiveRetention: null
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Global Creator ADN
  const [creatorProfile, setCreatorProfile] = useState<CreatorADN>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CREATOR_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.aiModel && (parsed.aiModel.includes('2.5') || parsed.aiModel === 'gemini-3.1-pro-preview')) {
          parsed.aiModel = 'gemini-3.8-flash';
        }
        return { ...DEFAULT_CREATOR, ...parsed };
      }
    } catch (e) {
      console.error('Error loading creator profile', e);
    }
    return DEFAULT_CREATOR;
  });

  // Video Projects (each video is a project)
  const [videoProjects, setVideoProjects] = useState<VideoProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_VIDEOS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading video projects', e);
    }
    return [createInitialVideo('Mi Primer Video')];
  });

  const [currentProjectId, setCurrentProjectId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_CURRENT_VIDEO_KEY);
      if (savedId) return savedId;
    } catch (e) {}
    return videoProjects[0]?.id || 'vid_default';
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('hooks');
  const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTask[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [teleprompterScript, setTeleprompterScript] = useState<Script | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);

  // Sync creator profile
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CREATOR_KEY, JSON.stringify(creatorProfile));
    } catch (e) {}
  }, [creatorProfile]);

  // Sync video projects
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VIDEOS_KEY, JSON.stringify(videoProjects));
    } catch (e) {}
  }, [videoProjects]);

  // Sync current video ID
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CURRENT_VIDEO_KEY, currentProjectId);
    } catch (e) {}
  }, [currentProjectId]);

  const currentVideo =
    videoProjects.find((v) => v.id === currentProjectId) || videoProjects[0] || createInitialVideo();

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const updateCreatorProfile = (partial: Partial<CreatorADN>) => {
    setCreatorProfile((prev) => ({ ...prev, ...partial }));
    showToast('ADN del Creador actualizado', 'success');
  };

  const createVideoProject = (title = 'Nuevo Video', rawIdea = ''): VideoProject => {
    const newVideo = createInitialVideo(title, rawIdea);
    setVideoProjects((prev) => [newVideo, ...prev]);
    setCurrentProjectId(newVideo.id);
    showToast(`Proyecto de video "${newVideo.title}" creado`, 'success');
    return newVideo;
  };

  const selectVideoProject = (id: string) => {
    const found = videoProjects.find((v) => v.id === id);
    if (found) {
      setCurrentProjectId(id);
      showToast(`Cambiado al video: "${found.title}"`, 'info');
    }
  };

  const updateVideoProject = (id: string, partial: Partial<VideoProject>) => {
    setVideoProjects((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...partial, updatedAt: Date.now() } : v))
    );
  };

  const updateVideoStatus = (id: string, status: ScriptStatus) => {
    updateVideoProject(id, { status });
    showToast('Estado del video actualizado', 'info');
  };

  const deleteVideoProject = (id: string) => {
    if (videoProjects.length <= 1) {
      showToast('Debes mantener al menos un video en producción', 'error');
      return;
    }
    const filtered = videoProjects.filter((v) => v.id !== id);
    setVideoProjects(filtered);
    if (currentProjectId === id) {
      setCurrentProjectId(filtered[0].id);
    }
    showToast('Video eliminado', 'info');
  };

  const duplicateVideoProject = (id: string): VideoProject | null => {
    const original = videoProjects.find((v) => v.id === id);
    if (!original) return null;

    const duplicated: VideoProject = {
      ...JSON.parse(JSON.stringify(original)),
      id: 'vid_' + Date.now(),
      title: `${original.title} (Variante B)`,
      status: 'idea',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setVideoProjects((prev) => [duplicated, ...prev]);
    setCurrentProjectId(duplicated.id);
    showToast(`Video duplicado como "${duplicated.title}"`, 'success');
    return duplicated;
  };

  const exportBackupJSON = () => {
    const backupData = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      creatorProfile,
      videoProjects
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VibeDirector_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Copia de seguridad descargada (.json)', 'success');
  };

  const importBackupJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.videoProjects) && parsed.videoProjects.length > 0) {
        setVideoProjects(parsed.videoProjects);
        if (parsed.creatorProfile) {
          setCreatorProfile((prev) => ({ ...prev, ...parsed.creatorProfile }));
        }
        setCurrentProjectId(parsed.videoProjects[0].id);
        showToast('Copia de seguridad restaurada con éxito', 'success');
        return true;
      }
      throw new Error('El archivo no contiene proyectos de video válidos');
    } catch (e: any) {
      showToast(e.message || 'Error al importar archivo de copia de seguridad', 'error');
      return false;
    }
  };

  // Active Video Pipeline Updaters
  const setCurrentVideoHooks = (pkg: HookPackage) => {
    updateVideoProject(currentVideo.id, {
      hooksPackage: pkg,
      rawIdea: pkg.rawIdea,
      format: pkg.format,
      energyLevel: pkg.energyLevel
    });
  };

  const setCurrentVideoSelectedHook = (hook: string) => {
    updateVideoProject(currentVideo.id, { selectedHook: hook });
  };

  const setCurrentVideoScript = (script: Script | null, silent = false) => {
    updateVideoProject(currentVideo.id, {
      script,
      status: currentVideo.status === 'idea' ? 'ready_to_record' : currentVideo.status
    });
    if (script && !silent) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#8b5cf6', '#06b6d4', '#ec4899']
        });
      } catch {}
      showToast(`Guion guardado en "${currentVideo.title}"`, 'success');
    }
  };

  const setCurrentVideoDraftAudit = (draftAudit: AuditorResult) => {
    updateVideoProject(currentVideo.id, { draftAudit });
  };

  const setCurrentVideoRoughCut = (roughCut: RoughCutResult) => {
    updateVideoProject(currentVideo.id, { roughCut });
  };

  const setCurrentVideoFinalQuality = (finalQuality: FinalQualityResult) => {
    updateVideoProject(currentVideo.id, { finalQuality });
  };

  const setCurrentVideoSEO = (seo: SEOResult) => {
    updateVideoProject(currentVideo.id, { seo });
  };

  const openTeleprompterWithBlocks = (title: string, blocks: Script['blocks']) => {
    const tempScript: Script = {
      id: 'tele_' + Date.now(),
      title,
      hookSummary: title,
      targetDuration: 'Variable',
      narrativeStructure: '',
      musicAtmosphere: '',
      blocks,
      infiniteLoopTrick: '',
      brollChecklist: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setTeleprompterScript(tempScript);
  };

  const startBackgroundTask = (type: BackgroundTask['type'], title: string): string => {
    const id = 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newTask: BackgroundTask = {
      id,
      type,
      title,
      status: 'running',
      progressLabel: 'Analizando con Gemini 3.8 Flash...',
      startTime: Date.now(),
      projectId: currentVideo.id
    };
    setBackgroundTasks((prev) => [newTask, ...prev]);
    return id;
  };

  const finishBackgroundTask = (taskId: string, success: boolean, errorMsg?: string) => {
    setBackgroundTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: success ? 'completed' : 'error',
              error: errorMsg,
              progressLabel: success ? 'Listo' : 'Error'
            }
          : t
      )
    );

    setTimeout(() => {
      setBackgroundTasks((prev) => prev.filter((t) => t.id !== taskId));
    }, 6000);
  };

  const openAdvisorForVideo = (videoId?: string) => {
    if (videoId) {
      selectVideoProject(videoId);
    }
    setIsAdvisorOpen(true);
  };

  const createVideoWithAdvisor = (): VideoProject => {
    const num = videoProjects.length + 1;
    const newVideo = createInitialVideo(`Video #${num}`, '');
    setVideoProjects((prev) => [newVideo, ...prev]);
    setCurrentProjectId(newVideo.id);
    setIsAdvisorOpen(true);
    showToast(`Iniciando sesión estratégica para "${newVideo.title}"`, 'info');
    return newVideo;
  };

  const addAdvisorMessage = (videoId: string, message: AdvisorMessage) => {
    setVideoProjects((prev) =>
      prev.map((v) => {
        if (v.id !== videoId) return v;
        const currentChat = v.advisorChat || [];
        return {
          ...v,
          advisorChat: [...currentChat, message],
          updatedAt: Date.now()
        };
      })
    );
  };

  const resetAdvisorChat = (videoId: string, greeting: AdvisorMessage) => {
    setVideoProjects((prev) =>
      prev.map((v) => {
        if (v.id !== videoId) return v;
        return {
          ...v,
          advisorChat: [greeting],
          updatedAt: Date.now()
        };
      })
    );
  };

  const applyAdvisorSynthesis = (
    videoId: string,
    synthesis: AdvisorSynthesis,
    hasClips?: boolean | null,
    clipsNotes?: string
  ) => {
    setVideoProjects((prev) =>
      prev.map((v) => {
        if (v.id !== videoId) return v;

        const updated: VideoProject = {
          ...v,
          title: synthesis.refinedTitle?.trim() || v.title,
          rawIdea: synthesis.refinedIdea?.trim() || v.rawIdea,
          hasRecordedFootage: hasClips !== undefined ? hasClips : v.hasRecordedFootage,
          recordedClipsNotes: clipsNotes !== undefined ? clipsNotes : v.recordedClipsNotes,
          selectedHook: synthesis.visualHookProposal || v.selectedHook,
          updatedAt: Date.now()
        };

        if (synthesis.brollShotsToRecord && synthesis.brollShotsToRecord.length > 0) {
          const newBrollItems: BrollItem[] = synthesis.brollShotsToRecord.map((shot, idx) => ({
            id: `broll_adv_${Date.now()}_${idx}`,
            shotDescription: shot.shotDescription,
            cameraAngle: `${shot.cameraAngle} — ${shot.whyImportant}`,
            completed: false
          }));

          if (updated.script) {
            updated.script = {
              ...updated.script,
              brollChecklist: [...updated.script.brollChecklist, ...newBrollItems]
            };
          } else {
            updated.script = {
              id: 'script_' + Date.now(),
              title: updated.title,
              hookSummary: synthesis.visualHookProposal || updated.title,
              targetDuration: '30-40s',
              narrativeStructure: 'Gancho Visual -> Tensión/Desarrollo -> Clímax -> Bucle',
              musicAtmosphere: 'Edición dinámica con SFX cada 3s',
              blocks: [],
              infiniteLoopTrick: '',
              brollChecklist: newBrollItems,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
          }
        }

        return updated;
      })
    );

    try {
      confetti({
        particleCount: 45,
        spread: 70,
        origin: { y: 0.75 },
        colors: ['#8b5cf6', '#06b6d4', '#ec4899']
      });
    } catch {}

    showToast('¡Estrategia y tomas B-Roll cargadas al proyecto!', 'success');
  };

  const openAudienceSimulator = (videoId?: string) => {
    if (videoId) {
      selectVideoProject(videoId);
    }
    setIsSimulatorOpen(true);
  };

  const setCurrentVideoSimulation = (audienceSimulation: AudienceSimulationResult) => {
    updateVideoProject(currentVideo.id, { audienceSimulation });
    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#8b5cf6', '#06b6d4', '#10b981']
      });
    } catch {}
    showToast(`Simulación de audiencia guardada en "${currentVideo.title}"`, 'success');
  };

  const openRetentionModal = (videoId?: string) => {
    if (videoId) {
      selectVideoProject(videoId);
    }
    setIsRetentionModalOpen(true);
  };

  const setCurrentVideoPredictiveRetention = (predictiveRetention: PredictiveRetentionReport) => {
    updateVideoProject(currentVideo.id, { predictiveRetention });
    try {
      confetti({
        particleCount: 35,
        spread: 65,
        origin: { y: 0.75 },
        colors: ['#06b6d4', '#8b5cf6', '#10b981']
      });
    } catch {}
    showToast(`Curva predictiva de retención calculada para "${currentVideo.title}"`, 'success');
  };

  return (
    <AppContext.Provider
      value={{
        creatorProfile,
        updateCreatorProfile,
        videoProjects,
        currentVideo,
        currentProjectId,
        createVideoProject,
        selectVideoProject,
        updateVideoProject,
        updateVideoStatus,
        deleteVideoProject,
        duplicateVideoProject,
        exportBackupJSON,
        importBackupJSON,
        setCurrentVideoHooks,
        setCurrentVideoSelectedHook,
        setCurrentVideoScript,
        setCurrentVideoDraftAudit,
        setCurrentVideoRoughCut,
        setCurrentVideoFinalQuality,
        setCurrentVideoSEO,
        activeTab,
        setActiveTab,
        backgroundTasks,
        toasts,
        showToast,
        dismissToast,
        teleprompterScript,
        setTeleprompterScript,
        openTeleprompterWithBlocks,
        startBackgroundTask,
        finishBackgroundTask,
        isApiKeyModalOpen,
        setIsApiKeyModalOpen,
        isSidebarOpen,
        setIsSidebarOpen,
        isAdvisorOpen,
        setIsAdvisorOpen,
        openAdvisorForVideo,
        createVideoWithAdvisor,
        addAdvisorMessage,
        resetAdvisorChat,
        applyAdvisorSynthesis,
        isSimulatorOpen,
        setIsSimulatorOpen,
        openAudienceSimulator,
        setCurrentVideoSimulation,
        isRetentionModalOpen,
        setIsRetentionModalOpen,
        openRetentionModal,
        setCurrentVideoPredictiveRetention
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
};
