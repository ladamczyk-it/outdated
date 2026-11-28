# Docs agent

What the `generate` step of `.woodpecker/docs.yml` hands Claude on a release tag (`scripts/update-docs.sh`).
Owned by cli-template and synced to every Tool (`WEBSITE_FILES` in `scripts/sync.mjs`): edit it there, never in a Tool.

- `docs.md`: the prompt of the first pass, which updates `website/docs` for the release.
- `llms.md`: the prompt of the second pass, which tunes each page's SEO front matter and rewrites
  `website/static/llms.txt`. Delete it to skip the pass.
- `plugins.txt`: `claude plugin` arguments, one call per line, run before both passes, e.g.
  `marketplace add owner/repo` then `install name@marketplace`.

Per-Tool rules, never synced, live in the Tool beside them: `local-docs.md` is appended to `docs.md` and
`local-llms.md` to `llms.md` when present (e.g. pages to keep, the qoq sentence for llms.txt). Edit them in the
Tool; the agent cannot write them.

Prompts may use `{{TAG}}`, `{{STAMP}}`, `{{SCOPE}}`, `{{SOURCES}}` and `{{SITE_URL}}`. The script appends
the hard rules to both prompts (which files may change, the stamp, no commands, no commit); those are what
`check-docs.sh` and `publish-docs.sh` enforce, so they stay in the script.

Installed plugins and skills run beside `CLAUDE_CODE_OAUTH_TOKEN`, so the step refuses any that bring code
or widen Claude's tools: hooks, MCP servers, or skills with `allowed-tools`. Markdown-only skills pass.
