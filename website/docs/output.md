---
title: 'Outdated table output: columns, flags and links'
sidebar_position: 3
description: 'What the Outdated table shows: npm outdated columns plus Last publish, Links and Flags, dependency-type sections, workspace blocks and colours.'
keywords: [npm outdated table, dependency report, deprecated flag, stale flag, npm workspaces]
---

The table mirrors `npm outdated` (`Package`, `Current`, `Wanted`, `Latest`, `Depended by`; `Location` is left out to keep rows short — it is in `--json`) and adds `Last publish`, `Links` and `Flags` at the end. It is split into `dependencies`, `devDependencies` and `optionalDependencies` sections (empty ones are omitted); packages keep their `package.json` order and the columns line up across sections. `Wanted` falls back to `Current` for packages `npm outdated` does not list. Only problem rows are shown by default; `--all` shows every package too. At an npm workspaces root the table has one block per workspace, headed `<name> (N problems)` (`1 problem` when singular), and `Depended by` is that workspace.

Flags are coloured: deprecated red, stale yellow, outdated cyan, unknown magenta, blocked blue, ok green; a major version bump shows `Latest` in red. The `Links` column holds `npm` and, when the package declares a repository, `repo`; each label is a hyperlink in terminals that support them. Colours and links turn off automatically when output is piped or `NO_COLOR` is set, and `--json` never contains either.

For machine-readable output, see [JSON output](./json-output.md).
