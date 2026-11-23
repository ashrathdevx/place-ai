import { continueStudy } from './study-plan.js';
import { studyProgress } from './practice-state.js';
import { watchArenaProgress } from './live-progress.js';
import { profilePortrait } from './profile-settings.js';

const targets = [
  ['github','GitHub'], ['codeforces','Codeforces'], ['linkedin','LinkedIn'],
  ['leetcode','LeetCode'], ['hackerrank','HackerRank'], ['codechef','CodeChef'],
];
const metrics = {
  python: [['Coding problems',180],['Mini projects',14],['Major projects',4],['Assessments passed',2],['Repository evidence',1]],
  sql: [['SQL problems',120],['JOIN queries',45],['GROUP BY queries',30],['Window functions',15],['Database projects',20]],
};
const topicCounts = [['Arrays',150],['Linked lists',100],['Graphs',75],['Trees',50],['Heaps',80]];
const sampleDays = Array.from({length:84},(_,index) => ({
  date:new Date(Date.UTC(2026,10,23+index-83)).toISOString().slice(0,10),
  count:[0,1,3,0,6,2,0,4,0,0,5,1,0][(index*index+index)%13],
}));
const format = value => Number.isSafeInteger(value) ? value.toLocaleString('en-IN') : '—';
const dateLabel = date => date ? new Date(date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}) : '';
const acceptedRate = ({accepted,graded}={}) => graded ? Math.round(accepted*100/graded)+'%' : '—';

export function activityGrid(days=[], demo=false, accepted=false) {
  const eventLabel = accepted ? 'accepted submissions' : 'submissions';
  const counts = new Map(days.map(item => [item.date,item.count]));
  const today = demo ? Date.parse('2026-11-23') : Date.now();
  const cells = Array.from({length:84},(_,index) => {
    const date = new Date(today-(83-index)*86400000).toISOString().slice(0,10);
    const count = counts.get(date) ?? 0;
    return `<span class="activity-cell level-${Math.min(count,4)}" title="${date}: ${count} ${eventLabel}"></span>`;
  });
  const activeDays = days.filter(day => day.count > 0).length;
  const total = days.reduce((sum,day) => sum+day.count,0);
  return `<div class="activity-head"><h2>${accepted ? 'Accepted activity' : 'Submission activity'}</h2><span>${activeDays} active days · 12 weeks</span></div>
    <div class="activity-grid" role="img" aria-label="${total} ${eventLabel} across ${activeDays} days in the last 12 weeks">${cells.join('')}</div>
    <div class="heat-legend">Less ${[0,1,2,3,4].map(level => `<i class="activity-cell level-${level}"></i>`).join('')} More</div>`;
}
const metricList = (rows,stat) => `<div class="passport-metrics">${rows.map(([label,value]) => stat(format(value),label)).join('')}</div>`;
function subject(label,values,score,ui) {
  return `<article class="subject"><div class="subject-title"><h3>${label}</h3>${score ? `<strong class="score">${score}</strong>` : ''}</div>${metricList(values,ui.stat)}</article>`;
}
function topics(rows,ui) {
  const largest = Math.max(1,...rows.map(([,count]) => count));
  return `<div class="topic-list">${rows.map(([label,count]) => `<div><span>${ui.html(label)}</span><progress max="${largest}" value="${count}" aria-label="${ui.html(label)} solved"></progress><strong>${format(count)}</strong></div>`).join('')}</div>`;
}
function connectionDetails(label,body) {
  return `<details class="connection-details"><summary>${label}</summary><div>${body}</div></details>`;
}

function sampleConnections(ui) {
  const contributions = metricList([['Commit contributions',321],['Public repositories',18],['Pull request contributions',15]],ui.stat);
  return `<div class="panel connection-list">
    <article class="connection-row"><div class="connection-main"><h3>GitHub</h3><p>Sample contribution history</p></div>${connectionDetails('View contribution history',contributions)}</article>
    <article class="connection-row"><div class="connection-main"><h3>LeetCode</h3><p>Sample Java practice</p></div>${connectionDetails('View topic breakdown',topics(topicCounts,ui))}</article></div>`;
}

