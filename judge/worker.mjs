import { Worker } from 'bullmq';
import { db, queue, connection, queueName, readObject, enqueue, transaction } from './services.mjs';
import { compile, runCase } from './container.mjs';
import { classifyRun, compareOutput } from './verdict.ts';

async function finish(id, verdict, runtime = null, output = null) {
  await transaction(async client => {
    const { rows:[submission] } = await client.query('SELECT contest_id,user_id FROM submissions WHERE id=$1',[id]);
    if (!submission) return;
    const { contest_id:contestId, user_id:userId } = submission;
    if (contestId) {
      await client.query('INSERT INTO contest_participants(contest_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',[contestId,userId]);
      await client.query('SELECT user_id FROM contest_participants WHERE contest_id=$1 AND user_id=$2 FOR UPDATE',[contestId,userId]);
    }
    const result = await client.query(
      `UPDATE submissions SET status='FINISHED',verdict=$2,execution_time_ms=$3,output=$4,updated_at=now() WHERE id=$1 AND verdict IS NULL`,
      [id,verdict,runtime,output]);
    if (result.rowCount && contestId) {
      await client.query(`
        WITH first_ac AS (
          SELECT DISTINCT ON (problem_id) problem_id,created_at,id FROM submissions
          WHERE contest_id=$1 AND user_id=$2 AND verdict='AC' ORDER BY problem_id,created_at,id
        ), scores AS (
          SELECT count(*)::int AS score,
          coalesce(sum(floor(extract(epoch FROM (a.created_at - c.start_time))/60)::int +
            20*(SELECT count(*) FROM submissions s WHERE s.contest_id=$1 AND s.user_id=$2 AND s.problem_id=a.problem_id
              AND (s.created_at,s.id)<(a.created_at,a.id) AND s.verdict IN ('WA','TLE','MLE','RE'))),0)::int AS penalty
          FROM first_ac a CROSS JOIN contests c WHERE c.id=$1
        )
        UPDATE contest_participants p SET score=s.score,penalty_minutes=s.penalty
        FROM scores s WHERE p.contest_id=$1 AND p.user_id=$2`,[contestId,userId]);
    }
  });
}

async function execute({ id }) {
  const { rows:[sub] } = await db.query(
    `SELECT s.*,p.time_limit_ms,p.memory_limit_mb FROM submissions s JOIN problems p ON p.id=s.problem_id
     WHERE s.id=$1 AND s.verdict IS NULL`,[id]);
  if (!sub) return;
  const custom = sub.custom_input !== null;
  const cases = custom ? [{ input:sub.custom_input }] : (await db.query(
    'SELECT input_url,expected_output_url FROM test_cases WHERE problem_id=$1 ORDER BY ordinal',[sub.problem_id])).rows;
  if (!cases.length) throw new Error('No test cases registered');
  await db.query(`UPDATE submissions SET status='COMPILING',current_case=0,total_cases=$2,updated_at=now()
    WHERE id=$1 AND verdict IS NULL`,[id,cases.length]);
  const compilation = await compile(sub.language,sub.code);
  if (compilation.error) return finish(id,'CE',null,compilation.error);
  let maxRuntime = 0;
  for (const [index,item] of cases.entries()) {
    await db.query(`UPDATE submissions SET status='RUNNING',current_case=$2,updated_at=now()
      WHERE id=$1 AND verdict IS NULL`,[id,index+1]);
    const [input,expected] = custom ? [item.input,null] : await Promise.all([
      readObject(item.input_url),readObject(item.expected_output_url),
    ]);
    const result = await runCase(sub.language,compilation.program,input,sub.memory_limit_mb,sub.time_limit_ms);
    maxRuntime = Math.max(result.runtime,maxRuntime);
    const terminal = classifyRun(result);
    if (terminal) return finish(id,terminal,maxRuntime,custom ? result.stderr.slice(0,4000) : null);
    if (custom) return finish(id,'RUN_OK',maxRuntime,result.stdout);
    if (compareOutput(result.stdout,expected) === 'WA') return finish(id,'WA',maxRuntime);
  }
  await finish(id,'AC',maxRuntime);
}

const worker = new Worker(queueName, job => execute(job.data), {
  connection:{ ...connection,maxRetriesPerRequest:null },concurrency:Number(process.env.JUDGE_CONCURRENCY ?? 2),
});
worker.on('error', error => console.error('Worker connection:',error.message));
worker.on('failed', (job,error) => console.error('Judge job failed:',job?.id,error.message));

let reconciling = false;
async function reconcile() {
  if (reconciling) return;
  reconciling = true;
  try {
    const { rows } = await db.query(`SELECT id FROM submissions WHERE verdict IS NULL
      AND updated_at < now()-interval '5 seconds' ORDER BY updated_at LIMIT 200`);
    for (const { id } of rows) {
      const job = await queue.getJob(id);
      const status = await job?.getState();
      if (status === 'failed') await finish(id,'SYSTEM_ERROR');
      else if (!job) await enqueue(id);
    }
  } catch (error) {
    console.error('Submission reconciliation:',error.message);
  } finally {
    reconciling = false;
  }
}
const recovery = setInterval(reconcile,5000);
for (const signal of ['SIGINT','SIGTERM']) process.once(signal,async () => {
  clearInterval(recovery);
  await worker.close();
  await Promise.all([queue.close(),db.end()]);
  process.exit(0);
});
