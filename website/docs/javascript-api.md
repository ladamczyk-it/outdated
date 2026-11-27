---
title: Outdated JavaScript API for npm dependency checks
sidebar_position: 5
description: 'How to call Outdated from JavaScript or TypeScript: check() options, the typed ICheckResult, and formatTable and formatJson for printing reports.'
keywords:
  [
    npm outdated api,
    dependency check javascript,
    check outdated packages node,
    typescript,
    ICheckResult,
  ]
---

Outdated's JavaScript API runs the same check as the CLI and returns the result as a typed object, so you can call it in-process instead of starting `outdated --json` and parsing its output. The package is ESM-only and ships its own TypeScript declarations.

```bash
npm install --save-dev @ladamczyk/outdated
```

```ts
import { check, formatTable } from '@ladamczyk/outdated';

const result = await check({ cwd: '.', staleAfterMonths: 12, include: ['prod'] });

const deprecated = result.packages.filter((p) => p.flags.includes('deprecated'));
if (deprecated.length > 0) {
  process.stdout.write(formatTable(result, { now: new Date() }));
  process.exitCode = 1;
}
```

## Exports

- `check(options?)` — runs the check and resolves to an `ICheckResult`, the object the CLI prints with `--json`.
- `formatTable(result, { now, all?, color? })` — renders the table the CLI prints. `now` drives the relative ages in `Last publish`; `all` also lists ok rows; `color` defaults to the terminal's support.
- `formatJson(result)` — renders the JSON the CLI prints: pretty-printed with a trailing newline.
- Types: `ICheckOptions`, `ICheckResult`, `IPackageResult`, `ISummary`, `ISkipped`, `TRunner`, `TDepType`, `TFlag`, `TProblem`.

## check() options

All options are optional.

- `cwd` — project folder, resolved to an absolute path. Default: `process.cwd()`.
- `staleAfterMonths` — months without a release before a package is stale. Default: `6`.
- `include` — dependency types to check: any of `'prod'`, `'dev'`, `'optional'`. Default: all three.
- `ignore` — exact package names to leave out of the report.
- `concurrency` — parallel `npm view` lookups. Default: `6`.
- `timeoutMs` — timeout for each `npm view` lookup. Default: `30000`. Not available as a CLI flag.
- `runner` — a `TRunner`, `(args) => Promise<string>`, that runs `npm <args>` and resolves to its stdout. Default: the npm CLI. Inject one to test without the network.
- `now` — the clock used for staleness and `generatedAt`. Default: `new Date()`.

## The result

`ICheckResult` is the [JSON output](./json-output.md) as a TypeScript type, `schemaVersion: 3`:

- `packages` — one `IPackageResult` per workspace and dependency, never filtered. Each row carries `flags`, always in the order `deprecated`, `stale`, `outdated`, `unknown`, `blocked`, or exactly `['ok']`.
- `summary` — counts of each flag plus `total` and `skipped`.
- `skipped` — dependencies that were not checked, each with a `reason`.
- `project`, `workspaces`, `generatedAt` and `staleAfterMonths` describe the run.

`TProblem` is the set `--fail-on` accepts: `deprecated`, `stale`, `outdated`, `unknown`. `blocked` is informational and never a problem.

## Errors

`check()` rejects when the project's `package.json` can't be read or parsed, when npm can't be started, or when `npm outdated` output can't be parsed. A single package whose `npm view` lookup fails or times out doesn't reject: its row gets the `unknown` flag and a reason.

`check()` never prompts and never sends usage statistics; those belong to the CLI only.

## Used by qoq

[qoq](https://qoq.adamczyk.ovh/) calls `check()` and `formatTable()` in-process for its dependency check. See [qoq integration](./qoq.md).
