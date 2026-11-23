import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const key = process.env.EVIDENCE_SESSION_SECRET || randomBytes(32);
const prefix = '/api/evidence';
const configs = {
  github: {
    env:'GITHUB', auth:'https://github.com/login/oauth/authorize',
    token:'https://github.com/login/oauth/access_token', scope:'',
  },
  linkedin: {
    env:'LINKEDIN', auth:'https://www.linkedin.com/oauth/v2/authorization',
    token:'https://www.linkedin.com/oauth/v2/accessToken', scope:'openid profile',
  },
};
function configuration(provider) {
  const config = configs[provider];
  const id = process.env[config.env + '_CLIENT_ID'];
  const secret = process.env[config.env + '_CLIENT_SECRET'];
  try {
    const url = new URL(process.env.EVIDENCE_PUBLIC_ORIGIN);
    const loopback = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
        url.origin !== process.env.EVIDENCE_PUBLIC_ORIGIN ||
        (process.env.EVIDENCE_SESSION_SECRET?.length ?? 0) < 32 || !id || !secret) return null;
    return { ...config, id, secret, callback:url.origin+prefix+'/'+provider+'/callback', secure:url.protocol === 'https:' };
  } catch {
    return null;
  }
}
const mac = value => createHmac('sha256',key).update(value).digest('base64url');
function seal(name, data, lifetime) {
  const payload = Buffer.from(JSON.stringify({ data, expires:Date.now()+lifetime*1000 })).toString('base64url');
  return payload+'.'+mac(name+'.'+payload);
}
function cookie(req,name) {
  const raw = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(name+'='))?.slice(name.length+1);
  if (!raw || raw.length > 3900) return null;
  const [payload, signature, rest] = raw.split('.');
  if (!payload || !signature || rest !== undefined) return null;
  try {
    const expected = Buffer.from(mac(name+'.'+payload));
    const supplied = Buffer.from(signature);
    if (expected.length !== supplied.length || !timingSafeEqual(expected,supplied)) return null;
    const parsed = JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    return parsed.expires > Date.now() ? parsed.data : null;
  } catch {
    return null;
  }
}
function setCookie(res,name,data,lifetime,secure) {
  const value = lifetime ? seal(name,data,lifetime) : '';
  res.appendHeader('Set-Cookie',`${name}=${value}; Path=${prefix}; HttpOnly; SameSite=Lax; Max-Age=${lifetime}${secure ? '; Secure' : ''}`);
}
const snapshotName = provider => 'place_engine_'+provider;
const flowName = provider => 'place_oauth_'+provider;
const secureContext = () => process.env.EVIDENCE_PUBLIC_ORIGIN?.startsWith('https://') || process.env.COOKIE_SECURE === '1';
const reply = (res,status,data) => {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(data));
};
const redirect = (res,location) => {
  res.writeHead(303,{Location:location,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  res.end();
};
const random = () => randomBytes(32).toString('base64url');
const clipped = (value,limit=80) => typeof value === 'string' ? value.slice(0,limit) : '';
async function upstream(url, options={}) {
  const response = await fetch(url,{ ...options, redirect:'error', signal:AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Provider request failed');
  return response.json();
}
function connect(res,provider,config) {
  const state = random();
  const verifier = random();
  setCookie(res,flowName(provider),{ state, verifier },600,config.secure);
  const url = new URL(config.auth);
  for (const [name,value] of Object.entries({client_id:config.id,redirect_uri:config.callback,scope:config.scope,state,response_type:'code'})) {
    url.searchParams.set(name,value);
  }
  if (provider === 'github') {
    url.searchParams.set('code_challenge',createHash('sha256').update(verifier).digest('base64url'));
    url.searchParams.set('code_challenge_method','S256');
  }
  redirect(res,url.href);
}
async function verifiedAccount(provider,token) {
  const headers = {Authorization:`Bearer ${token}`,Accept:'application/json'};
  const syncedAt = new Date().toISOString();
  if (provider === 'linkedin') {
    const person = await upstream('https://api.linkedin.com/v2/userinfo',{headers});
    if (!person.sub || !person.name) throw new Error('Missing member information');
    return { name:clipped(person.name),syncedAt };
  }
  const result = await upstream('https://api.github.com/graphql',{
    method:'POST', headers:{...headers,'Content-Type':'application/json'},
    body:JSON.stringify({query:`query { viewer { login repositories(first: 1, privacy: PUBLIC, ownerAffiliations: OWNER) { totalCount }
      contributionsCollection { totalCommitContributions totalPullRequestContributions } } }`}),
  });
  const account = result.data?.viewer;
  if (!account?.login || result.errors?.length) throw new Error('Missing GitHub activity');
  return { handle:clipped(account.login),syncedAt,repositories:account.repositories.totalCount,
    commits:account.contributionsCollection.totalCommitContributions,pullRequests:account.contributionsCollection.totalPullRequestContributions };
}
async function callback(req,res,provider,config,url) {
  const attempt = cookie(req,flowName(provider));
  setCookie(res,flowName(provider),null,0,config.secure);
  const code = url.searchParams.get('code');
  if (!attempt || attempt.state !== url.searchParams.get('state') || !code || code.length > 4096) {
    return redirect(res,'/profile?connection=cancelled#connections');
  }
  try {
    const body = new URLSearchParams({ client_id:config.id,client_secret:config.secret,code,redirect_uri:config.callback,grant_type:'authorization_code' });
    if (provider === 'github') body.set('code_verifier',attempt.verifier);
    const token = await upstream(config.token,{method:'POST',headers:{Accept:'application/json'},body});
    if (!token.access_token) throw new Error('Missing authorization');
    const snapshot = await verifiedAccount(provider,token.access_token);
    setCookie(res,snapshotName(provider),snapshot,60*60*24*30,config.secure);
    redirect(res,'/profile?connection=connected#connections');
  } catch {
    redirect(res,'/profile?connection=failed#connections');
  }
}

export function summarizeSubmissions(submissions) {
  const solved = new Set();
  const topics = new Map();
  for (const entry of submissions) {
    const problem = entry.problem;
    if (entry.verdict !== 'OK' || !Number.isInteger(problem?.contestId) || typeof problem.index !== 'string') continue;
    const id = problem.contestId+':'+problem.index;
    if (solved.has(id)) continue;
    solved.add(id);
    for (const tag of new Set(problem.tags ?? [])) {
      if (typeof tag === 'string' && tag.length <= 30) topics.set(tag,(topics.get(tag) ?? 0)+1);
    }
  }
  return { solved:solved.size, topics:[...topics].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,8) };
}
let codeforcesBusy = false;
let nextQuery = 0;
const results = new Map();
async function codeforces(req,res,url) {
  const handle = url.searchParams.get('handle') ?? '';
  if (!/^[\w.-]{3,24}$/.test(handle)) return reply(res,400,{error:'Enter a Codeforces handle.'});
  const cached = results.get(handle.toLowerCase());
  if (cached && Date.now()-Date.parse(cached.syncedAt) < 600000) {
    setCookie(res,snapshotName('codeforces'),cached,60*60*24*30,secureContext());
    return reply(res,200,{snapshot:cached});
  }
  if (codeforcesBusy || Date.now() < nextQuery) return reply(res,429,{error:'Codeforces is busy. Try again in a few seconds.'});
  codeforcesBusy = true;
  try {
    const info = await upstream('https://codeforces.com/api/user.info?'+new URLSearchParams({handles:handle,checkHistoricHandles:'false'}));
    await delay(2100);
    const activity = await upstream('https://codeforces.com/api/user.status?'+new URLSearchParams({handle,from:'1',count:'250'}));
    if (info.status !== 'OK' || activity.status !== 'OK' || !info.result?.[0] || !Array.isArray(activity.result)) throw new Error('Unavailable');
    const account = info.result[0];
    const snapshot = { ...summarizeSubmissions(activity.result), handle:clipped(account.handle),
      rating:account.rating ?? null, maxRating:account.maxRating ?? null, window:activity.result.length,syncedAt:new Date().toISOString() };
    if (results.size >= 100) results.delete(results.keys().next().value);
    results.set(handle.toLowerCase(),snapshot);
    setCookie(res,snapshotName('codeforces'),snapshot,60*60*24*30,secureContext());
    reply(res,200,{snapshot});
  } catch {
    reply(res,502,{error:'Codeforces could not return this profile right now. Check the handle and try again.'});
  } finally {
    nextQuery = Date.now()+2100;
    codeforcesBusy = false;
  }
}
export async function handleEvidence(req,res,path) {
  const url = new URL(req.url,'http://localhost');
  if (path === prefix+'/connections' && req.method === 'GET') {
    return reply(res,200,{ configured:{ github:!!configuration('github'),linkedin:!!configuration('linkedin') },
      snapshots:Object.fromEntries(['github','linkedin','codeforces'].map(provider => [provider,cookie(req,snapshotName(provider))])) });
  }
  const [provider,action,extra] = path.slice(prefix.length+1).split('/');
  const validProvider = Object.hasOwn(configs,provider);
  if (extra !== undefined) return reply(res,404,{error:'Unknown evidence endpoint.'});
  if (req.method === 'POST' && req.headers['x-place-evidence'] === '1' &&
      !['cross-site','same-site'].includes(req.headers['sec-fetch-site'])) {
    if (action === 'disconnect' && (validProvider || provider === 'codeforces')) {
      setCookie(res,snapshotName(provider),null,0,secureContext());
      return reply(res,200,{removed:true});
    }
    if (provider === 'codeforces' && action === 'import') return codeforces(req,res,url);
  }
  if (validProvider && req.method === 'GET' && ['connect','callback'].includes(action)) {
    const config = configuration(provider);
    if (!config) return redirect(res,'/profile?connection=setup#connections');
    return action === 'connect' ? connect(res,provider,config) : callback(req,res,provider,config,url);
  }
  reply(res,404,{error:'Unknown evidence endpoint.'});
}
