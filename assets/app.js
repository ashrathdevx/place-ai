import { setTheme, themePreference } from './theme.js';
import { cseTrack, challengeUrl, continueStudy, moduleProgress } from './study-plan.js';
import { practiceState, rememberLesson, reviewReason, studyProgress, updatePractice } from './practice-state.js';
import { watchArenaProgress } from './live-progress.js';
import { activityGrid, attachLiveEvidence, attachPassportNavigation, renderPassport } from './profile.js';
import { openProfileSettings } from './profile-settings.js';
import { branches, challenges, starterListings, platforms, evidenceTypes } from './data.js';

const icons = {
  spark:'M12 2v20M2 12h20M5 5l14 14M5 19 19 5',
  code:'m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
  layers:'m12 3 10 5-10 5L2 8l10-5Zm10 9-10 5-10-5m20 4-10 5-10-5',
  bag:'M3 7h18v13H3zM8 7V4h8v3M3 12l9 3 9-3',
  shop:'M3 10v11h18V10M2 10l2-6h16l2 6M2 10c0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0M10 21v-5h4v5',
  shield:'M12 22S4 18 4 11V5l8-3 8 3v6c0 7-8 11-8 11Zm-4-10 3 3 5-6',
  link:'M10 13a4 4 0 0 0 6 .5l4-4a4 4 0 0 0-6-6l-2 2m0 13-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 .5',
  chart:'M3 20h18M6 16v-4m6 4V8m6 8V4',
  up:'M6 18 18 6M7 6h11v11',
  check:'m5 12 4 4L19 6',
  card:'M3 5h18v14H3zM7 9h4v4H7zm7 0h4m-4 4h4',
};
const icon = (name, className = '') => `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]}"/></svg>`;
const html = (value = '') => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const read = () => {
  try { return JSON.parse(localStorage.getItem('place-ai-vision-v1')) ?? {}; }
  catch { return {}; }
};
const state = {
  branch:'CSE', completed:{}, evidence:[], listings:[], savedListings:[], placement:{},
  profile:{ name:'', college:'', cgpa:'', role:'', availability:'', languages:'' },
  ...read(),
};
const save = () => {
  try {
    localStorage.setItem('place-ai-vision-v1', JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};
const localStatus = (message, stored) => stored ? message : `${message} Browser storage is unavailable, so this change lasts for this session.`;
const main = document.querySelector('main');
const dialog = document.querySelector('#dialog');
const route = location.pathname.replace(/\/$/, '') || '/';
const navigation = [['/learn','Learn'],['/practice','Practice'],['/placements','Placements'],['/arena','Arena'],['/marketplace','Marketplace'],['/proof','Evidence Engine']];
const brand = `<a class="brand" href="/" aria-label="Place AI home"><img src="/assets/mark.svg" alt="" width="33" height="33"> Place<span>AI</span></a>`;
const nav = navigation.map(([link,label]) => `<a href="${link}" ${route === link || (route.startsWith(link + '/') && !navigation.some(([candidate]) => candidate !== link && (route === candidate || route.startsWith(candidate + '/')))) ? 'aria-current="page"' : ''}>${label}</a>`).join('');
document.querySelector('#header').innerHTML = `<div class="wrap header-inner">${brand}<nav id="nav" aria-label="Main navigation">${nav}</nav><a href="/profile" class="button small header-cta" ${route.startsWith('/profile') ? 'aria-current="page"' : ''}>Skill Passport</a><label class="theme-control"><span class="sr-only">Theme</span><select id="site-theme" aria-label="Theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label><button id="menu" class="button small secondary" type="button" aria-expanded="false" aria-controls="nav">Menu</button></div>`;
const themeControl = document.querySelector('#site-theme');
themeControl.value = themePreference();
themeControl.onchange = () => setTheme(themeControl.value);
window.addEventListener('place-theme',() => { themeControl.value = themePreference(); });
document.querySelector('#menu').onclick = event => {
  const open = event.currentTarget.getAttribute('aria-expanded') === 'true';
  event.currentTarget.setAttribute('aria-expanded', String(!open));
  document.querySelector('#nav').classList.toggle('open', !open);
};
document.querySelector('#footer').innerHTML = `<div class="wrap footer-inner">${brand}<p>From your first semester to your first role.</p><a href="/proof/demo">Sample Skill Passport</a></div>`;

const action = (link, label, style = '') => `<a class="button ${style}" href="${link}">${label}</a>`;
const sectionIntro = (label, title, text) => `<div class="page-intro"><p class="eyebrow">${label}</p><h1>${title}</h1><p class="lede">${text}</p></div>`;
const avatar = (name) => `<span class="avatar" aria-hidden="true">${html(name.trim().split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase() || 'PA')}</span>`;
const stat = (value, label) => `<div><strong>${value}</strong><span>${label}</span></div>`;
const demoCard = () => `<article class="preview panel">
  <div class="preview-top"><span>${icon('shield')} Skill Passport</span><span class="tag">Sample profile</span></div>
  <div class="identity">${avatar('Synexis')}<div><h2>Synexis</h2><p>Student developer · CSE</p></div></div>
  <div class="stats">${stat('180','Python problems')}${stat('120','SQL problems')}${stat('18','Recorded projects')}</div>
  <div class="hero-activity">${activityGrid(Array.from({length:84},(_,i) => ({date:new Date(Date.UTC(2026,10,23+i-83)).toISOString().slice(0,10),count:i%5 === 0 ? 0 : (i*i+i)%7})),true)}</div>
  <a class="preview-bottom" href="/proof/demo">Open Synexis’s passport ${icon('up')}</a>
</article>`;

function home() {
  const steps = [
    ['spark','Learn','Find a roadmap','Get a branch-specific plan and see which skills to work on next.','/learn'],
    ['code','Build','Practice and build','Solve mini challenges and turn your projects into portfolio evidence.','/practice'],
    ['bag','Get placed','Prepare for interviews','Track application prep and share your work with recruiters.','/placements'],
    ['shop','Marketplace','Explore student resources','Browse sample resources and draft your own listing.','/marketplace'],
  ];
  main.innerHTML = `
    <section class="hero"><div class="hero-grid" aria-hidden="true"></div><div class="wrap hero-inner">
      <div class="hero-copy"><p class="eyebrow"><span class="dot"></span> Placement preparation for engineering students</p>
        <h1>Learn to debug real code.</h1>
        <p class="lede">Repair complete programs in C, C++, or Python, then add accepted fixes to your Skill Passport.</p>
        <div class="actions">${action('/arena/decode','Browse challenges')}</div>
      </div>
      <div class="hero-art"><span class="orbit orbit-one" aria-hidden="true"></span><span class="orbit orbit-two" aria-hidden="true"></span>${demoCard()}</div>
    </div></section>
    <section class="wrap journey">
      <div class="section-heading"><div><p class="eyebrow">The student journey</p><h2>Your placement toolkit.</h2></div><p>Start with CSE or explore starter tracks for ECE, EEE, Mechanical and Civil.</p></div>
      <div class="journey-grid">${steps.map(([symbol, label, title, text, link]) => `<a class="panel journey-card spotlight" href="${link}"><span class="tile-icon">${icon(symbol)}</span><span class="step-label">${label}</span><h3>${title}</h3><p>${text}</p></a>`).join('')}</div>
    </section>
    <section class="wrap home-proof"><div class="panel proof-callout"><div><p class="eyebrow">${icon('shield')} Evidence Engine</p><h2>Give every skill<br>something to show.</h2><p>See what you solved, what you shipped and where each record came from.</p>${action('/proof','Explore Evidence Engine','secondary')}</div><ul class="proof-points"><li>${icon('code')} <div><strong>Practice results</strong><span>Challenge outcomes and assessment history</span></div></li><li>${icon('layers')} <div><strong>Projects and experience</strong><span>Portfolio work, internships and credentials</span></div></li><li>${icon('link')} <div><strong>External sources</strong><span>GitHub, LinkedIn and coding profiles</span></div></li></ul></div>
    <div class="landing-pipeline"><div class="pipeline-copy"><h2>Debug real code.</h2><p>Start with a buggy C, C++, or Python program. Run it, fix the logic, and add the accepted result to your Skill Passport.</p>${action('/arena/decode','Open Decode','secondary')}</div><div class="canvas" aria-hidden="true" id="landing-graph"></div></div></section>`;
  const graph = document.querySelector('#landing-graph');
  let disposeGraph;
  let active = true;
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    import('/vendor/pipeline.js').then(({mountPipeline}) => {
      if (active) disposeGraph = mountPipeline(graph);
    }).catch(() => {});
  }, {rootMargin:'90px'});
  observer.observe(graph);
  window.addEventListener('pagehide', () => { active = false; observer.disconnect(); disposeGraph?.(); }, {once:true});
  if (!matchMedia('(pointer: coarse)').matches) {
    main.querySelectorAll('.spotlight').forEach(card => card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--y', `${event.clientY - rect.top}px`);
    }));
  }
}

