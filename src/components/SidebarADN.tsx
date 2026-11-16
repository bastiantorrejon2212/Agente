import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  UserCircle,
  Sparkles,
  Cpu,
  Video,
  Mic,
  Save,
  Key,
  Eye,
  EyeOff,
  ChevronLeft,
  Info,
  ShieldCheck
} from 'lucide-react';

export const SidebarADN: React.FC = () => {
  const { creatorProfile, updateCreatorProfile, isSidebarOpen, setIsSidebarOpen, hasServerKey } = useApp();

  const [creatorHandle, setCreatorHandle] = useState(creatorProfile.creatorHandle);
  const [nicheStyle, setNicheStyle] = useState(creatorProfile.nicheStyle);
  const [voiceTone, setVoiceTone] = useState(creatorProfile.voiceTone);
  const [equipment, setEquipment] = useState(creatorProfile.equipment);
  const [aiModel, setAiModel] = useState(creatorProfile.aiModel || 'gemini-3.8-flash');
  const [customModelId, setCustomModelId] = useState(creatorProfile.customModelId || '');
  const [apiKey, setApiKey] = useState(creatorProfile.apiKey || '');
  const [showKey, setShowKey] = useState(false);

  React.useEffect(() => {
    setCreatorHandle(creatorProfile.creatorHandle);
    setNicheStyle(creatorProfile.nicheStyle);
    setVoiceTone(creatorProfile.voiceTone);
    setEquipment(creatorProfile.equipment);
    setAiModel(creatorProfile.aiModel || 'gemini-3.8-flash');
    setCustomModelId(creatorProfile.customModelId || '');
    setApiKey(creatorProfile.apiKey || '');
  }, [creatorProfile]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCreatorProfile({
      creatorHandle: creatorHandle.trim(),
      nicheStyle: nicheStyle.trim(),
      voiceTone: voiceTone.trim(),
      equipment: equipment.trim(),
      aiModel,
      customModelId: customModelId.trim(),
      apiKey: apiKey.trim()
    });
  };

  if (!isSidebarOpen) {
    return null;
  }

  return (
    <aside className="w-80 shrink-0 bg-zinc-900/90 border-r border-zinc-800/80 p-5 flex flex-col h-[calc(100vh-57px)] overflow-y-auto z-30 transition-all duration-300">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
            <UserCircle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">ADN del Creador</h2>
            <p className="text-[11px] text-zinc-400">Perfil Global (Aplica a todos los videos)</p>
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          title="Colapsar panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSave} className="py-4 space-y-4 flex-1">
        {/* Creator Handle */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <span>Alias / Creador</span>
          </label>
          <input
            type="text"
            value={creatorHandle}
            onChange={(e) => setCreatorHandle(e.target.value)}
            placeholder="@torr3ji"
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
          />
        </div>

        {/* Niche & Style */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Video className="w-3 h-3 text-cyan-400" />
            <span>Nicho y Estilo</span>
          </label>
          <textarea
            rows={3}
            value={nicheStyle}
            onChange={(e) => setNicheStyle(e.target.value)}
            placeholder="Vlogs cotidianos dinámicos, salidas, estética cuidada..."
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl p-2.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors leading-relaxed"
          />
        </div>

        {/* Tone of Voice */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Mic className="w-3 h-3 text-violet-400" />
            <span>Tono de Voz</span>
          </label>
          <textarea
            rows={2}
            value={voiceTone}
            onChange={(e) => setVoiceTone(e.target.value)}
            placeholder="Chileno natural, cercano, ágil, cero impostado..."
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl p-2.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors leading-relaxed"
          />
        </div>

        {/* Equipment */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Equipo Disponible</span>
          </label>
          <input
            type="text"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            placeholder="Smartphone gama alta, cámara acción, POV..."
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
          />
        </div>

        {/* AI Engine Selector */}
        <div className="pt-2 border-t border-zinc-800">
          <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Motor de IA (Razonamiento)</span>
          </label>
          <select
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none transition-colors cursor-pointer"
          >
            <option value="gemini-3.8-flash">gemini-3.8-flash (Recomendado Google AI - Cuota Activa Free Tier)</option>
            <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Máximo Razonamiento - Requiere Billing)</option>
            <option value="gemini-1.5-pro">gemini-1.5-pro (Estable GA)</option>
            <option value="custom">Custom / Experimental (Modelo manual)</option>
          </select>

          {aiModel === 'custom' && (
            <div className="mt-2">
              <input
                type="text"
                value={customModelId}
                onChange={(e) => setCustomModelId(e.target.value)}
                placeholder="ID de modelo (ej. gemini-3.8-flash)"
                className="w-full bg-zinc-950 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-cyan-200 font-mono placeholder-zinc-600 outline-none"
              />
            </div>
          )}
        </div>

        {/* API Key */}
        <div className="pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Gemini API Key</span>
            </label>
            {hasServerKey && (
              <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>Privada en Servidor</span>
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasServerKey ? '●●●●●●●●●●●● (Protegida en Vercel)' : 'AIzaSy...'}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none font-mono pr-8 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
            <Info className="w-3 h-3 shrink-0" />
            <span>
              {hasServerKey
                ? 'Protegida en las variables de entorno de Vercel (Oculta para visitantes).'
                : 'Se guarda en tu navegador y aplica a todos tus videos.'}
            </span>
          </p>
        </div>

        <button
          type="submit"
          className="w-full mt-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-950/40 transition-all active:scale-[0.98]"
        >
          <Save className="w-4 h-4" />
          <span>Guardar ADN Global</span>
        </button>
      </form>
    </aside>
  );
};
