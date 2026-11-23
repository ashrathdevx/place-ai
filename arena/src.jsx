import { useEffect,useRef,useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence,MotionConfig,motion } from 'framer-motion';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './workspace.css';

const path = location.pathname.replace(/\/$/,'');
const parts = path.split('/');
const contest = new URL(location.href).searchParams.get('contest');
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

function Header({ compact = false }) {
  return <header className={compact ? 'arena-header compact' : 'arena-header'}><div className="arena-nav">
    {brand}<div className="arena-nav-links"><a href="/arena">Coding Arena</a><a href="/arena#contests">Contests</a><a href="/profile">My profile</a>{!compact && <a href="/proof">Evidence Engine</a>}</div>
    <a className="button secondary small" href={compact && contest ? `/arena/contests/${encodeURIComponent(contest)}` : compact ? '/arena' : '/learn'}>{compact ? 'Back to arena' : 'Student roadmap'}</a>
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

function useResource(url) {
  const [data,setData] = useState(null);
  const [error,setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    api(url,{signal:abort.signal}).then(setData).catch(error => {
      if (!abort.signal.aborted) setError(error.message);
    });
    return () => abort.abort();
  },[url]);
  return {data,error};
}

function ProblemList({ problems, context }) {
  return <div className="problem-list">{problems.map(item => <a className="problem-row" key={item.slug} href={`/arena/problems/${item.slug}${context ? '?contest=' + encodeURIComponent(context) : ''}`}>
    <span><strong>{item.solved && <span className="arena-solved" role="img" aria-label="Solved">✓ </span>}{item.title}</strong>{item.time_limit_ms && <small>{item.time_limit_ms} ms · {item.memory_limit_mb} MB</small>}</span><span className={`difficulty ${item.difficulty.toLowerCase()}`}>{item.difficulty}</span>
  </a>)}</div>;
}

function ProblemBrowser({problems}) {
  const [query,setQuery] = useState('');
  const [level,setLevel] = useState('');
  const [progress,setProgress] = useState('');
  const solved = problems.filter(item => item.solved).length;
  const shown = problems.filter(item => item.title.toLowerCase().includes(query.trim().toLowerCase()) &&
    (!level || item.difficulty === level) && (!progress || item.solved === (progress === 'solved')));
  return <div className="arena-library"><div className="activity-head"><h2>Problem library</h2><span>{solved} of {problems.length} solved</span></div>
    <div className="practice-filters"><label>Search<input type="search" placeholder="Search problems" value={query} onChange={event => setQuery(event.target.value)}/></label>
    <label>Difficulty<select value={level} onChange={event => setLevel(event.target.value)}><option value="">All levels</option>{['Easy','Medium','Hard'].map(value => <option key={value}>{value}</option>)}</select></label>
    <label>Status<select value={progress} onChange={event => setProgress(event.target.value)}><option value="">All statuses</option><option value="solved">Solved</option><option value="todo">To do</option></select></label></div>
    {shown.length ? <ProblemList problems={shown}/> : <p className="practice-empty">No problems match these filters.</p>}<p className="practice-count" role="status">Showing {shown.length} of {problems.length} problems</p></div>;
}

function ArenaHome() {
  const problems = useResource('/api/problems');
  const contests = useResource('/api/contests');
  return <><Header/><main><section className="arena-hero"><div className="wrap arena-hero-inner"><div>
    <p className="eyebrow">Place AI Coding Arena</p><h1>Get better.<br/><em>One submission at a time.</em></h1>
    <p className="lede">Solve DSA problems, watch your verdict arrive live, and turn practice into competition.</p>
    <div className="actions"><a className="button" href="#problems">Explore problems</a><a className="button secondary" href="#contests">View contests</a></div>
  </div><Pipeline/></div></section>
  <div className="wrap arena-catalog"><section className="panel padded" id="problems">
    {problems.data ? <ProblemBrowser problems={problems.data}/> : <><h2>Problem library</h2><p role="status">{problems.error || 'Loading problems…'}</p></>}</section>
    <section className="panel padded" id="contests"><h2>Contests</h2>{contests.data?.map(item => <a key={item.slug} className="problem-row" href={`/arena/contests/${item.slug}`}><span><strong>{item.title}</strong><small>Ends {new Date(item.end_time).toLocaleString()}</small></span><span className="tag">View contest</span></a>)}
    {!contests.data && <p role="status">{contests.error || 'Loading contests…'}</p>}</section></div></main></>;
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
  return <><Header/><main className="wrap page">
    {data ? <><header className="page-intro"><p className="eyebrow">Contest</p><h1>{data.title}</h1><p className="lede">Ends {new Date(data.end_time).toLocaleString()} · One point per solved problem.</p></header>
    <div className="workspace"><section className="panel padded"><h2>Problems</h2><ProblemList problems={data.problems} context={slug}/></section>
    <section className="panel padded"><h2>Live leaderboard</h2><p>{error || 'Ranked by score, then time penalty.'}</p>
    {data.standings.length ? <ol className="standings"><AnimatePresence initial={false}>{data.standings.map(row =>
      <motion.li layout="position" transition={{type:'spring',stiffness:280,damping:28}} key={row.key}>
        <span>{row.rank}</span><strong>{row.display_name}</strong><span>{row.score} solved</span><span>{row.penalty_minutes} min</span>
      </motion.li>
    )}</AnimatePresence></ol> : <p>No contest submissions yet.</p>}</section></div></> : <p role="status">{error || 'Loading contest…'}</p>}
  </main></>;
}

