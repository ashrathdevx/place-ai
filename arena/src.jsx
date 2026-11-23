import { useEffect,useRef,useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence,MotionConfig,motion } from 'framer-motion';
import './typography.css';
import { Monaco } from './editor.jsx';
import { catalogSearch,problemHref,selectChallenges } from './navigation.js';
import { setTheme,themePreference } from '../assets/theme.js';
import './workspace.css';
import { Indicator, Meter } from './loading.jsx';

const path = location.pathname.replace(/\/$/,'');
const parts = path.split('/');
const contest = new URL(location.href).searchParams.get('contest');
const decodeLibrary = parts[2] === 'decode';
const working = parts[2] === 'problems' && Boolean(parts[3]);
const editorialRoute = parts[4] === 'editorial';
if (working) document.body.classList.add('working');

const labels = {
  PENDING:'Queued', COMPILING:'Compiling', RUNNING:'Running tests',
  AC:'Accepted', WA:'Wrong Answer', CE:'Compile Error', RE:'Runtime Error',
  TLE:'Time Limit Exceeded', MLE:'Memory Limit Exceeded', SYSTEM_ERROR:'Judge unavailable', RUN_OK:'Run complete',
};
const verdictText = result => result.status === 'RUNNING'
  ? `Running test case ${result.current_case}/${result.total_cases}`
  : labels[result.verdict ?? result.status] ?? 'Waiting for result';

async function api(url, options) {
  const res = await fetch(url,options);
  const body = await res.json();
  if (!res.ok) throw Object.assign(new Error(body.error ?? 'Could not load this request.'),{status:res.status});
  return body;
}
const brand = <a href="/" className="brand" aria-label="Place AI home"><img src="/assets/mark.svg" alt="" width="31" height="31"/> Place<span>AI</span></a>;

