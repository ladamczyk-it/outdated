#!/usr/bin/env bash
# Syncs website/docs with the Tool's release tag (CI_COMMIT_TAG): when the Docs stamp
# trails the tag, Claude updates the gap. Matching or newer stamps never reach Claude.
set -euo pipefail

phase="${1:-}"
case "$phase" in
  install | freeze | generate) ;;
  *) echo "usage: update-docs.sh <install|freeze|generate>" >&2; exit 1 ;;
esac

tag="${CI_COMMIT_TAG:-}"
[[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "CI_COMMIT_TAG must match vX.Y.Z" >&2; exit 1; }

file=website/docs/index.mdx
# freeze runs after generate, which has already set the working-tree stamp to the tag: only HEAD still holds the old one
read_index() { if [ "$phase" = freeze ]; then git show "HEAD:$file"; else cat "$file"; fi; }
# same Docs-stamp grep as check-docs.sh and publish-docs.sh; keep the three in step
stamps=$(read_index | grep -o 'verified against \*\*`[^`]*` v[0-9.]*' | grep -o 'v[0-9.]*$' || true)
[ -n "$stamps" ] && [ "$(printf '%s\n' "$stamps" | wc -l)" -eq 1 ] || { echo "$file must carry exactly one Docs stamp" >&2; exit 1; }
stamp="$stamps"

# tag <= stamp: the highest of the two by version order is the stamp
if [ "$(printf '%s\n%s\n' "${stamp#v}" "${tag#v}" | sort -V | tail -n1)" = "${stamp#v}" ]; then
  echo "$tag <= $stamp, skip"
  exit 0
fi

echo "$stamp -> $tag, updating"

# Each phase runs in its own docs.yml step and holds only the token it needs. Same-uid code can read
# a parent's /proc/<pid>/environ, so a token the phase refuses must be absent from the step, not unset here.
case "$phase" in
  install) requires=VERDACCIO_CI_TOKEN; refuses="CLAUDE_CODE_OAUTH_TOKEN GITHUB_TOKEN" ;;
  freeze) requires=""; refuses="VERDACCIO_CI_TOKEN CLAUDE_CODE_OAUTH_TOKEN GITHUB_TOKEN" ;;
  generate) requires=CLAUDE_CODE_OAUTH_TOKEN; refuses="VERDACCIO_CI_TOKEN GITHUB_TOKEN" ;;
esac
for required in $requires; do
  [ -n "${!required:-}" ] || { echo "$required is required by the $phase phase" >&2; exit 1; }
done
for refused in $refuses; do
  [ -z "${!refused:-}" ] || { echo "$refused must not be set in the $phase phase" >&2; exit 1; }
done

if [ "$phase" = install ]; then
  # npm substitutes ${VERDACCIO_CI_TOKEN} in website/.npmrc from its own environment
  npm ci --prefix website --ignore-scripts
  exit 0
fi

if [ "$phase" = freeze ]; then
  # the frozen version is the one being replaced, so it is named after the stamp's major
  stamp_major="${stamp#v}"; stamp_major="${stamp_major%%.*}"
  tag_major="${tag#v}"; tag_major="${tag_major%%.*}"
  # same freeze rule as publish-docs.sh, which checks it again from the clone; keep both in step
  # v0.0.0 is the never-documented sentinel: nothing to freeze, and no such tag to diff
  if [ "$stamp" != v0.0.0 ] && [ "$stamp_major" != "$tag_major" ]; then
    # docs:version copies website/docs, which already holds generate's pages: freeze HEAD's, then put those back.
    # The copy goes outside the repo, as check-docs.sh rejects untracked files outside the docs paths.
    aside=$(mktemp -d)
    mv website/docs "$aside/docs"
    git checkout HEAD -- website/docs
    npm run docusaurus --prefix website -- docs:version "$stamp_major.x"
    rm -rf website/docs
    mv "$aside/docs" website/docs
  fi
  exit 0
fi

# generate: installed here, after the skip, so a skipped release costs no npm call
npm install -g @anthropic-ai/claude-code

# Claude gets no git: the range is written here, outside the repo, for it to Read
notes=$(mktemp -d)
if [ "$stamp" = v0.0.0 ]; then
  scope="The docs have never been verified against a release: document $tag from scratch, using CHANGELOG.md for its history."
else
  git log "$stamp..$tag" > "$notes/log.txt"
  git diff "$stamp..$tag" > "$notes/diff.patch"
  scope="The docs were last verified against $stamp; the release is $tag. The release range $stamp..$tag is in $notes/log.txt (git log) and $notes/diff.patch (git diff); read those and CHANGELOG.md to see exactly what changed, and limit your changes to that gap: do not touch or rewrite anything it does not affect."
fi

sources=""
for doc in README.md CLAUDE.md AGENTS.md; do
  [ -f "$doc" ] && sources="$sources$doc, "
done

prompt="Update this Tool's documentation site in website/docs.
$scope
Source facts from the internal docs (${sources}src/), not from memory.
You may write only .md under website/docs; in index.mdx change only the stamp line. Never touch website/src/pages: those Static pages belong to the maintainer.
In website/docs/index.mdx, set the Docs stamp to $tag (the 'Content is verified against' line).
Pages are plain Docusaurus Markdown: no raw HTML tags, no JSX or MDX components, and no javascript:, data: or vbscript: links; code samples in fenced blocks are fine.
Write lint-clean Markdown, but run no command at all: you have no tool for it, and the script formats and checks your changes after you finish.
Do not commit or push: the script commits after you finish."

# under -p every tool outside this list is denied. Each absence closes a way out of website/docs:
# - Bash(npm run *) would allow publish:full.
# - Bash(git …): git log/diff/show take --output=<file>, which writes anywhere, so the range comes as notes files.
# - Glob and Grep: a bare grant reaches every path (Read rules don't narrow it), including
#   /proc/<pid>/environ, which holds CLAUDE_CODE_OAUTH_TOKEN.
# - npm run build: Docusaurus evaluates MDX in Node, so building a page Claude wrote runs its code;
#   the build is left to the gates after Claude exits.
# - Bash(npm run qoq:check) and Bash(npm run qoq:fix): Prettier loads a JS config (prettier.config.mjs)
#   found beside a checked file, so a config Claude wrote would run with CLAUDE_CODE_OAUTH_TOKEN in reach.
#   With no Bash at all Claude runs no command; the gates after it exits do the linting.
# - Edit/Write beyond .md: a .js/.mjs/.json Claude wrote could be loaded as code or config by a
#   later tool, and an .mdx page compiles to code. With markdown.format 'detect' a .md page is
#   CommonMark, not code. index.mdx gets Edit only, for its stamp line; publish-docs.sh rejects any other change.
# Read(./**) still lets Claude read anything in the repo.
allowed_tools="Read(./**),Read(/$notes/**),Edit(website/docs/**/*.md),Write(website/docs/**/*.md),Edit(website/docs/index.mdx)"

# claude -p exits 0 even when it gives up, so its exit code proves nothing; the gates that follow are the check
claude -p --model sonnet "$prompt" --allowedTools "$allowed_tools"
