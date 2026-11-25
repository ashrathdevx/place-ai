# Place AI

Place AI is a CSE-first learning and career preparation workspace. Students work through a lesson, repair or write code in Arena, and review accepted work in their Skill Passport.

**[Run locally](#run-locally)** · **[Architecture](docs/architecture.md)** · **[Development](docs/development.md)** · **[Contributing](CONTRIBUTING.md)**

## Run locally

Use Docker Desktop or Docker Engine with Compose. The first run downloads images and seeds the development database.

```sh
docker compose up --build -d
```

Open [Place AI](http://127.0.0.1:4173). Choose **Start learning**, open **Array boundaries**, and try **The Missing Reading** in Decode. Run the example, repair the program, and submit it to the judge. Your first accepted fix unlocks the editorial and appears in your Passport.

```sh
docker compose ps --all
docker compose logs --tail=80 web worker
docker compose down
```

Stopping with `docker compose down` retains the local database, queue, and fixture volumes. Keep Docker running while using Run or Submit Fix. See the [development guide](docs/development.md) for a frontend-only workflow, test commands, and startup help.

## What works today

| Area | Current behavior |
| --- | --- |
| Landing and Learn | Interactive before-and-after code example. Five CSE modules with worked examples and two judged repairs each, resume links, and a browser-local review queue. |
| Arena · Decode | 30 challenges with complete buggy starters across Easy, Medium, and Hard. C17, C++20, and Python 3 each have a starter and reference per challenge. Includes drafts, saved challenges, hints, and editorials unlocked by acceptance. |
| Arena · Solve and Contests | 14 standalone problems, one seeded practice contest, and live verdicts and standings. Run uses sample or custom input. Submit uses the server-side fixture bank. |
| Skill Passport | Overview, accepted activity, and evidence. One decoded problem per distinct accepted challenge, even when several languages pass. Profile edits and the private preview are browser-local. |
| Evidence Engine | Judge records, student-added sources, and provider imports where configured. The shareable sample Passport uses fictional data. |
| Placement | Browse jobs and internships, compare evidence with role benchmarks or a pasted posting, and build a weekly study plan. Targets, saved roles, and task progress are stored in this browser. |
| Practice and Marketplace | Mini challenges, sample marketplace listings, bookmarks, and listing drafts. |

Placement reads the public GitLab and Razorpay Greenhouse boards when reachable. Other companies have clearly labeled example roles and links to their official careers pages. Résumé text is processed in the current tab.

Employer coverage beyond the connected careers boards, payments, durable accounts, public personal Passport publishing, and a live Decode contest pilot are pending. The repository and the local Compose stack are development artifacts. See the [launch gates](LAUNCH-AUDIT.md) before hosting a public judge.

## Repository map

| Path | Owns |
| --- | --- |
| [assets/](assets/) | Landing, Learn, Skill Passport, browser preferences, theme tokens |
| [arena/](arena/) | React workspace, Monaco, filters, contests, and verdict UI |
| [judge/](judge/) | HTTP API, submission ownership, catalog, fixtures, and isolated execution |
| [db/](db/) | PostgreSQL schema, indexes, and compatibility updates |
| [evidence/](evidence/) | External evidence integrations |
| [scripts/](scripts/) | Seed, build, verification, and smoke tests |
| [.github/workflows/](.github/workflows/) | Repeatable checks in GitHub Actions |

See [Evidence integrations](docs/evidence.md) for provider behavior and local setup. Use [Security](SECURITY.md) for sensitive reports.
