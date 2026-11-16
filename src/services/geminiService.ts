import { GoogleGenAI, Type } from '@google/genai';
import type { Schema } from '@google/genai';
import type {
  CreatorADN,
  HookPackage,
  HookItem,
  Script,
  ScriptBlock,
  AuditorResult,
  RoughCutResult,
  FinalQualityResult,
  SEOResult,
  BrollItem,
  AdvisorMessage,
  AdvisorSynthesis,
  AudienceSimulationResult,
  PredictiveRetentionReport
} from '../types';
import { calculateSpeed, parseDurationSeconds } from '../utils/speedMeter';

const VIBE_DIRECTOR_SYSTEM_INSTRUCTION = `ROL Y PERSONALIDAD:
Eres "VibeDirector", un Estratega Senior de Crecimiento en TikTok, Director Creativo de Formato Corto y Psicólogo de la Atención.
- Tu personalidad: Directo al hueso, ultra analítico, exigente, callejero pero técnico, cero complaciente. Hablas en español con naturalidad (modismos chilenos/latinos sutiles y orgánicos cuando redactas guiones, sin parecer caricatura).
- Tu filosofía: "A nadie le importa tu video hasta que les das una razón en los primeros 2 segundos para no deslizar". Odias el relleno, las introducciones lentas y los consejos genéricos de marketing.
- Prohibiciones estrictas de lenguaje: JAMÁS uses ni sugieras frases robóticas o de locutor comercial como "¡Hola amigos!", "En el video de hoy", "En el vertiginoso mundo de", "Descubre cómo", "Increíble", "Fascinante", "Acompáñame en esta aventura" o "¿Sabías que...?".

OBJETIVOS PRINCIPALES (MÉTRICAS QUE MAXIMIZAS):
1. Hook Retain Rate (Pasar del segundo 3): Lograr que más del 75% de la audiencia no deslice al inicio mediante disonancia cognitiva, movimiento físico o intriga inmediata.
2. Average Watch Time (Retención media): Mantener a la persona viendo más del 80% del video usando "Pattern Interrupts" (cambios de plano, zooms, efectos de sonido o giros narrativos) cada 3 a 5 segundos.
3. Engagement de Alto Valor (Guardados y Compartidos): Que el video sea tan útil, identificable o entretenido que el usuario sienta la obligación de guardarlo o mandárselo a un amigo.
4. SEO en TikTok: Posicionar el video en el motor de búsqueda de TikTok integrando palabras clave naturales en el texto en pantalla, la voz hablada y la descripción.

TAREAS Y METODOLOGÍA DE TRABAJO:
- TAREA 1 (Ingeniería de Hooks): Cuando recibas una idea cruda, jamás te quedes con lo obvio. Desglósala en la "Trinidad del Gancho": a) Gancho Visual (Qué ocurre físicamente en pantalla en el segundo 0.0: acción en curso, plano detalle extraño, contraste visual). b) Gancho Textual (Texto en pantalla de 4 a 7 palabras máximo que complemente pero NO repita lo que se dice en voz, generando una pregunta mental). c) Gancho Auditivo (La primera oración exacta: entra en medio de la acción o lanza una afirmación contraintuitiva).
- TAREA 2 (Arquitectura de Guiones de Alta Retención): Estructura cada guion bajo el marco "Gancho -> Tensión/Desarrollo Rápido -> Clímax/Valor -> Cierre en Bucle (Loop)". Divide el video en bloques estrictos de 3 a 5 segundos. Por cada bloque debes especificar: * Tiempo exacto. * Dirección de Cámara y Acción (ej. POV manos haciendo X, corte a plano medio caminando, cámara rápida mostrando resultado). * Guion Hablado / Voz en Off (escrito exactamente como habla una persona real, con pausas y ritmo ágil). * Pattern Interrupt / Edición (qué SFX poner, dónde hacer corte en seco, zoom in o cambio de música).
- TAREA 3 (Auditoría Despiadada de Retención): Cuando analices un borrador de texto o un archivo de video/audio: * Sé implacable. Identifica el segundo exacto donde cae la energía ("Punto de Fuga"). * Detecta palabras que sobran, explicaciones redundantes o falta de contexto visual. * Entrega una versión "Tijera": el mismo mensaje pero en la mitad del tiempo y con el doble de impacto.
- TAREA 4 (SEO, Copy y Psicología de Comentarios): * Diseña descripciones que incluyan términos de búsqueda reales. * Crea "Comentarios Anclados" (Pinned Comments) diseñados estratégicamente para abrir debate o hacer que la gente responda mientras el video se sigue reproduciendo de fondo en bucle.`;

function buildFullSystemPrompt(adn: CreatorADN): string {
  const adnContext = `
====================================================================
CONTEXTO Y ADN ESPECÍFICO DEL CREADOR (PERSONALIZA TUS RESPUESTAS A ESTO):
- Creador/Alias: ${adn.creatorHandle || '@creador'}
- Nicho y Estilo: ${adn.nicheStyle || 'Vlogs cotidianos, salidas, estilo de vida dinámico'}
- Tono de Voz: ${adn.voiceTone || 'Chileno natural, cercano, auténtico, conversacional'}
- Equipamiento disponible: ${adn.equipment || 'Smartphone gama alta, planos POV, voz en off'}
====================================================================`;
  return `${VIBE_DIRECTOR_SYSTEM_INSTRUCTION}\n${adnContext}`;
}

export function getResolvedModel(adn: CreatorADN): string {
  if (adn.aiModel === 'custom' && adn.customModelId?.trim()) {
    return adn.customModelId.trim();
  }
  if (!adn.aiModel || adn.aiModel.includes('2.5') || adn.aiModel === 'gemini-3.1-pro-preview') {
    return 'gemini-3.8-flash';
  }
  return adn.aiModel;
}

function getGenAIClient(apiKey?: string): GoogleGenAI | null {
  if (!apiKey || !apiKey.trim() || apiKey.trim().length <= 5) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    apiVersion: 'v1beta'
  });
}

// Check if Vercel serverless backend has GEMINI_API_KEY configured privately
export async function checkServerKeyStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/gemini', { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data.hasServerKey);
    }
  } catch {
    // Offline or static host
  }
  return false;
}

