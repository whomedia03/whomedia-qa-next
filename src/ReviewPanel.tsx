import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3, Copy, FileVideo, Info, LoaderCircle, MessageSquare, Pause, Play, RotateCcw, RotateCw, Send, X, XCircle } from 'lucide-react';
import { latestStatus } from '../lib/review-status';
import type { Data, Review } from '../lib/types';

export type ReviewDraft = Pick<Review, 'author' | 'text' | 'time' | 'status' | 'timestampAttached' | 'kind'>;
type Props = {
  video: Data['videos'][number];
  reviews: Review[];
  mediaUrl: string;
  onClose: () => void;
  onSave: (draft: ReviewDraft) => Promise<void>;
  onCopyLink: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
};
const statusLabels = { pending: '검수 대기', approved: '승인', changes: '거절' };
const speeds = [.5, .75, 1, 1.25, 1.5, 1.75, 2];
export function timeLabel(seconds: number) {
  const value = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = String(value % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${String(minutes).padStart(2, '0')}:${secs}`;
}

export function ReviewPanel({ video, reviews, mediaUrl, onClose, onSave, onCopyLink, onBusyChange }: Props) {
  const player = useRef<HTMLVideoElement>(null);
  const ordered = [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  const currentStatus = latestStatus(reviews);
  const [status, setStatus] = useState<Review['status']>(currentStatus);
  const [tab, setTab] = useState<'comments' | 'information'>('comments');
  const [author, setAuthor] = useState('');
  const [note, setNote] = useState('');
  const [attachTime, setAttachTime] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [decisionSelected, setDecisionSelected] = useState(false);
  const [error, setError] = useState('');
  const [mediaError, setMediaError] = useState('');
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  function seek(value: number) {
    if (!player.current || !Number.isFinite(player.current.duration)) return;
    player.current.currentTime = Math.max(0, Math.min(player.current.duration, value));
    setTime(player.current.currentTime);
  }
  async function togglePlay() {
    if (!player.current) return;
    try { if (player.current.paused) await player.current.play(); else player.current.pause(); }
    catch { setMediaError('영상을 재생하지 못했습니다. 잠시 후 다시 재생해 주세요.'); }
  }
  async function submit(decision = false) {
    if (saving) return;
    const name = author.trim(); const content = note.trim();
    if (!name || (!decision && !content) || (decision && status === 'changes' && !content)) { setError('검수자 이름을 입력해 주세요. 거절 또는 의견 등록 시에는 의견도 필요합니다.'); return; }
    setSaving(true); onBusyChange(true); setError('');
    try {
      await onSave({ author: name, text: content, time: !decision && attachTime ? Math.floor(time) : 0, timestampAttached: !decision && attachTime, status: decision ? status : currentStatus, kind: decision ? 'decision' : 'comment' });
      setNote(''); setDecisionSelected(false); setFeedback(decision ? `${statusLabels[status]} 결과가 저장되었습니다.` : '검수 의견이 등록되었습니다.');
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); onBusyChange(false); }
  }
  async function copyLink() {
    if (copying) return;
    setCopying(true); setError('');
    try { await onCopyLink(); setCopied(true); }
    catch { setError('링크를 복사하지 못했습니다. 브라우저의 클립보드 접근을 확인해 주세요.'); }
    finally { setCopying(false); }
  }
  return <div className="overlay review-overlay">
    <section className="review-modal studio-review" role="dialog" aria-modal="true" aria-labelledby="studio-review-title">
      <div className="studio-grid">
        <div className="studio-player">
          <div className="studio-stage">
            <video ref={player} controls playsInline preload="metadata" src={mediaUrl}
              onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
              onLoadedMetadata={e => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
              onDurationChange={e => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
              onRateChange={e => setSpeed(e.currentTarget.playbackRate)}
              onError={() => setMediaError('영상 재생에 실패했습니다. 링크 유효기간과 파일 형식을 확인해 주세요.')}/>
            <div className="studio-chips"><span className="studio-title-chip"><i/>{video.title}</span><span className={`studio-state-chip ${currentStatus}`}><Clock3 size={13}/>{statusLabels[currentStatus]}</span></div>
          </div>
          <div className="studio-transport">
            <input className="studio-scrubber" type="range" aria-label="영상 재생 위치" min={0} max={duration || .01} step={.1} value={Math.min(time, duration || 0)} onChange={e => seek(Number(e.target.value))} disabled={!duration}/>
            <div className="studio-playback-row">
              <div className="studio-seek-controls">
                <button type="button" onClick={() => seek(time - 10)} disabled={!duration} aria-label="10초 뒤로"><RotateCcw size={14}/>10초</button>
                <button type="button" onClick={() => void togglePlay()} aria-label={playing ? '영상 일시 정지' : '영상 재생'}>{playing ? <Pause size={14}/> : <Play size={14}/>} {playing ? '일시 정지' : '재생'}</button>
                <button type="button" onClick={() => seek(time + 10)} disabled={!duration} aria-label="10초 앞으로">10초<RotateCw size={14}/></button>
              </div>
              <output aria-label="재생 시간">{timeLabel(time)} <span>/ {timeLabel(duration)}</span></output>
            </div>
            <div className="studio-speed-row"><span>재생 속도</span><div>{speeds.map(value => <button key={value} type="button" aria-label={`${value}배속`} aria-pressed={speed === value} className={speed === value ? 'selected' : ''} onClick={() => { if (player.current) player.current.playbackRate = value; }}>{value}×</button>)}</div></div>
            {mediaError && <p className="studio-media-error" role="alert">{mediaError}</p>}
          </div>
        </div>
        <aside className="studio-side">
          <div className="studio-side-top">
            <div className="studio-tabs" role="tablist" aria-label="검수 패널">
              <button id="studio-comments-tab" type="button" role="tab" aria-controls="studio-comments-panel" aria-selected={tab === 'comments'} onClick={() => setTab('comments')}><MessageSquare size={14}/>검수 의견 ({reviews.length})</button>
              <button id="studio-information-tab" type="button" role="tab" aria-controls="studio-information-panel" aria-selected={tab === 'information'} onClick={() => setTab('information')}><Info size={14}/>강의 정보</button>
            </div>
            <button className="studio-close" type="button" onClick={() => { if (!saving) onClose(); }} disabled={saving} aria-label="영상 닫기"><X size={20}/></button>
          </div>
          {tab === 'comments' ? <div id="studio-comments-panel" role="tabpanel" aria-labelledby="studio-comments-tab">
            <form onSubmit={e => { e.preventDefault(); void submit(false); }}>
              <label className="studio-label">검수자<input name="author" value={author} onChange={e => setAuthor(e.target.value)} placeholder="검수자 이름" required maxLength={60} disabled={saving}/></label>
              <div className="studio-result-label"><span>검수 결과</span><span className={`status ${currentStatus}`}>{statusLabels[currentStatus]}</span></div>
              <div className="studio-status-actions" role="group" aria-label="검수 결과 선택">
                <button type="button" className={status === 'approved' ? 'selected approved' : ''} aria-pressed={status === 'approved'} onClick={() => { setStatus('approved'); setDecisionSelected(true); setFeedback(''); } } disabled={saving}><CheckCircle2 size={16}/>승인</button>
                <button type="button" className={status === 'changes' ? 'selected changes' : ''} aria-pressed={status === 'changes'} onClick={() => { setStatus('changes'); setDecisionSelected(true); setFeedback(''); } } disabled={saving}><XCircle size={16}/>거절</button>
                <button type="button" className={status === 'pending' ? 'selected pending' : ''} aria-pressed={status === 'pending'} onClick={() => { setStatus('pending'); setDecisionSelected(true); setFeedback(''); } } disabled={saving}><Clock3 size={16}/>대기</button>
              </div>
              <div className={`decision-confirm ${status}`}><p className="studio-status-help">{decisionSelected ? `${statusLabels[status]} 선택됨 · 확인 버튼을 눌러 저장하세요.` : "결과를 선택한 뒤 확인 버튼을 누르세요."}</p><button type="button" className="primary action-confirm" disabled={saving || !decisionSelected} onClick={() => void submit(true)}>{saving ? "저장 중…" : `${statusLabels[status]} 확인`}</button></div>{feedback && <p className="studio-feedback" role="status">✓ {feedback}</p>}
              <label className="studio-label studio-note-label">검수 의견<small>필요한 장면에서 의견을 남겨 주세요.</small><textarea name="note" value={note} onChange={e => setNote(e.target.value)} placeholder="예) 03:12 자막의 표현을 확인해 주세요." maxLength={4000} rows={4} disabled={saving}/></label>
              <div className="studio-submit-row"><label className="studio-attach"><input type="checkbox" checked={attachTime} onChange={e => setAttachTime(e.target.checked)} disabled={saving}/>현재 재생 시점 첨부<span>{timeLabel(time)}</span></label><button type="submit" className="primary action-save" disabled={saving || !author.trim() || !note.trim()}>{saving ? <LoaderCircle size={14} className="spin"/> : <Send size={14}/>}의견 등록</button></div>
              {error && <div className="error" role="alert">{error}</div>}
            </form>
            <div className="studio-comments-heading">등록된 검수 의견<span>{reviews.length}</span></div>
            <div className="studio-comments">{ordered.length ? ordered.map(review => <article key={review.id}>
              <div className="studio-comment-meta"><strong>{review.author}</strong><span className={`status ${review.status}`}>{statusLabels[review.status]}</span></div>
              <p>{review.text}</p><div className="studio-comment-footer">{review.timestampAttached !== false ? <button type="button" className="timecode" onClick={() => seek(review.time)}>{timeLabel(review.time)}로 이동</button> : <span>영상 전체 의견</span>}<time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleString('ko-KR')}</time></div>
            </article>) : <div className="studio-comments-empty"><MessageSquare size={23}/><p>등록된 검수 의견이 없습니다.</p></div>}</div>
          </div> : <div id="studio-information-panel" role="tabpanel" aria-labelledby="studio-information-tab" className="studio-information">
            <FileVideo size={29}/><h3>강의 정보</h3><dl><dt>강의명</dt><dd>{video.title}</dd><dt>주차 · 차시</dt><dd>{video.week}주차 · {video.lesson}차시</dd><dt>파일명</dt><dd>{video.fileName}</dd><dt>파일 크기</dt><dd>{(video.bytes / 1024 ** 2).toFixed(1)} MB</dd><dt>영상 길이</dt><dd>{duration ? timeLabel(duration) : '불러오는 중'}</dd><dt>강의 설명</dt><dd>{video.description || "등록된 설명이 없습니다."}</dd><dt>등록일</dt><dd>{new Date(video.createdAt).toLocaleDateString('ko-KR')}</dd></dl>
          </div>}
        </aside>
      </div>
      <footer className="studio-footer"><div><h2 id="studio-review-title">{video.title}</h2><p>{video.week}주차 · {video.lesson}차시<span>파일 {(video.bytes / 1024 ** 2).toFixed(1)} MB</span><span>등록 {new Date(video.createdAt).toLocaleDateString('ko-KR')}</span></p></div><button type="button" onClick={() => void copyLink()} disabled={copying}>{copied ? <CheckCircle2 size={15}/> : <Copy size={15}/>} {copied ? '복사 완료' : '영상 링크 복사'}</button></footer>
    </section>
  </div>;
}
