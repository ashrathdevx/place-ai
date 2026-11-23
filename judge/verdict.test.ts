import test from 'node:test';
import assert from 'node:assert/strict';
import { compareOutput, classifyRun } from './verdict.ts';

test('compares tokens and preserves token order and boundaries', () => {
  assert.equal(compareOutput('1\r\n 2  ', '1 2\n'), 'AC');
  assert.equal(compareOutput('1 2', '12'), 'WA');
  assert.equal(compareOutput('2 1', '1 2'), 'WA');
  assert.equal(compareOutput('', '  '), 'AC');
  assert.equal(compareOutput('', '0'), 'WA');
});
test('classifies resource limits and abnormal exits', () => {
  const clean = { timedOut:false, oom:false, code:0, overflow:false };
  assert.equal(classifyRun(clean), null);
  assert.equal(classifyRun({ ...clean, timedOut:true }), 'TLE');
  assert.equal(classifyRun({ ...clean, timedOut:true, oom:true }), 'MLE');
  assert.equal(classifyRun({ ...clean, code:1 }), 'RE');
  assert.equal(classifyRun({ ...clean, overflow:true }), 'RE');
});
