---
title: 'How stale, blocked and deprecated are decided'
sidebar_label: 'Behaviour notes'
sidebar_position: 8
description: 'How npm dependencies are classified: why lastPublish ignores time.modified, when a package is blocked by Node, latestInMajor, aliases and workspaces.'
keywords: [stale npm packages, deprecated npm packages, engines node, npm workspaces, npm aliases]
---

These notes explain how a dependency is judged stale, deprecated, outdated, blocked or unknown, and where the npm CLI's own behaviour shows through.

**Age is a signal, not a verdict.** The `lastPublish` date indicates inactivity, not necessarily abandonment. Regularly maintained packages may have long gaps between releases.

**Why `time.modified` is not used.** The npm registry's `time.modified` timestamp changes on metadata edits—deprecation notices, dist-tag moves, owner changes—without a new release. This would hide abandoned packages that changed owners but never shipped again. The `lastPublish` date of `dist-tags.latest` reflects the actual last public version.

**Blocked by Node:** `npm outdated` resolves `Latest` with the running Node's `engines` in mind, so a release that needs a newer Node is skipped. `outdated` notices when the registry's latest release differs from what npm settled on, and instead of `ok` it prints `latest needs node <engines.node of that release>` (flag `blocked`, field `latestNode`). It is informational: it is not accepted by `--fail-on`. A package with a deprecated latest release, or one that declares no `engines.node`, is never marked blocked.

**Latest in major:** `latestInMajor` (JSON only) is the highest published version with the same major as `current` that isn't a prerelease; for `0.x` it also keeps the same minor, the way `^` does. It is read from `versions` of the same `npm view` call, so no extra request is made. It is `null` when `current` is `null` or no version qualifies, and it can equal `current`. Per-version deprecation isn't checked, since `npm view` doesn't expose it alongside `versions`; a deprecation that covers the whole package already shows up as the package's `deprecated` flag.

**Specifiers:** Non-npm specifiers (file:, link:, git:, etc.), invalid package names, and dependencies named like a local workspace package (reason `workspace package`) are skipped with a reason.

**Workspaces:** npm `workspaces` (an array, or `{ packages }`, with globs and `!` negation) are detected automatically from the root `package.json`. Each workspace is shown as its own block, and `npm view` runs once per unique package across all of them. A dependency named like a local workspace package is skipped with reason `workspace package`. Only npm workspaces are read; pnpm and yarn workspace files are not. Running with `--cwd` inside one workspace folder checks that workspace alone. Two workspaces with the same folder name under different parents can't be told apart in `npm outdated` data, so the first match wins.

**Aliases:** When a dependency uses `npm:` prefix (alias syntax), the lookup queries the real package name.

**Ignore:** The `--ignore` flag uses exact-match on the dependency name and omits matching packages entirely from the report.

**Timeouts:** A timed-out `npm view` lookup is not killed; the process continues in the background. The timeout only affects the result for that package.

**npm stderr:** npm's own error lines may be printed to stderr, inherited from the npm CLI.

**Windows behaviour is untested/unverified.**

Only the npm CLI is used. Registry, proxy, authentication, and certificate settings are inherited from `.npmrc`.
