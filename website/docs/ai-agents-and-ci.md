---
title: 'Outdated for AI agents and CI pipelines'
sidebar_position: 6
description: 'Use Outdated as a dependency quality gate in CI or for AI coding agents: versioned JSON, --fail-on exit codes, no prompts, and an AGENTS.md snippet.'
keywords:
  [
    dependency quality gate,
    ci dependency check,
    ai coding agent,
    agents.md,
    fail on deprecated dependencies,
    npm outdated json,
  ]
---

Outdated works as a dependency quality gate for CI pipelines and AI coding agents such as Claude Code, Codex or Cursor. `--json` gives a versioned report to read, `--fail-on` turns chosen problems into a non-zero exit code, and a JSON run never stops to ask anything.

## The contract

- **Versioned JSON.** `--json` prints one object following [schemaVersion 3](./json-output.md). Every row carries `flags`, the reason for each flag (`deprecated` message, `unknown` reason, `latestNode`), plus `latestInMajor` and `repository`, which tell an agent the safe in-major target and where to read the changelog.
- **Exit codes.** `0` when no `--fail-on` problem is found, `1` when one is, `2` on a usage or runtime error (no `package.json`, npm not found, invalid options, `npm outdated` failing).
- **Gate policy.** `--fail-on` takes any of `deprecated`, `stale`, `outdated`, `unknown`, comma-separated. One matching row is enough to exit `1`. `blocked` is informational and can't fail a run.
- **Never interactive.** Runs with `--json`, with `CI=true` or with output piped are never prompted and never send usage statistics.
- **Plain output when piped.** Colours and terminal hyperlinks turn off when output isn't a terminal or `NO_COLOR` is set; `--json` never contains them.

## CI example

Fail the build on deprecated packages and on anything with no release in a year, and keep the JSON as an artifact:

```bash
npx -y @ladamczyk/outdated --fail-on deprecated,stale --stale-after 12 --include prod
npx -y @ladamczyk/outdated --json > outdated-report.json
```

Add `--fail-on outdated` only if every outdated package should block a merge; most teams gate on `deprecated` and review the rest.

## AGENTS.md snippet

Paste this into your `AGENTS.md` or `CLAUDE.md` so a coding agent checks dependencies the same way every time:

```markdown
## Dependencies

- Check dependency health with `npx -y @ladamczyk/outdated --json`. Read the JSON, not the table.
- Act on rows whose `flags` include `deprecated` first: the `deprecated` field says what to use instead.
- For `outdated` rows, bump to `latestInMajor` when it is newer than `current`; treat `majorBump: true` as a separate change and read the changelog at `repository` first.
- `blocked` means the latest release needs a newer Node (`latestNode`); don't bump it without raising Node.
- `unknown` means the lookup failed; retry before acting on it.
- Exit code 1 with `--fail-on` means a gated problem was found, exit code 2 means the check itself failed.
```

## From JavaScript

Tools that run in Node can skip the subprocess and call [`check()`](./javascript-api.md) directly; it returns the same object `--json` prints.

## Inside qoq

[qoq](https://qoq.adamczyk.ovh/) runs Outdated as the dependency check of `qoq --check`, and its `/qoq bump` skill plans dependency upgrades from Outdated's JSON. See [qoq integration](./qoq.md).
