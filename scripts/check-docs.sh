#!/usr/bin/env bash
# The `check` step: gates the docs the generate step wrote. It holds no secret, so the
# code that formatting and building run from Claude's pages can reach none.
set -euo pipefail

# same four docs paths as publish-docs.sh; keep the two lists in step
docs_paths=(website/docs website/versioned_docs website/versioned_sidebars website/versions.json)

if [ -z "$(git status --porcelain --untracked-files=all -- "${docs_paths[@]}")" ]; then
  echo "no docs change, skip"
  exit 0
fi

existing_paths=()
for path in "${docs_paths[@]}"; do
  [ -e "$path" ] && existing_paths+=("$path")
done
if [ -n "$(find "${existing_paths[@]}" -type l)" ]; then
  echo "a symlink is under the docs paths" >&2
  exit 1
fi

# Claude may write only .md pages and the stamp in index.mdx; the other three paths are the freeze's
while IFS= read -r -d '' entry; do
  path="${entry:3}"
  case "$path" in
    website/docs/index.mdx | website/docs/*.md | website/versioned_docs/* | website/versioned_sidebars/* | website/versions.json) ;;
    *) echo "$path: only .md pages and website/docs/index.mdx may change under website/docs" >&2; exit 1 ;;
  esac
  [ -f "$path" ] || { echo "$path: not a regular file" >&2; exit 1; }
done < <(git status --porcelain -z --untracked-files=all -- "${docs_paths[@]}")

# qoq and the ESLint templates qoq.website.js loads come from the root node_modules; check holds no secret, and --ignore-scripts skips husky's prepare
npm ci --ignore-scripts --no-audit --no-fund
npm run qoq:fix

tag="${CI_COMMIT_TAG:-}"
# same Docs-stamp grep as update-docs.sh and publish-docs.sh; keep the three in step
stamps=$(grep -o 'verified against \*\*`[^`]*` v[0-9.]*' website/docs/index.mdx | grep -o 'v[0-9.]*$' || true)
[ -n "$tag" ] && [ "$stamps" = "$tag" ] || { echo "website/docs/index.mdx must carry exactly one Docs stamp, $tag" >&2; exit 1; }

npm run qoq:check
npm run build --prefix website

outside=$(git status --porcelain --untracked-files=all -- . "${docs_paths[@]/#/:!}")
[ -z "$outside" ] || { printf 'files outside the docs paths changed:\n%s\n' "$outside" >&2; exit 1; }