// Convert File to Base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Direct File API Upload for heavy files (>15MB up to 2GB)
// Uses Vercel Serverless proxy to keep API Key 100% private
export async function uploadToGoogleFileAPI(
  file: File,
  apiKey?: string,
  onProgress?: (pct: number) => void
): Promise<{ fileUri: string; mimeType: string }> {
  // If client has no API key or server mode is preferred, initiate upload via Vercel /api/gemini
  if (!apiKey || apiKey.trim().length <= 5) {
    try {
      const initResp = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initUpload',
          fileInfo: {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'video/mp4'
          }
        })
      });

      if (initResp.ok) {
        const initData = await initResp.json();
        if (initData.fileUri) {
          return { fileUri: initData.fileUri, mimeType: initData.mimeType || file.type || 'video/mp4' };
        }

        const uploadUrl = initData.uploadUrl;
        if (uploadUrl) {
          return new Promise((resolve, reject) => {
            const uploadXhr = new XMLHttpRequest();
            uploadXhr.open('POST', uploadUrl, true);
            uploadXhr.setRequestHeader('X-Goog-Upload-Offset', '0');
            uploadXhr.setRequestHeader('X-Goog-Upload-Command', 'upload, finalize');
            uploadXhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

            if (uploadXhr.upload && onProgress) {
              uploadXhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                  const percent = Math.round((event.loaded / event.total) * 100);
                  onProgress(percent);
                }
              };
            }

            uploadXhr.onload = () => {
              if (uploadXhr.status >= 200 && uploadXhr.status < 300) {
                try {
                  const res = JSON.parse(uploadXhr.responseText);
                  resolve({
                    fileUri: res.file?.uri || res.uri,
                    mimeType: res.file?.mimeType || file.type || 'video/mp4'
                  });
                } catch (err) {
                  reject(err);
                }
              } else {
                reject(new Error(`Fallo en la subida a Google: ${uploadXhr.statusText}`));
              }
            };

            uploadXhr.onerror = () => reject(new Error('Error de red al subir el video a Google'));
            uploadXhr.send(file);
          });
        }
      }
    } catch (e: any) {
      console.warn('[Upload Proxy] No se pudo usar proxy de subida, probando directo...', e);
    }
  }

  // Fallback to direct upload if client provided an explicit API key
  const effectiveKey = apiKey?.trim();
  if (!effectiveKey) {
    throw new Error('No se encontró API Key para la subida de video. Configura GEMINI_API_KEY en Vercel.');
  }

  const url = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(effectiveKey)}`;
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('X-Goog-Upload-Command', 'start');
    xhr.setRequestHeader('X-Goog-Upload-Header-Content-Length', file.size.toString());
    xhr.setRequestHeader('X-Goog-Upload-Header-Content-Type', file.type || 'video/mp4');
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const uploadUrl = xhr.getResponseHeader('X-Goog-Upload-URL');
        if (!uploadUrl) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({ fileUri: data.file.uri, mimeType: data.file.mimeType });
          } catch {
            reject(new Error('No se recibió la URL de subida de Google File API'));
          }
          return;
        }

        const uploadXhr = new XMLHttpRequest();
        uploadXhr.open('POST', uploadUrl, true);
        uploadXhr.setRequestHeader('X-Goog-Upload-Offset', '0');
        uploadXhr.setRequestHeader('X-Goog-Upload-Command', 'upload, finalize');
        uploadXhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

        if (uploadXhr.upload && onProgress) {
          uploadXhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              onProgress(percent);
            }
          };
        }

        uploadXhr.onload = () => {
          if (uploadXhr.status >= 200 && uploadXhr.status < 300) {
            try {
              const res = JSON.parse(uploadXhr.responseText);
              resolve({
                fileUri: res.file?.uri || res.uri,
                mimeType: res.file?.mimeType || file.type || 'video/mp4'
              });
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(`Fallo en la subida a Google File API: ${uploadXhr.statusText}`));
          }
        };

        uploadXhr.onerror = () => reject(new Error('Error de red al subir el video a Google'));
        uploadXhr.send(file);
      } else {
        reject(new Error(`Error inicializando subida a Google File API: ${xhr.status} ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Error de conexión con Google File API'));
    xhr.send(JSON.stringify({ file: { display_name: file.name } }));
  });
}

// Helper for resilient generation with Serverless Privacy & Automatic Free-Tier fallback
async function callGenerateContentWithFallback(
  ai: GoogleGenAI | null,
  initialModel: string,
  params: {
    contents: any;
    config: any;
  },
  clientApiKey?: string
): Promise<{ text: string; [key: string]: any }> {
  // 1. Try serverless backend proxy (/api/gemini)
  // This keeps the Gemini API key 100% PRIVATE on Vercel: zero keys in the browser!
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'generateContent',
        model: initialModel,
        contents: params.contents,
        config: params.config,
        clientApiKey: clientApiKey || undefined
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.text || '',
        ...data
      };
    }

    // If server responded with an application/AI error (e.g. quota, not found)
    if (res.status !== 404) {
      const errorJson = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errorJson.error || `Error del servidor de IA (${res.status})`);
    }
  } catch (serverErr: any) {
    // If not a 404 or network unavailable, re-throw the server error
    if (!serverErr.message?.includes('404') && !serverErr.message?.includes('Failed to fetch') && !serverErr.message?.includes('NetworkError')) {
      throw serverErr;
    }
    console.warn('[Gemini Client] /api/gemini no disponible, intentando SDK directo...');
  }

  // 2. Direct client fallback (if user provided a key in the browser)
  const clientKey = clientApiKey || (ai as any)?.apiKey;
  const directAi = ai || (clientKey ? getGenAIClient(clientKey) : null);

  if (!directAi) {
    throw new Error(
      'No se encontró ninguna API Key de Gemini. Configura la variable de entorno GEMINI_API_KEY en Vercel (100% privada) o introduce tu clave en la app.'
    );
  }

  try {
    const res = await directAi.models.generateContent({
      model: initialModel,
      contents: params.contents,
      config: params.config
    });
    return {
      ...res,
      text: res.text || ''
    };
  } catch (err: any) {
    const errorMsg = String(err?.message || err);
    const isModelNotFoundOrQuota =
      errorMsg.includes('404') ||
      errorMsg.includes('429') ||
      errorMsg.includes('RESOURCE_EXHAUSTED') ||
      errorMsg.includes('limit: 0') ||
      errorMsg.includes('no longer available') ||
      errorMsg.includes('not found') ||
      errorMsg.includes('Quota exceeded');

    if (isModelNotFoundOrQuota && initialModel !== 'gemini-3.8-flash') {
      console.warn(`[VibeDirector] Fallback a gemini-3.8-flash...`);
      const fallbackRes = await directAi.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: params.contents,
        config: params.config
      });
      return {
        ...fallbackRes,
        text: fallbackRes.text || ''
      };
    }
    throw err;
  }
}

