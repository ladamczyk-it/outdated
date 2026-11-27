---
title: Command line
sidebar_position: 2
description: The outdated command, its options and exit codes.
---

```bash
outdated [options]
```

## Options

- `--cwd <dir>` — Project folder (default: `.`)
- `--stale-after <months>` — Months without a release before a package is stale (default: `6`)
- `--include <types>` — Dependency types to check: `prod`, `dev`, `optional`, comma-separated (default: all)
- `--ignore <pkgs>` — Comma-separated package names to skip entirely
- `--concurrency <n>` — Parallel `npm view` lookups (default: `6`)
- `--json` — Output machine-readable JSON
- `--all` — Show ok packages in the table too (by default only problems are shown)
- `--fail-on <list>` — Exit 1 when any of `stale`, `deprecated`, `outdated`, `unknown` is found (default: none)
- `--help, -h` — Display help message
- `--version, -v` — Display version number

## Exit codes

- `0` — Success, and no `--fail-on` condition met
- `1` — A `--fail-on` condition was met
- `2` — Usage or runtime error (no `package.json`, npm not found, invalid options, `npm outdated` failure)
