import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sign, verify, mayAccess, safeId } from '../lib/security.ts';
process.env.SESSION_SECRET = 'test-only-secret-32-characters-or-longer';
test('변조·만료·누락 토큰을 거부한다', () => {
 const token = sign({ role: 'reviewer', project: 'postech', exp: Date.now() + 10000 });
 assert.equal(verify(token)?.project, 'postech');
 assert.equal(verify(token + 'x'), null); assert.equal(verify(''), null);
 assert.equal(verify(sign({ role: 'admin', exp: Date.now() - 1 })), null);
});
test('기관 링크는 다른 기관을 읽을 수 없다', () => {
 const claims = verify(sign({ role: 'reviewer', project: 'postech', exp: Date.now() + 10000 }));
 assert.equal(mayAccess(claims, 'postech', 'video-a'), true);
 assert.equal(mayAccess(claims, 'khcu', 'video-a'), false);
 assert.equal(mayAccess(null, 'postech'), false);
});
test('개별 영상 링크로 다른 영상이나 기관 전체를 조회할 수 없다', () => {
 const claims = verify(sign({ role: 'reviewer', project: 'postech', video: 'video-a', exp: Date.now() + 10000 }));
 assert.equal(mayAccess(claims, 'postech', 'video-a'), true);
 assert.equal(mayAccess(claims, 'postech', 'video-b'), false);
 assert.equal(mayAccess(claims, 'postech'), false);
});
test('경로 조작을 거부한다', () => {
 for (const id of ['../admin', 'a/b', '', null, '<script>', 'a'.repeat(101)]) assert.equal(safeId(id), false);
 assert.equal(safeId('postech-123a'), true);
});
