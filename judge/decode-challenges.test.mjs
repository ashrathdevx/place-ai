import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { decodeChallenges } from './decode-challenges.mjs';
import { publicProblem } from './public-catalog.mjs';

test('each difficulty has ten unique challenges with safe public starter data', () => {
  assert.equal(new Set(decodeChallenges.map(item => item.slug)).size,30);
  for (const difficulty of ['Easy','Medium','Hard']) {
    assert.equal(decodeChallenges.filter(item => item.difficulty === difficulty).length,10);
  }
  for (const item of decodeChallenges) {
    const preview = publicProblem(item);
    assert.equal(preview.starter,item.starter);
    assert.equal(preview.samples.length,1);
    assert.ok(!('cases' in preview || 'reference' in preview || 'editorial_md' in preview),item.slug);
  }
});

test('every Python reference passes every fixture and each starter fails a judged hidden case', () => {
  const result = spawnSync('python3',['-c',`
import json, sys
failures = []
for entry in json.load(sys.stdin):
    results = []
    for key in ("reference", "starter"):
        namespace = {"__name__": "fixture_check"}
        exec(compile(entry[key], entry["slug"], "exec"), namespace)
        passed = []
        for values, expected, is_sample in entry["cases"]:
            actual = namespace["solve"](list(map(int, values.split())))
            passed.append((str(actual) == expected.strip(), is_sample))
        results.append(passed)
    reference, starter = results
    if not all(ok for ok, _ in reference):
        failures.append((entry["slug"], "reference mismatch", reference))
    if not any(not ok and not sample for ok, sample in starter):
        failures.append((entry["slug"], "starter needs a failing hidden case"))
assert not failures, failures
`],{encoding:'utf8',timeout:10000,input:JSON.stringify(decodeChallenges.map(item => ({
    ...item,cases:item.cases.map(([input,expected,explanation]) => [input,expected,Boolean(explanation)]),
  })))});
  assert.ifError(result.error);
  assert.equal(result.status,0,result.stderr);
});
