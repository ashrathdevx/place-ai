import { useEffect,useRef,useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence,MotionConfig,motion } from 'framer-motion';
import '@fontsource-variable/jetbrains-mono';
import './workspace.css';
import { Indicator, Meter } from './loading.jsx';

const path = location.pathname.replace(/\/$/,'');
const parts = path.split('/');
const contest = new URL(location.href).searchParams.get('contest');
const decodeLibrary = parts[2] === 'decode';
const working = parts[2] === 'problems' && Boolean(parts[3]);
if (working) document.body.classList.add('working');

const labels = {
  PENDING:'Queued', COMPILING:'Compiling', RUNNING:'Running tests',
  AC:'Accepted', WA:'Wrong Answer', CE:'Compilation Error', RE:'Runtime Error',
  TLE:'Time Limit Exceeded', MLE:'Memory Limit Exceeded', SYSTEM_ERROR:'Judge unavailable', RUN_OK:'Run complete',
};
const verdictText = result => result.status === 'RUNNING'
  ? `Running test case ${result.current_case}/${result.total_cases}`
  : labels[result.verdict ?? result.status] ?? 'Waiting for result';

async function api(url, options) {
  const res = await fetch(url,options);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Could not load this request.');
  return body;
}
const brand = <a href="/" className="brand" aria-label="Place AI home"><img src="/assets/mark.svg" alt="" width="31" height="31"/> Place<span>AI</span></a>;

function Header({ compact = false, backToDecode = false }) {
  return <header className={compact ? 'arena-header compact' : 'arena-header'}><div className="arena-nav">
    {brand}<div className="arena-nav-links"><a href="/arena">Arena</a><a href="/arena/decode">Decode</a><a href="/arena#contests">Contests</a><a href="/profile">My profile</a>{!compact && <a href="/proof">Evidence Engine</a>}</div>
    <a className="button secondary small" href={compact && contest ? `/arena/contests/${encodeURIComponent(contest)}` : compact ? (backToDecode ? '/arena/decode' : '/arena') : '/learn'}>{compact ? (backToDecode ? 'Back to Decode' : 'Back to Arena') : 'Student roadmap'}</a>
  </div></header>;
}

function Pipeline() {
  const host = useRef(null);
  useEffect(() => {
    let active = true;
    let cleanup;
    import('./pipeline.js').then(({ mountPipeline }) => {
      if (active) cleanup = mountPipeline(host.current);
    }).catch(() => {});
    return () => { active = false; cleanup?.(); };
  },[]);
  return <div className="pipeline"><div className="pipeline-canvas" aria-hidden="true" ref={host}/><div className="pipeline-stages"><span>Submit</span><span>Queue</span><span>Isolate</span><span>Verdict</span></div></div>;
}

function useResource(url, { live = false, revision = 0, enabled = true } = {}) {
  const [data,setData] = useState(null);
  const [error,setError] = useState('');
  useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController();
    let fetching = false;
    async function refresh() {
      if (fetching || abort.signal.aborted) return;
      fetching = true;
      try {
        setData(await api(url,{signal:abort.signal}));
        setError('');
      } catch (error) {
        if (!abort.signal.aborted) setError(error.message);
      } finally {
        fetching = false;
      }
    }
    function visible() {
      if (!document.hidden) void refresh();
    }
    function changed(event) {
      if (event.key === 'place-ai:judge-verdict') visible();
    }
    void refresh();
    const timer = live ? setInterval(visible,15000) : null;
    if (live) {
      document.addEventListener('visibilitychange',visible);
      window.addEventListener('storage',changed);
    }
    return () => {
      abort.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange',visible);
      window.removeEventListener('storage',changed);
    };
  },[url,live,revision,enabled]);
  return {data,error};
}

