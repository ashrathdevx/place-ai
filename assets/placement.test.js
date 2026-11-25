import assert from 'node:assert/strict';
import test from 'node:test';
import { examples, fitFor, recommendedPlan, roleSkills, skills } from './placement-data.js';
import { normalizeJobs } from '../placement-feed.mjs';

test('the explorer includes both jobs and internships across companies', () => {
  assert.ok(examples.some(role => role.type === 'job'));
  assert.ok(examples.some(role => role.type === 'internship'));
  assert.equal(new Set(examples.map(role => role.id)).size,examples.length);
});

test('a posted requirement replaces the generic benchmark and a resume mention stays unconfirmed', () => {
  const role = {discipline:'software',requirements:'SQL, automated tests'};
  assert.deepEqual(roleSkills(role),['sql','tests']);
  const fit = fitFor(role,{tests:'practice'},'Created SQL queries');
  assert.equal(fit.rows[0].status,'Résumé mention');
  assert.equal(fit.rows[1].status,'Needs practice');
  assert.equal(fit.score,0);
  assert.equal(fitFor(role,{sql:'added'}).score,50);
});

test('weekly plans prioritize practice gaps and stay within the budget', () => {
  const role = examples[0];
  const plan = recommendedPlan(role,{arrays:'added',networks:'practice'},80);
  assert.deepEqual(plan,['networks','oop']);
  assert.ok(plan.reduce((sum,id) => sum + skills[id].minutes,0) <= 80);
  assert.deepEqual(recommendedPlan(role,Object.fromEntries(roleSkills(role).map(id => [id,'added'])),200),[]);
});

test('board normalization distinguishes internships and skips unrelated or prospect posts', () => {
  const roles = normalizeJobs({id:'gitlab',board:'gitlab'},[
    {id:12,internal_job_id:1,title:'Software Engineer Intern',absolute_url:'https://unrelated.example/'},
    {id:13,internal_job_id:2,title:'Backend Engineer'},
    {id:14,internal_job_id:3,title:'Internal Communications Manager'},
    {id:15,internal_job_id:null,title:'Backend Engineer'},
  ]);
  assert.deepEqual(roles.map(role => role.type),['internship','job']);
  assert.equal(roles[0].url,'https://job-boards.greenhouse.io/gitlab/jobs/12');
});
