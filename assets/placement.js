import { companies, disciplines, examples, fitFor, postingSkills, recommendedPlan, skills, topics } from './placement-data.js';

const key = 'place-ai:placement-guide:v1';
const typeLabels = {all:'All roles',job:'Jobs',internship:'Internships'};
const categoryLabels = ['All companies','Product','Startup / scale-up','IT services'];
const defaultTarget = {discipline:'software',stage:'Exploring',roleType:'all',hours:5,location:'',start:''};
const companyById = new Map(companies.map(company => [company.id,company]));

function read() {
  try { return JSON.parse(localStorage.getItem(key)) ?? {}; } catch { return {}; }
}

function logo(company, html) {
  if (company.id === 'microsoft') return '<span class="placement-brand microsoft" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  if (company.id === 'google') return '<svg class="placement-brand" aria-hidden="true" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.6 24.4c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.5 6.1-8.7 6.1-14.9z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.2 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44z"/><path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4v-5.2H5.8a20 20 0 0 0 0 17.8z"/><path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3l5.8-5.8C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4z"/></svg>';
  if (company.id === 'razorpay') return '<svg class="placement-brand" aria-hidden="true" viewBox="0 0 32 32"><path fill="#3395ff" d="M11 10l16-7-6 24h-6l4-15-9 3z"/><path fill="#1261ca" d="M5 19l10-5-4 13H3z"/></svg>';
  if (company.id === 'gitlab') return '<svg class="placement-brand" aria-hidden="true" viewBox="0 0 32 32"><path fill="#fc6d26" d="m3 13 4-11 4 11h10l4-11 4 11-13 16z"/><path fill="#fca326" d="m3 13 13 16L3 20zm26 0L16 29l13-9z"/></svg>';
  return `<span class="placement-brand placement-wordmark" aria-hidden="true">${html(company.name)}</span>`;
}

