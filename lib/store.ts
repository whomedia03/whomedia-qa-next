import { get, put, list, del } from '@vercel/blob';
export async function read<T>(path: string): Promise<T | null> {
 const result = await get(path, { access: 'private', useCache: false });
 if (!result || result.statusCode !== 200) return null;
 return await new Response(result.stream).json() as T;
}
export async function write(path: string, value: unknown, overwrite = false) {
 await put(path, JSON.stringify(value), { access: 'private', addRandomSuffix: false, allowOverwrite: overwrite, contentType: 'application/json' });
}
export async function records<T>(prefix: string): Promise<T[]> {
 let cursor: string | undefined; const paths: string[] = [];
 do { const page = await list({ prefix, cursor, limit: 1000 }); paths.push(...page.blobs.map(b => b.pathname)); cursor = page.hasMore ? page.cursor : undefined; } while (cursor);
 const values: T[] = [];
 for (let i = 0; i < paths.length; i += 10) {
  const batch = await Promise.all(paths.slice(i, i + 10).map(p => read<T>(p))); values.push(...batch.filter(v => v !== null) as T[]);
 }
 return values;
}
export { del };
