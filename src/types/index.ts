export interface CreatorADN {
  creatorHandle: string;
  nicheStyle: string;
  voiceTone: string;
  equipment: string;
  aiModel: string;
  customModelId: string;
  apiKey: string;
}

export interface HookItem {
  angleTitle: string;
  angleType: 'curiosity' | 'conflict' | 'pov' | 'polemic';
  visualHook: string; // Trinidad: Visual (segundo 0.0)
  textHook: string;   // Trinidad: Textual (4-7 palabras max)
  audioHook: string;  // Trinidad: Auditivo (primera oración exacta)
  retentionPrediction: number; // Porcentaje predicho ej. 84%
  psychologicalReasoning: string;
}

export interface HookPackage {
  id: string;
  timestamp: number;
  rawIdea: string;
  format: string;
  energyLevel: string;
  hooks: HookItem[];
}

export type SpeedStatus = 'optimal' | 'slow' | 'fast' | 'extreme';

export interface ScriptBlock {
  id: string;
  timeRange: string;      // ej. "0:00 - 0:04"
  durationSeconds: number;// ej. 4
  cameraAction: string;   // Cámara y acción física
  spokenText: string;     // Voz en off / Locución
  overlayTextSfx: string; // Texto en pantalla + SFX / Pattern interrupt
  wordsCount: number;
  wordsPerSecond: number; // Calculado
  speedStatus: SpeedStatus;
}

export interface BrollItem {
  id: string;
  shotDescription: string;
  cameraAngle: string;
  completed: boolean;
  notes?: string;
}

export type ScriptStatus = 'idea' | 'ready_to_record' | 'editing' | 'published';

export interface Script {
  id: string;
  title: string;
  hookSummary: string;
  targetDuration: string;
  narrativeStructure: string;
  musicAtmosphere: string;
  blocks: ScriptBlock[];
  infiniteLoopTrick: string;
  brollChecklist: BrollItem[];
  createdAt: number;
  updatedAt: number;
}

export interface ScrollAlert {
  timestampOrPhrase: string;
  reason: string;
  cutRecommendation: string;
}

export interface AuditorResult {
  retentionScore: number;
  scoreCategory: 'critico' | 'regular' | 'bueno' | 'viral';
  filterlessDiagnosis: string;
  scrollAlerts: ScrollAlert[];
  reEngineeredScript: {
    narrativeSummary: string;
    blocks: ScriptBlock[];
    infiniteLoopTrick: string;
  };
}

export interface RoughCutSilenceCut {
  timestamp: string;
  issue: string;
  cutSuggestion: string;
}

export interface RoughCutInsertion {
  timestamp: string;
  type: 'broll' | 'sfx' | 'zoom' | 'transition';
  instruction: string;
}

export interface RoughCutSceneReorder {
  currentPosition: string;
  suggestedPosition: string;
  rationale: string;
}

export interface RoughCutResult {
  retentionScore: number;
  silenceCuts: RoughCutSilenceCut[];
  insertions: RoughCutInsertion[];
  sceneReordering: RoughCutSceneReorder[];
  summaryAdvice: string;
}

export type FinalVerdict = 'LISTO_PARA_PUBLICAR' | 'AJUSTAR_ANTES_DE_SUBIR';

export interface FinalQualityResult {
  verdict: FinalVerdict;
  overallScore: number;
  hookScore: number;
  hookFeedback: string;
  midRetentionScore: number;
  midRetentionFeedback: string;
  loopScore: number;
  loopFeedback: string;
  predictedRetentionRate: number;
  shareSaveProbability: 'Baja' | 'Media' | 'Alta' | 'Viral / Explosiva';
  shareSaveAnalysis: string;
  finalLaunchTip: string;
}

export interface SEOResult {
  copies: string[];
  microKeywords: string[];
  hashtags: string[];
  pinnedComments: string[];
}

export interface BackgroundTask {
  id: string;
  type: 'hooks' | 'script' | 'audit' | 'rough_cut' | 'final_quality' | 'seo';
  title: string;
  status: 'running' | 'completed' | 'error';
  progressLabel: string;
  startTime: number;
  projectId: string;
  error?: string;
}

export interface AdvisorBrollSuggestion {
  shotDescription: string;
  cameraAngle: string;
  whyImportant: string;
}

export interface AdvisorSynthesis {
  refinedTitle?: string;
  refinedIdea?: string;
  visualHookProposal?: string;
  brollShotsToRecord?: AdvisorBrollSuggestion[];
  readyForScript?: boolean;
}

export interface AdvisorMessage {
  id: string;
  sender: 'vibedirector' | 'user';
  text: string;
  timestamp: number;
  options?: string[];
  synthesis?: AdvisorSynthesis;
}

// CADA VIDEO ES UN PROYECTO COMPLETO CON SU PIPELINE
export interface VideoProject {
  id: string;
  title: string;
  status: ScriptStatus;
  createdAt: number;
  updatedAt: number;
  
  // Pipeline del video
  rawIdea: string;
  format: string;
  energyLevel: string;
  targetDuration: string;

  // Asesor de contenido interactivo
  advisorChat?: AdvisorMessage[];
  hasRecordedFootage?: boolean | null;
  recordedClipsNotes?: string;
  
  hooksPackage: HookPackage | null;
  selectedHook: string;
  script: Script | null;
  draftAudit: AuditorResult | null;
  roughCut: RoughCutResult | null;
  finalQuality: FinalQualityResult | null;
  seo: SEOResult | null;
}

// Retrocompatibilidad de tipo
export type Project = VideoProject;

export type ActiveTab = 'hooks' | 'script' | 'audit' | 'rough_cut' | 'final_quality' | 'seo' | 'boveda';