function profileMetadata(user,ui) {
  const professional = user.showProfessional !== false;
  const career = user.showCareer !== false;
  const highlights = [
    professional && user.stage,
    professional && user.college,
    user.showCountry !== false && user.country,
    career && user.availability !== 'Unavailable' && user.availability,
  ].filter(Boolean);
  const links = career ? [['LinkedIn','linkedin','LinkedIn'],['Portfolio','portfolio']].flatMap(([label,key,provider]) => {
    const url = ui.validatedUrl(user[key],provider);
    return url ? [`<a href="${ui.html(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`] : [];
  }) : [];
  const attributes = [
    ...(professional ? [['Qualification',user.degree],['Graduation year',user.graduationYear],['CGPA',user.cgpa],
      ['Coding since',user.codingSince],['Preferred language',user.preferredLanguage],['Languages',user.languages]] : []),
    ...(career ? [['Target role',user.role]] : []),
  ].filter(([,value]) => value);
  return `
    ${highlights.length ? `<ul class="profile-meta">${highlights.map(value => `<li>${ui.html(value)}</li>`).join('')}</ul>` : ''}
    ${links.length ? `<div class="profile-links">${links.join('')}</div>` : ''}
    ${attributes.length ? `<details class="profile-details"><summary>Profile details</summary><dl class="profile-facts">${attributes.map(([label,value]) =>
      `<div><dt>${label}</dt><dd>${ui.html(value)}</dd></div>`).join('')}</dl></details>` : ''}`;
}

