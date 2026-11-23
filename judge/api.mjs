import { createHmac, randomUUID, randomBytes, timingSafeEqual } from 'node:crypto';
import { db, enqueue, readObject, transaction } from './services.mjs';

const signingKey = process.env.SESSION_SECRET || randomBytes(32);
const idPattern = '[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}';
const tokenPattern = new RegExp(`^(${idPattern})\\.([a-f0-9]{64})$`);
const sign = id => createHmac('sha256', signingKey).update(id).digest('hex');
const cookieName = 'place_session';
const submissionFields = 'id,status,verdict,current_case,total_cases,execution_time_ms,output,language,created_at';

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff' });
  res.end(JSON.stringify(payload));
}
function httpError(status, message) { return Object.assign(new Error(message),{status}); }

function session(req,res) {
  const stored = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(cookieName+'='));
  const token = stored?.slice(cookieName.length+1).match(tokenPattern);
  if (token && timingSafeEqual(Buffer.from(token[2],'hex'),Buffer.from(sign(token[1]),'hex'))) return token[1];
  const id = randomUUID();
  res.setHeader('Set-Cookie',`${cookieName}=${id}.${sign(id)}; HttpOnly; SameSite=Strict; Path=/${process.env.COOKIE_SECURE === '1' ? '; Secure' : ''}`);
  return id;
}
async function parse(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw httpError(415,'Send application/json.');
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn:false })) {
    size += chunk.length;
    if (size > 160000) {
      req.resume();
      throw httpError(413,'Submission request is too large.');
    }
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw httpError(400,'Send a JSON object.');
  }
}