const branchOptions = (current, extra = []) => [...extra, ...Object.keys(branches)].map(branch => `<option ${branch === current ? 'selected' : ''}>${branch}</option>`).join('');
const field = (label, name, value = '', attributes = '') => `<label>${label}<input name="${name}" value="${html(value)}" ${attributes}></label>`;
const closeButton = '<button class="close" type="button" aria-label="Close dialog">×</button>';
function showDialog(title, content) {
  dialog.innerHTML = `${closeButton}<h2 id="dialog-title">${html(title)}</h2>${content}`;
  dialog.querySelector('.close').onclick = () => dialog.close();
  dialog.showModal();
}
const flash = (message) => { document.querySelector('#status').textContent = message; };

function learn() {
  const lesson = cseTrack.find(item => item.id === new URLSearchParams(location.search).get('lesson'));
  if (lesson) rememberLesson(lesson.id);
  main.innerHTML = `<div class="wrap page study-page">
    ${sectionIntro('Learn','CSE Debugging Foundations','Practise tracing code, testing edge cases, and fixing logic bugs.')}
    <div id="study-resume" class="actions"></div>
    ${lesson ? `<article class="panel padded study-lesson"><a href="/learn">← Study plan</a><h2>${lesson.title}</h2><p>${lesson.concept}</p>
      <h3>Worked example</h3><p>${lesson.example}</p><p>${lesson.goal}</p><div class="actions">
      ${action(challengeUrl(lesson.id,lesson.challenge),'Open Decode challenge')}
      ${action(challengeUrl(lesson.id,lesson.followUp),'Open follow-up','secondary')}</div></article>` : ''}
    <section aria-labelledby="study-modules"><h2 id="study-modules">Modules</h2><p>Complete both accepted repairs in a module to finish it.</p><ol id="module-list" class="study-list"></ol></section>
    <section class="panel padded" id="study-review" aria-labelledby="review-title"><h2 id="review-title" tabindex="-1">Review queue</h2><div id="review-list"></div></section>
    <details class="panel padded" id="study-settings"><summary>Edit study plan</summary><form class="form">
      <label>Engineering branch<select name="branch">${branchOptions(state.roadmap?.branch ?? state.branch)}</select></label>
      <label>College year<select name="year">${['Year 1','Year 2','Year 3','Year 4'].map(year => `<option${year === state.roadmap?.year ? ' selected' : ''}>${year}</option>`).join('')}</select></label>
      <label>Target role<select name="role"></select></label><p>CSE Debugging Foundations is available to every branch.</p>
      <button class="button secondary" type="submit">Save study preferences</button><p role="status"></p></form></details></div>`;
  const form = main.querySelector('#study-settings form');
  const roles = () => {
    form.elements.role.innerHTML = branches[form.elements.branch.value].roles.map(role => `<option${role === state.roadmap?.role ? ' selected' : ''}>${html(role)}</option>`).join('');
  };
  roles();
  form.elements.branch.onchange = roles;
  form.onsubmit = event => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(form));
    state.branch = fields.branch;
    state.roadmap = {...state.roadmap,...fields};
    form.querySelector('[role="status"]').textContent = localStatus('Study preferences saved.',save());
  };
  let catalog = [];
  const render = () => {
    const progress = studyProgress();
    const resume = continueStudy(catalog,progress);
    const accepted = new Set(catalog.filter(item => item.solved === true).map(item => item.slug));
    main.querySelector('#study-resume').innerHTML = action(resume.url,resume.label);
    main.querySelector('#module-list').innerHTML = cseTrack.map(module => {
      const status = moduleProgress(module,catalog,progress.visited ?? []);
      return `<li class="panel padded"><div><h3><a href="/learn?lesson=${module.id}">${module.title}</a></h3><span class="tag">${status}</span></div>
        <p>${module.goal}</p><div class="study-links"><a href="${challengeUrl(module.id,module.challenge)}">Decode challenge</a>${accepted.has(module.challenge) ? '<span class="tag">Accepted</span>' : ''}
        <a href="${challengeUrl(module.id,module.followUp)}">Follow-up</a>${accepted.has(module.followUp) ? '<span class="tag">Accepted</span>' : ''}</div></li>`;
    }).join('');
    const bySlug = new Map(catalog.filter(item => item.kind === 'decode' && item.solved !== true).map(item => [item.slug,item]));
    main.querySelector('#review-list').innerHTML = Object.entries(practiceState()).flatMap(([slug,item]) => {
      const reason = reviewReason(item);
      const problem = bySlug.get(slug);
      return reason && problem ? [`<p><a href="/arena/problems/${encodeURIComponent(slug)}">${html(problem.title)}</a> · ${reason}
        <button type="button" class="button secondary small" data-skip="${html(slug)}">Skip</button></p>`] : [];
    }).join('') || '<p>No challenges to review yet.</p>';
  };
  main.querySelector('#review-list').onclick = event => {
    const skip = event.target.closest('[data-skip]');
    if (!skip) return;
    updatePractice(skip.dataset.skip,item => ({...item,skipped:true}));
    render();
    (main.querySelector('#review-list button') ?? main.querySelector('#study-review h2')).focus();
  };
  async function refresh() {
    try {
      const response = await fetch('/api/problems');
      if (!response.ok) return;
      const next = await response.json();
      if (JSON.stringify(next) !== JSON.stringify(catalog)) { catalog = next; render(); }
    } catch { /* Study content stays available without the judge. */ }
  }
  render();
  void refresh();
  window.addEventListener('pageshow',event => { if (event.persisted) void refresh(); });
  window.addEventListener('storage',event => { if (event.key === 'place-ai:judge-verdict') void refresh(); });
}

