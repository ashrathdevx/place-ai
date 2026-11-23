import assert from 'node:assert/strict';

const base = process.env.PLACE_URL ?? 'http://127.0.0.1:4173';
const read = async (path, options) => {
  const response = await fetch(base+path,options);
  assert.ok(response.ok,`${path} returned ${response.status}`);
  return response;
};
assert.match(await (await read('/')).text(),/Place AI/);
assert.match(await (await read('/arena/problems/array-sum')).text(),/Place AI/);
assert.match(await (await read('/vendor/arena.js')).text(),/Coding Arena/);
const problems = await (await read('/api/problems')).json();
assert.equal(problems.length,6);
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
const standings = (await (await read('/api/contests/foundations-sprint')).json()).standings;
assert.equal(standings[0]?.score,1);
const evidence = await (await read('/api/evidence/arena',{headers:{Cookie:cookie}})).json();
assert.equal(evidence.solved,1);
assert.equal(evidence.python,1);
assert.equal(evidence.accepted,1);
assert.equal(evidence.graded,4);
assert.equal(evidence.activity.reduce((sum,day) => sum+day.count,0),4);
const userProblems = await (await read('/api/problems',{headers:{Cookie:cookie}})).json();
assert.deepEqual(userProblems.filter(problem => problem.solved).map(problem => problem.slug),['array-sum']);
const visitorProblems = await (await read('/api/problems')).json();
assert.ok(visitorProblems.every(problem => !problem.solved));
const connections = await (await read('/api/evidence/connections')).json();
assert.equal(connections.snapshots.github,null);
const disconnected = await read('/api/evidence/github/disconnect',{method:'POST',headers:{'x-place-evidence':'1'}});
assert.equal((await disconnected.json()).removed,true);
console.log('Arena smoke passed: routes, isolation of user history, SSE, AC, WA, CE, TLE, C++ custom input and contest score.');