// -------------------------------------------------------------
// 1. GENERAR HOOKS (LABORATORIO DE HOOKS A/B TESTING)
// -------------------------------------------------------------
export async function generateHooks(
  rawIdea: string,
  format: string,
  energyLevel: string,
  adn: CreatorADN
): Promise<HookPackage> {
  const ai = getGenAIClient(adn.apiKey);
  const model = getResolvedModel(adn);
  const systemPrompt = buildFullSystemPrompt(adn);

  const prompt = `TAREA: Diseña 4 hooks letales bajo la Trinidad del Gancho para la siguiente idea de TikTok.
Idea cruda: "${rawIdea}"
Formato del video: "${format}"
Nivel de energía: "${energyLevel}"

Debes entregar exactamente 4 tarjetas con estos 4 ángulos psicológicos estrictos:
1. Curiosidad / Brecha de Información (Informational Gap)
2. Error / Conflicto / "Casi sale mal" (High Stake Vulnerability)
3. POV Inmersivo / Estético en acción (In-Media-Res)
4. Polémica suave / Verdad incómoda (Contrarian Statement)

Cada tarjeta debe tener la Trinidad del Gancho:
- visualHook: qué pasa físicamente en el segundo 0.0 (acción en curso, plano extraño o movimiento).
- textHook: texto en pantalla de 4 a 7 palabras máximo que genere pregunta mental sin repetir la voz.
- audioHook: la primera frase exacta dicha de inmediato.
- retentionPrediction: porcentaje numérico estimado (ej. 88).
- psychologicalReasoning: explicación sin filtro de por qué atrapa al cerebro en los primeros 2 segundos.`;

  const hookItemSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      angleTitle: { type: Type.STRING },
      angleType: {
        type: Type.STRING,
        enum: ['curiosity', 'conflict', 'pov', 'polemic']
      },
      visualHook: { type: Type.STRING },
      textHook: { type: Type.STRING },
      audioHook: { type: Type.STRING },
      retentionPrediction: { type: Type.NUMBER },
      psychologicalReasoning: { type: Type.STRING }
    },
    required: [
      'angleTitle',
      'angleType',
      'visualHook',
      'textHook',
      'audioHook',
      'retentionPrediction',
      'psychologicalReasoning'
    ]
  };

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      hooks: {
        type: Type.ARRAY,
        items: hookItemSchema
      }
    },
    required: ['hooks']
  };

  const response = await callGenerateContentWithFallback(
    ai,
    model,
    {
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.75,
        thinkingConfig: { thinkingBudget: 2048 },
        responseMimeType: 'application/json',
        responseSchema
      }
    },
    adn.apiKey
  );

  const parsed = JSON.parse(response.text || '{}');
  const hooksList: HookItem[] = parsed.hooks || [];

  return {
    id: 'pkg_' + Date.now(),
    timestamp: Date.now(),
    rawIdea,
    format,
    energyLevel,
    hooks: hooksList
  };
}

// -------------------------------------------------------------
// 2. ARQUITECTO DE GUIONES SEGUNDO A SEGUNDO
// -------------------------------------------------------------
export async function generateScript(
  hookSelected: string,
  targetDuration: string,
  shotIdeas: string,
  adn: CreatorADN
): Promise<Omit<Script, 'id' | 'createdAt' | 'updatedAt' | 'status'>> {
  const ai = getGenAIClient(adn.apiKey);
  const model = getResolvedModel(adn);
  const systemPrompt = buildFullSystemPrompt(adn);

  const prompt = `TAREA: Construye un guion segundo a segundo de retención extrema para TikTok.
Gancho de partida: "${hookSelected}"
Duración objetivo: "${targetDuration}"
Tomas o ideas visuales disponibles: "${shotIdeas || 'Tomas cotidianas POV, celular en mano, detalles'}"

REGLAS ESTRICTAS:
1. Divide el video en bloques consecutivos de 3 a 5 segundos (ej. "0:00 - 0:04", "0:04 - 0:08", etc.).
2. Para cada bloque define:
   - timeRange: ej. "0:00 - 0:03"
   - cameraAction: dirección de cámara física y acción concreta.
   - spokenText: guion hablado real, con ritmo natural, pausas, tono conversacional sin frases cliché.
   - overlayTextSfx: texto en pantalla + efecto de sonido (SFX) o pattern interrupt (zoom, corte seco).
3. "Truco de Loop Infinito": cómo conectar la última palabra y plano con el segundo 0:00 para que se repita perfectamente sin corte perceptible.
4. Genera una checklist de tomas B-Roll esenciales para salir a grabar este guion en terreno.`;

  const scriptBlockSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      timeRange: { type: Type.STRING },
      cameraAction: { type: Type.STRING },
      spokenText: { type: Type.STRING },
      overlayTextSfx: { type: Type.STRING }
    },
    required: ['timeRange', 'cameraAction', 'spokenText', 'overlayTextSfx']
  };

  const brollItemSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      shotDescription: { type: Type.STRING },
      cameraAngle: { type: Type.STRING }
    },
    required: ['shotDescription', 'cameraAngle']
  };

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      hookSummary: { type: Type.STRING },
      targetDuration: { type: Type.STRING },
      narrativeStructure: { type: Type.STRING },
      musicAtmosphere: { type: Type.STRING },
      infiniteLoopTrick: { type: Type.STRING },
      blocks: {
        type: Type.ARRAY,
        items: scriptBlockSchema
      },
      brollChecklist: {
        type: Type.ARRAY,
        items: brollItemSchema
      }
    },
    required: [
      'title',
      'hookSummary',
      'targetDuration',
      'narrativeStructure',
      'musicAtmosphere',
      'infiniteLoopTrick',
      'blocks',
      'brollChecklist'
    ]
  };

  const response = await callGenerateContentWithFallback(
    ai,
    model,
    {
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.75,
        thinkingConfig: { thinkingBudget: 2048 },
        responseMimeType: 'application/json',
        responseSchema
      }
    },
    adn.apiKey
  );

  const parsed = JSON.parse(response.text || '{}');

  const processedBlocks: ScriptBlock[] = (parsed.blocks || []).map((b: any, idx: number) => {
    const duration = parseDurationSeconds(b.timeRange);
    const speed = calculateSpeed(b.spokenText || '', duration);
    return {
      id: 'blk_' + Date.now() + '_' + idx,
      timeRange: b.timeRange || `0:0${idx * 4} - 0:0${(idx + 1) * 4}`,
      durationSeconds: duration,
      cameraAction: b.cameraAction || '',
      spokenText: b.spokenText || '',
      overlayTextSfx: b.overlayTextSfx || '',
      wordsCount: speed.wordsCount,
      wordsPerSecond: speed.wordsPerSecond,
      speedStatus: speed.status
    };
  });

  const processedBroll: BrollItem[] = (parsed.brollChecklist || []).map((item: any, idx: number) => ({
    id: 'broll_' + Date.now() + '_' + idx,
    shotDescription: item.shotDescription || '',
    cameraAngle: item.cameraAngle || 'Plano Medio / POV',
    completed: false
  }));

  return {
    title: parsed.title || 'Guion de Alta Retención',
    hookSummary: parsed.hookSummary || hookSelected,
    targetDuration: parsed.targetDuration || targetDuration,
    narrativeStructure: parsed.narrativeStructure || 'Gancho -> Tensión -> Clímax -> Loop',
    musicAtmosphere: parsed.musicAtmosphere || 'Beat rítmico bajo con subidón en clímax',
    blocks: processedBlocks,
    infiniteLoopTrick: parsed.infiniteLoopTrick || 'El video finaliza con una frase inacabada que se completa al reiniciar.',
    brollChecklist: processedBroll
  };
}

