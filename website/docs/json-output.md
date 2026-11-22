---
title: JSON output
sidebar_position: 4
description: The --json output and its schema (schemaVersion 3).
---

When `--json` is used, the output conforms to the following schema (schemaVersion: 3):

```json
{
  "schemaVersion": 3,
  "generatedAt": "ISO 8601 timestamp",
  "staleAfterMonths": 6,
  "project": "package.json name, else the directory name",
  "workspaces": ["root name", "workspace names in discovery order"],
  "packages": [
    {
      "workspace": "package name of the owning workspace, else the project name",
      "location": "root-relative path of the installed copy, else node_modules/<name>",
      "name": "package name",
      "queriedName": "real package for npm: aliases, else null",
      "type": "prod | dev | optional",
      "specifier": "version specifier from package.json",
      "current": "currently installed version or null",
      "wanted": "npm outdated wanted version or null",
      "latest": "dist-tags.latest or npm outdated latest or null",
      "latestInMajor": "highest non-prerelease version in current's major (same minor for 0.x), or null",
      "outdated": true,
      "majorBump": true,
      "deprecated": "full deprecation message or null",
      "lastPublish": "ISO 8601 of dist-tags.latest release date or null",
      "stale": true,
      "unknown": "reason npm view failed or null",
      "latestNode": "engines.node of the latest release, or null",
      "repository": "https URL of the package repository, or null",
      "flags": ["deprecated", "stale", "outdated", "unknown", "blocked"]
    }
  ],
  "summary": {
    "total": 42,
    "deprecated": 3,
    "stale": 5,
    "outdated": 8,
    "unknown": 2,
    "blocked": 1,
    "ok": 24,
    "skipped": 0
  },
  "skipped": [
    {
      "workspace": "package name of the owning workspace, else the project name",
      "name": "package name",
      "type": "prod | dev | optional",
      "specifier": "version specifier",
      "reason": "why it was skipped"
    }
  ]
}
```

Note that the table hides ok packages unless `--all`, but the JSON `packages` array is never filtered. `summary` counts one per (workspace, dependency) row, so a dependency installed in several workspaces is counted once for each. `workspaces` has length 1 for a single-package project.
