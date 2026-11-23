---
title: Table output | v1.x
sidebar_label: Table output | v1.x
sidebar_position: 3
description: 'The table outdated prints, its columns, sections, flags and links. | v1.x'
---

The table mirrors `npm outdated` (`Package`, `Current`, `Wanted`, `Latest`, `Location`, `Depended by`) and adds `Last publish`, `Links` and `Flags` at the end. `Location` is always `node_modules/<name>`, and `Depended by` is the project's name (its `package.json` `name`, else the directory name). It is split into `dependencies`, `devDependencies` and `optionalDependencies` sections (empty ones are omitted); packages keep their `package.json` order and the columns line up across sections. `Wanted` falls back to `Current` for packages `npm outdated` does not list.

Every package is shown by default; `--only-problems` hides the ok ones.

Flags are coloured: deprecated red, stale yellow, outdated cyan, unknown magenta, blocked blue, ok green; a major version bump shows `Latest` in red. The `Links` column holds `npm` and, when the package declares a repository, `repo`; each label is a hyperlink in terminals that support them. Colours and links turn off automatically when output is piped or `NO_COLOR` is set, and `--json` never contains either.

For machine-readable output, see [JSON output](./json-output.md).