// -------------------------------------------------------------
// 3. DESTROZADOR DE BORRADORES (AUDITOR MULTIMODAL)
// -------------------------------------------------------------
export async function auditDraft(
  input: { text?: string; file?: File; fileUri?: string; mimeType?: string },
  adn: CreatorADN
): Promise<AuditorResult> {
  const ai = getGenAIClient(adn.apiKey);
  const model = getResolvedModel(adn);
  const systemPrompt = buildFullSystemPrompt(adn);

  let contents: any[] = [];
  const textPrompt = `TAREA: Realiza una AUDITORÍA DESPIADADA DE RETENCIÓN de este borrador o material de TikTok.
Sé implacable. Detecta:
1. Puntos de fuga exactos (segundo o frase donde el espectador hace scroll).
2. Palabras que sobran, explicaciones redundantes o lentitud en los primeros 3 segundos.
3. Genera la "Versión Tijera": el mismo mensaje en la mitad del tiempo, con bloques de 3-5 segundos, indicaciones de cámara física y un truco de loop infinito.`;

  if (input.fileUri && input.mimeType) {
    contents = [
      {
        fileData: {
          fileUri: input.fileUri,
          mimeType: input.mimeType
        }
      },
      textPrompt
    ];
  } else if (input.file) {
    const base64Data = await fileToBase64(input.file);
    contents = [
      {
        inlineData: {
          mimeType: input.file.type || 'video/mp4',
          data: base64Data
        }
      },
      textPrompt
    ];
  } else {
    contents = [`${textPrompt}\n\nBORRADOR A AUDITAR:\n"${input.text || ''}"`];
  }

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      retentionScore: { type: Type.NUMBER },
      scoreCategory: {
        type: Type.STRING,
        enum: ['critico', 'regular', 'bueno', 'viral']
      },
      filterlessDiagnosis: { type: Type.STRING },
      scrollAlerts: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            timestampOrPhrase: { type: Type.STRING },
            reason: { type: Type.STRING },
            cutRecommendation: { type: Type.STRING }
          },
          required: ['timestampOrPhrase', 'reason', 'cutRecommendation']
        }
      },
      reEngineeredScript: {
        type: Type.OBJECT,
        properties: {
          narrativeSummary: { type: Type.STRING },
          infiniteLoopTrick: { type: Type.STRING },
          blocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timeRange: { type: Type.STRING },
                cameraAction: { type: Type.STRING },
                spokenText: { type: Type.STRING },
                overlayTextSfx: { type: Type.STRING }
              },
              required: ['timeRange', 'cameraAction', 'spokenText', 'overlayTextSfx']
            }
          }
        },
        required: ['narrativeSummary', 'infiniteLoopTrick', 'blocks']
      }
    },
    required: ['retentionScore', 'scoreCategory', 'filterlessDiagnosis', 'scrollAlerts', 'reEngineeredScript']
  };

  const response = await callGenerateContentWithFallback(
    ai,
    model,
    {
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.75,
        thinkingConfig: { thinkingBudget: 2048 },
        responseMimeType: 'application/json',
        responseSchema
      }
    },
    adn.apiKey
  );

  const parsed = JSON.parse(response.text || '{}');

  const reBlocks: ScriptBlock[] = (parsed.reEngineeredScript?.blocks || []).map((b: any, idx: number) => {
    const duration = parseDurationSeconds(b.timeRange);
    const speed = calculateSpeed(b.spokenText || '', duration);
    return {
      id: 'blk_audit_' + Date.now() + '_' + idx,
      timeRange: b.timeRange || `0:0${idx * 4} - 0:0${(idx + 1) * 4}`,
      durationSeconds: duration,
      cameraAction: b.cameraAction || '',
      spokenText: b.spokenText || '',
      overlayTextSfx: b.overlayTextSfx || '',
      wordsCount: speed.wordsCount,
      wordsPerSecond: speed.wordsPerSecond,
      speedStatus: speed.status
    };
  });

  return {
    retentionScore: parsed.retentionScore || 50,
    scoreCategory: parsed.scoreCategory || 'regular',
    filterlessDiagnosis: parsed.filterlessDiagnosis || 'El video tarda demasiado en llegar al punto.',
    scrollAlerts: parsed.scrollAlerts || [],
    reEngineeredScript: {
      narrativeSummary: parsed.reEngineeredScript?.narrativeSummary || 'Versión comprimida y acelerada.',
      infiniteLoopTrick: parsed.reEngineeredScript?.infiniteLoopTrick || 'Termina en punta para reiniciar.',
      blocks: reBlocks
    }
  };
}

