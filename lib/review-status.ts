import type { Review } from './types.ts';
export function latestStatus(reviews: Review[]): Review['status'] { return [...reviews].filter(r => r.kind !== 'comment').sort((a,b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0]?.status || 'pending'; }
