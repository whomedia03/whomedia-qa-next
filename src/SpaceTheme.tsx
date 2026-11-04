/** Original vector artwork; no reference PDF images are bundled. */
export function WindowChrome({ title }: { title: string }) {
  return <div className="window-chrome">
    <span className="window-dots" aria-hidden="true"><i/><i/><i/></span>
    <span className="window-title">{title}</span>
    <span className="window-cross" aria-hidden="true">×</span>
  </div>;
}

export function ReviewOrbit() {
  return <div className="review-orbit" aria-hidden="true">
    <div className="orbit-grid"/>
    <svg className="orbit-art" viewBox="0 0 440 270" fill="none">
      <ellipse className="orbit-track" cx="220" cy="134" rx="165" ry="65" transform="rotate(-24 220 134)"/>
      <ellipse className="orbit-track secondary" cx="220" cy="134" rx="167" ry="65" transform="rotate(24 220 134)"/>
      <circle className="orbit-ring" cx="220" cy="134" r="96"/>
      <circle className="orbit-inner" cx="220" cy="134" r="79"/>
      <path className="orbit-frame" d="M181 96h78a10 10 0 0 1 10 10v56a10 10 0 0 1-10 10h-78a10 10 0 0 1-10-10v-56a10 10 0 0 1 10-10Z"/>
      <path className="orbit-play" d="m208 116 30 18-30 18Z"/>
      <path className="orbit-corners" d="M158 99V84h15m94 0h15v15m0 70v15h-15m-94 0h-15v-15"/>
      <circle className="orbit-satellite" cx="354" cy="72" r="5"/>
      <circle className="orbit-satellite lime" cx="89" cy="73" r="3"/>
      <circle className="orbit-star" cx="39" cy="134" r="1.5"/>
      <circle className="orbit-star" cx="382" cy="174" r="2"/>
      <circle className="orbit-star" cx="284" cy="28" r="1.5"/>
      <path className="orbit-spark" d="M364 41v10m-5-5h10M76 191v10m-5-5h10"/>
    </svg>
    <span className="orbit-caption"><i/> EVERY FRAME MATTERS</span>
    <span className="orbit-coordinate">WHOMEDIA · CONTENT QUALITY</span>
  </div>;
}
