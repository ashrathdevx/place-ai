import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPassport } from './profile.js';
import { profilePortrait } from './profile-settings.js';

const ui = {
  html: value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
  avatar: () => '<span class="avatar">PA</span>',
  action: (url,label) => `<a href="${url}">${label}</a>`,
  stat: () => '',
  validatedUrl: url => typeof url === 'string' && url.startsWith('https://') ? url : null,
};
const user = {
  name:'Sample & Student',username:'sample_123',country:'Exampleland',college:'Example Institution',
  role:'Example Engineer',portfolio:'https://example.com',photo:'data:image/jpeg;base64,AAAA',
  email:'contact@example.com',phone:'private-phone',birthDate:'2001-01-01',postalCode:'private-postcode',
};

test('profile showcase uses saved details and excludes private fields', () => {
  const main = {};
  renderPassport(main,user,ui);
  for (const shown of ['Sample &amp; Student','@sample_123','Exampleland','Example Institution','Example Engineer','https://example.com','data:image/jpeg;base64,AAAA']) {
    assert.ok(main.innerHTML.includes(shown));
  }
  for (const value of [user.email,user.phone,user.birthDate,user.postalCode]) assert.ok(!main.innerHTML.includes(value));
});

test('visibility settings remove optional sections and the uploaded photo', () => {
  const main = {};
  renderPassport(main,{...user,showPhoto:false,showCountry:false,showProfessional:false,showCareer:false},ui);
  for (const value of [user.photo,user.country,user.college,user.role,user.portfolio]) assert.ok(!main.innerHTML.includes(value));
  assert.ok(main.innerHTML.includes('@sample_123'));
});

test('avatar rendering only accepts bounded JPEG data', () => {
  for (const photo of ['https://example.com/picture.jpg','data:image/svg+xml;base64,AAAA','data:image/jpeg;base64,AA"x','data:image/jpeg;base64,'+'A'.repeat(180001)]) {
    assert.match(profilePortrait({name:'Sample',photo},ui), /^<span/);
  }
  assert.match(profilePortrait(user,ui), /^<img/);
});

test('empty profiles omit the About panel and extra details disclosure', () => {
  const main = {};
  renderPassport(main,{},ui);
  assert.match(main.innerHTML, /<h1 id="profile-title">My profile<\/h1>/);
  assert.doesNotMatch(main.innerHTML, /<h2>About<\/h2>|<summary>Profile details<\/summary>|Open to internships/);
});

test('common details appear once with less common information in a disclosure', () => {
  const main = {};
  renderPassport(main,{...user,stage:'Student',availability:'Open to internships',degree:'Example Diploma'},ui);
  assert.equal(main.innerHTML.match(/Example Institution/g)?.length,1);
  assert.match(main.innerHTML, /class="profile-meta"[^>]*>.*Open to internships/);
  assert.match(main.innerHTML, /<details class="profile-details"><summary>Profile details<\/summary>.*Example Diploma/s);
});