const starter = {
  cpp:'#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read input and write your answer here.\n    return 0;\n}\n',
  python:'# Read input and write your answer here.\n',
};
function Monaco({ value,onChange,language }) {
  const root = useRef(null);
  const editor = useRef(null);
  const latest = useRef({ value,onChange,language });
  latest.current = { value,onChange,language };
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
          value:latest.current.value,language:latest.current.language,theme:'vs',
          automaticLayout:true,minimap:{enabled:false},fontSize:14,tabSize:4,
          padding:{top:12},scrollBeyondLastLine:false,fontFamily:'JetBrains Mono Variable, monospace',
          ariaLabel:'Solution code',bracketPairColorization:{enabled:true},
        });
        listener = editor.current.onDidChangeModelContent(() => latest.current.onChange(editor.current.getValue()));
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
    window.monaco.editor.setModelLanguage(editor.current.getModel(),language);
    if (editor.current.getValue() !== value) editor.current.setValue(value);
  },[language,value]);
  return <div className="editor-box"><div ref={root} className={active ? 'monaco-host' : 'monaco-host editor-pending'}/>
    {!active && <textarea className="editor-fallback" aria-label="Solution code" value={value} onChange={event => onChange(event.target.value)} spellCheck={false}/>}
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

function Problem({ slug }) {
  const {data,error} = useResource(`/api/problems/${slug}${contest ? '?contest='+encodeURIComponent(contest) : ''}`);
  const [tab,setTab] = useState('Description');
  const [language,setLanguage] = useState('cpp');
  const [drafts,setDrafts] = useState(starter);
  const [input,setInput] = useState('');
  const [result,setResult] = useState(null);
  const [notice,setNotice] = useState('');
  const [history,setHistory] = useState([]);
  const [running,setRunning] = useState(false);
  const [session,setSession] = useState(false);
  const width = useState(44);
  const height = useState(69);
  const workspace = useRef(null);
  const right = useRef(null);
  const stream = useRef(null);
  const historyUrl = '/api/submissions?problem='+encodeURIComponent(slug);
  useEffect(() => {
    const controller = new AbortController();
    api('/api/session',{signal:controller.signal}).then(() => setSession(true)).catch(error => {
      if (!controller.signal.aborted) setNotice(error.message);
    });
    return () => { controller.abort(); stream.current?.close(); };
  },[]);
  useEffect(() => {
    if (tab !== 'Submissions' || !session) return;
    const controller = new AbortController();
    api(historyUrl,{signal:controller.signal}).then(setHistory).catch(error => {
      if (!controller.signal.aborted) setNotice(error.message);
    });
    return () => controller.abort();
  },[tab,session,historyUrl]);

  async function execute(custom) {
    if (!session || running) return;
    setNotice('');
    setResult({status:'PENDING'});
    setRunning(true);
    try {
      const payload = {slug,language,code:drafts[language]};
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
          setRunning(false);
          setHistory(items => [next,...items.filter(item => item.id !== next.id)]);
        }
      };
      events.onerror = () => {
        if (++disconnects < 4) return setNotice('Reconnecting to the verdict stream…');
        events.close();
        setRunning(false);
        setNotice('Verdict stream disconnected. Check Submissions for the latest result.');
      };
    } catch (error) {
      setResult(null);
      setNotice(error.message);
      setRunning(false);
    }
  }
  const tabs = ['Description','Editorial','Submissions'];
  return <><Header compact/><main className="solve" ref={workspace} style={{'--left':width[0]+'%'}}>
    <section className="statement pane" aria-label="Problem statement">
      <div className="editor-toolbar" role="group" aria-label="Problem views">{tabs.map(name => <button key={name} type="button" className="solver-tab" aria-pressed={tab===name} onClick={() => setTab(name)}>{name}
        {tab === name && <motion.span className="tab-indicator" layoutId="solver-tab" transition={{type:'spring',stiffness:340,damping:30}}/>}</button>)}</div>
      <div className="pane-scroll">
        {data ? <AnimatePresence mode="wait" initial={false}><motion.div key={tab} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:.15}}>
          {tab === 'Description' && <><p className={`difficulty ${data.difficulty.toLowerCase()}`}>{data.difficulty}</p><h1>{data.title}</h1>
            <div className="limits"><span>{data.time_limit_ms} ms</span><span>{data.memory_limit_mb} MB</span></div>
            <p className="problem-statement">{data.statement_md}</p>
            {data.samples.map((sample,index) => <section key={index} className="sample"><h2>Sample {index+1}</h2><h3>Input</h3><pre>{sample.input}</pre><h3>Output</h3><pre>{sample.output}</pre><button className="button small secondary" onClick={() => setInput(sample.input)}>Use sample input</button></section>)}</>}
          {tab === 'Editorial' && <><h1>Editorial</h1>{contest ? <p>Open the practice version to read the editorial.</p> : <p>{data.editorial_md}</p>}</>}
          {tab === 'Submissions' && <><h1>Submissions</h1>{history.length ? <ol className="submission-history">{history.map(item => <li key={item.id}><span>{verdictText(item)}</span><small>{item.language} · {new Date(item.created_at).toLocaleTimeString()}</small></li>)}</ol> : <p>No submissions in this browser session.</p>}</>}
        </motion.div></AnimatePresence> : <p role="status">{error || 'Loading problem…'}</p>}
      </div>
    </section>
    <ResizeHandle label="Resize problem and editor panes" direction="vertical" state={width} container={workspace}/>
    <section className="solve-right" ref={right} style={{'--upper':height[0]+'%'}}>
      <div className="pane editor-pane">
        <div className="editor-toolbar"><label className="language">Language<select value={language} onChange={event => setLanguage(event.target.value)}><option value="cpp">C++20</option><option value="python">Python 3</option></select></label>
          <div className="solver-actions"><button className="button secondary small" disabled={!data || !session || running} onClick={() => execute(true)}>Run</button><button className="button small" disabled={!data || !session || running} onClick={() => execute(false)}>Submit</button></div>
        </div>
        <Monaco language={language} value={drafts[language]} onChange={value => setDrafts(current => ({...current,[language]:value}))}/>
      </div>
      <ResizeHandle label="Resize editor and console" direction="horizontal" state={height} container={right} min={32} max={76}/>
      <div className="pane console-pane"><div className="editor-toolbar"><strong>Test console</strong></div><div className="console-layout">
        <label>Custom input<textarea placeholder="Enter stdin here" value={input} onChange={event => setInput(event.target.value)} spellCheck={false}/></label>
        <section className="verdict" aria-label="Verdict" aria-live="polite"><h2>Verdict</h2>
          {result && <motion.div key={result.verdict ?? result.status} initial={{opacity:0,y:3}} animate={{opacity:1,y:0}}
            className={`tag verdict-tag ${result.verdict ? 'verdict-'+result.verdict : ''}`}>{verdictText(result)}</motion.div>}
          {result?.execution_time_ms != null && <p><small>Elapsed including container startup · {result.execution_time_ms} ms</small></p>}
          {result?.output != null && <pre>{result.output || '(empty output)'}</pre>}{notice && <p>{notice}</p>}{!result && !notice && <p>Run custom input or submit for grading.</p>}
        </section>
      </div></div>
    </section>
  </main></>;
}

const page = working ? <Problem slug={parts[3]}/> : parts[2] === 'contests' ? <Contest slug={parts[3]}/> : <ArenaHome/>;
createRoot(document.querySelector('#arena')).render(<MotionConfig reducedMotion="user">{page}</MotionConfig>);
