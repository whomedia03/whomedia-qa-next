import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { handler } from './api/index.ts';
export default defineConfig(({ mode }) => {
 Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
 return { plugins: [react(), { name: 'local-vercel-api', configureServer(server) {
  server.middlewares.use(async (req, res, next) => {
   if (new URL(req.url || '/', 'http://localhost').pathname !== '/api') return next();
   try {
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 1024 ** 2) throw new Error('요청이 너무 큽니다.'); chunks.push(chunk); }
    const method = req.method || 'GET'; const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    const request = new Request(`http://${req.headers.host}${req.url}`, { method, headers, ...(method !== 'GET' && method !== 'HEAD' ? { body: Buffer.concat(chunks) } : {}) });
    const response = await handler(request); res.statusCode = response.status; response.headers.forEach((v, k) => res.setHeader(k, v));
    if (response.body) await pipeline(Readable.fromWeb(response.body as never), res); else res.end();
   } catch { if (!res.headersSent) { res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: '로컬 API 요청을 처리하지 못했습니다.' })); } else res.end(); }
  });
 } }] };
});
