// 큰 동영상은 작은 범위로 나누어 전송해 함수 실행 시간을 줄입니다.
export function boundedRange(range: string | null, size: number): string | null {
 if (!range) return null;
 const match = /^bytes=(\d*)-(\d*)$/.exec(range);
 if (!match || (!match[1] && !match[2])) throw new Error('Invalid range');
 const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
 const requestedEnd = match[1] && match[2] ? Number(match[2]) : size - 1;
 if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0 || start >= size || requestedEnd < start) throw new Error('Invalid range');
 return `bytes=${start}-${Math.min(requestedEnd, size - 1, start + 8 * 1024 ** 2 - 1)}`;
}
