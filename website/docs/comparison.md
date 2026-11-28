---
title: 'Outdated vs npm outdated, npm-check-updates, depcheck and Renovate'
sidebar_label: 'Compared with others'
sidebar_position: 1.5
description: 'An npm outdated alternative that also finds deprecated and stale npm packages: how Outdated compares with npm outdated, npm-check-updates, depcheck and Renovate, and when to use which.'
keywords:
  [
    npm outdated alternative,
    find deprecated npm packages,
    stale npm dependencies,
    npm-check-updates alternative,
    depcheck,
    renovate,
  ]
---

# Outdated vs npm outdated, npm-check-updates, depcheck and Renovate

These tools answer different questions about your dependencies. Most projects use more than one.

| Tool              | Question it answers                                                               | Changes files?             | Runs where             |
| ----------------- | --------------------------------------------------------------------------------- | -------------------------- | ---------------------- |
| `npm outdated`    | Which installed versions are behind wanted or latest?                             | No                         | Local, CI              |
| Outdated          | Which dependencies are behind, deprecated, stale or blocked by my Node version?   | No                         | Local, CI, AI agents   |
| npm-check-updates | What would `package.json` look like with the newest ranges?                       | Yes, with `-u`             | Local, CI              |
| depcheck          | Which dependencies are unused, and which imports are missing from `package.json`? | No                         | Local, CI              |
| Renovate          | Can a bot open the update pull requests for me?                                   | Yes, through pull requests | Hosted app or self-run |

## When to use which

- **`npm outdated`**: a quick look at version drift, with nothing to install.
- **Outdated**: when "behind" is not the whole story. It adds the deprecation message, the last publish date, a `--stale-after` check for packages nobody releases any more, and releases your Node can't run. With `--fail-on` it can fail CI, and the versioned JSON works as input for an AI agent or script. See the [table against `npm outdated`](./index.mdx#outdated-vs-npm-outdated).
- **npm-check-updates**: when you have decided to upgrade and want the ranges in `package.json` rewritten for you.
- **depcheck**: when the question is which dependencies you can delete, not their versions.
- **Renovate**: when you want update pull requests opened on a schedule, across many repos or package managers.

A common setup combines them. Outdated in CI flags deprecated and abandoned packages, which a version-only bump misses. Renovate or npm-check-updates then does the upgrading.

## Outdated's limits

| Limit                   | Detail                                                                         |
| ----------------------- | ------------------------------------------------------------------------------ |
| npm only                | pnpm and yarn workspace files are not read. Use their own `outdated` commands. |
| Windows untested        | It may work on Windows, but nothing tests it there.                            |
| Reports, never upgrades | It changes no files. Pair it with npm-check-updates or Renovate to upgrade.    |
| Versions, not usage     | It does not find unused dependencies. That is depcheck's (or knip's) job.      |