function practice() {
  main.innerHTML = `<div class="wrap page practice-page">
    <div class="practice-banner"><div><p class="eyebrow">Practice</p><h1>Find your next problem.</h1><p class="lede">Work through short challenges by branch or open the Arena for judged coding problems.</p></div>${action('/arena','Open Coding Arena')}</div>
    <div class="practice-grid"><section class="panel practice-library" aria-labelledby="challenge-title">
      <div class="practice-controls"><h2 id="challenge-title">Challenge library</h2>
        <div class="practice-filters"><label>Search<input type="search" id="practice-search" placeholder="Search challenges"></label>
        <label>Branch<select id="practice-branch"><option value="">All branches</option>${branchOptions()}</select></label>
        <label>Status<select id="practice-completion"><option value="all">All statuses</option><option value="todo">To do</option><option value="done">Completed</option></select></label></div>
        <div id="practice-types" class="chips" role="group" aria-label="Challenge type"></div></div>
      <div id="challenges" class="challenge-list"></div><p class="practice-count" id="practice-count" role="status"></p></section>
      <aside class="practice-sidebar"><section class="panel padded"><p class="eyebrow">Your progress</p><h2 id="practice-status"></h2>
        <progress id="practice-progress" aria-label="Completed practice challenges"></progress>
        <p>Correct answers add a record to your Skill Passport.</p>${action('/profile','View profile','secondary small')}</section>
      <section class="panel padded"><h2>Fix a logic bug</h2><p>Choose from 30 runnable challenges in C, C++, and Python in Decode.</p>${action('/arena/decode','Browse Decode challenges','secondary small')}</section></aside>
    </div></div>`;
  const branch = main.querySelector('#practice-branch');
  const search = main.querySelector('#practice-search');
  const completion = main.querySelector('#practice-completion');
  const types = main.querySelector('#practice-types');
  const list = main.querySelector('#challenges');
  let category = '';
  const render = () => {
    const items = challenges.filter(item => !branch.value || item.branch === branch.value);
    const done = items.filter(item => state.completed[item.id]).length;
    const progress = main.querySelector('#practice-progress');
    progress.max = items.length || 1;
    progress.value = done;
    main.querySelector('#practice-status').textContent = `${done} of ${items.length} completed`;
    const query = search.value.trim().toLowerCase();
    const filtered = items.filter(item => {
      const solved = Boolean(state.completed[item.id]);
      return (!category || category === item.type)
        && (completion.value === 'all' || solved === (completion.value === 'done'))
        && (!query || (item.title+' '+item.type).toLowerCase().includes(query));
    });
    main.querySelector('#practice-count').textContent = `Showing ${filtered.length} of ${items.length} challenges`;
    list.innerHTML = filtered.map(item => {
      const solved = Boolean(state.completed[item.id]);
      return `<article class="challenge-row"><span class="challenge-status ${solved ? 'solved' : ''}" role="img" aria-label="${solved ? 'Completed' : 'To do'}">${solved ? icon('check') : '○'}</span>
        <div><h3>${item.title}</h3><p>${item.type}</p></div>
        <button class="button secondary small" data-challenge="${item.id}" aria-label="${solved ? 'Review' : 'Open'} ${item.title}">${solved ? 'Review' : 'Open'}</button></article>`;
    }).join('') || '<p class="practice-empty">No challenges match these filters.</p>';
  };
  const renderTypes = () => {
    const options = [...new Set(challenges.filter(item => !branch.value || item.branch === branch.value).map(item => item.type))];
    types.innerHTML = ['',...options].map(type => `<button class="chip" data-type="${type}" aria-pressed="${type === category}">${type || 'All challenges'}</button>`).join('');
  };
  branch.onchange = () => { category = ''; renderTypes(); render(); };
  search.oninput = render;
  completion.onchange = render;
  types.onclick = event => {
    const selected = event.target.closest('[data-type]');
    if (!selected) return;
    category = selected.dataset.type;
    types.querySelectorAll('[data-type]').forEach(button => button.setAttribute('aria-pressed',String(button === selected)));
    render();
  };
  renderTypes();
  list.onclick = event => {
    const button = event.target.closest('[data-challenge]');
    if (!button) return;
    const item = challenges.find(challenge => challenge.id === button.dataset.challenge);
    const input = item.choices ? `<fieldset><legend>Choose your answer</legend><div class="checkbox-group">${item.choices.map(choice => `<label><input required type="radio" name="answer" value="${html(choice)}"> ${html(choice)}</label>`).join('')}</div></fieldset>` : field('Your answer','answer','','required maxlength="80"');
    showDialog(item.title, `<p>${item.prompt}</p><form class="form">${input}<button class="button">Check answer</button><p id="answer-result" role="status"></p></form>`);
    dialog.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const answer = new FormData(event.currentTarget).get('answer').trim().replace(/\s+/g,' ').replace(/;$/,'').toUpperCase();
      const correct = answer === item.answer.toUpperCase();
      let message = 'Try again. Re-read the prompt and check your answer.';
      if (correct) {
        if (!state.completed[item.id]) {
          state.completed[item.id] = new Date().toISOString();
          message = localStatus(`Correct. ${item.reason} Added to your evidence.`, save());
        } else {
          message = `Correct. ${item.reason}`;
        }
        const dialogTrigger = button.dataset.challenge;
        render();
        dialog.addEventListener('close', () => (list.querySelector(`[data-challenge="${dialogTrigger}"]`) ?? completion).focus(), { once:true });
      }
      dialog.querySelector('#answer-result').textContent = message;
    };
  };
  render();
}