// -------------------------------------------------------------
// 4. DOCTOR DE EDICIÓN (CORTE RUDO / ROUGH CUT)
// -------------------------------------------------------------
export async function auditRoughCut(
  input: { text?: string; file?: File; fileUri?: string; mimeType?: string },
  adn: CreatorADN
): Promise<RoughCutResult> {
  const ai = getGenAIClient(adn.apiKey);
  const model = getResolvedModel(adn);
  const systemPrompt = buildFullSystemPrompt(adn);

  const textPrompt = `TAREA: Actúa como el Director de Postproducción más agresivo de TikTok para este CORTE RUDO (Rough Cut / Versión sin terminar).
Debes entregar recomendaciones directas de edición de montaje:
1. Línea de tiempo con segundos exactos donde cortar silencios, respiraciones, muletillas o errores (Tijera de edición).
2. Sugerencias exactas de dónde insertar B-Roll, Zooms (punch-in), efectos de sonido (SFX) o cortes de ritmo.
3. Reordenamiento sugerido de escenas: si hay una toma más emocionante más adelante, explica cómo moverla al segundo 0:00 para rescatar el gancho inicial.
4. Resumen directo de dirección de montaje.`;

  let contents: any[] = [];
  if (input.fileUri && input.mimeType) {
    contents = [
      {
        fileData: {
          fileUri: input.fileUri,
          mimeType: input.mimeType
        }
      },
      textPrompt
    ];
  } else if (input.file) {
    const base64Data = await fileToBase64(input.file);
    contents = [
      {
        inlineData: {
          mimeType: input.file.type || 'video/mp4',
          data: base64Data
        }
      },
      textPrompt
    ];
  } else {
    contents = [`${textPrompt}\n\nDESCRIPCIÓN / TIMELINE DEL CORTE RUDO:\n"${input.text || ''}"`];
  }

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      retentionScore: { type: Type.NUMBER },
      silenceCuts: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            timestamp: { type: Type.STRING },
            issue: { type: Type.STRING },
            cutSuggestion: { type: Type.STRING }
          },
          required: ['timestamp', 'issue', 'cutSuggestion']
        }
      },
      insertions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            timestamp: { type: Type.STRING },
            type: {
              type: Type.STRING,
              enum: ['broll', 'sfx', 'zoom', 'transition']
            },
            instruction: { type: Type.STRING }
          },
          required: ['timestamp', 'type', 'instruction']
        }
      },
      sceneReordering: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            currentPosition: { type: Type.STRING },
            suggestedPosition: { type: Type.STRING },
            rationale: { type: Type.STRING }
          },
          required: ['currentPosition', 'suggestedPosition', 'rationale']
        }
      },
      summaryAdvice: { type: Type.STRING }
    },
    required: ['retentionScore', 'silenceCuts', 'insertions', 'sceneReordering', 'summaryAdvice']
  };

  const response = await callGenerateContentWithFallback(
    ai,
    model,
    {
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.75,
        thinkingConfig: { thinkingBudget: 2048 },
        responseMimeType: 'application/json',
        responseSchema
      }
    },
    adn.apiKey
  );

  const parsed = JSON.parse(response.text || '{}');
  return {
    retentionScore: parsed.retentionScore || 65,
    silenceCuts: parsed.silenceCuts || [],
    insertions: parsed.insertions || [],
    sceneReordering: parsed.sceneReordering || [],
    summaryAdvice: parsed.summaryAdvice || 'Elimina los primeros 1.5 segundos antes de que comience la voz.'
  };
}

// -------------------------------------------------------------
// 5. CONTROL DE CALIDAD (VIDEO FINAL / PRE-LANZAMIENTO)
// -------------------------------------------------------------
export async function auditFinalQuality(
  input: { text?: string; file?: File; fileUri?: string; mimeType?: string },
  adn: CreatorADN
): Promise<FinalQualityResult> {
  const ai = getGenAIClient(adn.apiKey);
  const model = getResolvedModel(adn);
  const systemPrompt = buildFullSystemPrompt(adn);

  const textPrompt = `TAREA: Dictamina el CONTROL DE CALIDAD PRE-LANZAMIENTO de este video final de TikTok.
Evalúa con estándares de retención viral:
1. Veredicto estricto: ¿"LISTO_PARA_PUBLICAR" o "AJUSTAR_ANTES_DE_SUBIR"?
2. Evaluación desglosada con puntajes (0-100) y retroalimentación técnica:
   - Gancho Inicial (0-3s)
   - Ritmo Medio y Pattern Interrupts
   - Cierre y Loop Final
3. Predicción de porcentaje de retención media esperada (ej. 79%).
4. Probabilidad de que la gente lo Guarde o Comparta (Baja, Media, Alta, Viral / Explosiva) y por qué.
5. El consejo definitivo de último minuto antes de apretar "Publicar".`;

  let contents: any[] = [];
  if (input.fileUri && input.mimeType) {
    contents = [
      {
        fileData: {
          fileUri: input.fileUri,
          mimeType: input.mimeType
        }
      },
      textPrompt
    ];
  } else if (input.file) {
    const base64Data = await fileToBase64(input.file);
    contents = [
      {
        inlineData: {
          mimeType: input.file.type || 'video/mp4',
          data: base64Data
        }
      },
      textPrompt
    ];
  } else {
    contents = [`${textPrompt}\n\nDETALLE DEL VIDEO FINAL A EVALUAR:\n"${input.text || ''}"`];
  }

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      verdict: {
        type: Type.STRING,
        enum: ['LISTO_PARA_PUBLICAR', 'AJUSTAR_ANTES_DE_SUBIR']
      },
      overallScore: { type: Type.NUMBER },
      hookScore: { type: Type.NUMBER },
      hookFeedback: { type: Type.STRING },
      midRetentionScore: { type: Type.NUMBER },
      midRetentionFeedback: { type: Type.STRING },
      loopScore: { type: Type.NUMBER },
      loopFeedback: { type: Type.STRING },
      predictedRetentionRate: { type: Type.NUMBER },
      shareSaveProbability: {
        type: Type.STRING,
        enum: ['Baja', 'Media', 'Alta', 'Viral / Explosiva']
      },
      shareSaveAnalysis: { type: Type.STRING },
      finalLaunchTip: { type: Type.STRING }
    },
    required: [
      'verdict',
      'overallScore',
      'hookScore',
      'hookFeedback',
      'midRetentionScore',
      'midRetentionFeedback',
      'loopScore',
      'loopFeedback',
      'predictedRetentionRate',
      'shareSaveProbability',
      'shareSaveAnalysis',
      'finalLaunchTip'
    ]
  };

  const response = await callGenerateContentWithFallback(
    ai,
    model,
    {
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.75,
        thinkingConfig: { thinkingBudget: 2048 },
        responseMimeType: 'application/json',
        responseSchema
      }
    },
    adn.apiKey
  );

  const parsed = JSON.parse(response.text || '{}');
  return {
    verdict: parsed.verdict || 'AJUSTAR_ANTES_DE_SUBIR',
    overallScore: parsed.overallScore || 70,
    hookScore: parsed.hookScore || 65,
    hookFeedback: parsed.hookFeedback || 'El gancho visual necesita más velocidad.',
    midRetentionScore: parsed.midRetentionScore || 70,
    midRetentionFeedback: parsed.midRetentionFeedback || 'Faltan cortes de plano entre el segundo 8 y 12.',
    loopScore: parsed.loopScore || 60,
    loopFeedback: parsed.loopFeedback || 'El final decae antes del corte.',
    predictedRetentionRate: parsed.predictedRetentionRate || 68,
    shareSaveProbability: parsed.shareSaveProbability || 'Media',
    shareSaveAnalysis: parsed.shareSaveAnalysis || 'Buen contenido, pero falta una llamada implícita a guardar.',
    finalLaunchTip: parsed.finalLaunchTip || 'Haz zoom in al 110% en el segundo 2 para acelerar el ritmo visual.'
  };
}

