import { companies, disciplines } from './assets/placement-data.js';

const boards = companies.filter(company => company.board);
const maxAge = 5 * 60_000;
let cached;
let pending;

export function normalizeJobs(company, jobs) {
  return jobs.flatMap(job => {
    if (!job?.internal_job_id || typeof job.title !== 'string' || !Number.isSafeInteger(job.id)) return [];
    const discipline = disciplines.find(item => item.pattern.test(job.title));
    if (!discipline) return [];
    // Use the canonical provider URL and validated ID instead of forwarding upstream URLs.
    return [{
      id:`${company.id}-${job.id}`, company:company.id, title:job.title.slice(0,160), discipline:discipline.id,
      type:/\b(?:intern(?:ship)?|co-op|apprentice(?:ship)?)\b/i.test(job.title) ? 'internship' : 'job',
      location:typeof job.location?.name === 'string' ? job.location.name.slice(0,160) : '',
      source:'live', url:`https://job-boards.greenhouse.io/${company.board}/jobs/${job.id}`,
    }];
  });
}

async function refresh() {
  const results = await Promise.allSettled(boards.map(async company => {
    const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company.board}/jobs`,{signal:AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error('Careers board unavailable');
    const payload = await response.json();
    if (!Array.isArray(payload.jobs)) throw new Error('Invalid careers board response');
    return normalizeJobs(company,payload.jobs);
  }));
  const connected = boards.filter((_,index) => results[index].status === 'fulfilled').map(company => company.id);
  const body = { connected, roles:results.flatMap(result => result.status === 'fulfilled' ? result.value : []) };
  cached = { expires:Date.now()+(connected.length === boards.length ? maxAge : 30_000), body };
  return body;
}

export async function handlePlacementFeed(req,res) {
  if (req.method !== 'GET') {
    res.writeHead(405,{Allow:'GET'});
    return res.end();
  }
  const body = cached?.expires > Date.now() ? cached.body
    : await (pending ??= refresh().finally(() => { pending = null; }));
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  return res.end(JSON.stringify(body));
}
