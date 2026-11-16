import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const serverKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

  // GET: Health check & Server Key status
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      hasServerKey: Boolean(serverKey && serverKey.trim().length > 5),
      environment: process.env.NODE_ENV || 'production'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    // In Vercel, req.body is pre-parsed JSON. If not, parse it.
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { action = 'generateContent', model = 'gemini-3.8-flash', contents, config, clientApiKey, fileInfo } = body || {};

    const effectiveKey = (clientApiKey && clientApiKey.trim().length > 5 ? clientApiKey.trim() : serverKey).trim();

    if (!effectiveKey) {
      return res.status(401).json({
        error: 'No se encontró ninguna API Key de Gemini. Configura la variable de entorno GEMINI_API_KEY en Vercel (Settings -> Environment Variables) o añade tu clave en la aplicación.'
      });
    }

    // Action: Status check via POST
    if (action === 'status') {
      return res.status(200).json({
        status: 'ok',
        hasServerKey: Boolean(serverKey && serverKey.trim().length > 5)
      });
    }

    // Action: Initialize Resumable File Upload (keeps API key private on server)
    if (action === 'initUpload') {
      const googleUploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(effectiveKey)}`;
      
      const initResp = await fetch(googleUploadUrl, {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(fileInfo?.fileSize || 0),
          'X-Goog-Upload-Header-Content-Type': fileInfo?.mimeType || 'video/mp4',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file: {
            display_name: fileInfo?.fileName || 'uploaded_video'
          }
        })
      });

      if (!initResp.ok) {
        const errText = await initResp.text();
        return res.status(initResp.status).json({
          error: `Error iniciando subida a Google File API: ${errText}`
        });
      }

      const uploadUrl = initResp.headers.get('X-Goog-Upload-URL');
      if (!uploadUrl) {
        const data = (await initResp.json()) as any;
        return res.status(200).json({ fileUri: data.file?.uri, mimeType: data.file?.mimeType });
      }

      // Return the secure session upload URL (which does NOT expose the API key)
      return res.status(200).json({ uploadUrl });
    }

    // Action: Generate Content (Default)
    const ai = new GoogleGenAI({
      apiKey: effectiveKey,
      apiVersion: 'v1beta'
    });

    let resolvedModel = model;
    if (resolvedModel.includes('2.5') || resolvedModel === 'gemini-3.1-pro-preview') {
      resolvedModel = 'gemini-3.8-flash';
    }

    try {
      const response = await ai.models.generateContent({
        model: resolvedModel,
        contents,
        config
      });

      return res.status(200).json({
        text: response.text,
        candidates: response.candidates
      });
    } catch (genError: any) {
      const errorMsg = String(genError?.message || genError);
      const isQuotaOrNotFound =
        errorMsg.includes('404') ||
        errorMsg.includes('429') ||
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('limit: 0') ||
        errorMsg.includes('no longer available') ||
        errorMsg.includes('not found') ||
        errorMsg.includes('Quota exceeded');

      if (isQuotaOrNotFound && resolvedModel !== 'gemini-3.8-flash') {
        console.warn(`[Vercel Serverless] Fallback a gemini-3.8-flash por error en ${resolvedModel}`);
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config
        });

        return res.status(200).json({
          text: fallbackResponse.text,
          candidates: fallbackResponse.candidates
        });
      }

      throw genError;
    }
  } catch (error: any) {
    console.error('[Vercel Serverless API Error]:', error);
    return res.status(500).json({
      error: error?.message || 'Error procesando solicitud en el servidor de Gemini'
    });
  }
}