function ProblemList({ problems, context }) {
  return <ul className="problem-list">{problems.map(item => <li key={item.slug}>
    <a className="problem-row" href={`/arena/problems/${item.slug}${context ? '?contest=' + encodeURIComponent(context) : ''}`}>
      <span className={`solve-mark${item.solved ? ' arena-solved' : ''}`} role="img" aria-label={item.solved === null ? 'Progress unavailable' : item.solved ? (item.kind === 'decode' ? 'Decoded' : 'Solved') : 'To do'}>{item.solved ? '✓' : '○'}</span>
      <span className="problem-row-title"><strong>{item.title}</strong>{item.topics?.length > 0 && <small>{item.topics.join(' · ')}</small>}</span>
      <span className={`difficulty ${item.difficulty.toLowerCase()}`}>{item.difficulty}</span>
      <span className="row-arrow" aria-hidden="true">↗</span>
    </a>
  </li>)}</ul>;
}

function ProblemBrowser({ problems, decoding }) {
  const [query,setQuery] = useState('');
  const [level,setLevel] = useState('');
  const [topic,setTopic] = useState('');
  const [progress,setProgress] = useState('');
  const topics = [...new Set(problems.flatMap(item => item.topics ?? []))].sort();
  const needle = query.trim().toLowerCase();
  const shown = problems.filter(item => [item.title,...(item.topics ?? [])].some(value => value.toLowerCase().includes(needle)) &&
    (!level || item.difficulty === level) && (!topic || item.topics?.includes(topic)) &&
    (!progress || item.solved === (progress === 'solved')));
  return <div className="arena-library">
    <div className="arena-section-head"><h2>{decoding ? 'All Decode challenges' : 'Practice problems'}</h2><span role="status">{shown.length} of {problems.length}</span></div>
    <div className="arena-filters">
      <label>Search<input type="search" placeholder="Problem or topic" value={query} onChange={event => setQuery(event.target.value)}/></label>
      <label>Topic<select value={topic} onChange={event => setTopic(event.target.value)}><option value="">All topics</option>{topics.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Difficulty<select value={level} onChange={event => setLevel(event.target.value)}><option value="">All levels</option>{['Easy','Medium','Hard'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Status<select value={progress} onChange={event => setProgress(event.target.value)}><option value="">All statuses</option><option value="solved">{decoding ? 'Decoded' : 'Solved'}</option><option value="todo">To do</option></select></label>
    </div>
    {shown.length ? <><div className="problem-columns" aria-hidden="true"><span/><span>Problem</span><span>Difficulty</span><span/></div><ProblemList problems={shown}/></>
      : <div className="arena-empty"><p>No problems match these filters.</p><button className="text-button" onClick={() => { setQuery(''); setTopic(''); setLevel(''); setProgress(''); }}>Clear filters</button></div>}
  </div>;
}

function LoadingState({ label }) {
  return <div className="resource-loading" role="status"><span>{label}</span><Indicator kind="skeleton"/></div>;
}

function contestPhase(item) {
  const now = Date.now();
  if (now < Date.parse(item.start_time)) return 'Upcoming';
  return now < Date.parse(item.end_time) ? 'Live' : 'Ended';
}

function ArenaHome({ decoding }) {
  const problems = useResource('/api/problems',{live:true});
  const contests = useResource('/api/contests',{live:true,enabled:!decoding});
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const items = problems.data?.filter(item => decoding === (item.kind === 'decode'));
  const hasLiveProgress = items?.some(item => typeof item.solved === 'boolean');
  const solved = items?.filter(item => item.solved).length;
  return <><Header/><main className="wrap arena-page">
    <div className="arena-intro">
      <div><h1>{decoding ? 'Decode' : 'Coding Arena'}</h1><p>{decoding
        ? 'Run a buggy Python program, trace where it goes wrong, and submit your fix.'
        : 'Solve coding problems or sharpen your debugging skills in Decode.'}</p></div>
      <a className="button secondary small" href={decoding ? '/arena' : '/arena/decode'}>{decoding ? 'Browse practice problems' : 'Explore Decode →'}</a>
    </div>
    <div className="arena-catalog">
      <section className="arena-card" id="problems" aria-label="Problem library">
        {items ? <ProblemBrowser key={String(decoding)} problems={items} decoding={decoding}/> : problems.error ? <p role="alert">{problems.error}</p> : <LoadingState label="Loading problems…"/>}
      </section>
      <aside className="arena-rail" aria-label="Arena activity and resources">
        <section className="arena-card arena-progress">
          <h2>{decoding ? 'Your Decode progress' : 'Your practice progress'}</h2>
          {hasLiveProgress ? <><p><strong>{solved}</strong> / {items.length} {decoding ? 'decoded' : 'solved'}</p>
            <Meter value={solved} max={items.length} label={decoding ? 'Problems decoded' : 'Problems solved'}/></>
          : <p>{items ? 'Live progress is unavailable. You can still open questions.' : 'Loading progress…'}</p>}
          <a className="arena-back" href="/profile">View Skill Passport →</a>
        </section>
        {decoding ? <section className="arena-card"><h2>How Decode works</h2>
          <ol className="decode-flow"><li>Run the starter and compare its output.</li><li>Change the logic and test your fix.</li><li>Submit to unlock the editorial and earn profile credit.</li></ol>
        </section> : <section className="arena-card" id="contests"><h2>Contests</h2>
          {contests.data?.map(item => <a key={item.slug} className="contest-row" href={`/arena/contests/${item.slug}`}>
            <span><strong>{item.title}</strong><small>{new Date(item.end_time).toLocaleDateString(undefined,{dateStyle:'medium'})}</small></span>
            <span className={`contest-phase ${contestPhase(item).toLowerCase()}`}>{contestPhase(item)}</span>
          </a>)}
          {contests.data?.length === 0 && <p>No contests scheduled.</p>}
          {!contests.data && (contests.error ? <p>{contests.error}</p> : <LoadingState label="Loading contests…"/>)}
        </section>}
        {!decoding && <details className="arena-card arena-technical" onToggle={event => setPipelineOpen(event.currentTarget.open)}><summary>How judging works</summary>{pipelineOpen && <Pipeline/>}</details>}
      </aside>
    </div></main></>;
}

function Contest({slug}) {
  const [data,setData] = useState(null);
  const [error,setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    let timer;
    const refresh = async () => {
      try {
        setData(await api(`/api/contests/${slug}`,{signal:abort.signal}));
        setError('');
      } catch (error) {
        if (!abort.signal.aborted) setError(error.message);
      } finally {
        if (!abort.signal.aborted) timer = setTimeout(refresh,4000);
      }
    };
    void refresh();
    return () => { abort.abort(); clearTimeout(timer); };
  },[slug]);
  return <><Header/><main className="wrap arena-page">
    {data ? <><header className="arena-intro"><div><a className="arena-back" href="/arena#contests">← Contests</a><h1>{data.title}</h1><p>{contestPhase(data)} · Ends {new Date(data.end_time).toLocaleString()} · One point per solved problem.</p></div></header>
    <div className="contest-grid"><section className="arena-card"><h2>Problems</h2><ProblemList problems={data.problems} context={slug}/></section>
    <section className="arena-card"><h2>{contestPhase(data) === 'Ended' ? 'Final standings' : 'Leaderboard'}</h2><p className="standings-note">{error || 'Ranked by score, then time penalty.'}</p>
    {data.standings.length ? <ol className="standings"><AnimatePresence initial={false}>{data.standings.map(row =>
      <motion.li layout="position" transition={{type:'spring',stiffness:280,damping:28}} key={row.key}>
        <span>{row.rank}</span><strong>{row.display_name}</strong><span>{row.score} solved</span><span>{row.penalty_minutes} min</span>
      </motion.li>
    )}</AnimatePresence></ol> : <p>No contest submissions yet.</p>}</section></div></> : error ? <p role="alert">{error}</p> : <LoadingState label="Loading contest…"/>}
  </main></>;
}

const starter = {
  cpp:'#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read input and write your answer here.\n    return 0;\n}\n',
  python:'# Read input and write your answer here.\n',
};
function Monaco({ value,onChange,language,readOnly }) {
  const root = useRef(null);
  const editor = useRef(null);
  const latest = useRef({ value,onChange,language,readOnly });
  latest.current = { value,onChange,language,readOnly };
  const [active,setActive] = useState(false);
  useEffect(() => {
    let mounted = true;
    let timeout;
    let listener;
    const load = () => {
      if (!mounted) return;
      if (!window.require?.config) {
        timeout = setTimeout(() => setActive(false),1000);
        return;
      }
      window.require.config({paths:{vs:'/vendor/monaco/vs'}});
      window.require(['vs/editor/editor.main'], () => {
        if (!mounted) return;
        editor.current = window.monaco.editor.create(root.current,{
          value:latest.current.value,language:latest.current.language,theme:'vs',readOnly:latest.current.readOnly,
          automaticLayout:true,minimap:{enabled:false},fontSize:Math.round(parseFloat(getComputedStyle(document.documentElement).fontSize) * .9375),tabSize:4,
          padding:{top:12},scrollBeyondLastLine:false,fontFamily:'JetBrains Mono Variable, monospace',
          ariaLabel:'Solution code',bracketPairColorization:{enabled:true},
        });
        listener = editor.current.onDidChangeModelContent(() => {
          const next = editor.current.getValue();
          if (next !== latest.current.value) latest.current.onChange(next);
        });
        setActive(true);
      }, () => setActive(false));
    };
    if (document.readyState === 'complete') load();
    else window.addEventListener('load',load,{once:true});
    return () => {
      mounted = false;
      clearTimeout(timeout);
      window.removeEventListener('load',load);
      listener?.dispose();
      const model = editor.current?.getModel();
      editor.current?.dispose();
      model?.dispose();
      editor.current = null;
    };
  },[]);
  useEffect(() => {
    if (!editor.current) return;
    if (editor.current.getModel().getLanguageId() !== language) window.monaco.editor.setModelLanguage(editor.current.getModel(),language);
    editor.current.updateOptions({readOnly});
    if (editor.current.getValue() !== value) editor.current.setValue(value);
  },[language,value,readOnly]);
  return <div className="editor-box"><div ref={root} className={active ? 'monaco-host' : 'monaco-host editor-pending'}/>
    {!active && <textarea className="editor-fallback" aria-label="Solution code" readOnly={readOnly} value={value} onChange={event => onChange(event.target.value)} spellCheck={false}/>}
  </div>;
}
function ResizeHandle({ label, direction, state, container, min = 27, max = 73 }) {
  const [value,set] = state;
  const bound = number => Math.round(Math.min(max,Math.max(min,number)));
  return <div role="separator" aria-label={label} aria-orientation={direction} aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} tabIndex={0}
    className={`resize-handle ${direction}`}
    onKeyDown={event => {
      const delta = ['ArrowLeft','ArrowUp'].includes(event.key) ? -3 : ['ArrowRight','ArrowDown'].includes(event.key) ? 3 : 0;
      if (delta) { event.preventDefault(); set(bound(value+delta)); }
      if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); set(event.key === 'Home' ? min : max); }
    }}
    onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)}
    onPointerMove={event => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      const rect = container.current.getBoundingClientRect();
      const fraction = direction === 'vertical' ? (event.clientX-rect.left)/rect.width : (event.clientY-rect.top)/rect.height;
      set(bound(fraction*100));
    }}/>;
}

