import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'gemini-dev-api',
        configureServer(server) {
          server.middlewares.use('/api/gemini', async (req: any, res: any) => {
            if (env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
              process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
            }

            res.status = (code: number) => {
              res.statusCode = code;
              return res;
            };
            res.json = (data: any) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
              return res;
            };

            if (req.method === 'POST') {
              let raw = '';
              req.on('data', (chunk: any) => {
                raw += chunk;
              });
              req.on('end', async () => {
                try {
                  req.body = raw ? JSON.parse(raw) : {};
                  const { default: handler } = await import('./api/gemini.ts');
                  await handler(req, res);
                } catch (e: any) {
                  res.status(500).json({ error: e?.message || 'Server error' });
                }
              });
            } else {
              try {
                const { default: handler } = await import('./api/gemini.ts');
                await handler(req, res);
              } catch (e: any) {
                res.status(500).json({ error: e?.message || 'Server error' });
              }
            }
          });
        }
      }
    ]
  };
});

