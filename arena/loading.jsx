import { useEffect, useState } from 'react';
import './loading.css';

const patterns = [
  ['arc', 'Spinner arc'],
  ['bounce-dots', 'Bouncing dots', 3],
  ['pulse', 'Pulse rings', 2],
  ['indeterminate', 'Indeterminate bar'],
  ['skeleton', 'Skeleton shimmer', 3],
  ['orbit', 'Orbit'],
  ['equalizer', 'Equalizer bars', 5],
  ['morph', 'Square morph'],
  ['liquid', 'Liquid fill'],
  ['dot-grid', 'Dot grid wave', 9],
  ['infinity', 'Infinity trail', 3],
  ['flip', 'Flipping square'],
  ['gradient', 'Gradient ring'],
  ['typing', 'Typing dots', 3],
  ['spokes', 'Spoke spinner', 12],
  ['percent', 'Percent bar'],
  ['chase', 'Chasing squares', 2],
  ['text', 'Text shimmer'],
  ['battery', 'Battery charge', 4],
  ['ball', 'Bouncing ball'],
];

const countByPattern = Object.fromEntries(patterns.map(([id, , parts = 1]) => [id, parts]));

export function Indicator({ kind, active = true }) {
  return <span aria-hidden="true" className={`indicator indicator-${kind}${active ? ' is-moving' : ''}`}>
    {Array.from({ length: countByPattern[kind] }, (_, index) =>
      <i key={index} style={{ '--index': index }}/>)}
    {kind === 'text' && <b>Loading</b>}
  </span>;
}

export function Meter({ value, max, label }) {
  return <progress className="loading-meter" value={value} max={max} aria-label={label}/>;
}

const demoDuration = 4000;
export function MotionGallery() {
  const [playing, setPlaying] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    const interval = setInterval(() => {
      const next = Math.min(performance.now() - start, demoDuration);
      setElapsed(next);
      if (next >= demoDuration) setPlaying(null);
    }, 100);
    return () => clearInterval(interval);
  }, [playing]);

  return <main className="wrap motion-page">
    <div className="arena-intro">
      <a className="arena-back" href="/arena">← Coding Arena</a>
      <h1>Loading patterns</h1>
      <p>Play any example. Each preview stops after four seconds.</p>
    </div>
    <ul className="motion-grid">{patterns.map(([id, name]) => {
      const active = playing === id;
      const percent = active ? Math.floor(elapsed / demoDuration * 100) : 65;
      return <li key={id}>
        <button type="button" aria-pressed={active} onClick={() => { setElapsed(0); setPlaying(active ? null : id); }}>
          <span className="motion-stage">
            {id === 'percent' ? <span className="motion-percent" aria-hidden="true"><progress className="loading-meter" value={percent} max="100"/>{percent}%</span>
              : <Indicator kind={id} active={active}/>}
          </span>
          <span className="motion-label"><span>{name}</span><span>{active ? 'Stop' : 'Play'}</span></span>
        </button>
      </li>;
    })}</ul>
  </main>;
}
