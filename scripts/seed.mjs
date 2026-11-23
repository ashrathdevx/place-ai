import { readFile } from 'node:fs/promises';
import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { bank } from '../judge/problems.mjs';
import { db, queue, s3, bucket, transaction } from '../judge/services.mjs';

try {
  await db.query(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  try {
    await s3.send(new HeadBucketCommand({ Bucket:bucket }));
  } catch (error) {
    if (error.$metadata?.httpStatusCode !== 404) throw error;
    await s3.send(new CreateBucketCommand({ Bucket:bucket }));
  }
  for (const problem of bank) {
    await transaction(async client => {
      const { rows:[row] } = await client.query(
        `INSERT INTO problems (slug,title,difficulty,time_limit_ms,memory_limit_mb,statement_md,editorial_md)
         VALUES ($1,$2,$3,2000,256,$4,$5) ON CONFLICT (slug) DO UPDATE SET
         title=excluded.title,difficulty=excluded.difficulty,statement_md=excluded.statement_md,editorial_md=excluded.editorial_md RETURNING id`,
        [problem.slug,problem.title,problem.difficulty,problem.statement,problem.editorial]);
      for (const [ordinal,[input,expected]] of problem.cases.entries()) {
        const prefix = `problems/${problem.slug}/${ordinal + 1}`;
        const keys = [`${prefix}.in`,`${prefix}.out`];
        await Promise.all([input,expected].map((body,index) => s3.send(new PutObjectCommand({ Bucket:bucket, Key:keys[index], Body:body }))));
        await client.query(
          `INSERT INTO test_cases (problem_id,ordinal,input_url,expected_output_url,is_sample) VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (problem_id,ordinal) DO UPDATE SET input_url=excluded.input_url,expected_output_url=excluded.expected_output_url,is_sample=excluded.is_sample`,
          [row.id,ordinal,...keys,ordinal === 0]);
      }
    });
  }
  await transaction(async client => {
    const { rows:[contest] } = await client.query(
      `INSERT INTO contests (slug,title,start_time,end_time) VALUES ('foundations-sprint','Foundations Sprint',now(),now()+interval '7 days')
       ON CONFLICT (slug) DO UPDATE SET title=excluded.title RETURNING id`);
    await client.query(
      `INSERT INTO contest_problems (contest_id,problem_id,ordinal)
       SELECT $1,id,row_number() OVER (ORDER BY id)::int FROM problems WHERE slug=ANY($2)
       ON CONFLICT DO NOTHING`,[contest.id,['array-sum','shortest-path','matrix-fibonacci']]);
  });
  console.log(`Seeded ${bank.length} problems and one contest.`);
} finally {
  await Promise.all([db.end(),queue.close()]);
  s3.destroy();
}
