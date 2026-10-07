# @ladamczyk/outdated

CLI that reports outdated dependencies using the npm CLI.

## Usage

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
- `--only-problems` — Hide ok packages from the table
- `--fail-on <list>` — Exit 1 when any of `stale`, `deprecated`, `outdated`, `unknown` is found (default: none)
- `--help, -h` — Display help message
- `--version, -v` — Display version number

## Exit codes

- `0` — Success, and no `--fail-on` condition met
- `1` — A `--fail-on` condition was met
- `2` — Usage or runtime error (no `package.json`, npm not found, invalid options, `npm outdated` failure)

## JSON schema

When `--json` is used, the output conforms to the following schema (schemaVersion: 1):

```json
{
  "schemaVersion": 1,
  "generatedAt": "ISO 8601 timestamp",
  "staleAfterMonths": 6,
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
      "flags": ["deprecated", "stale", "outdated", "unknown"]
    }
  ],
  "summary": {
    "total": 42,
    "deprecated": 3,
    "stale": 5,
    "outdated": 8,
    "unknown": 2,
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

## Behaviour notes

**Age is a signal, not a verdict.** The `lastPublish` date indicates inactivity, not necessarily abandonment. Regularly maintained packages may have long gaps between releases.

**Why `time.modified` is not used.** The npm registry's `time.modified` timestamp changes on metadata edits—deprecation notices, dist-tag moves, owner changes—without a new release. This would hide abandoned packages that changed owners but never shipped again. The `lastPublish` date of `dist-tags.latest` reflects the actual last public version.

**Specifiers:** Non-npm specifiers (file:, link:, git:, etc.) and invalid package names are skipped with a reason.

**Aliases:** When a dependency uses `npm:` prefix (alias syntax), the lookup queries the real package name.

**Ignore:** The `--ignore` flag uses exact-match on the dependency name and omits matching packages entirely from the report.

**Timeouts:** A timed-out `npm view` lookup is not killed; the process continues in the background. The timeout only affects the result for that package.

**npm stderr:** npm's own error lines may be printed to stderr, inherited from the npm CLI.

**Windows behaviour is untested/unverified.**

Only the npm CLI is used. Registry, proxy, authentication, and certificate settings are inherited from `.npmrc`.
