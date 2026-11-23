import './loading.css';

export function Indicator({ kind }) {
  return <span aria-hidden="true" className={`indicator indicator-${kind}`}>
    {kind === 'skeleton' ? <><i/><i/><i/></> : <i/>}
  </span>;
}

export function Meter({ value, max, label }) {
  return <progress className="loading-meter" value={value} max={max} aria-label={label}/>;
}
