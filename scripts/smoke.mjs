import assert from 'node:assert/strict';
import { bank } from '../judge/problems.mjs';

const base = process.env.PLACE_URL ?? 'http://127.0.0.1:4173';
const read = async (path, options) => {
  const response = await fetch(base+path,options);
  assert.ok(response.ok,`${path} returned ${response.status}`);
  return response;
};
assert.match(await (await read('/')).text(),/Place AI/);
assert.match(await (await read('/arena/problems/array-sum')).text(),/Place AI/);
assert.equal((await fetch(base+'/arena/motion')).status,404);
const bundle = await (await read('/vendor/arena.js')).text();
assert.match(bundle,/Decode the problem/);
assert.doesNotMatch(bundle,/Loading patterns/);
const problems = await (await read('/api/problems')).json();
assert.deepEqual(problems.map(problem => problem.slug).sort(),bank.map(problem => problem.slug).sort());
assert.ok(problems.every(problem => problem.topics.length));
await Promise.all(problems.map(async ({slug}) => {
  const problem = await (await read(`/api/problems/${slug}`)).json();
  assert.equal(problem.decoding.length,3,slug);
  assert.ok(problem.decoding.every(({label,text}) => label && text),slug);
}));
const contestProblem = await (await read('/api/problems/array-sum?contest=foundations-sprint')).json();
assert.equal(contestProblem.decoding,undefined);
assert.equal(contestProblem.editorial_md,undefined);
const ledger = await (await read('/api/problems/credit-ledger')).json();
assert.match(ledger.statement_md,/## Constraints/);
assert.equal(ledger.decoding[1].label,'Walk through an example');
const medium = await (await read('/api/problems/shuttle-budget')).json();
assert.equal(medium.decoding[1].label,'Find the bottleneck');
const hard = await (await read('/api/problems/matrix-fibonacci')).json();
assert.equal(hard.decoding[1].label,'Find what stays true');
assert.equal(ledger.samples.length,2);
assert.ok(ledger.samples.every(sample => sample.explanation && !sample.input_url));
const detail = await (await read('/api/problems/array-sum')).json();
assert.equal(detail.samples.length,1);
assert.equal(detail.samples[0].output.trim(),'15');
assert.equal((await (await read('/api/contests/foundations-sprint')).json()).problems.length,3);

const start = await read('/api/session');
const cookie = start.headers.get('set-cookie').split(';')[0];
async function judge(payload, verdict) {
  const response = await read('/api/submissions',{
    method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},
    body:JSON.stringify({slug:'array-sum',language:'python',...payload}),
  });
  assert.equal(response.status,202);
  const {id} = await response.json();
  const endpoint = `/api/submissions/${id}/events`;
  const stranger = await fetch(base+endpoint);
  assert.equal(stranger.status,404);
  const events = await read(endpoint,{headers:{Cookie:cookie},signal:AbortSignal.timeout(70000)});
  const records = (await events.text()).split('\n')
    .filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)));
  assert.ok(records.length,'Received at least one SSE event');
  const final = records.at(-1);
  assert.equal(final.status,'FINISHED');
  assert.equal(final.verdict,verdict,JSON.stringify(final));
  return final;
}
await judge({code:'import sys\na=list(map(int,sys.stdin.read().split()))\nprint(sum(a[1:]))',contest:'foundations-sprint'},'AC');
await judge({code:'print(0)'},'WA');
await judge({code:'def bad syntax'},'CE');
await judge({code:'while True: pass'},'TLE');
const custom = await judge({language:'cpp',code:'#include <iostream>\nint main(){int x; std::cin >> x; std::cout << x*2;}',customInput:'7'},'RUN_OK');
assert.equal(custom.output.trim(),'14');
const history = await (await read('/api/submissions?problem=array-sum',{headers:{Cookie:cookie}})).json();
assert.equal(history.length,5);
await judge({slug:'credit-ledger',code:`
import sys
it = iter(map(int, sys.stdin.buffer.read().split()))
n, q = next(it), next(it)
prefix = [0]
for _ in range(n):
    prefix.append(prefix[-1] + next(it))
for _ in range(q):
    left, right = next(it), next(it)
    print(prefix[right] - prefix[left - 1])
`},'AC');
const standings = (await (await read('/api/contests/foundations-sprint')).json()).standings;
assert.equal(standings[0]?.score,1);
const settingsPage = await (await read('/profile/edit')).text();
assert.match(settingsPage,/assets\/app\.js/);
assert.match(await (await read('/assets/profile-settings.js')).text(),/Profile settings/);
const evidence = await (await read('/api/evidence/arena',{headers:{Cookie:cookie}})).json();
assert.equal(evidence.solved,2);
assert.equal(evidence.python,2);
assert.equal(evidence.accepted,2);
assert.equal(evidence.graded,5);
assert.equal(evidence.activity.reduce((sum,day) => sum+day.count,0),5);
const userProblems = await (await read('/api/problems',{headers:{Cookie:cookie}})).json();
assert.deepEqual(userProblems.filter(problem => problem.solved).map(problem => problem.slug),['array-sum','credit-ledger']);
const visitorProblems = await (await read('/api/problems')).json();
assert.ok(visitorProblems.every(problem => !problem.solved));
const connections = await (await read('/api/evidence/connections')).json();
assert.equal(connections.snapshots.github,null);
const disconnected = await read('/api/evidence/github/disconnect',{method:'POST',headers:{'x-place-evidence':'1'}});
assert.equal((await disconnected.json()).removed,true);
console.log('Arena smoke passed: routes, isolation of user history, SSE, AC, WA, CE, TLE, C++ custom input and contest score.');