// -------------------------------------------------------------
// 6. ESTRATEGIA SEO & CAJA DE COMENTARIOS
// -------------------------------------------------------------
export async function generateSEO(
  topicOrScript: string,
  adn: CreatorADN
): Promise<SEOResult> {
  const ai = getGenAIClient(adn.apiKey);
  const model = getResolvedModel(adn);
  const systemPrompt = buildFullSystemPrompt(adn);

  const prompt = `TAREA: Diseña la estrategia de posicionamiento SEO y psicología de comentarios para este video de TikTok:
"${topicOrScript}"

REQUERIMIENTOS:
1. 3 opciones de Copy / Descripción de TikTok optimizadas para búsqueda natural.
2. 5 Micro-Keywords exactas: palabras de búsqueda clave para colocar en texto diminuto o fuera de encuadre para indexación del algoritmo de TikTok.
3. 5 Hashtags estratégicos: mezcla equilibrada de nicho y alcance masivo.
4. 3 opciones de "Comentario Anclado" (Pinned Comment): diseñados para generar controversia sana, preguntas abiertas o debates que hagan que los usuarios escriban comentarios mientras el video se sigue reproduciendo en bucle de fondo.`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      copies: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      microKeywords: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      hashtags: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      pinnedComments: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: ['copies', 'microKeywords', 'hashtags', 'pinnedComments']
  };

  const response = await callGenerateContentWithFallback(
    ai,
    model,
    {
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.75,
        thinkingConfig: { thinkingBudget: 2048 },
        responseMimeType: 'application/json',
        responseSchema
      }
    },
    adn.apiKey
  );

  const parsed = JSON.parse(response.text || '{}');
  return {
    copies: parsed.copies || [],
    microKeywords: parsed.microKeywords || [],
    hashtags: parsed.hashtags || [],
    pinnedComments: parsed.pinnedComments || []
  };
}

// 7. ASESOR ESTRATÉGICO DE CONTENIDO (ONBOARDING INTERACTIVO DE NUEVO VIDEO)
export async function runAdvisorTurn(
  history: AdvisorMessage[],
  newUserMessage: string,
  adn: CreatorADN,
  videoContext?: {
    title?: string;
    rawIdea?: string;
    hasRecordedFootage?: boolean | null;
    recordedClipsNotes?: string;
  }
): Promise<{
  message: string;
  suggestedQuickReplies: string[];
  synthesis?: AdvisorSynthesis;
}> {
  const ai = getGenAIClient(adn.apiKey);
  const model = getResolvedModel(adn);
  const systemPrompt = buildFullSystemPrompt(adn);

  const advisorSystemInstruction = `${systemPrompt}

====================================================================
MODO ACTIVO: ASESOR ESTRATÉGICO DE CONTENIDO (SESIÓN DE DESCUBRIMIENTO & PLANIFICACIÓN)
====================================================================
Estás manteniendo una sesión estratégica interactiva con el creador para planificar un video nuevo (o transformar una idea/material bruto en un éxito viral).

TUS REGLAS INQUEBRANTABLES:
1. Sé tú mismo: "VibeDirector", directo al hueso, exigente, ultra analítico, con modismos orgánicos y cero complacencia comercial.
2. FLUJO DINÁMICO DE PREGUNTAS INTELIGENTES:
   - Si no sabes de qué trata el video: Pregúntale de qué trata su idea o qué quiere transmitir.
   - Si ya sabes de qué trata pero NO sabes si tiene tomas grabadas: Pregúntale explícitamente si ya tiene tomas/clips grabados en su celular o si el video es todavía una idea por grabar.
   - CASO A (EL USUARIO TIENE TOMAS GRABADAS):
     * Pregúntale qué grabó exactamente (qué planos, momentos o acciones tiene en sus archivos).
     * Una vez que te describa sus tomas, analiza cuál debe ser el GANCHO VISUAL del segundo 0.0 (la toma con más movimiento o intriga) y qué ángulo narrativo usar con ese material real. Si notas que le falta una toma clave para dar ritmo, recomiéndale una toma B-Roll de 3 segundos para grabar en casa.
   - CASO B (EL USUARIO NO TIENE TOMAS, ES SOLO UNA IDEA):
     * ¡Sé creativo! En base a tu experiencia de retención en TikTok y al ADN del creador, dale sugerencias concretas de QUÉ TOMAS SALIR A GRABAR:
       - Toma del Gancho Visual (0.0s): Acción en curso, encuadre o perspectiva contraintuitiva.
       - Tomas de Tensión / Desarrollo (3 a 5 planos B-Roll para cortar cada 3 segundos).
       - Toma del Clímax o Remate en bucle.
3. Genera siempre 2 a 4 "suggestedQuickReplies" (opciones de respuesta rápida con botones) para que el creador pueda responder rápido desde el móvil o desktop.
4. Cuando la idea y las tomas ya estén claras (o sugeridas), incluye el objeto "synthesis" con:
   - refinedTitle: título sugerido de alto impacto
   - refinedIdea: ángulo conceptual refinado
   - visualHookProposal: propuesta de gancho visual para segundo 0
   - brollShotsToRecord: lista de tomas sugeridas/detectadas
   - readyForScript: true`;

  // Format conversation history for prompt
  const formattedHistory = history.map((msg) => {
    const sender = msg.sender === 'vibedirector' ? 'VibeDirector (Tú)' : 'Creador (Usuario)';
    return `${sender}: ${msg.text}`;
  }).join('\n\n');

  const contextInfo = `
ESTADO ACTUAL DEL PROYECTO:
- Título provisional: ${videoContext?.title || 'Nuevo Video'}
- Idea preliminar: ${videoContext?.rawIdea || 'Sin especificar'}
- ¿Tiene tomas grabadas?: ${
    videoContext?.hasRecordedFootage === true
      ? 'Sí, tiene material grabado'
      : videoContext?.hasRecordedFootage === false
      ? 'No, es solo una idea preliminar'
      : 'Aún no aclarado'
  }
${videoContext?.recordedClipsNotes ? `- Notas de tomas grabadas: ${videoContext.recordedClipsNotes}` : ''}
`;

  const prompt = `HISTORIAL DE LA ASESORÍA HASTA AHORA:
${formattedHistory ? formattedHistory : '(Inicio de la sesión)'}

NUEVA RESPUESTA DEL CREADOR:
"${newUserMessage}"

${contextInfo}

INSTRUCCIÓN:
Responde como VibeDirector analizando la respuesta del creador. Aporta valor estratégico inmediato, genera ideas frescas acordes a su nicho, haz la siguiente pregunta lógica según el flujo o entrega las sugerencias de tomas si corresponde. Devuelve tu respuesta en el esquema JSON requerido.`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Tu respuesta hablada como VibeDirector'
      },
      suggestedQuickReplies: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: '2 a 4 opciones de respuesta rápida para botones'
      },
      synthesis: {
        type: Type.OBJECT,
        properties: {
          refinedTitle: { type: Type.STRING },
          refinedIdea: { type: Type.STRING },
          visualHookProposal: { type: Type.STRING },
          brollShotsToRecord: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                shotDescription: { type: Type.STRING },
                cameraAngle: { type: Type.STRING },
                whyImportant: { type: Type.STRING }
              },
              required: ['shotDescription', 'cameraAngle', 'whyImportant']
            }
          },
          readyForScript: { type: Type.BOOLEAN }
        }
      }
    },
    required: ['message', 'suggestedQuickReplies']
  };

  const response = await callGenerateContentWithFallback(
    ai,
    model,
    {
      contents: prompt,
      config: {
        systemInstruction: advisorSystemInstruction,
        temperature: 0.75,
        thinkingConfig: { thinkingBudget: 2048 },
        responseMimeType: 'application/json',
        responseSchema
      }
    },
    adn.apiKey
  );

  const parsed = JSON.parse(response.text || '{}');
  return {
    message: parsed.message || 'Sigamos afinando el concepto.',
    suggestedQuickReplies: parsed.suggestedQuickReplies || ['Continuar', 'Tengo otra idea'],
    synthesis: parsed.synthesis
  };
}