export function renderPlacement(main,dialog,{html,icon}) {
  const initial = read();
  const target = {...defaultTarget,...initial.target};
  const evidence = initial.evidence ?? {};
  const saved = new Set(initial.saved ?? []);
  const complete = new Set(initial.complete ?? []);
  let imported = initial.imported;
  let plan = initial.plan ?? null;
  let activeTopic = 'All topics';
  let selected;
  let roles = [...examples];
  if (imported) roles.unshift(imported);
  let resume = '';
  let mobileDetail = false;
  let savedOnly = false;
  let postingsOnly = false;
  let bestFit = false;
  let category = 'All companies';
  let type = target.roleType;
  let lastListFocus;
  const smallScreen = matchMedia('(max-width: 780px)');
  const save = () => {
    try {
      localStorage.setItem(key,JSON.stringify({target,evidence,saved:[...saved],complete:[...complete],imported,plan}));
    } catch {
      main.querySelector('#placement-storage').textContent = 'This browser could not save your changes.';
    }
  };
  const selectOptions = (items,value) => items.map(([id,label]) => `<option value="${html(id)}" ${id === value ? 'selected' : ''}>${html(label)}</option>`).join('');
  const options = disciplines.map(item => [item.id,item.label]);
  const labelForDiscipline = id => disciplines.find(item => item.id === id)?.label;
  const employment = role => role.type === 'internship' ? 'Internship' : 'Job';
  const external = (href,label) => `<a class="placement-text" href="${html(href)}" target="_blank" rel="noopener noreferrer">${label} ${icon('up')}</a>`;
  const planHeading = () => main.querySelector('#placement-plan-title');
  const openPlan = () => {
    planHeading().scrollIntoView({block:'start'});
    planHeading().focus({preventScroll:true});
  };

  main.innerHTML = `<div class="placement-page"><div class="wrap placement-wrap">
    <div class="placement-intro">
      <div><h1>Build what’s next in tech.</h1><p>Explore jobs and internships, see where you fit, and plan your next move.</p></div>
      <div class="placement-target"><div><span>Your target</span><strong id="placement-target"></strong></div><button class="button secondary" id="placement-edit">Edit target</button></div>
    </div>
    <section class="placement-workspace" aria-label="Role explorer">
      <div class="placement-browser">
        <div class="placement-section-head"><h2>Explore roles</h2><button class="placement-text" id="placement-import">Add a job posting</button></div>
        <label class="placement-search"><span class="placement-sr">Search companies or roles</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 5 5"/></svg><input type="search" id="placement-query" placeholder="Search companies or roles"></label>
        <div class="placement-segments" role="group" aria-label="Role type">${Object.entries(typeLabels).map(([id,label]) => `<button type="button" data-role-type="${id}" aria-pressed="${id === type}">${label}</button>`).join('')}</div>
        <div class="placement-selects">
          <label><span>Company type</span><select id="placement-category">${selectOptions(categoryLabels.map(label => [label,label]),category)}</select></label>
          <label><span>Discipline</span><select id="placement-discipline"><option value="">All disciplines</option>${selectOptions(options,'')}</select></label>
        </div>
        <div class="placement-filters" role="group" aria-label="Result options">
          <button class="placement-text" id="placement-saved" aria-pressed="false">Saved only</button><button class="placement-text" id="placement-posted" aria-pressed="false">Postings only</button><button class="placement-text" id="placement-fit-sort" aria-pressed="false">Best fit</button>
        </div>
        <div class="placement-results-meta"><p class="placement-meta" id="placement-count" role="status"></p><p class="placement-meta" id="placement-feed" role="status">Checking careers boards…</p></div>
        <div id="placement-results" class="placement-results"></div>
      </div>
      <div class="placement-detail" id="placement-detail"></div>
    </section>
    <section class="placement-plan" aria-labelledby="placement-plan-title">
      <div class="placement-plan-bar"><h2 tabindex="-1" id="placement-plan-title">Your study plan</h2>
        <div role="group" aria-label="Study topics" class="placement-topics">${['All topics',...topics].map((topic,index) => `<button data-plan-topic="${topic}" aria-pressed="${index === 0}">${index ? icon(['code','layers','link','chart','card'][index-1]) : ''}${topic}</button>`).join('')}</div>
      </div>
      <div id="placement-plan"></div>
    </section>
    <p id="placement-storage" role="status" class="placement-meta"></p>
  </div></div>`;

  const browser = main.querySelector('.placement-browser');
  const query = main.querySelector('#placement-query');
  const disciplineSelect = main.querySelector('#placement-discipline');
  const list = main.querySelector('#placement-results');
  const detail = main.querySelector('#placement-detail');
  const planBody = main.querySelector('#placement-plan');

  function getVisible() {
    const term = query.value.trim().toLowerCase();
    const filtered = roles.filter(role => {
      const company = companyById.get(role.company);
      return (type === 'all' || role.type === type) && (!savedOnly || saved.has(role.id)) && (!postingsOnly || role.source !== 'example') &&
        (!disciplineSelect.value || disciplineSelect.value === role.discipline) &&
        (category === 'All companies' || company?.type === category) &&
        [company?.name ?? role.companyName,role.title,role.location,role.source === 'imported' ? 'my posting' : ''].join(' ').toLowerCase().includes(term);
    });
    if (!bestFit) return filtered;
    return filtered.map(role => ({role, score:fitFor(role,evidence).score})).sort((a,b) => b.score - a.score).map(item => item.role);
  }

  function renderTarget() {
    main.querySelector('#placement-target').textContent = [labelForDiscipline(target.discipline), target.roleType === 'all' ? '' : typeLabels[target.roleType]].filter(Boolean).join(' · ');
  }

  function renderList(visible = getVisible()) {
    list.innerHTML = visible.length ? visible.map(role => {
      const company = companyById.get(role.company);
      const name = company?.name ?? role.companyName;
      const mark = company ? logo(company,html) : `<span class="placement-brand placement-wordmark" aria-hidden="true">${html(name.slice(0,2).toUpperCase())}</span>`;
      return `<button class="placement-role" data-role="${html(role.id)}" ${selected === role.id ? 'aria-current="true"' : ''}>
        ${mark}<span><strong>${html(name)}</strong><span>${html(role.title)}</span></span><span class="placement-role-source"><strong>${employment(role)}</strong><small>${role.source === 'live' ? 'Careers board' : role.source === 'imported' ? 'My posting' : 'Example'}</small></span><span aria-hidden="true" class="placement-chevron">›</span></button>`;
    }).join('') : '<p class="placement-empty">No matching roles.</p><button class="button secondary" id="placement-clear">Clear filters</button>';
    main.querySelector('#placement-count').textContent = `${visible.length} ${visible.length === 1 ? 'role' : 'roles'}${bestFit ? ' · Sorted by self-reported evidence' : ''}`;
  }

  function syncSelection() {
    const visible = getVisible();
    if (!visible.some(role => role.id === selected)) { selected = visible[0]?.id; mobileDetail = false; }
    renderList(visible);
    renderDetail();
  }

  function renderDetail() {
    const role = roles.find(item => item.id === selected);
    detail.classList.toggle('placement-detail-open',mobileDetail);
    browser.classList.toggle('placement-browser-away',mobileDetail);
    if (!role) { detail.innerHTML = '<p class="placement-empty">Choose a role to see its study benchmark.</p>'; return; }
    const company = companyById.get(role.company);
    const fit = fitFor(role,evidence,resume);
    const assessed = fit.rows.some(row => evidence[row.key]);
    const matchesPosting = postingSkills(role).length > 0;
    detail.innerHTML = `
      <button class="placement-text placement-back" id="placement-back">← Back to roles</button>
      <div class="placement-role-head">
        <strong>${company ? logo(company,html) : ''}${html(company?.name ?? role.companyName)}</strong>
        <button class="button secondary small" id="placement-bookmark" aria-pressed="${saved.has(role.id)}">${saved.has(role.id) ? 'Saved' : 'Save role'}</button>
      </div>
      <h2 tabindex="-1" id="placement-role-title">${html(role.title)}</h2>
      <p class="placement-meta">${employment(role)}${role.location ? ' · '+html(role.location) : ''} · ${role.source === 'live' ? 'Employer listing' : role.source === 'imported' ? 'Your saved posting' : 'Example role'}</p>
      <div class="placement-fit-head"><h3>${matchesPosting ? 'Skills recognized in your posting' : 'Skills to prepare'}</h3><button class="placement-text" id="placement-assess">Review my evidence</button></div>
      <p class="placement-meta">${assessed ? `${fit.score}% of listed skills have self-reported evidence. ` : ''}${matchesPosting ? 'Compare these skill mentions with the full posting.' : 'Use these skills to plan your practice. Confirm requirements on the employer’s site.'}</p>
      <ul class="placement-fit">${fit.rows.map(row => `<li><div>${row.label}${row.mention ? `<small>${html(row.mention)}</small>` : ''}</div><span class="placement-status ${row.status === 'Evidence added' ? 'positive' : row.status === 'Needs practice' ? 'practice' : ''}">${row.status}</span></li>`).join('')}</ul>
      <div class="placement-actions"><button class="button" id="placement-build">Build my study plan</button>${role.url || company?.careers ? external(role.url ?? company.careers,role.url ? 'Open posting' : 'Careers page') : ''}</div>`;
  }

  function renderPlan() {
    main.querySelectorAll('[data-plan-topic]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.planTopic === activeTopic)));
    const ordered = plan?.tasks ?? [];
    const listIds = activeTopic === 'All topics' ? ordered : Object.keys(skills).filter(id => skills[id].topic === activeTopic);
    if (!listIds.length) {
      planBody.innerHTML = `<p class="placement-empty">${plan ? 'No outstanding role tasks fit this week’s plan. Open a topic to practise or adjust your study time.' : 'Build a plan from a role, or open a topic to get started.'}</p>`;
      return;
    }
    const total = ordered.reduce((sum,id) => sum + skills[id].minutes,0);
    const done = ordered.filter(id => complete.has(id)).length;
    planBody.innerHTML = `${plan ? `<p class="placement-meta placement-plan-meta">${html(plan.title)} · ${total} min planned · ${done} of ${ordered.length} complete</p>` : ''}
      <div class="placement-task-list">${listIds.map(id => {
        const item = skills[id];
        return `<details><summary><span><strong>${item.task}</strong><small>${item.topic} · ${item.minutes} min</small></span><span class="placement-status ${complete.has(id) ? 'positive' : ''}">${complete.has(id) ? 'Complete' : 'To do'}</span></summary>
          <div class="placement-task-content"><p>${item.lesson}</p><p><strong>Finish when</strong> ${item.finish}</p><div class="placement-actions">${item.href.startsWith('https:') ? external(item.href,item.resource) : `<a class="placement-text" href="${item.href}">${item.resource}</a>`}${item.practice ? `<a class="placement-text" href="${item.practice}">Open Decode challenge</a>` : ''}</div>
          <label><input type="checkbox" data-complete="${id}" ${complete.has(id) ? 'checked' : ''}> Mark task complete</label></div></details>`;
      }).join('')}</div>`;
  }

  function openDialog(title,body,submit) {
    dialog.innerHTML = `<button class="close" type="button" aria-label="Close dialog">×</button><h2 id="dialog-title">${title}</h2><form class="form">${body}</form>`;
    dialog.querySelector('.close').onclick = () => dialog.close();
    dialog.querySelector('form').onsubmit = event => {
      event.preventDefault();
      if (submit(new FormData(event.currentTarget),event.currentTarget) !== false) dialog.close();
    };
    if (!dialog.open) dialog.showModal();
  }

  function editTarget() {
    openDialog('Edit your placement target',`
      <label>Specialization<select name="discipline">${selectOptions(options,target.discipline)}</select></label>
      <label>Career stage<select name="stage">${selectOptions(['Exploring','Diploma student','Degree student','Early career','Experienced'].map(item => [item,item]),target.stage)}</select></label>
      <label>Role preference<select name="roleType">${selectOptions(Object.entries(typeLabels),target.roleType)}</select></label>
      <label>Study hours per week<input name="hours" type="number" min="1" max="30" required value="${html(target.hours)}"></label>
      <label>Preferred location or work mode<input name="location" maxlength="80" value="${html(target.location)}" placeholder="Optional"></label>
      <label>Earliest start date<input type="date" name="start" value="${html(target.start)}"></label>
      <button class="button">Save target</button>`, values => {
      Object.assign(target,Object.fromEntries(values),{hours:Number(values.get('hours'))});
      disciplineSelect.value = target.discipline;
      type = target.roleType;
      main.querySelectorAll('[data-role-type]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.roleType === type)));
      if (plan) plan.tasks = recommendedPlan(plan.role,evidence,target.hours * 60);
      save(); renderTarget(); syncSelection(); renderPlan();
    });
  }

  function editEvidence(role) {
    const {rows} = fitFor(role,evidence,resume);
    openDialog('Review your evidence',`<p>Paste résumé text to find possible mentions. Review each skill and mark where you can show a project, result, or work sample. Résumé text stays in this tab until you reload.</p>
      <label>Résumé text (optional)<textarea name="resume" maxlength="24000">${html(resume)}</textarea></label>
      ${rows.map(row => `<label>${row.label}<select name="${row.key}">${selectOptions([['','Not assessed'],['practice','Needs practice'],['added','I have evidence']],evidence[row.key] ?? '')}</select></label>`).join('')}
      <button class="button">Update role fit</button>`, values => {
      resume = values.get('resume');
      for (const row of rows) evidence[row.key] = values.get(row.key);
      if (plan) plan.tasks = recommendedPlan(plan.role,evidence,target.hours * 60);
      save(); renderList(); renderDetail(); renderPlan();
      requestAnimationFrame(() => detail.querySelector('#placement-assess')?.focus());
    });
  }

  function addPosting() {
    openDialog('Add a job posting',`<p>Paste the requirements you want to work toward. This saves one posting in this browser.</p>
      <label>Company<input name="companyName" maxlength="80" required value="${html(imported?.companyName)}"></label>
      <label>Role title<input name="title" maxlength="120" required value="${html(imported?.title)}"></label>
      <label>Role type<select name="type">${selectOptions([['job','Job'],['internship','Internship']],imported?.type ?? 'job')}</select></label>
      <label>Specialization<select name="discipline">${selectOptions(options,imported?.discipline ?? target.discipline)}</select></label>
      <label>Requirements<textarea name="requirements" maxlength="16000" required>${html(imported?.requirements)}</textarea></label>
      <button class="button">Save posting</button>`, (values,form) => {
      const fields = Object.fromEntries([...values].map(([name,value]) => [name,value.trim()]));
      const empty = ['companyName','title','requirements'].find(name => !fields[name]);
      if (empty) { form.elements[empty].value = ''; form.elements[empty].reportValidity(); return false; }
      imported = {...fields,id:'my-posting',source:'imported'};
      roles = [imported,...roles.filter(role => role.id !== imported.id)];
      clearFilters();
      selected = imported.id;
      mobileDetail = true;
      save(); syncSelection();
      requestAnimationFrame(() => detail.querySelector('h2')?.focus());
    });
  }

  function clearFilters() {
    query.value = '';
    disciplineSelect.value = '';
    type = 'all';
    category = 'All companies';
    main.querySelector('#placement-category').value = category;
    main.querySelectorAll('[data-role-type]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.roleType === type)));
    savedOnly = false;
    postingsOnly = false;
    bestFit = false;
    main.querySelector('#placement-fit-sort').setAttribute('aria-pressed','false');
    main.querySelector('#placement-posted').setAttribute('aria-pressed','false');
    main.querySelector('#placement-saved').setAttribute('aria-pressed','false');
  }

  main.querySelector('#placement-edit').onclick = editTarget;
  main.querySelector('#placement-import').onclick = addPosting;
  query.oninput = syncSelection;
  disciplineSelect.onchange = syncSelection;
  main.querySelector('#placement-category').onchange = event => { category = event.target.value; syncSelection(); };
  main.querySelector('#placement-saved').onclick = event => {
    savedOnly = !savedOnly;
    event.currentTarget.setAttribute('aria-pressed',String(savedOnly));
    syncSelection();
  };
  main.querySelector('#placement-fit-sort').onclick = event => {
    bestFit = !bestFit;
    event.currentTarget.setAttribute('aria-pressed',String(bestFit));
    renderList();
  };
  main.querySelector('#placement-posted').onclick = event => {
    postingsOnly = !postingsOnly;
    event.currentTarget.setAttribute('aria-pressed',String(postingsOnly));
    syncSelection();
  };
  main.querySelectorAll('[data-role-type]').forEach(button => button.onclick = () => {
    type = button.dataset.roleType;
    main.querySelectorAll('[data-role-type]').forEach(item => item.setAttribute('aria-pressed',String(item === button)));
    syncSelection();
  });
  list.onclick = event => {
    if (event.target.closest('#placement-clear')) { clearFilters(); syncSelection(); query.focus(); return; }
    const button = event.target.closest('[data-role]');
    if (!button) return;
    lastListFocus = selected = button.dataset.role;
    mobileDetail = true;
    list.querySelector('[aria-current]')?.removeAttribute('aria-current');
    button.setAttribute('aria-current','true');
    renderDetail();
    detail.querySelector('h2').focus();
    if (smallScreen.matches) detail.scrollIntoView({block:'start'});
  };
  detail.onclick = event => {
    const button = event.target.closest('button');
    const role = roles.find(item => item.id === selected);
    if (!button || !role) return;
    if (button.id === 'placement-back') {
      mobileDetail = false; renderDetail();
      (Array.from(list.querySelectorAll('[data-role]')).find(item => item.dataset.role === lastListFocus) ?? query).focus();
    }
    if (button.id === 'placement-bookmark') {
      if (saved.has(role.id)) saved.delete(role.id); else saved.add(role.id);
      save(); syncSelection();
      (detail.querySelector('#placement-bookmark') ?? query).focus();
    }
    if (button.id === 'placement-assess') editEvidence(role);
    if (button.id === 'placement-build') {
      plan = { role, title:role.title, tasks:recommendedPlan(role,evidence,target.hours * 60) };
      activeTopic = 'All topics';
      save(); renderPlan(); openPlan();
    }
  };
  main.querySelectorAll('[data-plan-topic]').forEach(button => button.onclick = () => {
    activeTopic = button.dataset.planTopic; renderPlan();
  });
  planBody.onchange = event => {
    const id = event.target.dataset.complete;
    if (!id) return;
    if (event.target.checked) complete.add(id); else complete.delete(id);
    save(); renderPlan();
    const checkbox = planBody.querySelector(`[data-complete="${id}"]`);
    checkbox.closest('details').open = true;
    checkbox.focus({preventScroll:true});
  };

  renderTarget(); syncSelection(); renderPlan();
  const feedStatus = main.querySelector('#placement-feed');
  void fetch('/api/placement/roles',{signal:AbortSignal.timeout(12500)}).then(async response => {
    if (!response.ok) throw new Error('Careers boards unavailable');
    const data = await response.json();
    roles.push(...data.roles);
    feedStatus.textContent = data.connected.length ? `Employer listings from ${data.connected.map(id => companyById.get(id).name).join(' and ')}. Example roles are labeled.`
      : 'Connected boards are unavailable. Browse example roles or open a careers page.';
    if (selected) renderList(); else syncSelection();
  }).catch(() => { feedStatus.textContent = 'Could not check careers boards. Browse example roles or open a careers page.'; });
}
