# Development and operations

## Frontend and catalog

Use Node.js 24 and npm. Python 3 and C and C++ compilers with C17 and C++20 support are required for fixture tests.

```sh
npm ci
npm run build:arena
npm run dev
```

Open [localhost:4173](http://127.0.0.1:4173). This mode serves the landing, Learn, profile, and public catalog. Use Compose for grading and judge-backed progress. To avoid a port conflict with Compose, run `PORT=4182 npm run dev`.

Rebuild generated assets after editing Arena code. Student-site assets are served from source. Keep `generated/` and `node_modules/` out of Git. When intentionally changing a dependency, update and review the lockfile alongside `package.json`.

## Verification

| Command | Scope |
| --- | --- |
| `npm run verify` | Syntax and TypeScript checks, unit and fixture tests, and Arena build |
| `npm run wait:arena` | Waits for the database-backed catalog on a running stack |
| `npm run test:smoke` | Live Docker judge, SSE verdicts, ownership, language coverage, contest scoring, and distinct acceptance |
| `npm run test:browser` | Chromium navigation and responsiveness, landing controls, drafts, and the Learn → Decode → Passport flow |

For an end-to-end run, use a freshly seeded development stack. The API smoke check expects a clean seeded contest leaderboard. Run `npx playwright install chromium` once or use an installed Chrome with `PLACE_BROWSER_CHANNEL=chrome`. Tests default to `http://127.0.0.1:4173`. Set `PLACE_URL` to test another local origin.

```sh
docker compose up --build -d
npm run wait:arena
npm run test:smoke
npm run test:browser
```

## Troubleshooting

| Symptom | Check |
| --- | --- |
| The editor or Arena bundle is missing in frontend-only mode | Run `npm run build:arena`, then refresh. |
| Problems load and the judge is unavailable | Run `npm run wait:arena`, then inspect `docker compose logs --tail=100 web worker`. The public fallback can serve content during judge outages. |
| Seed or judge-image shows Exited | Both are one-shot services. Inspect `docker compose ps --all` for their exit status and `docker compose logs seed` for diagnostics. |
| Build fails or port 4173 is busy | Check Docker is running and inspect the first Compose error. Stop the conflicting process or change the frontend-only port. |
| The queue stays pending after a worker stops | Check `docker compose logs worker redis`. Restart the worker after correcting its dependencies. It reconciles unfinished rows when it comes back. |

`docker compose exec web npm run db:seed` reruns the development seed and schema compatibility updates. It preserves user submissions and does not reset an existing contest clock. To stop while retaining data, run `docker compose down`. Use a disposable stack for destructive reset tests.
