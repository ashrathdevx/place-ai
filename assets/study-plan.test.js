import assert from 'node:assert/strict';
import test from 'node:test';
import { cseTrack, continueStudy, moduleProgress } from './study-plan.js';
import { catalogBySlug } from '../judge/public-catalog.mjs';
import { recordHint, recordVerdict, reviewReason, practiceState, rememberLesson, studyProgress, updatePractice } from './practice-state.js';

test('each lesson has two distinct, real Decode challenges', () => {
  const slugs = cseTrack.flatMap(module => [module.challenge,module.followUp]);
  assert.equal(new Set(slugs).size,10);
  for (const slug of slugs) assert.equal(catalogBySlug.get(slug)?.kind,'decode',slug);
});

test('acceptance, not a lesson visit, completes required repairs', () => {
  const [module] = cseTrack;
  assert.equal(moduleProgress(module,[],[]),'To do');
  assert.equal(moduleProgress(module,[],['arrays']),'In progress');
  const solved = [{slug:module.challenge,solved:true}];
  assert.equal(moduleProgress(module,solved,['arrays']),'In progress');
  assert.equal(continueStudy(solved,{last:{module:'arrays',slug:module.challenge}}).url,
    '/arena/problems/decode-highest-reading?lesson=arrays');
  assert.equal(moduleProgress(module,[...solved,{slug:module.followUp,solved:true}],['arrays']),'Complete');
});

test('fresh and resumed study links point to exact destinations', () => {
  assert.equal(continueStudy().url,'/learn?lesson=arrays');
  assert.equal(continueStudy([],{last:{module:'search',slug:'decode-first-ticket'}}).url,
    '/arena/problems/decode-first-ticket?lesson=search');
});

test('review recommendations are skippable, deduplicate repeat events, and clear on acceptance', context => {
  const entries = new Map();
  const original = Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
    getItem:key => entries.get(key) ?? null,
    setItem:(key,value) => entries.set(key,value),
  }});
  context.after(() => original ? Object.defineProperty(globalThis,'localStorage',original) : delete globalThis.localStorage);
  const slug = 'decode-last-reading';
  recordVerdict(slug,'one','WA');
  recordVerdict(slug,'one','WA');
  assert.equal(reviewReason(practiceState()[slug]),'');
  recordVerdict(slug,'two','WA');
  assert.equal(reviewReason(practiceState()[slug]),'Two or more wrong answers');
  updatePractice(slug,item => ({...item,skipped:true}));
  assert.equal(reviewReason(practiceState()[slug]),'');
  recordVerdict(slug,'three','AC');
  recordHint(slug,0);
  recordHint(slug,0);
  assert.equal(reviewReason(practiceState()[slug]),'');
  recordHint(slug,1);
  assert.equal(reviewReason(practiceState()[slug]),'Used two or more hints');
  rememberLesson('arrays',slug);
  assert.equal(studyProgress().last.slug,slug);
});
