# [2.0.0](https://github.com/ladamczyk-it/outdated/compare/v1.1.2...v2.0.0) (2026-10-22)


* feat(check)!: check every npm workspace, view each package once ([9381c5a](https://github.com/ladamczyk-it/outdated/commit/9381c5a0cd6112a72c4a43037236021795f7de61))
* feat(cli)!: show only problems by default, add --all ([e401bc5](https://github.com/ladamczyk-it/outdated/commit/e401bc5fa3706907a3dd31889be2cd554596784f))


### Bug Fixes

* **npm:** keep every dependent from npm outdated output ([c9cc4d1](https://github.com/ladamczyk-it/outdated/commit/c9cc4d1d16d369bd01dfc1145f8373cf1bb976c9))


### Features

* **deps:** discover npm workspaces and find nested installs ([48ca152](https://github.com/ladamczyk-it/outdated/commit/48ca152c7b4192b06d9a39554ad97176d51b0dc9))
* **format:** drop the Location column from the table ([0113210](https://github.com/ladamczyk-it/outdated/commit/01132108c652b7478b2938c6db3b881ea93becb1))
* **format:** hide ok rows unless all is set ([97b5bd7](https://github.com/ladamczyk-it/outdated/commit/97b5bd7eab36cf340f5b5a01c71483b57b542267))
* **format:** one table block per workspace with problem counts ([e679bb4](https://github.com/ladamczyk-it/outdated/commit/e679bb4658a6bf368b278080baf4358a37f65668))


### BREAKING CHANGES

* JSON output is schemaVersion 2. Every package row carries workspace and location, every skipped entry carries workspace, and the result lists workspaces. At an npm workspaces root, rows are reported per (workspace, dependency).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01BaAHw4LbFwp72u14kcTtHS
* --only-problems is removed. The table now hides ok packages by default; pass --all to show them. JSON output is unchanged and never filtered.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01BaAHw4LbFwp72u14kcTtHS

## [1.1.2](https://github.com/ladamczyk-it/outdated/compare/v1.1.1...v1.1.2) (2026-10-11)


### Bug Fixes

* packages bump ([e4ab926](https://github.com/ladamczyk-it/outdated/commit/e4ab9261e61062eec9f2fc588588be9d86979f0c))

## [1.1.1](https://github.com/ladamczyk-it/outdated/compare/v1.1.0...v1.1.1) (2026-10-08)


### Bug Fixes

* export helper functions ([4cd2506](https://github.com/ladamczyk-it/outdated/commit/4cd25062b75b994289d7c2a873d48871708f0105))

# [1.1.0](https://github.com/ladamczyk-it/outdated/compare/v1.0.0...v1.1.0) (2026-10-08)


### Features

* add repo url and stats ([3c2d2d2](https://github.com/ladamczyk-it/outdated/commit/3c2d2d2fd26d9055990e6e1c68cb261c73497759))

# 1.0.0 (2026-10-07)


### Features

* check() orchestration ([d320d2a](https://github.com/ladamczyk-it/outdated/commit/d320d2aaf77625fb2a44c33174fddefc08a4cc52))
* cli option parsing and exit code mapping ([23ee346](https://github.com/ladamczyk-it/outdated/commit/23ee3463a52492fff38affd9750a950c36cce25d))
* concurrency pool ([8c20c52](https://github.com/ladamczyk-it/outdated/commit/8c20c529a4a8c1f8727a364e6394380cc212a7b1))
* date helpers addMonths and isStale ([8c7a535](https://github.com/ladamczyk-it/outdated/commit/8c7a5356db51d39525d8bbb15c7aa4cf8fb27d2f))
* dependency reading, filtering and alias handling ([612db27](https://github.com/ladamczyk-it/outdated/commit/612db271f81e0bb423cef9f80d0580712058e6c6))
* npm outdated and view output parsers ([8dfec69](https://github.com/ladamczyk-it/outdated/commit/8dfec69b838f20fe66e355bf393014f60f3aa7c3))
* npm outdated companion with deprecated, stale and node-blocked checks ([ece8a28](https://github.com/ladamczyk-it/outdated/commit/ece8a285c939ac10409f330f793e53d5b0f7c538))
* production npm runner ([2f07236](https://github.com/ladamczyk-it/outdated/commit/2f07236fba8786a9a3aa9ef56b05d626b77b8d46))
* relativeAge formatting ([d3b2020](https://github.com/ladamczyk-it/outdated/commit/d3b2020c81f44b85634dc71be64684abcf0d4ea1))
* result types and compile-green check shim ([34c1ccc](https://github.com/ladamczyk-it/outdated/commit/34c1cccd2ff2d20eedbfb88f8997650bc1eb8985))
* run() and the cli entry ([e5eca82](https://github.com/ladamczyk-it/outdated/commit/e5eca8215e34a1f21b46e5e4164e20c629b3a590))
* table and json formatters ([a7067db](https://github.com/ladamczyk-it/outdated/commit/a7067db315fa953980d28d5da26ff468a51582f7))
