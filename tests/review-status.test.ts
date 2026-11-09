import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latestStatus } from '../lib/review-status.ts';
import type { Review } from '../lib/types.ts';
test('의견 등록은 확정 결과를 덮어쓰지 않고 기존 기록은 호환된다', () => {
 const base = { id: 'a', project: 'p', video: 'v', author: '검수자', text: '내용', time: 0 };
 const records: Review[] = [{ ...base, status: 'changes', createdAt: '2026-11-01' }, { ...base, id: 'b', status: 'approved', kind: 'decision', createdAt: '2026-11-02' }, { ...base, id: 'c', status: 'pending', kind: 'comment', createdAt: '2026-11-03' }];
 assert.equal(latestStatus(records), 'approved'); assert.equal(latestStatus(records.slice(0,1)), 'changes'); assert.equal(latestStatus([]), 'pending');
});