async function submit(req,res) {
  if (req.headers['sec-fetch-site'] === 'cross-site') throw httpError(403,'Use the Place AI contest workspace.');
  const { slug,language,code,customInput,contest } = await parse(req);
  if (typeof slug !== 'string' || !['cpp','python'].includes(language) || typeof code !== 'string'
      || !code.trim() || Buffer.byteLength(code) > 32768
      || (customInput !== undefined && (typeof customInput !== 'string' || Buffer.byteLength(customInput) > 16384))
      || (contest !== undefined && typeof contest !== 'string')) throw httpError(400,'Choose a language and enter up to 32 KB of code and 16 KB of custom input.');
  const user = session(req,res);
  const id = randomUUID();
  await transaction(async client => {
    const { rows:[problem] } = await client.query('SELECT id FROM problems WHERE slug=$1',[slug]);
    if (!problem) throw httpError(404,'Problem not found.');
    let contestId = null;
    if (contest && customInput === undefined) {
      const { rows:[result] } = await client.query(`SELECT c.id FROM contests c JOIN contest_problems p ON p.contest_id=c.id
        WHERE c.slug=$1 AND p.problem_id=$2 AND now()>=c.start_time AND now()<c.end_time`,[contest,problem.id]);
      if (!result) throw httpError(409,'This problem is not accepting submissions for that contest.');
      contestId = result.id;
    }
    await client.query('INSERT INTO users(id,username) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING',[user,`student-${user.replaceAll('-','')}`]);
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user]);
    const { rows:[usage] } = await client.query(`SELECT count(*) FILTER (WHERE verdict IS NULL)::int AS pending,count(*)::int AS recent
      FROM submissions WHERE user_id=$1 AND (verdict IS NULL OR created_at>now()-interval '1 minute')`,[user]);
    if (usage.pending >= 3 || usage.recent >= 10) throw httpError(429,'Wait for your existing submissions before trying again.');
    await client.query(`INSERT INTO submissions(id,user_id,problem_id,contest_id,language,code,custom_input)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,[id,user,problem.id,contestId,language,code,customInput ?? null]);
  });
  // PostgreSQL remains the durable handoff if Redis is temporarily unavailable.
  void enqueue(id).catch(error => console.error('Delayed judge enqueue:',error.message));
  json(res,202,{id,status:'PENDING'});
}

const openStreams = new Map();
let totalStreams = 0;
async function stream(req,res,id) {
  const user = session(req,res);
  const load = async () => (await db.query(`SELECT ${submissionFields} FROM submissions WHERE id=$1 AND user_id=$2`,[id,user])).rows[0];
  const first = await load();
  if (!first) throw httpError(404,'Submission not found.');
  if ((openStreams.get(user) ?? 0) >= 4 || totalStreams >= 300) throw httpError(429,'Too many live verdict connections.');
  res.writeHead(200,{ 'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no' });
  res.flushHeaders();
  let prior = '';
  const send = row => {
    const value = JSON.stringify(row);
    if (value !== prior) {
      res.write(`data: ${value}\n\n`);
      prior = value;
    }
    if (row.verdict) res.end();
  };
  send(first);
  if (first.verdict) return;
  openStreams.set(user,(openStreams.get(user) ?? 0)+1);
  totalStreams++;
  let timer;
  let closed = false;
  const end = () => {
    closed = true;
    clearTimeout(timer);
    clearInterval(heartbeat);
    clearTimeout(expire);
    const remaining = openStreams.get(user)-1;
    if (remaining) openStreams.set(user,remaining);
    else openStreams.delete(user);
    totalStreams--;
  };
  const tick = async () => {
    try {
      const row = await load();
      if (closed) return;
      if (row) send(row);
      if (!row || row.verdict) res.end();
      else timer = setTimeout(tick,700);
    } catch {
      res.end();
    }
  };
  const heartbeat = setInterval(() => res.write(': keep-alive\n\n'),10000);
  const expire = setTimeout(() => res.end(),120000);
  timer = setTimeout(tick,700);
  res.once('close',end);
}

async function problemDetail(slug) {
  const { rows:[problem] } = await db.query('SELECT * FROM problems WHERE slug=$1',[slug]);
  if (!problem) throw httpError(404,'Problem not found.');
  const { rows:samples } = await db.query(`SELECT input_url,expected_output_url,explanation FROM test_cases WHERE problem_id=$1 AND is_sample ORDER BY ordinal`,[problem.id]);
  return { ...problem,samples:await Promise.all(samples.map(async item => ({
    input:await readObject(item.input_url),output:await readObject(item.expected_output_url),explanation:item.explanation,
  }))) };
}
async function contestDetail(slug) {
  const { rows:[contest] } = await db.query('SELECT * FROM contests WHERE slug=$1',[slug]);
  if (!contest) throw httpError(404,'Contest not found.');
  const [{ rows:problems }, { rows:standings }] = await Promise.all([
    db.query(`SELECT p.slug,p.title,p.difficulty FROM problems p JOIN contest_problems cp ON cp.problem_id=p.id
      WHERE cp.contest_id=$1 ORDER BY cp.ordinal`,[contest.id]),
    db.query(`SELECT row_number() OVER (ORDER BY score DESC,penalty_minutes ASC,user_id)::int AS rank,
      'Student '||substr(u.username,9,8) AS display_name,u.username AS entry_key,p.score,p.penalty_minutes
      FROM contest_participants p JOIN users u ON u.id=p.user_id WHERE contest_id=$1
      ORDER BY score DESC,penalty_minutes ASC,user_id LIMIT 100`,[contest.id]),
  ]);
  return { ...contest,problems,standings:standings.map(({ entry_key,...row }) => ({ ...row, key:sign(entry_key).slice(0,24) })) };
}

export async function handle(req,res,path) {
  try {
    const method = req.method;
    if (method === 'POST' && path === '/api/submissions') return await submit(req,res);
    if (method !== 'GET') return json(res,405,{error:'Method not allowed.'});
    const slug = path.match(/^\/api\/problems\/([a-z0-9-]+)$/)?.[1];
    const contest = path.match(/^\/api\/contests\/([a-z0-9-]+)$/)?.[1];
    const streamId = path.match(new RegExp(`^/api/submissions/(${idPattern})/events$`))?.[1];
    if (streamId) return await stream(req,res,streamId);
    if (path === '/api/evidence/arena') {
      const user = session(req,res);
      const { rows:[metrics] } = await db.query(`SELECT count(DISTINCT problem_id) FILTER (WHERE verdict='AC')::int AS solved,
        count(DISTINCT problem_id) FILTER (WHERE verdict='AC' AND language='python')::int AS python,
        count(DISTINCT problem_id) FILTER (WHERE verdict='AC' AND language='cpp')::int AS cpp,
        count(*) FILTER (WHERE verdict='AC')::int AS accepted,
        count(*) FILTER (WHERE verdict IN ('AC','WA','CE','RE','TLE','MLE'))::int AS graded
        FROM submissions WHERE user_id=$1 AND custom_input IS NULL`,[user]);
      const { rows:activity } = await db.query(`SELECT (created_at AT TIME ZONE 'UTC')::date::text AS date, count(*)::int AS count
        FROM submissions WHERE user_id=$1 AND custom_input IS NULL AND created_at >= now()-interval '83 days'
        GROUP BY 1 ORDER BY 1`,[user]);
      return json(res,200,{...metrics,activity});
    }
    if (path === '/api/session') {
      session(req,res);
      return json(res,200,{active:true});
    }
    if (path === '/api/problems') {
      const user = session(req,res);
      const { rows } = await db.query(`SELECT p.slug,p.title,p.difficulty,p.topics,p.time_limit_ms,p.memory_limit_mb,
        EXISTS (SELECT 1 FROM submissions s WHERE s.user_id=$1 AND s.problem_id=p.id AND s.verdict='AC' AND s.custom_input IS NULL) AS solved
        FROM problems p ORDER BY p.id`,[user]);
      return json(res,200,rows);
    }
    if (slug) {
      const detail = await problemDetail(slug);
      if (new URL(req.url,'http://localhost').searchParams.has('contest')) delete detail.editorial_md;
      return json(res,200,detail);
    }
    if (path === '/api/contests') {
      const { rows } = await db.query('SELECT slug,title,start_time,end_time FROM contests ORDER BY start_time DESC');
      return json(res,200,rows);
    }
    if (contest) return json(res,200,await contestDetail(contest));
    if (path === '/api/submissions') {
      const user = session(req,res);
      const problem = new URL(req.url,'http://localhost').searchParams.get('problem');
      const { rows } = await db.query(`SELECT ${submissionFields.split(',').map(field => 's.'+field).join(',')}
        FROM submissions s JOIN problems p ON p.id=s.problem_id WHERE s.user_id=$1 AND p.slug=$2 ORDER BY s.created_at DESC LIMIT 30`,[user,problem]);
      return json(res,200,rows);
    }
    return json(res,404,{error:'API route not found.'});
  } catch (error) {
    if (!error.status) console.error('Arena request failed:',error.message);
    if (!res.headersSent) json(res,error.status ?? 503,{error:error.status ? error.message : 'The arena is temporarily unavailable.'});
    else res.end();
  }
}
