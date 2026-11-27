---
title: 'Usage statistics and privacy'
sidebar_label: 'Usage statistics'
sidebar_position: 9
description: 'What gets counted, and only with your consent: the opt-in prompt, the one constant it sends, what is never sent, and why CI and JSON runs never count.'
keywords: [outdated privacy, opt-in telemetry, usage statistics, npm cli telemetry]
---

Opt-in, off until a human says yes. The first interactive run asks; the answer is stored as `stats: true|false` in `~/.config/outdated.json` (or `$XDG_CONFIG_HOME/outdated.json`) and never asked again — edit or delete the key to change it. Runs that can't ask (`CI=true`, a pipe, `--json`) are never prompted and never counted.

![Outdated monthly usage — runs per month](https://adamczyk.ovh/img/stats/outdated.png)

A counted run posts one constant to `https://stats.adamczyk.ovh` and nothing else:

```jsonc
{ "tool": "outdated", "options": [] } // `options` is always empty
```

Where an outbound POST never leaves the network, the same run counts as a plain image GET instead — `https://adamczyk.ovh/img/stats/pixel.png?tool=outdated`.

Never sent: your dependencies, package.json, paths, versions, findings, the flags you typed, project or package names, or anything identifying the user or machine. Sends are fire-and-forget with a 2s timeout; a failure is swallowed and never affects the exit code.
