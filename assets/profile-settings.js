const profileSections = [
  ['identity','Identity','Photo, name and username','person'],
  ['personal','Personal details','Contact and regional preferences','globe'],
  ['professional','Education & career','Background, target role and technical skills','work'],
  ['career','Links & evidence','Portfolio, LinkedIn and résumé','target'],
  ['privacy','Privacy','Profile visibility and connections','lock'],
];
const settingsIcons = {
  person:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8v-2a7 7 0 0 1 14 0v2',
  globe:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3a16 16 0 0 1 0 18m0-18a16 16 0 0 0 0 18',
  work:'M3 7h18v13H3zM8 7V4h8v3M3 12h18',
  target:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  lock:'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4m-4 4v2',
};
function settingsIcon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${settingsIcons[name]}"/></svg>`;
}
const stages = ['Student','Working professional','Recent graduate','Independent learner','Other'];
const availability = ['Open to internships','Open to full-time roles','Exploring opportunities','Unavailable'];
const photos = new Set(['image/jpeg','image/png','image/webp']);
const photoLimit = 5*1024*1024;
const resumeLimit = 2*1024*1024;

export function profilePortrait(user,ui) {
  const url = user.photo;
  if (typeof url === 'string' && url.length <= 180000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(url)) {
    return `<img class="avatar photo-avatar" src="${url}" alt="">`;
  }
  return ui.avatar(user.name || 'Place AI');
}

function control(ui,label,key,attributes='') {
  return `<label>${label}<input name="${key}" value="${ui.html(ui.user[key] ?? '')}" ${attributes}></label>`;
}
function selection(ui,label,key,choices) {
  const current = ui.user[key] ?? '';
  const options = current && !choices.includes(current) ? [current,...choices] : choices;
  return `<label>${label}<select name="${key}"><option value="">Select an option</option>${options.map(option =>
    `<option ${option === current ? 'selected' : ''}>${ui.html(option)}</option>`).join('')}</select></label>`;
}
function check(ui,label,key) {
  return `<label class="visibility-toggle"><input name="${key}" type="checkbox" ${ui.user[key] !== false ? 'checked' : ''}><span>${label}</span></label>`;
}

