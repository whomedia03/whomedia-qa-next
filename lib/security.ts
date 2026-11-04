import { createHmac, timingSafeEqual } from 'node:crypto';
export function equal(a: string, b: string) {
 const x = createHmac('sha256', 'compare').update(a).digest();
 const y = createHmac('sha256', 'compare').update(b).digest();
 return timingSafeEqual(x, y);
}
type Claims = { role: 'admin' | 'reviewer'; project?: string; video?: string; exp: number };
function secret() { const s = process.env.SESSION_SECRET; if (!s || s.length < 32) throw new Error('SESSION_SECRET을 32자 이상으로 설정하세요.'); return s; }
export function sign(claims: Claims) {
 const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
 return `${body}.${createHmac('sha256', secret()).update(body).digest('base64url')}`;
}
export function verify(token: string): Claims | null {
 try {
  const parts = token.split('.'); if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!equal(sig, createHmac('sha256', secret()).update(body).digest('base64url'))) return null;
  const c = JSON.parse(Buffer.from(body, 'base64url').toString());
  return Number.isFinite(c.exp) && c.exp > Date.now() && ['admin', 'reviewer'].includes(c.role) ? c : null;
 } catch { return null; }
}
export function mayAccess(claims: Claims | null, project: string, video?: string) {
 return claims?.role === 'admin' || (claims?.role === 'reviewer' && claims.project === project && (!claims.video || claims.video === video));
}
export function safeId(value: unknown): value is string { return typeof value === 'string' && /^[a-z0-9-]{1,100}$/.test(value); }
