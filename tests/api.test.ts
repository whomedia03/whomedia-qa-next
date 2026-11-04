import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { sign } from '../lib/security.ts';
process.env.SESSION_SECRET = 'test-only-secret-with-at-least-32-characters';
process.env.ADMIN_PASSWORD = 'test-only-password-with-at-least-32-characters';
process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
const memory = new Map<string, unknown>();
await mock.module('@vercel/blob', { namedExports: {
 get: async (path: string) => memory.has(path) ? { statusCode: 200, stream: new Blob([JSON.stringify(memory.get(path))]).stream(), headers: new Headers(), blob: { contentType: 'application/json' } } : null,
 put: async (path: string, value: string) => { if (memory.has(path)) throw new Error('Duplicate record'); memory.set(path, JSON.parse(value)); },
 list: async ({ prefix }: { prefix: string }) => ({ blobs: [...memory.keys()].filter(k => k.startsWith(prefix)).map(pathname => ({ pathname })), hasMore: false }),
 del: async (path: string) => { memory.delete(path); }, head: async () => ({ size: 100 })
} });
await mock.module('@vercel/blob/client', { namedExports: { handleUpload: async ({ onBeforeGenerateToken }: { onBeforeGenerateToken: (path: string) => Promise<unknown> }) => onBeforeGenerateToken('media/postech/vid-a.mp4') } });
const { handler } = await import('../api/index.ts');
async function request(action: string, options: { body?: unknown; token?: string; project?: string; video?: string; admin?: boolean; origin?: string } = {}) {
 const q = new URLSearchParams({ action, p: options.project || '', v: options.video || '', token: options.token || '' });
 const headers = new Headers({ origin: options.origin || 'https://qa.example', 'Content-Type': 'application/json' });
 if (options.admin) headers.set('cookie', `qa_session=${sign({ role: 'admin', exp: Date.now() + 10000 })}`);
 return handler(new Request(`https://qa.example/api?${q}`, { headers, method: options.body === undefined ? 'GET' : 'POST', ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}) }));
}
test('API: 비로그인 조회와 잘못된 비밀번호를 거부한다', async () => {
 assert.equal((await request('data')).status, 401);
 assert.equal((await request('login', { body: { password: 'wrong' } })).status, 401);
 const result = await request('login', { body: { password: process.env.ADMIN_PASSWORD } });
 assert.equal(result.status, 200); assert.match(result.headers.get('set-cookie')!, /HttpOnly; SameSite=Strict/); assert.match(result.headers.get('set-cookie')!, /Secure/);
});
test('API: 다른 출처의 변경 요청을 거부한다', async () => {
 assert.equal((await request('project', { admin: true, origin: 'https://attacker.example', body: { name: '기관', alias: 'test' } })).status, 403);
});
test('API: 프로젝트·영상·의견·QR 발급 흐름 및 기관 격리', async () => {
 const created = await request('project', { admin: true, body: { name: '포항공대', alias: 'postech' } }); assert.equal(created.status, 201);
 const project = (await created.json()).id;
 await request('project', { admin: true, body: { name: '다른 기관', alias: 'khcu' } });
 for (const id of ['vid-a', 'vid-b']) {
  const r = await request('video', { admin: true, body: { project, id, pathname: `media/${project}/${id}.mp4`, title: '실제 강의', week: 1, lesson: 1, fileName: 'lecture.mp4' } }); assert.equal(r.status, 201);
 }
 const shared = await request('share', { admin: true, body: { project, video: 'vid-a' } }); const link = new URL((await shared.json()).url); const token = link.searchParams.get('token')!;
 const dataResponse = await request('data', { project, video: 'vid-a', token }); assert.equal(dataResponse.status, 200);
 const data = await dataResponse.json(); assert.equal(data.projects.length, 1); assert.equal(data.videos.length, 1); assert.equal(data.videos[0].pathname, undefined);
 assert.equal((await request('data', { project, video: 'vid-b', token })).status, 401);
 assert.equal((await request('data', { project, token })).status, 401);
 assert.equal((await request('data', { project: 'khcu', video: 'vid-a', token })).status, 401);
 const body = { project, video: 'vid-a', author: '심사위원', text: '음량을 확인해 주세요.', status: 'changes', time: 12 };
 const replies = await Promise.all([request('review', { project, video: 'vid-a', token, body }), request('review', { project, video: 'vid-a', token, body: { ...body, text: '자막 확인' } })]);
 assert.deepEqual(replies.map(r => r.status), [201, 201]);
 const refreshed = await (await request('data', { project, video: 'vid-a', token })).json(); assert.equal(refreshed.reviews.length, 2);
 assert.equal((await request('review', { project, video: 'vid-a', token, body: { ...body, video: 'vid-b' } })).status, 403);
 assert.equal((await request('project', { project, video: 'vid-a', token, body: { name: 'forbidden', alias: 'forbidden' } })).status, 403);
 const removed = await request('delete', { admin: true, body: { project, video: 'vid-a' } }); assert.equal(removed.status, 200);
 assert.equal((await request('media', { project, video: 'vid-a', token })).status, 404);
});
test('API: 업로드는 관리자만 허용한다', async () => {
 assert.equal((await request('upload', { body: {} })).status, 401);
});
