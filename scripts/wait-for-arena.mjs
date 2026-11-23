import { setTimeout as delay } from 'node:timers/promises';

const origin = process.env.PLACE_URL ?? 'http://127.0.0.1:4173';
const catalog = new URL('/api/problems',origin);
const attempts = 30;

for (let attempt = 1; attempt <= attempts; attempt++) {
  try {
    const response = await fetch(catalog,{signal:AbortSignal.timeout(2000)});
    if (response.ok) {
      const problems = await response.json();
      // The public fallback is HTTP 200 and has null progress.
      if (Array.isArray(problems) && problems.length > 0 && problems.every(problem => typeof problem.solved === 'boolean')) {
        console.log(`Arena catalog ready with ${problems.length} database-backed problems.`);
        break;
      }
    } else {
      await response.body?.cancel();
    }
  } catch {
    // The listener or backing database may still be starting.
  }

  if (attempt === attempts) {
    console.error(`Database-backed Arena catalog did not become ready at ${catalog}. Check docker compose ps --all and docker compose logs seed web.`);
    process.exitCode = 1;
  } else {
    await delay(2000);
  }
}