function fieldsFor(tab,ui) {
  const input = (label,key,attributes) => control(ui,label,key,attributes);
  const select = (label,key,options) => selection(ui,label,key,options);
  const today = new Date().toISOString().slice(0,10);
  const year = Number(today.slice(0,4));
  if (tab === 'identity') return `<div class="photo-settings">
    <div id="photo-preview">${profilePortrait(ui.user,ui)}</div><div><h3>Profile photo</h3><p>JPEG, PNG or WebP up to 5 MB. The photo is cropped to a square.</p>
    <div class="photo-actions"><label class="button secondary small photo-picker">Choose photo<input type="file" id="photo-file" aria-label="Choose profile photo" accept="image/jpeg,image/png,image/webp"></label>
    <button class="button secondary small" id="remove-photo" type="button" ${ui.user.photo ? '' : 'disabled'}>Remove</button></div>
    <p id="photo-status" role="status"></p></div></div>
    <div class="settings-fields">${input('Display name','name','required maxlength="70" autocomplete="name"')}${input('Username','username','minlength="3" maxlength="30" pattern="[A-Za-z0-9_]{3,30}" autocomplete="username" aria-describedby="handle-help"')}
    <p class="settings-hint full-field" id="handle-help">Use 3–30 letters, numbers or underscores.</p>
    <label class="full-field">Short bio<textarea name="bio" maxlength="240" rows="3">${ui.html(ui.user.bio ?? '')}</textarea></label></div>`;
  if (tab === 'personal') return `<div class="settings-fields">
    ${input('Country or region','country','maxlength="70" autocomplete="country-name"')}${input('Time zone','timezone','maxlength="80" list="profile-timezones" placeholder="e.g. Asia/Kolkata"')}
    <datalist id="profile-timezones">${(Intl.supportedValuesOf?.('timeZone') ?? []).concat(['UTC','Asia/Kolkata']).map(value => `<option value="${value}"></option>`).join('')}</datalist>
    ${input('Contact email','email','type="email" maxlength="120" autocomplete="email"')}${input('Phone number','phone','type="tel" maxlength="35" autocomplete="tel"')}
    ${input('Date of birth','birthDate',`type="date" max="${today}" autocomplete="bday"`)}${input('Pronouns','pronouns','maxlength="35"')}
    ${input('Postal code','postalCode','maxlength="18" autocomplete="postal-code"')}
    </div><p class="settings-note">${settingsIcon('lock')} Contact details, date of birth, pronouns, postal code and time zone are saved on this device. Country or region can appear on your profile.</p>`;
  if (tab === 'professional') return `<div class="settings-fields">
    ${select('Career stage','stage',stages)}${input('Target role','role','maxlength="70" placeholder="e.g. Software developer"')}${select('Availability','availability',availability)}${input('Institution or employer','college','maxlength="100" autocomplete="organization"')}
    ${input('Degree or qualification','degree','maxlength="100"')}${input('Graduation year','graduationYear',`type="number" min="1900" max="${year+20}" step="1"`)}
    ${input('CGPA out of 10','cgpa','type="number" min="0" max="10" step="0.01"')}${input('Coding since','codingSince',`type="number" min="1900" max="${year}" step="1"`)}
    ${select('Preferred programming language','preferredLanguage',['C++','Python','Java','JavaScript','TypeScript','C','SQL','Other'])}${input('Other programming languages','languages','maxlength="100" placeholder="e.g. Python, SQL"')}
    </div>`;
  if (tab === 'career') return `<div class="settings-fields">
    ${input('LinkedIn profile','linkedin','type="url" maxlength="500" placeholder="https://www.linkedin.com/in/…"')}${input('Portfolio website','portfolio','type="url" maxlength="500" placeholder="https://…"')}
    </div><div class="resume-settings"><div><h3>Résumé</h3><p id="resume-status" role="status">Attach a PDF up to 2 MB for your own use.</p></div><div class="photo-actions">
    <label class="button secondary small photo-picker">Choose PDF<input type="file" id="resume-file" aria-label="Choose résumé PDF" accept="application/pdf,.pdf"></label>
    <button class="button secondary small" id="download-resume" type="button" hidden>Download</button><button class="button secondary small" id="remove-resume" type="button" hidden>Remove</button></div></div>`;
  return `<div class="visibility-options">
    ${check(ui,'Show my photo', 'showPhoto')}${check(ui,'Show country or region', 'showCountry')}
    ${check(ui,'Show education and work details', 'showProfessional')}${check(ui,'Show career preferences and links', 'showCareer')}
    </div><p class="settings-note">${settingsIcon('lock')} This profile is stored in this browser. These settings control what appears in your profile showcase on this device.</p>
    <a href="/profile#connections" class="button secondary small">Manage connected platforms</a>`;
}
function settingsView(user,ui) {
  const template = {...ui,user};
  return `<div class="wrap page profile-settings"><a href="/profile" class="settings-back">← Back to my profile</a>
    <div class="settings-title"><h1>Profile settings</h1><p>Update the details you want to showcase.</p></div>
    <div class="settings-layout"><aside class="panel settings-sidebar">
    <div class="settings-identity">${profilePortrait(user,ui)}<div><strong id="settings-name">${ui.html(user.name || 'Your profile')}</strong><p id="settings-handle">${ui.html(user.username ? '@'+user.username : 'Skill Passport')}</p></div></div>
    <nav aria-label="Profile settings">${profileSections.map(([key,label,description,icon],index) => `<button type="button" data-settings-section="${key}" aria-controls="settings-${key}" ${index === 0 ? 'aria-current="true"' : ''}>${settingsIcon(icon)}<span><strong>${label}</strong><small>${description}</small></span></button>`).join('')}</nav>
    </aside><div class="settings-forms">${profileSections.map(([key,label,description],index) => `<section class="panel settings-card" id="settings-${key}" aria-labelledby="heading-${key}" ${index === 0 ? '' : 'hidden'}>
    <header><h2 id="heading-${key}">${label}</h2><p>${description}</p></header>
    <form data-section="${key}"><div class="settings-body">${fieldsFor(key,template)}</div>
    <footer><p class="settings-feedback" role="status"></p><button class="button">Save changes</button></footer></form></section>`).join('')}</div></div></div>`;
}
async function resizePortrait(file) {
  if (!photos.has(file.type) || file.size > photoLimit || !file.size) throw new Error('Choose a JPEG, PNG or WebP image up to 5 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    const side = Math.min(bitmap.width,bitmap.height);
    context.fillStyle = '#f0f4fe';
    context.fillRect(0,0,256,256);
    context.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,256,256);
    return canvas.toDataURL('image/jpeg',.82);
  } finally { bitmap.close(); }
}
function resumeStore(mode,operation) {
  return new Promise((resolve,reject) => {
    const open = indexedDB.open('place-ai-profile',1);
    open.onupgradeneeded = () => open.result.createObjectStore('files');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction('files',mode);
      const request = operation(transaction.objectStore('files'));
      transaction.oncomplete = () => { db.close(); resolve(request.result); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
  });
}
function attachResume(main) {
  const input = main.querySelector('#resume-file');
  const status = main.querySelector('#resume-status');
  const download = main.querySelector('#download-resume');
  const remove = main.querySelector('#remove-resume');
  const hint = 'Attach a PDF up to 2 MB for your own use.';
  let selected = null;
  const update = file => {
    selected = file;
    status.textContent = file ? file.name+' · Saved on this device' : hint;
    download.hidden = remove.hidden = !file;
  };
  let interaction = false;
  resumeStore('readonly',store => store.get('resume')).then(file => { if (!interaction) update(file); }).catch(() => {});
  input.onchange = async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    interaction = true;
    input.disabled = true;
    remove.disabled = true;
    try {
      if (!file.size || file.size > resumeLimit || await file.slice(0,5).text() !== '%PDF-') throw new Error('Choose a PDF up to 2 MB.');
      const entry = { name:file.name, data:new Blob([file],{type:'application/pdf'}) };
      await resumeStore('readwrite',store => store.put(entry,'resume'));
      update(entry);
    } catch (error) { status.textContent = error instanceof Error ? error.message : 'Could not save this PDF.'; }
    finally { input.disabled = false; remove.disabled = false; }
  };
  download.onclick = () => {
    if (!selected) return;
    const url = URL.createObjectURL(selected.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = selected.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url),30000);
  };
  remove.onclick = async () => {
    interaction = true;
    remove.disabled = input.disabled = true;
    try {
      await resumeStore('readwrite',store => store.delete('resume'));
      update(null);
      status.textContent = 'Résumé removed from this device.';
    } catch { status.textContent = 'Could not remove the résumé.'; }
    finally { remove.disabled = input.disabled = false; }
  };
}

