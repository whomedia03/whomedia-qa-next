import { randomUUID } from 'node:crypto';
import { get, head } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';
import { equal, sign, verify, mayAccess, safeId } from '../lib/security.ts';
import { read, write, records, del } from '../lib/store.ts';
import type { Project, Video, Review } from '../lib/types.ts';
import { boundedRange } from '../lib/range.ts';

export const maxDuration = 300;
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', ...headers } });
function requireValue(ok: unknown, message: string, status = 400): asserts ok { if (!ok) throw Object.assign(new Error(message), { status }); }
function text(v: unknown, max = 200) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
export async function handler(req: Request): Promise<Response> {
 try {
  const url = new URL(req.url); const action = url.searchParams.get('action') || 'data';
  requireValue(process.env.BLOB_READ_WRITE_TOKEN && process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 32 && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32, 'Vercel에서 Private Blob과 관리자 환경 변수를 설정해 주세요.', 503);
  const cookie = req.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith('qa_session='))?.slice(11) || '';
  const session = verify(cookie);
  const token = url.searchParams.get('token') || '';
  // A submitted review link always keeps its own scope, even in an administrator's browser.
  const admin = session?.role === 'admin' && !token;
  const claims = token ? verify(token) : admin ? session : null;
  const project = url.searchParams.get('p') || ''; const video = url.searchParams.get('v') || '';
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  if (req.method !== 'GET' && action !== 'upload') {
   requireValue(req.headers.get('origin') === url.origin, '요청 출처를 확인할 수 없습니다.', 403);
   requireValue((req.headers.get('content-type') || '').includes('application/json'), 'JSON 요청이 필요합니다.', 415);
  }
  if (action === 'session' && req.method === 'GET') return json({ admin });
  if (action === 'login' && req.method === 'POST') {
   const body = await req.json(); requireValue(equal(text(body.password, 1000), process.env.ADMIN_PASSWORD!), '비밀번호를 확인해 주세요.', 401);
   return json({ admin: true }, 200, { 'Set-Cookie': `qa_session=${sign({ role: 'admin', exp: Date.now() + 8 * 3600000 })}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure}` });
  }
  if (action === 'logout' && req.method === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': `qa_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}` });
  if (action === 'upload' && req.method === 'POST') {
   const body = await req.json();
   const response = await handleUpload({ request: req, body,
    onBeforeGenerateToken: async pathname => {
     requireValue(admin, '관리자 로그인이 필요합니다.', 401);
     requireValue(req.headers.get('origin') === url.origin, '잘못된 요청입니다.', 403);
     const match = /^media\/([a-z0-9-]+)\/([a-z0-9-]+)\.(mp4|webm|mov|mkv)$/.exec(pathname);
     requireValue(match && await read(`projects/${match[1]}.json`), '프로젝트 또는 파일 형식이 올바르지 않습니다.');
     return { allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'], maximumSizeInBytes: 2 * 1024 ** 3, addRandomSuffix: false, validUntil: Date.now() + 3600000 };
    }, onUploadCompleted: async () => {} });
   return json(response);
  }
  requireValue(admin || mayAccess(claims, project, video || undefined), '유효한 검수 링크 또는 관리자 로그인이 필요합니다.', 401);
  if (!admin) requireValue(safeId(project) && (!video || safeId(video)), '올바르지 않은 검수 링크입니다.');
  const baseUrl = (process.env.PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : url.origin)).replace(/\/+$/, '');
  if (action === 'data' && req.method === 'GET') {
   const projects = admin ? await records<Project>('projects/') : [await read<Project>(`projects/${project}.json`)].filter(Boolean);
   const videos = admin ? await records<Video>('videos/') : video ? [await read<Video>(`videos/${project}/${video}.json`)].filter(Boolean) as Video[] : await records<Video>(`videos/${project}/`);
   const reviews = await records<Review>(admin ? 'reviews/' : `reviews/${project}/${video ? `${video}/` : ''}`);
   return json({ projects, videos: videos.map(({ pathname: _, ...v }) => v), reviews, baseUrl });
  }
  if (action === 'media' && req.method === 'GET') {
   requireValue(safeId(project) && safeId(video), '영상을 찾을 수 없습니다.', 404);
   const item = await read<Video>(`videos/${project}/${video}.json`); requireValue(item, '영상을 찾을 수 없습니다.', 404);
   let range: string | null;
   try { range = boundedRange(req.headers.get('range'), item.bytes); } catch { return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${item.bytes}`, 'Cache-Control': 'private, no-store' } }); }
   const result = await get(item.pathname, { access: 'private', useCache: false, headers: range ? { range } : undefined });
   requireValue(result, '영상 파일을 찾을 수 없습니다.', 404);
   const headers = new Headers({ 'Cache-Control': 'private, no-store', 'Content-Type': result.blob.contentType || 'application/octet-stream', 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(item.fileName)}` });
   for (const key of ['content-length', 'content-range', 'accept-ranges']) { const value = result.headers.get(key); if (value) headers.set(key, value); }
   return new Response(result.stream, { status: result.headers.has('content-range') ? 206 : result.statusCode, headers });
  }
  if (action === 'share' && req.method === 'POST') {
   requireValue(admin, '관리자 전용 기능입니다.', 403); const b = await req.json();
   requireValue(safeId(b.project) && await read(`projects/${b.project}.json`), '프로젝트를 찾을 수 없습니다.');
   if (b.video) requireValue(safeId(b.video) && await read(`videos/${b.project}/${b.video}.json`), '영상을 찾을 수 없습니다.');
   const token = sign({ role: 'reviewer', project: b.project, ...(b.video ? { video: b.video } : {}), exp: Date.now() + 90 * 86400000 });
   const link = new URL(baseUrl); link.searchParams.set('p', b.project); link.searchParams.set('token', token); if (b.video) link.searchParams.set('v', b.video);
   return json({ url: link.href });
  }
  if (action === 'project' && req.method === 'POST') {
   requireValue(admin, '관리자 전용 기능입니다.', 403); const b = await req.json(); const name = text(b.name); const alias = text(b.alias).toLowerCase();
   requireValue(name && /^[a-z0-9-]{2,40}$/.test(alias), '기관명과 영문 슬러그(2~40자)를 입력해 주세요.');
   const item: Project = { id: `${alias}-${randomUUID().slice(0, 8)}`, name, alias, createdAt: new Date().toISOString() }; await write(`projects/${item.id}.json`, item); return json(item, 201);
  }
  if (action === 'video' && req.method === 'POST') {
   requireValue(admin, '관리자 전용 기능입니다.', 403); const b = await req.json();
   requireValue(safeId(b.project) && safeId(b.id) && await read(`projects/${b.project}.json`), '프로젝트를 확인해 주세요.');
   requireValue(typeof b.pathname === 'string' && new RegExp(`^media/${b.project}/${b.id}\\.(mp4|webm|mov|mkv)$`).test(b.pathname), '잘못된 영상 경로입니다.');
   const blob = await head(b.pathname); const title = text(b.title);
   requireValue(title && Number.isInteger(b.week) && b.week > 0 && b.week <= 1000 && Number.isInteger(b.lesson) && b.lesson > 0 && b.lesson <= 1000, '제목·주차·차시를 확인해 주세요.');
   const item: Video = { id: b.id, project: b.project, title, week: b.week, lesson: b.lesson, fileName: text(b.fileName), pathname: b.pathname, bytes: blob.size, createdAt: new Date().toISOString() };
   await write(`videos/${item.project}/${item.id}.json`, item); return json(item, 201);
  }
  if (action === 'review' && req.method === 'POST') {
   const b = await req.json(); requireValue(safeId(b.project) && safeId(b.video) && mayAccess(claims, b.project, b.video), '이 영상에 접근할 수 없습니다.', 403);
   requireValue(await read(`videos/${b.project}/${b.video}.json`), '영상을 찾을 수 없습니다.', 404);
   requireValue(['pending', 'approved', 'changes'].includes(b.status) && Number.isFinite(b.time) && b.time >= 0 && b.time < 604800, '검수 내용을 확인해 주세요.');
   const author = text(b.author, 60); const note = text(b.text, 4000); requireValue(author && note, '검수자 이름과 의견을 입력해 주세요.');
   const item: Review = { id: randomUUID(), project: b.project, video: b.video, author, text: note, time: b.time, status: b.status, createdAt: new Date().toISOString() };
   await write(`reviews/${item.project}/${item.video}/${item.id}.json`, item); return json(item, 201);
  }
  if (action === 'delete' && req.method === 'POST') {
   requireValue(admin, '관리자 전용 기능입니다.', 403); const b = await req.json(); requireValue(safeId(b.project) && safeId(b.video), '영상을 확인해 주세요.');
   const path = `videos/${b.project}/${b.video}.json`; const item = await read<Video>(path); requireValue(item, '영상을 찾을 수 없습니다.', 404);
   await del(item.pathname); await del(path); return json({ ok: true });
  }
  return json({ error: '지원하지 않는 요청입니다.' }, 405);
 } catch (error) {
  const e = error as Error & { status?: number }; if (!e.status) console.error(e);
  return json({ error: e.status ? e.message : '저장소 요청을 처리하지 못했습니다. Vercel 설정과 로그를 확인해 주세요.' }, e.status || 500);
 }
}
export default { fetch: handler };