function placements() {
  const tasks = ['Complete a technical practice set','Write a walkthrough of your strongest project','Update your résumé with evidence links','Rehearse an introduction and a behavioral answer','Prepare questions for the interviewer'];
  main.innerHTML = `<div class="wrap page">${sectionIntro('Get placed','Placement preparation','Use this checklist for interviews and application materials. Progress is saved in this browser.')}
    <div class="workspace"><section class="panel padded"><h2>Placement checklist</h2><p role="status" class="green" id="prep-progress"></p><div class="checkbox-group">${tasks.map((task, index) => `<label><input type="checkbox" data-task="${index}" ${state.placement[index] ? 'checked' : ''}> ${task}</label>`).join('')}</div></section>
    <section class="panel padded"><p class="eyebrow">Application materials</p><h2>Share your strongest work</h2><p class="muted">Add a project, résumé or internship record to your Skill Passport. Use a project walkthrough to explain what you built and what you learned.</p><div class="actions">${action('/profile','Update my profile')}${action('/practice','Practice questions','secondary')}</div></section></div></div>`;
  const progress = (stored = true) => {
    const message = `${tasks.filter((_, index) => state.placement[index]).length} of ${tasks.length} steps complete`;
    main.querySelector('#prep-progress').textContent = localStatus(message, stored);
  };
  main.querySelectorAll('[data-task]').forEach(input => input.onchange = () => {
    state.placement[input.dataset.task] = input.checked;
    progress(save());
  });
  progress();
}

