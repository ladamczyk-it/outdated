---
title: Behaviour notes | v1.x
sidebar_label: Behaviour notes | v1.x
sidebar_position: 5
description: "What outdated's flags and fields mean, and where npm's behaviour shows through. | v1.x"
---

**Age is a signal, not a verdict.** The `lastPublish` date indicates inactivity, not necessarily abandonment. Regularly maintained packages may have long gaps between releases.

**Why `time.modified` is not used.** The npm registry's `time.modified` timestamp changes on metadata edits—deprecation notices, dist-tag moves, owner changes—without a new release. This would hide abandoned packages that changed owners but never shipped again. The `lastPublish` date of `dist-tags.latest` reflects the actual last public version.

**Blocked by Node:** `npm outdated` resolves `Latest` with the running Node's `engines` in mind, so a release that needs a newer Node is skipped. `outdated` notices when the registry's latest release differs from what npm settled on, and instead of `ok` it prints `latest needs node <engines.node of that release>` (flag `blocked`, field `latestNode`). It is informational: it is not accepted by `--fail-on`. A package with a deprecated latest release, or one that declares no `engines.node`, is never marked blocked.

**Specifiers:** Non-npm specifiers (file:, link:, git:, etc.) and invalid package names are skipped with a reason.

**Aliases:** When a dependency uses `npm:` prefix (alias syntax), the lookup queries the real package name.

**Ignore:** The `--ignore` flag uses exact-match on the dependency name and omits matching packages entirely from the report.

**Timeouts:** A timed-out `npm view` lookup is not killed; the process continues in the background. The timeout only affects the result for that package.

**npm stderr:** npm's own error lines may be printed to stderr, inherited from the npm CLI.

**Windows behaviour is untested/unverified.**

Only the npm CLI is used. Registry, proxy, authentication, and certificate settings are inherited from `.npmrc`.
