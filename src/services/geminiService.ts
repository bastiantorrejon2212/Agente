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
  AdvisorSynthesis
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

function getGenAIClient(apiKey: string): GoogleGenAI {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API Key no encontrada. Por favor configura tu Gemini API Key en el panel lateral o en Configuración.');
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    apiVersion: 'v1beta'
  });
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
export async function uploadToGoogleFileAPI(
  file: File,
  apiKey: string,
  onProgress?: (pct: number) => void
): Promise<{ fileUri: string; mimeType: string }> {
  const url = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(apiKey)}`;
  
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

// Helper for resilient generation with automatic Free-Tier fallback
async function callGenerateContentWithFallback(
  ai: GoogleGenAI,
  initialModel: string,
  params: {
    contents: any;
    config: any;
  }
) {
  try {
    return await ai.models.generateContent({
      model: initialModel,
      contents: params.contents,
      config: params.config
    });
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
      console.warn(`[VibeDirector] Modelo ${initialModel} no disponible o sin cuota. Fallback a gemini-3.8-flash...`);
      return await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: params.contents,
        config: params.config
      });
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

  const response = await callGenerateContentWithFallback(ai, model, {
    contents: prompt,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.75,
      thinkingConfig: { thinkingBudget: 2048 },
      responseMimeType: 'application/json',
      responseSchema
    }
  });

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

  const response = await callGenerateContentWithFallback(ai, model, {
    contents: prompt,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.75,
      thinkingConfig: { thinkingBudget: 2048 },
      responseMimeType: 'application/json',
      responseSchema
    }
  });

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

  const response = await callGenerateContentWithFallback(ai, model, {
    contents,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.75,
      thinkingConfig: { thinkingBudget: 2048 },
      responseMimeType: 'application/json',
      responseSchema
    }
  });

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

  const response = await callGenerateContentWithFallback(ai, model, {
    contents,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.75,
      thinkingConfig: { thinkingBudget: 2048 },
      responseMimeType: 'application/json',
      responseSchema
    }
  });

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

  const response = await callGenerateContentWithFallback(ai, model, {
    contents,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.75,
      thinkingConfig: { thinkingBudget: 2048 },
      responseMimeType: 'application/json',
      responseSchema
    }
  });

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

  const response = await callGenerateContentWithFallback(ai, model, {
    contents: prompt,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.75,
      thinkingConfig: { thinkingBudget: 2048 },
      responseMimeType: 'application/json',
      responseSchema
    }
  });

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

  const response = await callGenerateContentWithFallback(ai, model, {
    contents: prompt,
    config: {
      systemInstruction: advisorSystemInstruction,
      temperature: 0.75,
      thinkingConfig: { thinkingBudget: 2048 },
      responseMimeType: 'application/json',
      responseSchema
    }
  });

  const parsed = JSON.parse(response.text || '{}');
  return {
    message: parsed.message || 'Sigamos afinando el concepto.',
    suggestedQuickReplies: parsed.suggestedQuickReplies || ['Continuar', 'Tengo otra idea'],
    synthesis: parsed.synthesis
  };
}
