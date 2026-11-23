import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const image = process.env.JUDGE_IMAGE ?? 'place-ai-judge:local';
const common = [
  '--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges',
  '--pids-limit=32','--cpus=1','--user=65534:65534','--ipc=none',
  '--ulimit=nofile=128:128','--ulimit=fsize=8388608:8388608',
  '--log-driver=none','--tmpfs=/tmp:rw,exec,nosuid,nodev,size=24m,mode=1777',
];
const compileScript = {
  cpp:'cat > /tmp/code.cpp && g++ -O2 -std=c++20 -pipe /tmp/code.cpp -o /tmp/program && base64 -w0 /tmp/program',
  python:'cat > /tmp/code.py && python3 -m py_compile /tmp/code.py',
};
const runScript = {
  cpp:'IFS= read -r package && printf %s "$package" | base64 -d > /tmp/program && chmod 500 /tmp/program && exec timeout --kill-after=.2s "$1" /tmp/program',
  python:'IFS= read -r package && printf %s "$package" | base64 -d > /tmp/code.py && exec timeout --kill-after=.2s "$1" python3 -I /tmp/code.py',
};

function docker(args, { input = '', limit = 65536, wall = 10000, onLimit = () => {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { stdio:['pipe','pipe','pipe'] });
    const streams = { stdout:[], stderr:[] };
    let bytes = 0;
    let timedOut = false;
    let overflow = false;
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      onLimit();
      child.kill('SIGKILL');
    };
    const timer = setTimeout(() => { timedOut = true; stop(); }, wall);
    for (const key of Object.keys(streams)) child[key].on('data', chunk => {
      bytes += chunk.length;
      if (bytes > limit) {
        overflow = true;
        stop();
      } else streams[key].push(chunk);
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => {
      clearTimeout(timer);
      resolve({ code, timedOut, overflow, stdout:Buffer.concat(streams.stdout).toString(), stderr:Buffer.concat(streams.stderr).toString() });
    });
  });
}

async function isolated(script, input, memory, wall, limit, arg = '') {
  const name = 'place-ai-run-' + randomUUID();
  const start = performance.now();
  try {
    const run = await docker(['run','--pull=never','--name',name,'--label=place-ai.runner=true','-i',...common,
      `--memory=${memory}m`,`--memory-swap=${memory}m`,image,'/bin/sh','-c',script,'place-judge',arg],
      { input,limit,wall, onLimit:() => { void docker(['kill',name],{wall:2500}).catch(() => {}); } });
    const runtime = Math.round(performance.now() - start);
    if (run.code === 125 || run.code === 126 || run.code === 127) {
      // Check container state so an ordinary user exit in this range is still a runtime error.
      const state = await docker(['inspect','--format','{{.State.Status}}',name]);
      if (state.code !== 0 || state.stdout.trim() !== 'exited') throw new Error('Judge container failed to start');
    }
    const memoryState = await docker(['inspect','--format','{{.State.OOMKilled}}',name], {wall:3000});
    return { ...run, oom:memoryState.stdout.trim() === 'true', runtime };
  } finally {
    await docker(['rm','-f',name],{wall:5000}).catch(() => {});
  }
}

export async function compile(language, code) {
  const result = await isolated(compileScript[language],code,256,15000,1024*1024);
  if (result.code !== 0 || result.timedOut || result.overflow) {
    return { error:result.timedOut ? 'Compilation timed out.' : result.overflow ? 'Compilation output limit exceeded.' : result.stderr.slice(0,4000) || 'Compilation failed.' };
  }
  return { program:language === 'cpp' ? result.stdout.trim() : Buffer.from(code).toString('base64') };
}

export async function runCase(language, program, input, memory, timeMs) {
  const result = await isolated(runScript[language],`${program}\n${input}`,memory,timeMs+4000,65536,`${timeMs/1000}s`);
  return { ...result, timedOut:result.timedOut || (result.code === 124 || result.code === 137) };
}