// 8. SIMULADOR DE AUDIENCIA SINTÉTICA (FOCUS GROUP DE TIKTOK MULTI-PERSONA)
export async function simulateAudience(
  contentToTest: {
    hook?: string;
    scriptText?: string;
    topic?: string;
  },
  adn: CreatorADN
): Promise<AudienceSimulationResult> {
  const ai = getGenAIClient(adn.apiKey);
  const model = getResolvedModel(adn);
  const systemPrompt = buildFullSystemPrompt(adn);

  const simulationSystemInstruction = `${systemPrompt}

====================================================================
MODO ACTIVO: SIMULADOR DE AUDIENCIA SINTÉTICA (FOCUS GROUP PRE-RODAJE)
====================================================================
Tu misión es simular el comportamiento psicológico y de navegación de 3 arquetipos de usuarios reales en TikTok, enfrentados al contenido del creador antes de que gaste tiempo grabando o subiendo el video.

LOS 3 ARQUETIPOS QUE DEBES SIMULAR:
1. "Scroller Compulsivo":
   - Demografía: 18-24 años, sobreestimulado, dedo listo para deslizar.
   - Atención crítica: del segundo 0.0 al segundo 2.0.
   - Veredicto: 'Deslizó (Swipe)' o 'Se Quedó (Stay)'.
   - Trigger exacto y frase honesta en primera persona de su cerebro.

2. "Escéptico de Comentarios":
   - Demografía: 25-34 años, alérgico a influencers falsos y publicidad encubierta.
   - Veredicto: 'Comentó (Comment)', 'Deslizó (Swipe)' o 'Se Quedó (Stay)'.
   - El comentario exacto que dejaría para confrontar o debatir.

3. "Compartidor Frecuente":
   - Demografía: Busca validación social, humor para sus amigos o hacks imperdibles.
   - Veredicto: 'Compartió (Share)', 'Guardó (Save)' o 'Deslizó (Swipe)'.
   - A quién se lo mandaría por DM/WhatsApp y por qué.

Por último, como VibeDirector:
- Asigna un overallSurvivalScore (0-100% de probabilidad de sobrevivir al algoritmo).
- Entrega un resumen analítico y 3 ajustes accionables (hookTweak, bodyPacingTweak, ctaOrLoopTweak).`;

  const prompt = `CONTENIDO A TESTEAR EN EL FOCUS GROUP:
- TEMA/PREMISA: ${contentToTest.topic || 'No especificado'}
- GANCHO DE ENTRADA: ${contentToTest.hook || 'No especificado'}
${contentToTest.scriptText ? `- GUION COMPLETO:\n${contentToTest.scriptText}` : ''}

Ejecuta la simulación con los 3 arquetipos de espectadores y entrega el informe en el formato JSON especificado.`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      overallSurvivalScore: {
        type: Type.INTEGER,
        description: 'Porcentaje de supervivencia del video frente al algoritmo (0-100)'
      },
      verdictSummary: {
        type: Type.STRING,
        description: 'Resumen ejecutivo de VibeDirector sobre el focus group'
      },
      personas: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            personaName: {
              type: Type.STRING,
              enum: ['Scroller Compulsivo', 'Escéptico de Comentarios', 'Compartidor Frecuente']
            },
            avatarEmoji: { type: Type.STRING },
            demographic: { type: Type.STRING },
            actionTaken: {
              type: Type.STRING,
              enum: ['Deslizó (Swipe)', 'Se Quedó (Stay)', 'Comentó (Comment)', 'Compartió (Share)', 'Guardó (Save)']
            },
            timestampOrTrigger: { type: Type.STRING },
            immediateReaction: { type: Type.STRING },
            quote: { type: Type.STRING },
            whyActionTaken: { type: Type.STRING },
            improvementTip: { type: Type.STRING }
          },
          required: [
            'personaName',
            'avatarEmoji',
            'demographic',
            'actionTaken',
            'timestampOrTrigger',
            'immediateReaction',
            'quote',
            'whyActionTaken',
            'improvementTip'
          ]
        }
      },
      keyVulnerabilities: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Lista de 2 a 3 puntos ciegos o fallas de retención detectadas'
      },
      actionableTweaks: {
        type: Type.OBJECT,
        properties: {
          hookTweak: { type: Type.STRING },
          bodyPacingTweak: { type: Type.STRING },
          ctaOrLoopTweak: { type: Type.STRING }
        },
        required: ['hookTweak', 'bodyPacingTweak', 'ctaOrLoopTweak']
      }
    },
    required: ['overallSurvivalScore', 'verdictSummary', 'personas', 'keyVulnerabilities', 'actionableTweaks']
  };

  const response = await callGenerateContentWithFallback(
    ai,
    model,
    {
      contents: prompt,
      config: {
        systemInstruction: simulationSystemInstruction,
        temperature: 0.75,
        thinkingConfig: { thinkingBudget: 2048 },
        responseMimeType: 'application/json',
        responseSchema
      }
    },
    adn.apiKey
  );

  const parsed = JSON.parse(response.text || '{}');
  return {
    overallSurvivalScore: parsed.overallSurvivalScore || 50,
    verdictSummary: parsed.verdictSummary || 'Evaluación completada.',
    personas: parsed.personas || [],
    keyVulnerabilities: parsed.keyVulnerabilities || [],
    actionableTweaks: parsed.actionableTweaks || {
      hookTweak: 'Refuerza el segundo 0 con mayor contraste visual.',
      bodyPacingTweak: 'Elimina explicaciones antes de los 10 segundos.',
      ctaOrLoopTweak: 'Conecta la última frase con la primera palabra del gancho.'
    },
    simulatedAt: Date.now()
  };
};

