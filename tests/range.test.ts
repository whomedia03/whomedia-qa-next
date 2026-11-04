import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boundedRange } from '../lib/range.ts';
test('영상 탐색 범위를 최대 8MiB로 제한한다', () => {
 assert.equal(boundedRange('bytes=0-', 100_000_000), 'bytes=0-8388607');
 assert.equal(boundedRange('bytes=0-1', 100), 'bytes=0-1');
 assert.equal(boundedRange('bytes=-10', 100), 'bytes=90-99');
 assert.equal(boundedRange(null, 100), null);
 for (const r of ['bytes=200-', 'bytes=10-2', 'bytes=-', 'bytes=0-1,3-4']) assert.throws(() => boundedRange(r, 100));
});