function marketplace() {
  const categories = ['All categories','Notes','Projects','Templates','Resources','Services'];
  const categoryOptions = (choices) => choices.map(category => `<option>${category}</option>`).join('');
  main.innerHTML = `<div class="wrap page">${sectionIntro('Student resources','Marketplace','Browse sample listings and save your own draft in this browser.')}
    <div class="toolbar"><label>Category<select id="category">${categoryOptions(categories)}</select></label><label>Engineering branch<select id="market-branch">${branchOptions('All branches',['All branches'])}</select></label>
    <label class="toggle"><input type="checkbox" id="saved-only"> Saved only</label><button class="button" id="new-listing">Draft a listing</button></div><p id="status" class="green" role="status"></p><div id="listings" class="cards"></div></div>`;
  const category = main.querySelector('#category');
  const branch = main.querySelector('#market-branch');
  const savedOnly = main.querySelector('#saved-only');
  const list = main.querySelector('#listings');
  const render = () => {
    const items = [...state.listings, ...starterListings].filter(item =>
      (category.value === 'All categories' || item.category === category.value)
      && (branch.value === 'All branches' || !branch.value || item.branch === branch.value || item.branch === 'All branches')
      && (!savedOnly.checked || state.savedListings.includes(item.id)));
    list.innerHTML = items.map(item => `<article class="panel padded">
      <div class="row"><span class="tag">${html(item.category)} · ${html(item.branch)}</span><span class="muted">${item.draft ? 'Your draft' : 'Sample'}</span></div>
      <h2>${html(item.title)}</h2><p class="muted">${html(item.description)}</p>
      <div class="row"><strong class="green">₹${Number(item.price).toLocaleString('en-IN')}</strong><button class="button small secondary" aria-pressed="${state.savedListings.includes(item.id)}" data-save="${html(item.id)}">${state.savedListings.includes(item.id) ? 'Unsave' : 'Save'}</button></div>
      </article>`).join('') || '<p class="muted">No items match these filters.</p>';
  };
  [category, branch, savedOnly].forEach(control => control.onchange = render);
  list.onclick = event => {
    const button = event.target.closest('[data-save]');
    if (!button) return;
    const id = button.dataset.save;
    const bookmarked = state.savedListings.includes(id);
    state.savedListings = bookmarked ? state.savedListings.filter(item => item !== id) : [...state.savedListings, id];
    flash(localStatus(bookmarked ? 'Item removed from saved listings.' : 'Item saved.', save()));
    render();
    (list.querySelector(`[data-save="${id}"]`) ?? savedOnly).focus();
  };
  main.querySelector('#new-listing').onclick = () => {
    showDialog('Draft a listing', `<p class="muted">Drafts are stored in this browser. Checkout and payouts are planned.</p>
      <form class="form">${field('Title','title','','required maxlength="70"')}
      <label>Category<select name="category">${categoryOptions(categories.slice(1))}</select></label>
      <label>Branch<select name="branch">${branchOptions('All branches',['All branches'])}</select></label>
      <label>Description<textarea name="description" maxlength="400" required></textarea></label>
      ${field('Price in ₹','price','','type="number" min="0" max="100000" step="1" required')}
      <button class="button">Save draft</button><p class="muted" role="status"></p></form>`);
    dialog.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form));
      if (!data.title.trim() || !data.description.trim()) {
        form.querySelector('[role="status"]').textContent = 'Enter a title and description.';
        return;
      }
      state.listings.unshift({ ...data, title:data.title.trim(), description:data.description.trim(), id:crypto.randomUUID(), draft:true });
      flash(localStatus('Listing draft saved.', save()));
      category.value = 'All categories';
      branch.value = 'All branches';
      savedOnly.checked = false;
      dialog.close();
      render();
    };
  };
  render();
}

