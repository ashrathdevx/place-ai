# Contributing to Place AI

1. Follow [local setup](docs/development.md) and pick the smallest relevant code boundary from the [architecture map](docs/architecture.md).
2. Keep changes focused. Add or update tests when behavior changes. Use `npm run verify` before opening a pull request.
3. Run the live smoke checks when editing judging, contests, ownership, progress, or browser flows. Report any checks you could not run.
4. Include a screenshot for layout changes and describe how to reproduce changes to submissions or progress. Record any impact on existing data, configuration, or the local startup sequence.

For challenge changes, keep the input contract, examples, intended logic bug, editorial, and language variants aligned. A reference must pass every fixture. Each starter must execute and fail because of the intended bug. Keep the public catalog projection free of hidden fixture contents. Avoid uploading private tests, source submissions, environment files, or real student details.

Use [Security](SECURITY.md) for sensitive findings.
