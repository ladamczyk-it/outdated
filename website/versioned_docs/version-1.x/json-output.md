---
title: JSON output | v1.x
sidebar_label: JSON output | v1.x
sidebar_position: 4
description: 'The --json output and its schema (schemaVersion 1). | v1.x'
---

When `--json` is used, the output conforms to the following schema (schemaVersion: 1):

```json
{
  "schemaVersion": 1,
  "generatedAt": "ISO 8601 timestamp",
  "staleAfterMonths": 6,
  "project": "package.json name, else the directory name",
  "packages": [
    {
      "name": "package name",
      "queriedName": "real package for npm: aliases, else null",
      "type": "prod | dev | optional",
      "specifier": "version specifier from package.json",
      "current": "currently installed version or null",
      "wanted": "npm outdated wanted version or null",
      "latest": "dist-tags.latest or npm outdated latest or null",
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
      "name": "package name",
      "type": "prod | dev | optional",
      "specifier": "version specifier",
      "reason": "why it was skipped"
    }
  ]
}
```

Note that `--only-problems` filters the table output but never filters the JSON `packages` array.