const evidenceFromPractice = () => Object.entries(state.completed).map(([id, date]) => {
  const item = challenges.find(challenge => challenge.id === id);
  return item && { id, title:item.title, type:item.type, source:'Internal', detail:`Correct response · ${item.branch}`, status:'Practice result', date };
}).filter(Boolean);

function validatedUrl(value, platform) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (platform && (!platforms[platform]?.includes(url.hostname) || url.pathname === '/')) return null;
    return url.href;
  } catch {
    return null;
  }
}
const evidenceRow = (item) => `<article class="evidence-row"><div class="tile-icon">${icon(item.source === 'External' ? 'link' : 'check')}</div>
  <div><h3>${html(item.title)}</h3><p>${html(item.detail)}</p><p class="evidence-meta">${html(item.type)}${item.skill ? ' · '+html(item.skill) : ''} · ${html(item.source)} · ${html(item.date.slice(0,10))}</p>
  ${validatedUrl(item.url, item.platform) ? `<a href="${html(validatedUrl(item.url, item.platform))}" target="_blank" rel="noopener noreferrer">Open source</a>` : ''}</div><span class="tag">${html(item.status)}</span></article>`;

function proof() {
  const localEvidence = [...evidenceFromPractice(), ...state.evidence];
  let decoded = [];
  let selected = 'All';
  main.innerHTML = `<div class="wrap page">${sectionIntro('Evidence Engine','Build a Skill Passport.','Give recruiters a single place to see your practice results, projects, credentials and original sources.')}
    <div class="workspace"><section class="panel padded"><h2>Your evidence</h2><p class="muted">Accepted Decode fixes and records saved in this browser.</p><p id="judge-evidence-status" role="status"></p><div class="chips" aria-label="Filter evidence">
    ${['All','Internal','External'].map((source,index) => `<button class="chip" data-source="${source}" aria-pressed="${index === 0}">${source}</button>`).join('')}</div><div id="evidence-list" aria-live="polite"></div>${action('/profile','Add evidence','secondary')}</section>
    <section class="panel padded"><p class="eyebrow">Sample Skill Passport</p><h2>See what a recruiter sees.</h2><p class="muted">Open the example to see a career card, skill scores and an evidence breakdown.</p>${action('/proof/demo','View sample passport')}</section></div></div>`;
  const render = source => {
    const evidence = [...decoded,...localEvidence].sort((left,right) => right.date.localeCompare(left.date));
    const items = source === 'All' ? evidence : evidence.filter(item => item.source === source);
    main.querySelector('#evidence-list').innerHTML = items.map(item => item.slug
      ? `<article class="evidence-row"><span class="tile-icon">${icon('code')}</span><div><h3><a href="/arena/problems/${encodeURIComponent(item.slug)}">${html(item.title)}</a></h3>
        <p>Decode · ${html(item.detail)}</p></div><span class="tag">Accepted</span></article>` : evidenceRow(item)).join('')
      || '<p class="muted">No evidence in this view yet.</p>';
  };
  main.querySelectorAll('[data-source]').forEach(button => button.onclick = () => {
    main.querySelectorAll('[data-source]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    selected = button.dataset.source;
    render(selected);
  });
  render(selected);
  const status = main.querySelector('#judge-evidence-status');
  watchArenaProgress(({recent_decoded = []}) => {
    const next = recent_decoded.map(item => ({...item,date:item.accepted_at,source:'Internal',detail:item.difficulty}));
    if (JSON.stringify(decoded) !== JSON.stringify(next)) { decoded = next; render(selected); }
    status.textContent = '';
  },() => { status.textContent = 'Live judge records are temporarily unavailable.'; });
}

function samplePassport() {
  renderPassport(main,{name:'Synexis',role:'Student developer · CSE',college:'Demo Engineering College',cgpa:'9.1',languages:'C++, Java, Python, SQL',username:'synexis',stage:'Student',country:'India',bio:'I build small tools, practice algorithms and document what I learn.',availability:'Open to internships'},profileUI,true);
  attachPassportNavigation(main);
  main.querySelector('#share').onclick = async () => {
    const url = new URL('/proof/demo', location.origin).href;
    showDialog('Share sample career card', `<p class="muted">${['127.0.0.1','localhost'].includes(location.hostname) ? 'This preview URL opens on this computer. A hosted URL is needed for other devices.' : 'Share this URL in a résumé, portfolio or application.'}</p><label class="form">Sample passport URL<input id="share-url" readonly value="${html(url)}"></label><div id="qr" class="qr"></div>
      <button class="button" id="copy">Copy link</button><p id="copy-status" class="green" role="status"></p>`);
    const status = dialog.querySelector('#copy-status');
    const qr = dialog.querySelector('#qr');
    dialog.querySelector('#copy').onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        status.textContent = 'Link copied.';
      } catch {
        dialog.querySelector('#share-url').select();
        status.textContent = 'Link selected. Press your copy shortcut.';
      }
    };
    try {
      const { renderQr } = await import('./qr.js');
      renderQr(qr, url);
    } catch {
      qr.textContent = 'The QR code is unavailable for this URL.';
    }
  };
}

