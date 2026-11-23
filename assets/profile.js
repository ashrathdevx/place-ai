import { profilePortrait } from './profile-settings.js';

const targets = [
  ['github','GitHub','GH','Commit and pull request contributions, plus owned public repositories.'],
  ['codeforces','Codeforces','CF','Public rating and topic counts from the latest 250 submissions.'],
  ['linkedin','LinkedIn','in','Connect your member profile through LinkedIn sign-in.'],
  ['leetcode','LeetCode','LC','Attach your public profile as a source.'],
  ['hackerrank','HackerRank','HR','Attach a profile or public certificate.'],
  ['codechef','CodeChef','CC','Attach your public competitive programming profile.'],
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

export function activityGrid(days=[], demo=false) {
  const counts = new Map(days.map(item => [item.date,item.count]));
  const today = demo ? Date.parse('2026-11-23') : Date.now();
  const cells = Array.from({length:84},(_,index) => {
    const date = new Date(today-(83-index)*86400000).toISOString().slice(0,10);
    const count = counts.get(date) ?? 0;
    return `<span class="activity-cell level-${Math.min(count,4)}" title="${date}: ${count} submissions"></span>`;
  });
  const activeDays = days.filter(day => day.count > 0).length;
  const total = days.reduce((sum,day) => sum+day.count,0);
  return `<div class="activity-head"><h2>Submission activity</h2><span>${activeDays} active days · 12 weeks</span></div>
    <div class="activity-grid" role="img" aria-label="${total} submissions across ${activeDays} days in the last 12 weeks">${cells.join('')}</div>
    <div class="heat-legend">Less ${[0,1,2,3,4].map(level => `<i class="activity-cell level-${level}"></i>`).join('')} More</div>`;
}
const metricList = (rows,stat) => `<div class="passport-metrics">${rows.map(([label,value]) => stat(format(value),label)).join('')}</div>`;
function subject(label,description,values,score,ui) {
  return `<article class="panel padded subject"><div class="subject-title"><div><h3>${label}</h3><p>${description}</p></div>${score ? `<strong class="score">${score}</strong>` : ''}</div>${metricList(values,ui.stat)}</article>`;
}
function topics(rows,ui) {
  const largest = Math.max(1,...rows.map(([,count]) => count));
  return `<div class="topic-list">${rows.map(([label,count]) => `<div><span>${ui.html(label)}</span><progress max="${largest}" value="${count}" aria-label="${ui.html(label)} solved"></progress><strong>${format(count)}</strong></div>`).join('')}</div>`;
}
function sampleConnections(ui) {
  return `<div class="connections-grid"><article class="panel padded"><div class="provider-head"><span class="provider-icon">GH</span><div><h3>GitHub</h3><p>Illustrative activity snapshot</p></div><span class="tag">Sample</span></div>
     ${metricList([['Commit contributions',321],['Public repositories',18],['Pull request contributions',15]],ui.stat)}</article>
     <article class="panel padded"><div class="provider-head"><span class="provider-icon">LC</span><div><h3>LeetCode topics</h3><p>Example Java practice · topics can overlap</p></div><span class="tag">Sample</span></div>${topics(topicCounts,ui)}</article></div>`;
}
function shell(user,ui,demo) {
  const title = user.name || 'My profile';
  const portrait = profilePortrait({...user,photo:user.showPhoto === false ? '' : user.photo},ui);
  const location = user.showCountry !== false ? user.country : '';
  const stage = user.showProfessional !== false ? user.stage : '';
  return `<div class="wrap page profile-page">
    <div class="panel profile-hero" aria-labelledby="profile-title">
      <div class="profile-stripes" aria-hidden="true"></div>
      <div class="profile-hero-body"><div class="profile-photo">${portrait}</div>
      <div class="profile-hero-copy"><p class="eyebrow">Skill Passport</p><h1 id="profile-title">${ui.html(title)}</h1>
        ${user.username ? `<p class="profile-username">@${ui.html(user.username)}</p>` : ''}
        ${user.bio ? `<p class="profile-bio">${ui.html(user.bio)}</p>` : ''}
        ${stage || location ? `<div class="profile-badges">${[stage,location].filter(Boolean).map(value => `<span class="tag">${ui.html(value)}</span>`).join('')}</div>` : ''}</div>
      <div class="profile-hero-actions">${demo ? '<button class="button secondary" id="share">Share sample</button>' : ui.action('/profile/edit','Edit profile')}</div></div>
    </div>
    <nav class="profile-nav" aria-label="Profile sections"><a href="#overview">Overview</a><a href="#skills">Skills & evidence</a><a href="#connections">Connected platforms</a></nav>
    <div class="profile-grid"><aside class="panel padded profile-sidebar">
      <h2>About</h2><div class="profile-context" id="passport-context">${identityDetails(user,ui)}</div>
    </aside><div class="profile-content">
      <section class="panel padded profile-overview" id="overview"><div class="activity-head"><h2>Overview</h2><span class="tag">${demo ? 'Illustrative profile' : 'Your browser session'}</span></div>
        <div class="stats" id="passport-stats">${ui.stat(demo ? '300' : '—',demo ? 'Example practice problems' : 'Solved in Arena')}${ui.stat(demo ? '91%' : '—',demo ? 'Example Python score' : 'Arena acceptance')}${ui.stat(demo ? '18' : '0','Recorded projects')}</div>
        <div id="passport-activity">${activityGrid(demo ? sampleDays : [],demo)}</div>
      </section>
      <section id="skills"><div class="section-heading"><div><p class="eyebrow">Evidence Engine</p><h2>Skills and proof</h2></div>${demo ? '' : '<button class="button secondary small" id="add-evidence">Add evidence</button>'}</div>
        <div class="subject-grid" id="passport-skills">${demo
          ? subject('Python','Example practice and project evidence',metrics.python,'91%',ui)+subject('SQL','Example assessment and project evidence',metrics.sql,'88%',ui)
          : subject('Python','Accepted Arena problems for this session',[['Problems solved',null]],null,ui)+subject('SQL','Add links to SQL work or assessments.',[],null,ui)}</div>
        ${demo ? '' : '<div class="panel padded" id="profile-evidence"></div>'}
      </section>
      <section id="connections"><div class="section-heading"><div><p class="eyebrow">Evidence sources</p><h2>Connected platforms</h2></div></div>
        ${demo ? sampleConnections(ui) : '<p id="connection-status" role="status"></p><div class="connections-grid" id="connections-grid"></div>'}
      </section></div></div></div>`;
}
function identityDetails(user,ui) {
  const rows = [];
  if (user.showCountry !== false) rows.push(['Country or region',user.country]);
  if (user.showProfessional !== false) rows.push(
    ['Career stage',user.stage],['Institution or employer',user.college],['Qualification',user.degree],
    ['Graduation year',user.graduationYear],['CGPA',user.cgpa],['Coding since',user.codingSince],
    ['Preferred language',user.preferredLanguage],['Programming languages',user.languages],
  );
  if (user.showCareer !== false) rows.push(['Target role',user.role],['Availability',user.availability]);
  const details = rows.filter(([,value]) => value).map(([label,value]) =>
    `<div><dt>${label}</dt><dd>${ui.html(value)}</dd></div>`).join('');
  const links = user.showCareer === false ? '' : [['LinkedIn','linkedin','LinkedIn'],['Portfolio','portfolio']].map(([label,key,provider]) => {
    const url = ui.validatedUrl(user[key],provider);
    return url ? `<a class="source-link" href="${ui.html(url)}" target="_blank" rel="noopener noreferrer">${label}</a>` : '';
  }).join('');
  return details || links ? `<dl class="profile-facts">${details}</dl><div class="profile-links">${links}</div>`
    : '<p>Add details in profile settings to fill out your showcase.</p>';
}
export function renderPassport(main,user,ui,demo=false) {
  main.innerHTML = shell(user,ui,demo);
}
const evidenceRequest = async (path,options) => {
  const response = await fetch('/api/evidence/'+path,options);
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? 'Evidence service unavailable.');
  return json;
};
const mutate = {method:'POST',headers:{'x-place-evidence':'1'}};
export async function attachLiveEvidence(main,state,ui) {
  const status = main.querySelector('#connection-status');
  const notice = new URL(location.href).searchParams.get('connection');
  if (notice) {
    status.textContent = {
      connected:'Account connected. Account activity was imported with your consent.',
      failed:'The provider did not complete the connection. Try again.',
      cancelled:'Connection cancelled or expired.',
      setup:'Provider registration is required before connecting.',
    }[notice] ?? '';
    history.replaceState({},'',location.pathname+location.hash);
  }
  const grid = main.querySelector('#connections-grid');
  let settings = {configured:{},snapshots:{}};
  let arena = null;
  const liveStats = () => {
    const projects = state.evidence.filter(item => ['Major project','Minor project'].includes(item.type)).length;
    main.querySelector('#passport-stats').innerHTML = ui.stat(format(arena?.solved),'Solved in Arena')+ui.stat(acceptedRate(arena ?? {}),'Arena acceptance')+ui.stat(format(projects),'Recorded projects');
    const records = (skill,type) => state.evidence.filter(item => item.skill === skill && item.type === type).length;
    main.querySelector('#passport-skills').innerHTML =
      subject('Python','Arena results and student-recorded evidence.',[
        ['Accepted Arena problems',arena?.python],['Recorded mini projects',records('Python','Minor project')],
        ['Recorded major projects',records('Python','Major project')],['Recorded assessments',records('Python','Assessment')],
      ],null,ui)+subject('SQL','Browser practice and student-recorded evidence.',[
        ['SQL mini challenges',Number(Boolean(state.completed.sql))],
        ['Recorded database projects',records('SQL','Major project')+records('SQL','Minor project')],
        ['Recorded assessments',records('SQL','Assessment')],
      ],null,ui);
  };
  const render = () => {
    grid.innerHTML = targets.map(([id,name,symbol,description]) => {
      const snapshot = settings.snapshots[id];
      const oauth = id === 'github' || id === 'linkedin';
      const linked = state.evidence.filter(item => item.platform === name && ui.validatedUrl(item.url,item.platform));
      const oauthAction = settings.configured[id]
        ? ui.action('/api/evidence/'+id+'/connect',snapshot ? 'Reconnect' : 'Connect','secondary small')
        : '<span class="connection-help">App setup required</span>';
      let snapshotBody = '';
      if (snapshot) {
        if (id === 'github') snapshotBody = metricList([['Commit contributions',snapshot.commits],['Owned public repositories',snapshot.repositories],['Pull request contributions',snapshot.pullRequests]],ui.stat)+'<p>Contribution counts cover the past year.</p>';
        if (id === 'codeforces') snapshotBody = metricList([['Rating',snapshot.rating],['Peak rating',snapshot.maxRating],['Unique accepted',snapshot.solved]],ui.stat)+topics(snapshot.topics,ui)+`<p>Based on the latest ${format(snapshot.window)} submissions. Topics can overlap.</p>`;
        snapshotBody = `<strong>${ui.html(snapshot.handle ? '@'+snapshot.handle : snapshot.name)}</strong>${snapshotBody}<p class="evidence-meta">Imported ${dateLabel(snapshot.syncedAt)}</p>`;
      }
      return `<article class="panel padded provider"><div class="provider-head"><span class="provider-icon">${symbol}</span><div><h3>${name}</h3><p>${description}</p></div>
        <span class="tag ${snapshot && oauth ? 'confirmed' : ''}">${snapshot ? oauth ? 'Account authorized' : 'Official public data' : linked.length ? 'Self-reported link' : oauth || id === 'codeforces' ? 'Available source' : 'Link only'}</span></div>
        ${snapshotBody}${linked.map(item => item.url ? `<p><a class="source-link" href="${ui.html(item.url)}" target="_blank" rel="noopener noreferrer">Open attached source</a></p>` : '').join('')}
        <div class="actions">${oauth ? oauthAction : id === 'codeforces' ? '<button class="button secondary small" data-import>Import public stats</button>' : ''}
        ${snapshot ? `<button class="button secondary small" data-disconnect="${id}">Remove snapshot</button>` : ''}
        ${!oauth && id !== 'codeforces' ? `<button class="button secondary small" data-link="${name}">Add source link</button>` : ''}</div></article>`;
    }).join('');
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
  evidenceRequest('connections').then(data => { settings = data; render(); }).catch(() => {
    if (!status.textContent) status.textContent = 'Platform connections require the running Place AI server.';
  });
  evidenceRequest('arena').then(data => {
    arena = data;
    liveStats();
    main.querySelector('#passport-activity').innerHTML = activityGrid(data.activity);
  }).catch(() => {});
}