export function openProfileSettings(main,state,ui,save) {
  main.innerHTML = settingsView(state.profile,ui);
  const navigation = main.querySelector('.settings-sidebar nav');
  const activate = target => {
    for (const button of navigation.querySelectorAll('button')) {
      const active = button.dataset.settingsSection === target;
      main.querySelector('#'+button.getAttribute('aria-controls')).hidden = !active;
      if (active) button.setAttribute('aria-current','true');
      else button.removeAttribute('aria-current');
    }
  };
  navigation.onclick = event => {
    const button = event.target.closest('[data-settings-section]');
    if (button) activate(button.dataset.settingsSection);
  };
  const photo = main.querySelector('#photo-file');
  const remove = main.querySelector('#remove-photo');
  const photoStatus = main.querySelector('#photo-status');
  const photoPreview = main.querySelector('#photo-preview');
  const identity = main.querySelector('.settings-identity');
  let portrait = state.profile.photo || '';
  const update = () => {
    photoPreview.innerHTML = profilePortrait({...state.profile,photo:portrait},ui);
    remove.disabled = !portrait;
  };
  let selection = 0;
  photo.onchange = async () => {
    const file = photo.files?.[0];
    photo.value = '';
    if (!file) return;
    const current = ++selection;
    const submit = main.querySelector('[data-section="identity"] button:not([type])');
    submit.disabled = true;
    photoStatus.textContent = 'Preparing photo…';
    try {
      const resized = await resizePortrait(file);
      if (current !== selection) return;
      portrait = resized;
      update();
      photoStatus.textContent = 'Ready to save.';
    } catch (error) {
      if (current === selection) photoStatus.textContent = error instanceof Error ? error.message : 'Could not open this photo.';
    } finally {
      if (current === selection) submit.disabled = false;
    }
  };
  remove.onclick = () => {
    selection++;
    portrait = '';
    update();
    main.querySelector('[data-section="identity"] button:not([type])').disabled = false;
    photoStatus.textContent = 'Save changes to remove your photo.';
  };
  for (const form of main.querySelectorAll('[data-section]')) form.onsubmit = event => {
    event.preventDefault();
    const feedback = form.querySelector('.settings-feedback');
    const values = Object.fromEntries([...new FormData(form)].map(([key,value]) => [key,String(value).trim()]));
    if (form.dataset.section === 'identity') {
      if (!values.name) { feedback.textContent = 'Enter a display name.'; return; }
      values.photo = portrait;
    }
    for (const key of ['linkedin','portfolio']) {
      if (values[key] && !ui.validatedUrl(values[key],key === 'linkedin' ? 'LinkedIn' : undefined)) {
        feedback.textContent = key === 'linkedin' ? 'Enter an HTTPS LinkedIn profile URL.' : 'Enter an HTTPS portfolio URL.';
        return;
      }
    }
    for (const checkbox of form.querySelectorAll('input[type="checkbox"]')) values[checkbox.name] = checkbox.checked;
    const previous = state.profile;
    state.profile = {...previous,...values};
    if (!save()) {
      state.profile = previous;
      feedback.textContent = 'Browser storage is unavailable. Your changes could not be saved.';
      return;
    }
    feedback.textContent = 'Changes saved.';
    if (form.dataset.section === 'identity') {
      identity.querySelector('.avatar').outerHTML = profilePortrait(state.profile,ui);
      main.querySelector('#settings-name').textContent = state.profile.name;
      main.querySelector('#settings-handle').textContent = state.profile.username ? '@'+state.profile.username : 'Skill Passport';
      photoStatus.textContent = '';
    }
  };
  attachResume(main);
}
