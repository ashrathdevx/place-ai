import { Pool } from 'pg';
import { Queue } from 'bullmq';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export const db = new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DB_POOL_SIZE ?? 12) });
const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379');
export const connection = {
  host:redisUrl.hostname, port:Number(redisUrl.port || 6379),
  username:redisUrl.username ? decodeURIComponent(redisUrl.username) : undefined,
  password:redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
  db: Number(redisUrl.pathname.slice(1) || '0'),
  ...(redisUrl.protocol === 'rediss:' ? { tls:{} } : {}),
};
export const queueName = 'place-submissions';
export const queue = new Queue(queueName, { connection:{ ...connection, enableOfflineQueue:false, maxRetriesPerRequest:1 } });
queue.on('error', error => console.error('Queue connection:', error.message));
export const bucket = process.env.S3_BUCKET ?? 'place-test-cases';
export const s3 = new S3Client({
  endpoint:process.env.S3_ENDPOINT, region:process.env.AWS_REGION ?? 'us-east-1',
  forcePathStyle:Boolean(process.env.S3_ENDPOINT),
  requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",
});
export async function readObject(key) {
  const { Body } = await s3.send(new GetObjectCommand({ Bucket:bucket, Key:key }));
  return Body.transformToString();
}

export function enqueue(id) {
  return queue.add('judge', { id }, {
    jobId:id, attempts:3, backoff:{ type:'exponential', delay:1500 },
    removeOnComplete:{ age:86400 }, removeOnFail:{ age:86400 },
  });
}

export async function transaction(callback) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