function shell(user,ui,demo,preview) {
  const title = user.name || 'My profile';
  const portrait = profilePortrait({...user,photo:user.showPhoto === false ? '' : user.photo},ui);
  return `<div class="wrap page profile-page">
    <header class="profile-header">
      <div class="profile-photo">${portrait}</div>
      <div class="profile-identity"><h1 id="profile-title">${ui.html(title)}</h1>
        ${user.username ? `<p class="profile-username">@${ui.html(user.username)}</p>` : ''}
        ${user.bio ? `<p class="profile-bio">${ui.html(user.bio)}</p>` : ''}
        ${profileMetadata(user,ui)}</div>
      <div class="profile-header-actions">${demo ? '<button class="button secondary small" id="share">Share sample</button>' : preview ? '' : ui.action('/profile/edit','Edit profile','secondary small')+ui.action('/profile?preview=1','Preview Passport','secondary small')}</div>
    </header>
    ${preview ? '<p class="settings-note">Private preview. Only you can see this view in this browser. <a href="/profile">Back to profile</a></p>' : ''}
    <nav class="profile-nav" aria-label="Profile sections"><a href="#overview">Overview</a><a href="#activity">Activity</a><a href="#skills">Evidence</a>${preview ? '' : '<a href="#connections">Platforms</a>'}</nav>
    <div class="profile-content">
      <section class="panel profile-overview" id="overview" aria-label="Coding overview">
        ${demo ? '<p class="sample-label">Sample data</p>' : ''}
        <div class="stats" id="passport-stats">${ui.stat(demo ? '300' : '—',demo ? 'Practice problems' : 'Arena solved')}${ui.stat(demo ? '91%' : '—',demo ? 'Python score' : 'Problems decoded')}${ui.stat(demo ? '18' : '0','Projects')}</div>
        ${demo ? '' : '<section class="passport-decode" id="passport-decode" aria-label="Decode progress"><h2>Decode progress</h2><p>Loading judge statistics…</p></section>'}
        ${demo || preview ? '' : '<p id="passport-track">CSE Debugging Foundations</p><a class="button small" id="passport-continue" href="/learn">Continue practice</a>'}
      </section>
      <section class="panel padded" id="activity" aria-label="Coding activity">
        ${demo ? '' : '<p>An active day has at least one accepted submission (UTC).</p>'}
        <div id="passport-activity">${demo ? activityGrid(sampleDays,true) : '<p>Loading activity…</p>'}</div>
        ${demo ? '' : '<div id="accepted-timeline"></div>'}
      </section>
      <section id="skills"><div class="profile-section-heading"><h2>Skills and evidence</h2>${demo || preview ? '' : '<button class="button secondary small" id="add-evidence">Add evidence</button>'}</div>
        <div class="panel subject-grid" id="passport-skills">${demo
          ? subject('Python',metrics.python,'91%',ui)+subject('SQL',metrics.sql,'88%',ui)
          : subject('Python',[['Arena problems solved',null]],null,ui)+subject('SQL',[['Mini challenges',0]],null,ui)}</div>
        ${demo ? '' : '<div class="panel padded"><h3>Judge-verified results</h3><div id="verified-evidence"></div></div><div class="panel padded" id="profile-evidence"></div>'}
      </section>
      <section id="connections" ${preview ? 'hidden' : ''}><div class="profile-section-heading"><h2>Connected platforms</h2></div>
        ${demo ? sampleConnections(ui) : '<p id="connection-status" role="status"></p><div class="panel connection-list" id="connections-grid"></div>'}
      </section></div></div>`;
}
export function renderPassport(main,user,ui,demo=false,preview=false) {
  main.innerHTML = shell(user,ui,demo,preview);
}
export function attachPassportNavigation(main) {
  const navigation = [...main.querySelectorAll('.profile-nav a')];
  const panels = [...main.querySelectorAll('.profile-content > section')];
  function showSection() {
    const section = navigation.find(link => link.hash === location.hash) ?? navigation[0];
    for (const link of navigation) {
      if (link === section) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    }
    for (const panel of panels) panel.hidden = '#'+panel.id !== section.hash;
  }
  window.addEventListener('hashchange',showSection);
  showSection();
}
const evidenceRequest = async (path,options) => {
  const response = await fetch('/api/evidence/'+path,options);
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? 'Evidence service unavailable.');
  return json;
};
const mutate = {method:'POST',headers:{'x-place-evidence':'1'}};
export async function attachLiveEvidence(main,state,ui,{preview=false}={}) {
  const status = main.querySelector('#connection-status');
  const notice = new URL(location.href).searchParams.get('connection');
  if (notice) {
    status.textContent = {
      connected:'Account connected. Account activity was imported with your consent.',
      failed:'The provider did not complete the connection. Try again.',
      cancelled:'Connection cancelled or expired.',
      setup:'Provider registration is required before connecting.',
    }[notice] ?? '';
    const url = new URL(location.href);
    url.searchParams.delete('connection');
    history.replaceState({},'',url.pathname+url.search+url.hash);
  }
  const grid = main.querySelector('#connections-grid');
  let settings = {configured:{},snapshots:{}};
  let arena = null;
  const languages = {python:'Python 3',cpp:'C++20',c:'C17'};
  function acceptedRows(items) {
    return items.length ? '<ul class="passport-decode-list">'+items.map(item => `<li>
      <a href="/arena/problems/${encodeURIComponent(item.slug)}">${ui.html(item.title)}</a>
      <span>${item.category === 'decode' ? 'Decode' : item.category === 'contest' ? 'Contest' : 'Solve'}
      · ${languages[item.language] ?? ui.html(item.language)} · Accepted · ${dateLabel(item.accepted_at)}</span></li>`).join('')+'</ul>'
      : '<p>No accepted submissions yet.</p>';
  }
  const next = main.querySelector('#passport-continue');
  if (next) fetch('/api/problems').then(response => response.ok ? response.json() : [])
    .then(catalog => { next.href = continueStudy(catalog,studyProgress()).url; }).catch(() => {});

  const liveStats = () => {
    const projects = state.evidence.filter(item => ['Major project','Minor project'].includes(item.type)).length;
    main.querySelector('#passport-stats').innerHTML = ui.stat(format(arena?.solved),'Arena solved')+
      ui.stat(format(arena?.decoded),'Problems decoded')+ui.stat(format(projects),'Projects');
    const decode = main.querySelector('#passport-decode');
    decode.innerHTML = arena ? `<div class="passport-decode-head"><h2>Decode progress</h2><a href="/arena/decode">Open Decode →</a></div>
      <p>${format(arena.decoded)} of ${format(arena.decode_total)} challenges decoded · ${acceptedRate(arena)} acceptance across judged submissions</p>
      ${metricList([['Easy',arena.decoded_easy],['Medium',arena.decoded_medium],['Hard',arena.decoded_hard]],ui.stat)}
      ${arena.recent_decoded?.length ? `<ul class="passport-decode-list">${arena.recent_decoded.slice(0,3).map(item =>
        `<li><a href="/arena/problems/${encodeURIComponent(item.slug)}">${ui.html(item.title)}</a><span>${ui.html(item.difficulty)}</span></li>`).join('')}</ul>` : ''}`
      : '<div class="passport-decode-head"><h2>Decode progress</h2><a href="/arena/decode">Open Decode →</a></div><p>Live judge statistics are unavailable.</p>';
    const records = (skill,type) => state.evidence.filter(item => item.skill === skill && item.type === type).length;
    main.querySelector('#passport-skills').innerHTML =
      subject('Python',[
        ['Arena problems solved',arena?.python],['Recorded mini projects',records('Python','Minor project')],
        ['Recorded major projects',records('Python','Major project')],['Recorded assessments',records('Python','Assessment')],
      ],null,ui)+subject('SQL',[
        ['Mini challenges',Number(Boolean(state.completed.sql))],
        ['Recorded database projects',records('SQL','Major project')+records('SQL','Minor project')],
        ['Recorded assessments',records('SQL','Assessment')],
      ],null,ui);
  };
  const render = () => {
    const expanded = new Set([...grid.querySelectorAll('article:has(details[open])')].map(row => row.dataset.provider));
    grid.innerHTML = targets.map(([id,name]) => {
      const snapshot = settings.snapshots[id];
      const oauth = id === 'github' || id === 'linkedin';
      const linked = state.evidence.filter(item => item.platform === name && ui.validatedUrl(item.url,item.platform));
      const account = snapshot?.handle ? '@'+snapshot.handle : snapshot?.name;
      const description = snapshot
        ? [account, oauth ? 'Connected' : 'Public stats'].filter(Boolean).join(' · ')
        : linked.length ? (linked.length === 1 ? '1 profile link' : linked.length+' profile links')
          : oauth ? settings.configured[id] ? 'Not connected' : 'Setup required'
            : id === 'codeforces' ? 'Public stats available' : 'No profile link';
      const button = (label,attrs) => `<button class="button secondary small" ${attrs} aria-label="${label} for ${name}">${label}</button>`;
      const action = oauth
        ? settings.configured[id] ? ui.action('/api/evidence/'+id+'/connect',snapshot ? 'Reconnect' : 'Connect','secondary small') : ''
        : id === 'codeforces' ? button(snapshot ? 'Refresh' : 'Import stats','data-import')
          : button('Add link',`data-link="${name}"`);
      let body = '';
      if (id === 'github' && snapshot) body = metricList([['Commits',snapshot.commits],['Public repositories',snapshot.repositories],['Pull requests',snapshot.pullRequests]],ui.stat)+'<p>Contributions in the past year.</p>';
      if (id === 'codeforces' && snapshot) body = metricList([['Rating',snapshot.rating],['Peak rating',snapshot.maxRating],['Unique accepted',snapshot.solved]],ui.stat)+topics(snapshot.topics,ui)+`<p>Latest ${format(snapshot.window)} submissions. Topics can overlap.</p>`;
      if (snapshot) body += `<p>Imported ${dateLabel(snapshot.syncedAt)}</p>${button('Remove snapshot',`data-disconnect="${id}"`)}`;
      if (linked.length) body += `<ul class="platform-links">${linked.map(item => `<li><a class="source-link" href="${ui.html(item.url)}" target="_blank" rel="noopener noreferrer">${ui.html(item.title || name+' profile')}</a></li>`).join('')}</ul>`;
      return `<article class="connection-row" data-provider="${id}"><div class="connection-main"><h3>${name}</h3><p>${ui.html(description)}</p></div>${action ? `<div class="connection-action">${action}</div>` : ''}
        ${body ? connectionDetails('View details',body) : ''}</article>`;
    }).join('');
    for (const provider of expanded) {
      const details = grid.querySelector(`[data-provider="${provider}"] details`);
      if (details) details.open = true;
    }
  };
  liveStats();
  render();
  main.addEventListener('passport:changed',() => { liveStats(); render(); });
  grid.onclick = event => {
    const disconnect = event.target.closest('[data-disconnect]');
    const link = event.target.closest('[data-link]');
    if (link) return ui.addEvidence(link.dataset.link);
    if (disconnect) {
      disconnect.disabled = true;
      evidenceRequest(disconnect.dataset.disconnect+'/disconnect',mutate).then(() => {
        delete settings.snapshots[disconnect.dataset.disconnect];
        render();
        grid.querySelector(`[data-provider="${disconnect.dataset.disconnect}"] .connection-action > *`)?.focus();
        status.textContent = 'Snapshot removed from this browser.';
      }).catch(error => { disconnect.disabled = false; status.textContent = error.message; });
    }
    if (event.target.closest('[data-import]')) {
      ui.showDialog('Import Codeforces profile',`<form class="form"><label>Public handle<input name="handle" required maxlength="24" autocomplete="off"></label><button class="button">Import</button><p role="status"></p></form>`);
      ui.dialog.querySelector('form').onsubmit = async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button');
        const feedback = form.querySelector('[role="status"]');
        button.disabled = true;
        feedback.textContent = 'Reading the public profile…';
        try {
          const {snapshot} = await evidenceRequest('codeforces/import?'+new URLSearchParams({handle:form.elements.handle.value.trim()}),mutate);
          settings.snapshots.codeforces = snapshot;
          render();
          if (ui.dialog.open && ui.dialog.contains(form)) ui.dialog.close();
          status.textContent = 'Public Codeforces activity imported.';
        } catch (error) { feedback.textContent = error.message; }
        finally { button.disabled = false; }
      };
    }
  };
  if (!preview) evidenceRequest('connections').then(data => { settings = data; render(); }).catch(() => {
    if (!status.textContent) status.textContent = 'Live imports require the running Place AI server.';
  });
  watchArenaProgress(data => {
    const previous = arena;
    arena = data;
    if (JSON.stringify(previous) !== JSON.stringify(data)) {
      liveStats();
      main.querySelector('#passport-activity').innerHTML = activityGrid(data.accepted_days ?? [],false,true);
      main.querySelector('#accepted-timeline').innerHTML = acceptedRows(data.accepted_activity ?? []);
      main.querySelector('#verified-evidence').innerHTML = acceptedRows(data.accepted_activity ?? []);
    }
  },() => {
    if (arena) return;
    liveStats();
    main.querySelector('#passport-activity').textContent = 'Accepted activity is unavailable while the judge is offline.';
  });
}
