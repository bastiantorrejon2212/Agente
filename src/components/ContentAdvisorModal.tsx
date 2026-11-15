import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { runAdvisorTurn } from '../services/geminiService';
import type { AdvisorMessage, AdvisorSynthesis } from '../types';
import {
  Brain,
  X,
  Send,
  Sparkles,
  Camera,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Zap,
  ChevronRight
} from 'lucide-react';

const INITIAL_GREETING: AdvisorMessage = {
  id: 'msg_welcome',
  sender: 'vibedirector',
  text: '¡Wena! Aquí VibeDirector. Antes de ponerte a grabar a lo loco o redactar un guion que nadie va a ver, cuéntame: ¿De qué trata este nuevo video o qué idea tienes en mente?',
  timestamp: Date.now(),
  options: [
    'Vlog o día conmigo / salida',
    'Tutorial o truco en segundos',
    'Review / prueba de producto honesta',
    'Historia o anécdota personal'
  ]
};

export const ContentAdvisorModal: React.FC = () => {
  const {
    isAdvisorOpen,
    setIsAdvisorOpen,
    currentVideo,
    creatorProfile,
    addAdvisorMessage,
    applyAdvisorSynthesis,
    setActiveTab,
    showToast,
    setIsApiKeyModalOpen
  } = useApp();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages: AdvisorMessage[] =
    currentVideo.advisorChat && currentVideo.advisorChat.length > 0
      ? currentVideo.advisorChat
      : [INITIAL_GREETING];

  const latestSynthesis: AdvisorSynthesis | undefined = messages
    .slice()
    .reverse()
    .find((m) => m.synthesis)?.synthesis;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isAdvisorOpen) return null;

  const handleSendMessage = async (textToSend: string) => {
    const cleanText = textToSend.trim();
    if (!cleanText || isLoading) return;

    if (!creatorProfile.apiKey) {
      showToast('Configura tu Gemini API Key para hablar con el Asesor', 'error');
      setIsApiKeyModalOpen(true);
      return;
    }

    const userMsg: AdvisorMessage = {
      id: 'msg_user_' + Date.now(),
      sender: 'user',
      text: cleanText,
      timestamp: Date.now()
    };

    addAdvisorMessage(currentVideo.id, userMsg);
    setInput('');
    setIsLoading(true);

    try {
      const allHistory = [...messages, userMsg];
      const response = await runAdvisorTurn(
        allHistory,
        cleanText,
        creatorProfile,
        {
          title: currentVideo.title,
          rawIdea: currentVideo.rawIdea,
          hasRecordedFootage: currentVideo.hasRecordedFootage,
          recordedClipsNotes: currentVideo.recordedClipsNotes
        }
      );

      const aiMsg: AdvisorMessage = {
        id: 'msg_ai_' + Date.now(),
        sender: 'vibedirector',
        text: response.message,
        timestamp: Date.now(),
        options: response.suggestedQuickReplies,
        synthesis: response.synthesis
      };

      addAdvisorMessage(currentVideo.id, aiMsg);

      // If synthesis was returned, automatically update the video in background
      if (response.synthesis) {
        applyAdvisorSynthesis(
          currentVideo.id,
          response.synthesis,
          currentVideo.hasRecordedFootage,
          cleanText
        );
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error en la respuesta del asesor', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    const freshGreeting: AdvisorMessage = {
      ...INITIAL_GREETING,
      id: 'msg_welcome_' + Date.now(),
      timestamp: Date.now()
    };
    currentVideo.advisorChat = [freshGreeting];
    addAdvisorMessage(currentVideo.id, freshGreeting);
    showToast('Sesión de asesoría reiniciada', 'info');
  };

  const handleApplyAndGo = (tabToGo: 'hooks' | 'script') => {
    if (latestSynthesis) {
      applyAdvisorSynthesis(
        currentVideo.id,
        latestSynthesis,
        currentVideo.hasRecordedFootage,
        currentVideo.recordedClipsNotes
      );
    }
    setIsAdvisorOpen(false);
    setActiveTab(tabToGo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-3xl w-full h-[90vh] md:h-[85vh] shadow-2xl flex flex-col relative overflow-hidden">
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-cyan-400 to-violet-600" />

        {/* Modal Header */}
        <div className="p-4 md:px-6 md:py-4 border-b border-zinc-800 flex items-center justify-between gap-3 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-violet-950/40">
                <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                  <Brain className="w-5 h-5 text-violet-400" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-zinc-100 tracking-tight">
                  VibeDirector
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30">
                  Asesor de Contenido
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <span>Planificando:</span>
                <strong className="text-zinc-200 truncate max-w-[200px]">{currentVideo.title}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChat}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
              title="Reiniciar asesoría de este video"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsAdvisorOpen(false)}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 scrollbar-thin">
          {messages.map((msg, idx) => {
            const isAI = msg.sender === 'vibedirector';
            return (
              <div
                key={msg.id || idx}
                className={`flex flex-col ${isAI ? 'items-start' : 'items-end'} animate-fade-in`}
              >
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <span className="text-[11px] font-bold text-zinc-400">
                    {isAI ? 'VibeDirector' : 'Tú'}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`p-4 md:p-5 rounded-2xl max-w-[90%] md:max-w-[85%] text-xs md:text-sm leading-relaxed ${
                    isAI
                      ? 'bg-zinc-950 border border-zinc-800 text-zinc-200 shadow-md'
                      : 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-medium shadow-lg shadow-violet-950/30'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Synthesis Box if AI provided one */}
                  {msg.synthesis && (
                    <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-3 bg-zinc-900/60 -mx-2 -mb-2 p-3.5 rounded-xl border border-violet-500/20">
                      <div className="flex items-center gap-2 text-violet-400 font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span>Síntesis Estratégica del Video</span>
                      </div>

                      {msg.synthesis.refinedTitle && (
                        <div className="text-xs">
                          <span className="text-zinc-500 font-semibold">Título sugerido: </span>
                          <strong className="text-zinc-100 font-bold">{msg.synthesis.refinedTitle}</strong>
                        </div>
                      )}

                      {msg.synthesis.visualHookProposal && (
                        <div className="p-2.5 rounded-lg bg-zinc-950 border border-cyan-500/30 text-xs">
                          <span className="text-cyan-400 font-bold flex items-center gap-1.5 mb-1">
                            <Zap className="w-3.5 h-3.5" />
                            Gancho Visual Sugerido (Segundo 0.0):
                          </span>
                          <p className="text-zinc-300 font-medium">{msg.synthesis.visualHookProposal}</p>
                        </div>
                      )}

                      {msg.synthesis.brollShotsToRecord && msg.synthesis.brollShotsToRecord.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-zinc-400 font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-amber-400" />
                            Tomas sugeridas para salir a grabar / usar:
                          </span>
                          <div className="grid grid-cols-1 gap-1.5">
                            {msg.synthesis.brollShotsToRecord.map((shot, sIdx) => (
                              <div
                                key={sIdx}
                                className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] flex items-start gap-2"
                              >
                                <span className="font-mono text-cyan-400 font-bold">#{sIdx + 1}</span>
                                <div>
                                  <strong className="text-zinc-200">{shot.shotDescription}</strong>
                                  <p className="text-zinc-400 text-[10px] mt-0.5">
                                    <span className="text-amber-400">{shot.cameraAngle}</span> — {shot.whyImportant}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Reply Chips */}
                {isAI && msg.options && msg.options.length > 0 && idx === messages.length - 1 && (
                  <div className="flex flex-wrap gap-2 mt-3 pl-1 max-w-[90%]">
                    {msg.options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() => handleSendMessage(opt)}
                        disabled={isLoading}
                        className="px-3.5 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 hover:border-violet-500/60 hover:bg-violet-950/20 text-zinc-300 hover:text-violet-300 text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span>{opt}</span>
                        <ChevronRight className="w-3 h-3 text-zinc-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 w-fit animate-pulse">
              <Sparkles className="w-4 h-4 text-violet-400 animate-spin" />
              <span className="text-xs text-zinc-400 font-medium">
                VibeDirector analizando psicología de retención y tomas...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Bar: Action buttons if synthesis ready + Message Input */}
        <div className="p-4 md:p-5 border-t border-zinc-800 bg-zinc-950/80 space-y-3">
          {latestSynthesis && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-violet-950/30 border border-violet-500/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-zinc-300">
                  Concepto listo. ¿Quieres saltar directo a estructurar el guion o los hooks?
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleApplyAndGo('hooks')}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  <span>Hooks A/B</span>
                </button>
                <button
                  onClick={() => handleApplyAndGo('script')}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-violet-950/40"
                >
                  <span>Ir al Guion</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Form input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Responde a VibeDirector (o cuéntale tus ideas y tomas grabadas)..."
              disabled={isLoading}
              className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-2xl px-4 py-3 text-xs md:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-violet-950/30 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