function Header({ compact = false, backToDecode = false }) {
  const [menu,setMenu] = useState(false);
  const [theme,setPreference] = useState(themePreference);
  const decodeActive = decodeLibrary || backToDecode;
  useEffect(() => {
    const sync = () => setPreference(themePreference());
    window.addEventListener('place-theme',sync);
    return () => window.removeEventListener('place-theme',sync);
  },[]);
  return <header className="arena-header" onKeyDown={event => {
    if (event.key === 'Escape' && menu) { setMenu(false); document.querySelector('.arena-menu-button')?.focus(); }
  }}><div className="arena-nav">
    {brand}
    <nav id="arena-navigation" aria-label="Main navigation" className={menu ? 'arena-nav-links is-open' : 'arena-nav-links'}>
      <a href="/arena/decode" aria-current={decodeActive ? 'page' : undefined}>Decode</a>
      <a href="/profile">Skill Passport</a>
      {!decodeActive && <a href="/arena" aria-current={!compact ? 'page' : undefined}>Arena</a>}
    </nav>
    <div className="arena-header-actions">
      <label className="theme-control"><span className="sr-only">Theme</span><select aria-label="Theme" value={theme} onChange={event => setTheme(event.target.value)}>
        <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
      </select></label>
      <button type="button" className="button secondary small arena-menu-button" aria-controls="arena-navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}>Menu</button>
    </div>
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
        const signal = AbortSignal.any([abort.signal,AbortSignal.timeout(10000)]);
        setData(await api(url,{signal}));
        setError('');
      } catch (error) {
        if (!abort.signal.aborted) setError(error);
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

function ProblemList({ problems, context, search }) {
  return <ul className="problem-list">{problems.map(item => <li key={item.slug}>
    <a className="problem-row" href={problemHref(item.slug,{contest:context,search})}>
      <span className={`solve-mark${item.solved ? ' arena-solved' : ''}`} role="img" aria-label={item.solved === null ? 'Progress unavailable' : item.solved ? (item.kind === 'decode' ? 'Decoded' : 'Solved') : 'To do'}>{item.solved ? '✓' : '○'}</span>
      <span className="problem-row-title"><strong>{item.title}</strong>{item.topics?.length > 0 && <small>{item.topics.join(' · ')}</small>}</span>
      <span className={`difficulty ${item.difficulty.toLowerCase()}`}>{item.difficulty}</span>
      <span className="row-arrow" aria-hidden="true">↗</span>
    </a>
  </li>)}</ul>;
}

function ProblemBrowser({ problems, decoding }) {
  const [search,setSearch] = useState(() => catalogSearch(location.search));
  const filters = new URLSearchParams(search);
  const query = filters.get('q') ?? '', topic = filters.get('topic') ?? '';
  const level = filters.get('level') ?? '', progress = filters.get('progress') ?? '';
  const topics = [...new Set(problems.flatMap(item => item.topics ?? []))].sort();
  const shown = selectChallenges(problems,search);
  function update(key,value) {
    const next = new URLSearchParams(search);
    if (value) next.set(key,value);
    else next.delete(key);
    const query = key ? catalogSearch(next) : '';
    history.replaceState(history.state,'',location.pathname+query+location.hash);
    setSearch(query);
  }
  useEffect(() => {
    const restore = () => setSearch(catalogSearch(location.search));
    window.addEventListener('popstate',restore);
    return () => window.removeEventListener('popstate',restore);
  },[]);
  return <div className="arena-library">
    <div className="arena-section-head"><h2>{decoding ? 'All Decode challenges' : 'Practice problems'}</h2><span role="status">{shown.length} of {problems.length}</span></div>
    <div className="arena-filters">
      <label>Search<input type="search" placeholder="Problem or topic" value={query} onChange={event => update('q',event.target.value)}/></label>
      <label>Topic<select aria-label="Topic" value={topic} onChange={event => update('topic',event.target.value)}><option value="">All topics</option>{topics.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Difficulty<select aria-label="Difficulty" value={level} onChange={event => update('level',event.target.value)}><option value="">All levels</option>{['Easy','Medium','Hard'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Status<select aria-label="Status" value={progress} onChange={event => update('progress',event.target.value)}><option value="">All statuses</option><option value="solved">{decoding ? 'Decoded' : 'Solved'}</option><option value="todo">To do</option></select></label>
    </div>
    {shown.length ? <><div className="problem-columns" aria-hidden="true"><span/><span>Problem</span><span>Difficulty</span><span/></div><ProblemList problems={shown} search={search}/></>
      : <div className="arena-empty"><p>No problems match these filters.</p><button className="text-button" onClick={() => update('','')}>Clear filters</button></div>}
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
        ? 'Repair real logic bugs in C++20, C17, or Python and see which tests your fix passes.'
        : 'Solve coding problems or sharpen your debugging skills in Decode.'}</p></div>
      <a className="button secondary small" href={decoding ? '/arena' : '/arena/decode'}>{decoding ? 'Browse practice problems' : 'Explore Decode →'}</a>
    </div>
    <div className="arena-catalog">
      <section className="arena-card" id="problems" aria-label="Problem library">
        {items ? <ProblemBrowser key={String(decoding)} problems={items} decoding={decoding}/> : problems.error ? <p role="alert">{problems.error.message}</p> : <LoadingState label="Loading problems…"/>}
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
          {!contests.data && (contests.error ? <p>{contests.error.message}</p> : <LoadingState label="Loading contests…"/>)}
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

const languageLabels = {cpp:'C++20',c:'C17',python:'Python 3'};
const starter = {
  c:'#include <stdio.h>\n\nint main(void) {\n    return 0;\n}\n',
  cpp:'#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read input and write your answer here.\n    return 0;\n}\n',
  python:'# Read input and write your answer here.\n',
};
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

function ProblemHints({ steps, difficulty }) {
  return <section className="decode-guide" aria-labelledby="hints-title">
    <div className="problem-heading"><h1 id="hints-title">Problem hints</h1><span className={`difficulty ${difficulty.toLowerCase()}`}>{difficulty}</span></div>
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
      {result.status === 'COMPILING' && <Indicator kind="arc"/>}{result.verdict && <span aria-hidden="true">{result.verdict === 'AC' || result.verdict === 'RUN_OK' ? '✓' : result.verdict === 'TLE' ? '◷' : '!'}</span>}{verdictText(result)}
    </motion.div>
    {result.status === 'PENDING' && <Indicator kind="indeterminate"/>}
    {result.status === 'RUNNING' && result.total_cases > 0 &&
      <Meter value={Math.max(0,result.current_case - 1)} max={result.total_cases} label="Test cases completed"/>}
  </>;
}

function Editorial({ problem, contestLink, challengeLink }) {
  return <article className="editorial-document">
    <header><span>Problem notes</span><h1>Editorial</h1><p>{problem.title}</p></header>
    {contestLink ? <p><a className="arena-back" href={contestLink}>Open the practice version →</a></p> : problem.editorial_locked
      ? <div><p>Submit an accepted fix to unlock the bug analysis, verification steps, and complexity notes.</p><a className="arena-back" href={challengeLink}>Return to the challenge →</a></div>
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
  const [tab,setTab] = useState(editorialRoute ? 'Editorial' : 'Description');
  const [mobile,setMobile] = useState('problem');
  const [codeSize,setCodeSize] = useState(() => {
    try { return [12,14,16,18,20].includes(Number(localStorage.getItem('place-ai:code-size'))) ? Number(localStorage.getItem('place-ai:code-size')) : 14; } catch { return 14; }
  });
  const [language,setLanguage] = useState(decoding ? 'python' : 'cpp');
  const [drafts,setDrafts] = useState(() => savedDrafts(draftKey));
  const [customInput,setInput] = useState(null);
  const initialCode = decoding ? data?.starters?.[language] ?? (language === 'python' ? data?.starter ?? '' : '') : starter[language];
  const code = typeof drafts[language] === 'string' ? drafts[language] : initialCode;
  const input = customInput ?? (decoding ? data?.samples[0]?.input ?? '' : '');
  const search = catalogSearch(location.search);
  const challengeLink = problemHref(slug,{search,contest});
  const editorialLink = problemHref(slug,{search,contest,editorial:true});
  const backLink = contest ? '/arena/contests/'+encodeURIComponent(contest) : (decoding ? '/arena/decode' : '/arena')+search;
  const [expected,setExpected] = useState(null);
  const inputBox = useRef(null);
  const [result,setResult] = useState(null);
  const [notice,setNotice] = useState('');
  const [submissions,setHistory] = useState([]);
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
    setResult({status:'PENDING',language,submittedSource:code});
    setExpected(custom ? data.samples.find(sample => sample.input === input)?.output ?? null : null);
    setRunning(custom ? 'run' : 'submit');
    setMobile('output');
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
        setResult({...next,submittedSource:code});
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
  if (error?.status === 404 && !data) return <><Header backToDecode={decoding}/><main className="wrap not-found">
    <section className="arena-card"><h1>Challenge not found</h1><p>This link may be outdated. The challenge list is the best place to pick up again.</p>
      <a className="button" href={backLink}>Browse challenges</a></section>
  </main></>;
  const tabs = data?.decoding ? ['Description','Hints','Editorial','Submissions'] : ['Description','Editorial','Submissions'];
  return <><Header compact backToDecode={decoding}/><main className="solve" ref={workspace} data-panel={mobile}
    style={{'--left':width[0]+'%','--code-size':codeSize+'px','--code-leading':Math.round(codeSize*22/14)+'px'}}>
    <div className="workspace-bar">
      <a className="workspace-back" href={backLink}>← {decoding ? 'Challenges' : 'Arena'}</a>
      <div className="workspace-views" role="group" aria-label="Workspace panels">
        {['problem','code','output'].map(view => <button key={view} type="button" className="solver-tab" aria-pressed={mobile === view} onClick={() => setMobile(view)}>{view[0].toUpperCase()+view.slice(1)}</button>)}
      </div>
      <div className="solver-actions">
        <button className="button secondary small" disabled={!ready} onClick={() => execute(true)}>{running === 'run' ? 'Running…' : 'Run'}</button>
        <button className="button small" disabled={!ready} onClick={() => execute(false)}>{running === 'submit' ? 'Submitting…' : decoding ? 'Submit Fix' : 'Submit'}</button>
      </div>
    </div>
    <section className="statement pane" aria-label="Problem statement">
      <div className="editor-toolbar" role="group" aria-label="Problem views">{tabs.map(name => (
        name === 'Editorial' ? <a key={name} className="solver-tab" href={editorialLink} aria-current={tab === name ? 'page' : undefined}>{name}</a> :
          <button key={name} type="button" className="solver-tab" aria-pressed={tab===name} onClick={() => {
            if (editorialRoute) window.history.replaceState(window.history.state,'',challengeLink);
            setTab(name);
          }}>{name}{tab === name && <motion.span className="tab-indicator" layoutId="solver-tab" transition={{duration:.15}}/>}</button>
      ))}</div>
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
                setMobile('output');
                requestAnimationFrame(() => inputBox.current?.focus());
              }}>Use input ↗</button></div>
              <div className="sample-io"><div><h4>Input</h4><pre>{sample.input}</pre></div><div><h4>Output</h4><pre>{sample.output}</pre></div></div>
              {sample.explanation && <p><strong>Explanation</strong> {sample.explanation}</p>}
            </section>)}
            {data.topics?.length > 0 && <div className="problem-topics"><h2>Topics</h2><ul>{data.topics.map(topic => <li key={topic}>{topic}</li>)}</ul></div>}
          </>}
          {tab === 'Hints' && data.decoding && <ProblemHints steps={data.decoding} difficulty={data.difficulty}/>}
          {tab === 'Editorial' && <Editorial problem={data} challengeLink={challengeLink} contestLink={contest ? problemHref(slug,{editorial:true}) : null}/>}
          {tab === 'Submissions' && <><h1>Submissions</h1>{submissions.length ? <ol className="submission-history">{submissions.map(item => <li key={item.id}><span>{verdictText(item)}</span><small>{languageLabels[item.language] ?? item.language} · {new Date(item.created_at).toLocaleTimeString()}</small></li>)}</ol> : <p>No submissions in this browser session.</p>}</>}
        </motion.div></AnimatePresence> : error ? <p role="alert">{error.message}</p> : <LoadingState label="Loading problem…"/>}
      </div>
    </section>
    <ResizeHandle label="Resize problem and editor panes" direction="vertical" state={width} container={workspace}/>
    <section className="solve-right" ref={right} style={{'--upper':height[0]+'%'}}>
      <div className="pane editor-pane">
        <div className="editor-toolbar editor-chrome">
          <label className="language"><span className="sr-only">Language</span><select aria-label="Language" value={language} onChange={event => setLanguage(event.target.value)}>
            {Object.entries(languageLabels).map(([id,label]) => <option value={id} key={id}>{label}</option>)}
          </select></label>
          <label className="language"><span className="sr-only">Code text size</span><select aria-label="Code text size" value={codeSize} onChange={event => {
            const value = Number(event.target.value);
            setCodeSize(value);
            try { localStorage.setItem('place-ai:code-size',String(value)); } catch {}
          }}>{[12,14,16,18,20].map(value => <option key={value} value={value}>{value} px</option>)}</select></label>
          {decoding && <button className="text-button reset-code" disabled={!data || !Object.hasOwn(drafts,language) || Boolean(running)} onClick={() => {
            if (window.confirm('Replace your edits with the original buggy starter?')) setDrafts(current => { const next = {...current}; delete next[language]; return next; });
          }}>Reset</button>}
        </div>
        <Monaco language={language} value={code} size={codeSize} readOnly={!data}
          diagnostic={(result?.verdict === 'CE' || result?.verdict === 'RE') && result.language === language && result.submittedSource === code ? result.output : null}
          onChange={value => setDrafts(current => ({...current,[language]:value}))}/>
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
