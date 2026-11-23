import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { decodeChallenges } from './decode-challenges.mjs';
import { publicProblem, ordinalIsSample } from './public-catalog.mjs';

const execute = promisify(execFile);
const languages = {
  c:{ command:process.env.CC || 'cc', standard:'c17', extension:'c' },
  cpp:{ command:process.env.CXX || 'c++', standard:'c++20', extension:'cpp' },
  python:{ command:'python3', extension:'py' },
};

function run(command, args, input) {
  return new Promise((resolve,reject) => {
    const child = spawn(command,args,{timeout:3500});
    let output = '', errors = '';
    child.stdout.setEncoding('utf8').on('data',chunk => { output += chunk; });
    child.stderr.setEncoding('utf8').on('data',chunk => { errors += chunk; });
    child.stdin.on('error',() => {});
    child.on('error',reject);
    child.on('close',(code,signal) => {
      if (code !== 0) reject(new Error(`Process failed (${code ?? signal}): ${errors}`));
      else resolve(output.trim());
    });
    child.stdin.end(input);
  });
}

for (const challenge of decodeChallenges) {
  for (const [language, config] of Object.entries(languages)) {
    test(`${challenge.slug} / ${language}: complete reference and logic-bug starter`,async () => {
      const dir = await mkdtemp(join(tmpdir(),'place-decode-'));
      try {
        const {starter,reference} = challenge.programs[language];
        const detail = publicProblem(challenge);
        assert.equal(detail.starters[language],starter);
        assert.ok(!('programs' in detail || 'cases' in detail || 'editorial_md' in detail));
        assert.notEqual(starter,reference);
        async function prepare(name, source) {
          const file = join(dir,name+'.'+config.extension);
          await writeFile(file,source);
          if (!config.standard) return [config.command,[file]];
          const binary = join(dir,name);
          await execute(config.command,[file,'-O2','-std='+config.standard,'-pedantic-errors','-o',binary],{timeout:20000});
          return [binary,[]];
        }
        const [correct,buggy] = await Promise.all([prepare('fixed',reference),prepare('starter',starter)]);
        let hiddenMismatch = false;
        for (const [index,[input,expected,explanation]] of challenge.cases.entries()) {
          const [accepted,actual] = await Promise.all([run(...correct,input),run(...buggy,input)]);
          assert.equal(accepted,expected.trim(),`reference fixture ${index+1}`);
          if (!ordinalIsSample(index,explanation) && actual !== expected.trim()) hiddenMismatch = true;
        }
        assert.ok(hiddenMismatch,'starter must terminate normally and produce a wrong answer on a hidden fixture');
      } finally {
        await rm(dir,{recursive:true,force:true});
      }
    });
  }
}
