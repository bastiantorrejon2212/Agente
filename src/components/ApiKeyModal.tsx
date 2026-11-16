import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Key, ShieldCheck, ExternalLink, X, Check, Eye, EyeOff } from 'lucide-react';

export const ApiKeyModal: React.FC = () => {
  const {
    isApiKeyModalOpen,
    setIsApiKeyModalOpen,
    creatorProfile,
    updateCreatorProfile,
    showToast,
    hasServerKey
  } = useApp();
  const [keyInput, setKeyInput] = useState(creatorProfile.apiKey || '');
  const [showKey, setShowKey] = useState(false);

  if (!isApiKeyModalOpen) return null;

  const handleSave = () => {
    const cleanKey = keyInput.trim();
    if (!cleanKey && !hasServerKey) {
      showToast('Por favor introduce una API Key válida', 'error');
      return;
    }

    updateCreatorProfile({ apiKey: cleanKey });
    showToast(
      cleanKey
        ? 'API Key guardada en tu navegador'
        : 'Usando clave privada de Vercel',
      'success'
    );
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
          {hasServerKey ? (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 leading-relaxed space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>API Key Protegida en Servidor Vercel (100% Privada)</span>
              </div>
              <p>
                Tu clave de Gemini está configurada de forma segura en las variables de entorno de <strong>Vercel</strong> (<code className="bg-emerald-950 px-1 py-0.5 rounded text-emerald-300 font-mono">GEMINI_API_KEY</code>).
              </p>
              <p className="text-[11px] text-emerald-300/80">
                🔒 Las llamadas se procesan en el backend serverless. <strong>Ningún visitante puede ver, inspeccionar en DevTools ni extraer tu clave</strong> desde el navegador.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 leading-relaxed space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Modo Privado en Vercel Recomendado</span>
              </div>
              <p>
                Para que tu clave sea 100% privada e invisible para cualquier visitante, añade la variable de entorno <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-cyan-300 font-mono font-bold">GEMINI_API_KEY</code> en tu panel de Vercel (<strong>Project Settings → Environment Variables</strong>).
              </p>
              <p className="text-[11px] text-zinc-400">
                También puedes ingresar una clave manual aquí abajo para pruebas en este navegador.
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                {hasServerKey ? 'Clave Manual de Anulación (Opcional)' : 'Google Gemini API Key'}
              </label>
              {hasServerKey && (
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Activa en Servidor
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={hasServerKey ? '●●●●●●●●●●●● (Protegida en Servidor Vercel)' : 'AIzaSy...'}
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