const profileUI = { action, avatar, dialog, html, showDialog, stat, validatedUrl };
function profile() {
  const preview = new URLSearchParams(location.search).get('preview') === '1';
  renderPassport(main,state.profile,profileUI,false,preview);
  attachPassportNavigation(main);
  const evidenceList = main.querySelector('#profile-evidence');
  const render = () => { evidenceList.innerHTML = '<h3>Self-added projects and external links</h3>'+(state.evidence.map(evidenceRow).join('') || '<p class="muted">No evidence added yet.</p>'); };
  const addEvidence = suggestedPlatform => {
    showDialog('Add evidence', `<form class="form">
      <label>Record type<select name="type">${evidenceTypes.map(type => `<option>${type}</option>`).join('')}</select></label>
      <label hidden id="platform-field">Platform<select name="platform">${Object.keys(platforms).map(name => `<option>${name}</option>`).join('')}</select></label>
      ${field('Title','title','','required maxlength="90"')}${field('Source URL (HTTPS)','url','','type="url" maxlength="500"')}
      <label>Skill<select name="skill"><option>General</option><option>Python</option><option>SQL</option><option>C++</option><option>DSA</option></select></label>
      <label>Evidence details<textarea name="detail" maxlength="400" required></textarea></label>
      <button class="button">Save evidence</button><p id="evidence-error" class="muted" role="status"></p></form>`);
    const form = dialog.querySelector('form');
    const setType = () => {
      const isExternal = form.elements.type.value === 'External profile';
      form.querySelector('#platform-field').hidden = !isExternal;
      form.elements.url.required = isExternal;
    };
    if (suggestedPlatform) {
      form.elements.type.value = 'External profile';
      form.elements.platform.value = suggestedPlatform;
    }
    form.elements.type.onchange = setType;
    setType();
    form.onsubmit = event => {
      event.preventDefault();
      const { title, type, platform, detail, url, skill } = Object.fromEntries(new FormData(form));
      const external = type === 'External profile';
      const sourceUrl = url ? validatedUrl(url, external ? platform : undefined) : null;
      if (!title.trim() || !detail.trim() || (url && !sourceUrl) || (external && !sourceUrl)) {
        form.querySelector('#evidence-error').textContent = external ? 'Enter a title, details and a valid HTTPS link on the chosen platform.' : 'Enter a title and details. If provided, use an HTTPS source URL.';
        return;
      }
      state.evidence.unshift({ id:crypto.randomUUID(), title:title.trim(), type, skill, detail:detail.trim(), url:sourceUrl, platform:external ? platform : undefined,
        source:external ? 'External' : 'Internal', status:external ? 'Linked by student' : 'Submitted locally', date:new Date().toISOString() });
      save();
      dialog.close();
      render();
      main.dispatchEvent(new Event('passport:changed'));
    };
  };
  const add = main.querySelector('#add-evidence');
  if (add) add.onclick = () => addEvidence();
  render();
  void attachLiveEvidence(main,state,{...profileUI,addEvidence},{preview});
}

const pages = {
  '/': ['Show what you can do', home],
  '/learn': ['Career coach', learn],
  '/practice': ['Practice', practice],
  '/placements': ['Placements', placements],
  '/marketplace': ['Student Marketplace', marketplace],
  '/proof': ['Evidence Engine', proof],
  '/proof/demo': ['Synexis · Sample Skill Passport', samplePassport],
  '/profile': ['My profile', profile],
  '/profile/edit': ['Profile settings', () => openProfileSettings(main,state,profileUI,save)],
};
const [title, render] = pages[route] ?? pages['/'];
document.title = `Place AI — ${title}`;
render();
