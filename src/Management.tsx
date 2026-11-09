import { useState } from 'react';
import type { Data, Project } from '../lib/types';
type Props = { project?: Project; videos: Data['videos']; request: (action: string, body: unknown) => Promise<unknown>; reload: () => Promise<void>; onNotice: (text: string) => void };
export function Management({ project, videos, request, reload, onNotice }: Props) {
 const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [query, setQuery] = useState('');
 async function save(action: string, form: HTMLFormElement, video?: string) {
  if (busy || !project) return; const fields = Object.fromEntries(new FormData(form)); setBusy(true); setError('');
  try { await request(action, { ...fields, project: project.id, video, ...(video ? { week: Number(fields.week), lesson: Number(fields.lesson) } : {}) }); await reload(); onNotice('변경 사항이 저장되었습니다. 기존 제출 링크는 그대로 사용할 수 있습니다.'); }
  catch (e) { setError((e as Error).message); } finally { setBusy(false); }
 }
 if (!project) return <p>프로젝트를 먼저 등록해 주세요.</p>;
 return <section className="management" aria-label="프로젝트 및 영상 관리">
  <div className="management-heading"><h2>프로젝트·영상 관리</h2><p>기관 정보와 강의 정보를 관리합니다. 설명은 검수자에게도 공개됩니다.</p></div>
  {error && <p className="error" role="alert">{error}</p>}
  <form className="manage-card" onSubmit={e => { e.preventDefault(); void save('update-project', e.currentTarget); }}>
   <h3>프로젝트 정보</h3><label>프로젝트명<input name="name" defaultValue={project.name} required maxLength={200}/></label>
   <label>프로젝트 안내<textarea name="description" defaultValue={project.description || ''} rows={3} maxLength={2000} placeholder="검수 일정과 유의 사항을 입력하세요."/></label>
   <p className="muted">슬러그 {project.alias} · 등록 {new Date(project.createdAt).toLocaleDateString('ko-KR')} · 영상 {videos.length}편</p>
   <button className="primary" disabled={busy}>{busy ? '저장 중…' : '프로젝트 저장'}</button>
  </form>
  <div className="management-heading"><h3>영상 정보 수정</h3><input aria-label="관리 영상 검색" placeholder="강의명·파일명 검색" value={query} onChange={e => setQuery(e.target.value)}/></div>
  <div className="manage-videos">{videos.filter(v => `${v.title} ${v.fileName}`.toLowerCase().includes(query.toLowerCase())).map(v => <details className="manage-card" key={v.id}><summary><strong>{v.title}</strong><span>{v.week}주차 · {v.lesson}차시 · 정보 수정</span></summary>
   <form onSubmit={e => { e.preventDefault(); void save('update-video', e.currentTarget, v.id); }}><label>강의 제목<input name="title" defaultValue={v.title} required maxLength={200}/></label><div className="form-row"><label>주차<input type="number" name="week" defaultValue={v.week} min={1} max={1000} required/></label><label>차시<input type="number" name="lesson" defaultValue={v.lesson} min={1} max={1000} required/></label></div><label>강의 설명<textarea name="description" defaultValue={v.description || ''} rows={3} maxLength={2000}/></label><p className="muted">{v.fileName} · {(v.bytes / 1024 ** 2).toFixed(1)} MB · 등록 {new Date(v.createdAt).toLocaleDateString('ko-KR')}</p><button className="primary" disabled={busy}>{busy ? '저장 중…' : '영상 정보 저장'}</button></form>
  </details>)}</div>{!videos.length && <p>영상 등록 버튼으로 첫 강의 영상을 추가하세요.</p>}
 </section>;
}
