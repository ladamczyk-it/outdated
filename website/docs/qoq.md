---
title: 'qoq integration'
sidebar_label: 'qoq integration'
sidebar_position: 7
description: 'How qoq --check runs this dependency check, the npm.checkOutdatedEvery throttle, qoq npm --json, and how the /qoq bump skill plans upgrades from the report.'
keywords: [qoq, qoq-cli, ai quality gate, dependency check, qoq bump, claude code skill]
---

[qoq](https://qoq.adamczyk.ovh/) is a quality suite for JavaScript and TypeScript projects (ESLint, Prettier, Knip, JSCPD and more behind one CLI) and a Claude Code skill that turns those checks into a guarded delivery loop. qoq uses it as its dependency check: `@ladamczyk/qoq-cli` depends on `@ladamczyk/outdated` and calls its [JavaScript API](./javascript-api.md) in-process, so nothing extra needs installing.

## In qoq --check

Every `qoq --check` runs it alongside the other tools and prints its table of problems. Inside qoq the check is **advisory**:

- It never fails `qoq --check`. If the check can't run (offline, a registry error), qoq prints a warning and carries on.
- It runs at most once every `npm.checkOutdatedEvery` days (default `1`; `0` checks on every run), because it queries the registry for every package.
- `--skip-npm` skips it for one run.
- When anything is outdated or deprecated, qoq suggests running `/qoq bump`.

```js
// qoq.config.js
export default {
  npm: {
    checkOutdatedEvery: 1, // days between dependency checks
  },
};
```

To block a merge on dependency problems, run it on its own with `--fail-on`; see [AI agents and CI](./ai-agents-and-ci.md).

## qoq npm --json

`qoq npm --json` runs only the dependency check, skips the throttle, and writes the [schemaVersion 3 JSON](./json-output.md) unchanged to `npm-report.json` in qoq's report directory. This is the file qoq's skill reads.

## The /qoq bump skill

`/qoq bump` is the step of qoq's AI delivery loop that upgrades dependencies, and it plans from this report:

- `majorBump` separates major upgrades from minor and patch ones; minor and patch bumps are grouped, and each package gets at most one major step per round.
- `latestInMajor` is the minor/patch target, even when an exact pin keeps `wanted` equal to `current`.
- `deprecated` and `stale` packages are raised even when no bump is pending.
- `blocked` means the newest release needs a newer Node, so it isn't attempted.
- `repository` is where the bumper agent clones the changelog before planning a major.

This tool produces the facts; qoq's skill decides what to change and verifies the result with the rest of `qoq --check`.