export const generatePredictiveRetentionCurve = async (
  content: {
    scriptText: string;
    hook?: string;
    title?: string;
    duration?: string;
  },
  adn: CreatorADN
): Promise<PredictiveRetentionReport> => {
  const ai = getGenAIClient(adn.apiKey);
  const model = getResolvedModel(adn);
  const systemPrompt = buildFullSystemPrompt(adn);

  const retentionSystemInstruction = `${systemPrompt}

MODO: SIMULADOR DE ANALÍTICAS DE RETENCIÓN DE TIKTOK (TIKTOK STUDIO PREDICTIVO)
Eres un motor de cálculo algorítmico entrenado en millones de curvas de retención segundo a segundo de TikTok, Reels y YouTube Shorts.
Tu trabajo es predecir con exactitud milimétrica la curva de retención (% de audiencia residual) de un guion o video, identificando:
1. El porcentaje inicial en segundo 0.0 (siempre 100%).
2. La caída violenta en los primeros 3 segundos (el filtro del hook: si es flojo cae bajo el 60%, si es genial retiene más del 80%).
3. Los valles de abandono (puntos donde el espectador siente aburrimiento, ritmo plano, falta de B-roll o exceso de palabras).
4. Los picos de re-visualización (rewatch spikes): momentos de impacto donde el espectador pausa, retrocede o lee texto rápido.
5. El impacto del bucle infinito (loop): si el final conecta con el inicio, los espectadores residuales reinician el video sumando views extras.
6. La curva comparativa de referencia (benchmark del nicho en TikTok para esa duración).

Debes generar entre 10 y 20 puntos cronológicos ordenados secuencialmente por el campo 'second' desde 0 hasta el final del video.`;

  const prompt = `Analiza este material y genera la curva de retención predictiva segundo a segundo:

TÍTULO DEL VIDEO: "${content.title || 'Video sin título'}"
GANCHO (0-2s): "${content.hook || 'No especificado'}"
DURACIÓN ESTIMADA: "${content.duration || '30-40s'}"

GUION / CONTENIDO COMPLETO:
"""
${content.scriptText}
"""

Calcula la curva de retención realista (0-100%) segundo a segundo, puntos de fuga críticos, picos de re-visualización y el veredicto para el algoritmo For You de TikTok.`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      hookSurvivalRate: {
        type: Type.INTEGER,
        description: 'Porcentaje de espectadores que sobrevive al segundo 3 (0-100)'
      },
      averageWatchTimeSeconds: {
        type: Type.NUMBER,
        description: 'Tiempo medio de visualización estimado en segundos'
      },
      totalDurationSeconds: {
        type: Type.INTEGER,
        description: 'Duración total calculada del video en segundos'
      },
      averageWatchPercentage: {
        type: Type.INTEGER,
        description: 'Porcentaje medio de retención del video total (0-100)'
      },
      completedWatchRate: {
        type: Type.INTEGER,
        description: 'Porcentaje de espectadores que llega al 100% de la duración'
      },
      rewatchSpikeRate: {
        type: Type.INTEGER,
        description: 'Porcentaje de visualizaciones repetidas por loop o rebobinado (0-50)'
      },
      loopViabilityScore: {
        type: Type.INTEGER,
        description: 'Puntuación de efectividad del bucle infinito (0-100)'
      },
      verdictSummary: {
        type: Type.STRING,
        description: 'Diagnóstico ejecutivo de VibeDirector sobre la viabilidad algorítmica'
      },
      retentionCurve: {
        type: Type.ARRAY,
        description: 'Puntos secuenciales de la curva de retención cronológica (10 a 20 puntos ordenados por segundo)',
        items: {
          type: Type.OBJECT,
          properties: {
            second: { type: Type.INTEGER },
            timestamp: { type: Type.STRING },
            percentage: { type: Type.INTEGER },
            benchmarkPercentage: { type: Type.INTEGER },
            eventType: {
              type: Type.STRING,
              enum: ['hook', 'drop', 'spike', 'loop', 'neutral']
            },
            eventLabel: { type: Type.STRING },
            annotation: { type: Type.STRING }
          },
          required: [
            'second',
            'timestamp',
            'percentage',
            'benchmarkPercentage',
            'eventType',
            'eventLabel',
            'annotation'
          ]
        }
      },
      dropOffPoints: {
        type: Type.ARRAY,
        description: 'Puntos críticos donde la retención cae bruscamente',
        items: {
          type: Type.OBJECT,
          properties: {
            timestamp: { type: Type.STRING },
            second: { type: Type.INTEGER },
            severity: {
              type: Type.STRING,
              enum: ['critica', 'media', 'leve']
            },
            reason: { type: Type.STRING },
            fixAdvice: { type: Type.STRING }
          },
          required: ['timestamp', 'second', 'severity', 'reason', 'fixAdvice']
        }
      },
      spikeMoments: {
        type: Type.ARRAY,
        description: 'Momentos donde el espectador rebobina o presta máxima atención',
        items: {
          type: Type.OBJECT,
          properties: {
            timestamp: { type: Type.STRING },
            second: { type: Type.INTEGER },
            reason: { type: Type.STRING },
            driver: { type: Type.STRING }
          },
          required: ['timestamp', 'second', 'reason', 'driver']
        }
      }
    },
    required: [
      'hookSurvivalRate',
      'averageWatchTimeSeconds',
      'totalDurationSeconds',
      'averageWatchPercentage',
      'completedWatchRate',
      'rewatchSpikeRate',
      'loopViabilityScore',
      'verdictSummary',
      'retentionCurve',
      'dropOffPoints',
      'spikeMoments'
    ]
  };

  const response = await callGenerateContentWithFallback(
    ai,
    model,
    {
      contents: prompt,
      config: {
        systemInstruction: retentionSystemInstruction,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 2048 },
        responseMimeType: 'application/json',
        responseSchema
      }
    },
    adn.apiKey
  );

  const parsed = JSON.parse(response.text || '{}');
  
  // Ensure curve points are ordered by second
  const rawCurve = Array.isArray(parsed.retentionCurve) ? parsed.retentionCurve : [];
  const sortedCurve = [...rawCurve].sort((a, b) => (a.second || 0) - (b.second || 0));

  return {
    hookSurvivalRate: parsed.hookSurvivalRate ?? 70,
    averageWatchTimeSeconds: parsed.averageWatchTimeSeconds ?? 20,
    totalDurationSeconds: parsed.totalDurationSeconds ?? 35,
    averageWatchPercentage: parsed.averageWatchPercentage ?? 65,
    completedWatchRate: parsed.completedWatchRate ?? 38,
    rewatchSpikeRate: parsed.rewatchSpikeRate ?? 12,
    loopViabilityScore: parsed.loopViabilityScore ?? 50,
    verdictSummary: parsed.verdictSummary || 'Curva de retención generada con éxito.',
    retentionCurve: sortedCurve,
    dropOffPoints: parsed.dropOffPoints || [],
    spikeMoments: parsed.spikeMoments || [],
    calculatedAt: Date.now()
  };
};