function Statement({ text }) {
  const [intro, ...sections] = text.split(/\n\n## /);
  return <div className="statement-copy">
    <p>{intro}</p>
    {sections.map(section => {
      const [heading, body = ''] = section.split('\n\n', 2);
      return <section key={heading}>
        <h2>{heading}</h2>
        {heading === 'Constraints' ? <ul>{body.split('\n').map(line => <li key={line}>{line}</li>)}</ul> : <p>{body}</p>}
      </section>;
    })}
  </div>;
}

function ProblemDecoding({ steps, difficulty }) {
  return <section className="decode-guide" aria-labelledby="decode-title">
    <div className="problem-heading"><h1 id="decode-title">Decode the problem</h1><span className={`difficulty ${difficulty.toLowerCase()}`}>{difficulty}</span></div>
    <p className="decode-intro">Open one step at a time, then try your approach in the editor.</p>
    <ol className="decode-steps">
      {steps.map(({label,text}, index) => <li key={label}>
        <details open={index === 0 ? true : undefined}>
          <summary>{label}</summary>
          <p>{text}</p>
        </details>
      </li>)}
    </ol>
  </section>;
}

function Verdict({ result }) {
  return <>
    <motion.div key={result.verdict ?? result.status} initial={{opacity:0,y:3}} animate={{opacity:1,y:0}}
      className={`verdict-tag ${result.verdict ? 'verdict-'+result.verdict : ''}`}>
      {result.status === 'COMPILING' && <Indicator kind="arc"/>}{verdictText(result)}
    </motion.div>
    {result.status === 'PENDING' && <Indicator kind="indeterminate"/>}
    {result.status === 'RUNNING' && result.total_cases > 0 &&
      <Meter value={Math.max(0,result.current_case - 1)} max={result.total_cases} label="Test cases completed"/>}
  </>;
}

function Editorial({ problem, contestLink }) {
  return <article className="editorial-document">
    <header><span>Problem notes</span><h1>Editorial</h1><p>{problem.title}</p></header>
    {contestLink ? <p><a className="arena-back" href={contestLink}>Open the practice version →</a></p> : problem.editorial_locked
      ? <p>Submit an accepted fix to unlock the bug analysis, verification steps, and complexity notes.</p>
      : problem.editorial_md?.split(/\n\n+/).map((paragraph,index) => paragraph.startsWith('## ')
        ? <h2 key={index}>{paragraph.slice(3)}</h2> : <p key={index}>{paragraph}</p>)}
  </article>;
}

function savedDrafts(key) {
  try {
    const draft = JSON.parse(localStorage.getItem(key));
    return draft && typeof draft === 'object' && !Array.isArray(draft) ? draft : {};
  }
  catch { return {}; }
}

function Problem({ slug }) {
  const decoding = slug.startsWith('decode-');
  const [revision,setRevision] = useState(0);
  const {data,error} = useResource(`/api/problems/${slug}${contest ? '?contest='+encodeURIComponent(contest) : ''}`,{revision,live:true});
  const draftKey = 'place-ai:draft:'+slug+(contest ? ':contest:'+contest : '');
  const [tab,setTab] = useState('Description');
  const [language,setLanguage] = useState(decoding ? 'python' : 'cpp');
  const [drafts,setDrafts] = useState(() => savedDrafts(draftKey));
  const [customInput,setInput] = useState(null);
  const initialCode = decoding ? data?.starter ?? '' : starter[language];
  const code = typeof drafts[language] === 'string' ? drafts[language] : initialCode;
  const input = customInput ?? (decoding ? data?.samples[0]?.input ?? '' : '');
  const [expected,setExpected] = useState(null);
  const inputBox = useRef(null);
  const [result,setResult] = useState(null);
  const [notice,setNotice] = useState('');
  const [history,setHistory] = useState([]);
  const [running,setRunning] = useState(null);
  const [session,setSession] = useState(false);
  const width = useState(44);
  const height = useState(69);
  const workspace = useRef(null);
  const right = useRef(null);
  const stream = useRef(null);
  const historyUrl = '/api/submissions?problem='+encodeURIComponent(slug);
  const online = Boolean(data && !data.offline);
  const ready = Boolean(online && session && !running && code.trim());
  useEffect(() => {
    const save = () => {
      try { localStorage.setItem(draftKey,JSON.stringify(drafts)); } catch {}
    };
    const timer = setTimeout(save,250);
    window.addEventListener('pagehide',save,{once:true});
    return () => { clearTimeout(timer); window.removeEventListener('pagehide',save); };
  },[drafts,draftKey]);
  useEffect(() => {
    if (!online) return;
    const controller = new AbortController();
    api('/api/session',{signal:controller.signal}).then(() => setSession(true)).catch(error => {
      if (!controller.signal.aborted) setNotice(error.message);
    });
    return () => controller.abort();
  },[online]);
  useEffect(() => () => stream.current?.close(),[]);
  useEffect(() => {
    if (tab !== 'Submissions' || !session) return;
    const controller = new AbortController();
    api(historyUrl,{signal:controller.signal}).then(setHistory).catch(error => {
      if (!controller.signal.aborted) setNotice(error.message);
    });
    return () => controller.abort();
  },[tab,session,historyUrl]);

  async function execute(custom) {
    if (!ready) return;
    setNotice('');
    setResult({status:'PENDING'});
    setExpected(custom ? data.samples.find(sample => sample.input === input)?.output ?? null : null);
    setRunning(custom ? 'run' : 'submit');
    try {
      const payload = {slug,language,code};
      if (custom) payload.customInput = input;
      else if (contest) payload.contest = contest;
      const {id} = await api('/api/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      stream.current?.close();
      const events = new EventSource(`/api/submissions/${id}/events`);
      stream.current = events;
      let disconnects = 0;
      events.onmessage = event => {
        const next = JSON.parse(event.data);
        disconnects = 0;
        setNotice('');
        setResult(next);
        if (next.verdict) {
          events.close();
          setRunning(null);
          if (!custom) {
            if (next.verdict === 'AC' && decoding) setRevision(value => value + 1);
            try { localStorage.setItem('place-ai:judge-verdict',id); } catch {}
          }
          setHistory(items => [next,...items.filter(item => item.id !== next.id)]);
        }
      };
      events.onerror = () => {
        if (++disconnects < 4) return setNotice('Reconnecting to the verdict stream…');
        events.close();
        setRunning(null);
        setResult(null);
        setNotice('Verdict stream disconnected. Check Submissions for the latest result.');
      };
    } catch (error) {
      setResult(null);
      setNotice(error.message);
      setRunning(null);
    }
  }
  const tabs = data?.decoding ? ['Description','Decode','Editorial','Submissions'] : ['Description','Editorial','Submissions'];
  return <><Header compact backToDecode={decoding}/><main className="solve" ref={workspace} style={{'--left':width[0]+'%'}}>
    <section className="statement pane" aria-label="Problem statement">
      <div className="editor-toolbar" role="group" aria-label="Problem views">{tabs.map(name => <button key={name} type="button" className="solver-tab" aria-pressed={tab===name} onClick={() => setTab(name)}>{name}
        {tab === name && <motion.span className="tab-indicator" layoutId="solver-tab" transition={{type:'spring',stiffness:340,damping:30}}/>}</button>)}</div>
      <div className="pane-scroll">
        {data ? <AnimatePresence mode="wait" initial={false}><motion.div key={tab} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:.15}}>
          {tab === 'Description' && <>
            <div className="problem-heading"><h1>{data.title}</h1><span className={`difficulty ${data.difficulty.toLowerCase()}`}>{data.difficulty}</span></div>
            <div className="limits"><span>{data.time_limit_ms} ms time limit</span><span>{data.memory_limit_mb} MB memory limit</span></div>
            {decoding && <p className="decode-callout">The editor contains a complete program with a logic bug. Run the example, fix the program, then submit.</p>}
            <Statement text={data.statement_md}/>
            <h2 className="examples-title">Examples</h2>
            {data.samples.map((sample,index) => <section key={index} className="sample">
              <div className="sample-head"><h3>Example {index+1}</h3><button type="button" className="text-button" onClick={() => {
                setInput(sample.input);
                inputBox.current?.focus();
              }}>Use input ↗</button></div>
              <div className="sample-io"><div><h4>Input</h4><pre>{sample.input}</pre></div><div><h4>Output</h4><pre>{sample.output}</pre></div></div>
              {sample.explanation && <p><strong>Explanation</strong> {sample.explanation}</p>}
            </section>)}
            {data.topics?.length > 0 && <div className="problem-topics"><h2>Topics</h2><ul>{data.topics.map(topic => <li key={topic}>{topic}</li>)}</ul></div>}
          </>}
          {tab === 'Decode' && data.decoding && <ProblemDecoding steps={data.decoding} difficulty={data.difficulty}/>}
          {tab === 'Editorial' && <Editorial problem={data} contestLink={contest ? `/arena/problems/${slug}` : null}/>}
          {tab === 'Submissions' && <><h1>Submissions</h1>{history.length ? <ol className="submission-history">{history.map(item => <li key={item.id}><span>{verdictText(item)}</span><small>{item.language} · {new Date(item.created_at).toLocaleTimeString()}</small></li>)}</ol> : <p>No submissions in this browser session.</p>}</>}
        </motion.div></AnimatePresence> : error ? <p role="alert">{error}</p> : <LoadingState label="Loading problem…"/>}
      </div>
    </section>
    <ResizeHandle label="Resize problem and editor panes" direction="vertical" state={width} container={workspace}/>
    <section className="solve-right" ref={right} style={{'--upper':height[0]+'%'}}>
      <div className="pane editor-pane">
        <div className="editor-toolbar editor-chrome">{decoding ? <span className="editor-file" aria-label="File main.py">main.py <small>Python 3</small></span> : <label className="language">Language<select value={language} onChange={event => setLanguage(event.target.value)}><option value="cpp">C++20</option><option value="python">Python 3</option></select></label>}
          <div className="solver-actions">{decoding && <button className="text-button" disabled={!data || !Object.hasOwn(drafts,language) || Boolean(running)} onClick={() => {
            if (window.confirm('Replace your edits with the original buggy starter?')) setDrafts(current => { const next = {...current}; delete next[language]; return next; });
          }}>Reset</button>}<button className="button secondary small" disabled={!ready} onClick={() => execute(true)}>{running === 'run' ? 'Running…' : 'Run'}</button><button className="button small" disabled={!ready} onClick={() => execute(false)}>{running === 'submit' ? 'Submitting…' : decoding ? 'Submit fix' : 'Submit'}</button></div>
        </div>
        <Monaco language={language} value={code} readOnly={!data} onChange={value => setDrafts(current => ({...current,[language]:value}))}/>
      </div>
      <ResizeHandle label="Resize editor and console" direction="horizontal" state={height} container={right} min={32} max={76}/>
      <div className="pane console-pane"><div className="editor-toolbar"><strong>Test console</strong></div><div className="console-layout">
        <label>Custom input<textarea ref={inputBox} placeholder="Enter stdin here" value={input} onChange={event => setInput(event.target.value)} spellCheck={false}/></label>
        <section className="verdict" aria-label="Verdict" aria-live="polite"><h2>Verdict</h2>
          {result && <Verdict result={result}/>}
          {result?.execution_time_ms != null && <p><small>Elapsed including container startup · {result.execution_time_ms} ms</small></p>}
          {result?.output != null && <>
            <h3 className="console-caption">{result.verdict === 'CE' || result.verdict === 'RE' ? 'Diagnostics' : 'Actual output'}</h3><pre>{result.output || '(empty output)'}</pre>
            {result.verdict === 'RUN_OK' && expected !== null && <><h3 className="console-caption">Expected output</h3><pre>{expected}</pre>
              <p>{result.output.trim().split(/\s+/u).join(' ') === expected.trim().split(/\s+/u).join(' ')
                ? 'Matches this example.' : 'Different from the example. Trace the first calculation that diverges.'}</p></>}
          </>}{notice && <p>{notice}</p>}{!result && !notice && <p>{data?.offline ? 'The judge is unavailable. You can still read this question and edit code.' : 'Run custom input or submit for grading.'}</p>}
        </section>
      </div></div>
    </section>
  </main></>;
}

const page = working ? <Problem slug={parts[3]}/> : parts[2] === 'contests' ? <Contest slug={parts[3]}/> : <ArenaHome decoding={decodeLibrary}/>;
createRoot(document.querySelector('#arena')).render(<MotionConfig reducedMotion="user">{page}</MotionConfig>);
