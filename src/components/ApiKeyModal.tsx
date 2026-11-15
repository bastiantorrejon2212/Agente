import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Key, ShieldCheck, ExternalLink, X, Check, Eye, EyeOff } from 'lucide-react';

export const ApiKeyModal: React.FC = () => {
  const { isApiKeyModalOpen, setIsApiKeyModalOpen, creatorProfile, updateCreatorProfile, showToast } = useApp();
  const [keyInput, setKeyInput] = useState(creatorProfile.apiKey || '');
  const [showKey, setShowKey] = useState(false);

  if (!isApiKeyModalOpen) return null;

  const handleSave = () => {
    const cleanKey = keyInput.trim();
    if (!cleanKey) {
      showToast('Por favor introduce una API Key válida', 'error');
      return;
    }

    updateCreatorProfile({ apiKey: cleanKey });
    showToast('API Key guardada de forma segura en tu navegador', 'success');
    setIsApiKeyModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-cyan-500 to-violet-600" />

        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100">Configuración de Gemini API Key</h3>
              <p className="text-xs text-zinc-400">Google AI Studio (Gratuito / Sin costo extra)</p>
            </div>
          </div>
          <button
            onClick={() => setIsApiKeyModalOpen(false)}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 leading-relaxed space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>100% Privado y Directo a Google</span>
            </div>
            <p>
              Tu clave se almacena exclusivamente en el almacenamiento local de tu navegador (LocalStorage). Las peticiones van directo al endpoint oficial de Google Gemini sin servidores intermedios.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none font-mono pr-10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <p className="text-xs text-zinc-400">
            Esta clave alimentará el motor cognitivo de VibeDirector para todos tus proyectos de video.
          </p>

          <div className="pt-2">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
            >
              <span>Obtener API Key gratis en Google AI Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={() => setIsApiKeyModalOpen(false)}
            className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-violet-900/30 flex items-center gap-2 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Clave</span>
          </button>
        </div>
      </div>
    </div>
  );
};
