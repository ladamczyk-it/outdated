#!/usr/bin/env bash
# The `publish` step: commits the checked docs from <workspace> and pushes them to main.
# It holds GITHUB_TOKEN, and the check step before it may have rewritten anything in the
# workspace (scripts/ and .git/config included), so it runs from a fresh clone of main, runs no
# git, npm or script in the workspace, and only reads regular files from it.
set -euo pipefail

workspace="${1:?usage: publish-docs.sh <workspace>}"
tag="${CI_COMMIT_TAG:-}"
[[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "CI_COMMIT_TAG must match vX.Y.Z" >&2; exit 1; }
[ -n "${GITHUB_TOKEN:-}" ] || { echo "GITHUB_TOKEN is required to publish the docs" >&2; exit 1; }

# same five docs paths as check-docs.sh; keep the two lists in step
docs_paths=(website/docs website/versioned_docs website/versioned_sidebars website/versions.json website/static/llms.txt)

fail() { echo "$1" >&2; exit 1; }

# step 0: the same skip as check-docs.sh, decided against the clone since git never runs on the workspace
changed=false
for path in "${docs_paths[@]}"; do
  if [ -e "$workspace/$path" ] || [ -L "$workspace/$path" ] || [ -e "$path" ]; then
    diff -rq --no-dereference -- "$workspace/$path" "$path" > /dev/null 2>&1 || changed=true
  fi
done
if [ "$changed" = false ]; then
  echo "no docs change, skip"
  exit 0
fi

# step 1: re-check what check-docs.sh checked, since the workspace can't be trusted to have run it
for dir in "$workspace" "$workspace/website"; do
  [ ! -L "$dir" ] || fail "$dir is a symlink"
done
for path in "${docs_paths[@]}"; do
  [ -e "$workspace/$path" ] || [ -L "$workspace/$path" ] || continue
  # find -P reports a symlink, the starting point included, without following it
  odd=$(find "$workspace/$path" ! -type f ! -type d -print -quit)
  [ -z "$odd" ] || fail "${odd#"$workspace/"}: only regular files may be published"
done
while IFS= read -r -d '' file; do
  relative="${file#"$workspace/"}"
  case "$relative" in
    website/docs/index.mdx | website/docs/*.md) ;;
    *) cmp -s -- "$file" "$relative" || fail "$relative: only .md pages and index.mdx may change under website/docs" ;;
  esac
done < <(find "$workspace/website/docs" -type f -print0)

# Docusaurus reads front matter with gray-matter: an `mdx.format` key there compiles a .md page as
# MDX whatever markdown.format says, and a language after the opening `---` (`---js`) is eval'd.
# YAML spells a key many ways (quotes, flow mappings, escapes), so instead of parsing it the block
# may name mdx nowhere and hold no backslash. The block ends, as in gray-matter, at a line opening `---`.
front_matter_can_select_code() {
  LC_ALL=C awk '
    { sub(/\r$/, "") }
    NR == 1 {
      sub(/^\357\273\277/, "")
      if (substr($0, 1, 3) != "---" || substr($0, 4, 1) == "-") exit
      if ($0 !~ /^---[ \t]*$/) { found = 1; exit }
      next
    }
    /^---/ { exit }
    tolower($0) ~ /mdx/ || /\\/ { found = 1; exit }
    END { exit !found }
  ' "$1"
}
while IFS= read -r -d '' file; do
  ! front_matter_can_select_code "$file" \
    || fail "${file#"$workspace/"}: its front matter may name no mdx key, escape or language"
done < <(find "$workspace/website/docs" -type f -name '*.md' -print0)

index=website/docs/index.mdx
[ -f "$workspace/$index" ] || fail "$index is missing"
# every Docs stamp in the file, one per line
# same Docs-stamp grep as update-docs.sh and check-docs.sh; keep the three in step
stamps_in() { grep -o 'verified against \*\*`[^`]*` v[0-9.]*' "$1" | grep -o 'v[0-9.]*$' || true; }
stamps=$(stamps_in "$workspace/$index")
[ "$stamps" = "$tag" ] || fail "$index must carry exactly one Docs stamp, $tag"
sed -E "s/(verified against \*\*\`[^\`]*\` )v[0-9.]*/\1$tag/" "$index" | cmp -s - "$workspace/$index" \
  || fail "$index may differ from main only in its Docs stamp"

# The versioned paths may hold only what `docs:version <old major>.x` writes from main, so nothing
# the check step planted there (an .mdx page, an html sidebar item) reaches main. Build that from
# the clone, then hold the workspace to it.
main_stamp=$(stamps_in "$index")
[[ "$main_stamp" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "main's $index must carry exactly one Docs stamp"
old_major=${main_stamp#v}
old_major=${old_major%%.*}
new_major=${tag#v}
new_major=${new_major%%.*}
expected=$(mktemp -d)
trap 'rm -rf -- "$expected"' EXIT
mkdir -p "$expected/versioned_docs" "$expected/versioned_sidebars" "$expected/absent"
for dir in versioned_docs versioned_sidebars; do
  [ ! -d "website/$dir" ] || cp -R "website/$dir/." "$expected/$dir"
done
frozen=
# same freeze rule as update-docs.sh's freeze phase; keep both in step
# update-docs.sh freezes only off a real stamp, never v0.0.0
if [ "$main_stamp" != v0.0.0 ] && [ "$old_major" != "$new_major" ]; then
  frozen="$old_major.x"
  [ ! -e "$expected/versioned_docs/version-$frozen" ] || fail "version $frozen is already frozen on main"
  cp -R website/docs "$expected/versioned_docs/version-$frozen"
  # shortcut: createConfig sets no sidebarPath, so docs:version writes Docusaurus's DefaultSidebars;
  # if the site gains a sidebars file, derive this from it, or every freeze fails here
  printf '{\n  "defaultSidebar": [\n    {\n      "type": "autogenerated",\n      "dirName": "."\n    }\n  ]\n}\n' \
    > "$expected/versioned_sidebars/version-$frozen-sidebars.json"
fi
for dir in versioned_docs versioned_sidebars; do
  actual="$workspace/website/$dir"
  [ -e "$actual" ] || actual="$expected/absent"
  diff -rq --no-dereference -- "$expected/$dir" "$actual" > /dev/null \
    || fail "website/$dir may hold only what docs:version writes${frozen:+ for $frozen} from main"
done
versions=website/versions.json
if [ -z "$frozen" ]; then
  { [ ! -e "$versions" ] && [ ! -e "$workspace/$versions" ]; } || cmp -s -- "$versions" "$workspace/$versions" \
    || fail "$versions may change only on a freeze"
else
  # compared as JSON, since qoq:fix in the check step reformats what docs:version wrote;
  # a parse error is swallowed because its message quotes the file
  node -e '
    const { existsSync, readFileSync } = require("node:fs");
    const [actualPath, frozen, mainPath] = process.argv.slice(1);
    const read = (path) => JSON.parse(readFileSync(path, "utf8"));
    try {
      const expected = [frozen, ...(existsSync(mainPath) ? read(mainPath) : [])];
      process.exit(JSON.stringify(read(actualPath)) === JSON.stringify(expected) ? 0 : 1);
    } catch {
      process.exit(1);
    }
  ' "$workspace/$versions" "$frozen" "$versions" > /dev/null 2>&1 \
    || fail "$versions must be main's list with $frozen added first"
fi

# step 2: the clone's five paths become the workspace's, regular files only
for path in "${docs_paths[@]}"; do
  rm -rf -- "$path"
  [ -e "$workspace/$path" ] || continue
  while IFS= read -r -d '' file; do
    relative="${file#"$workspace/"}"
    mkdir -p -- "$(dirname -- "$relative")"
    cp -- "$file" "$relative"
  done < <(find "$workspace/$path" -type f -print0)
done

# step 3: the value is never printed, only the files holding it
leaks=$(grep -rlF -e "$GITHUB_TOKEN" -- "${docs_paths[@]}" 2> /dev/null || true)
[ -z "$leaks" ] || fail "$(printf 'the GITHUB_TOKEN value is in:\n%s' "$leaks")"

# a pathspec that matches nothing on disk or in the index fails git add
staged_paths=()
for path in "${docs_paths[@]}"; do
  if [ -e "$path" ] || [ -n "$(git ls-files -- "$path")" ]; then staged_paths+=("$path"); fi
done
git add -- "${staged_paths[@]}"
git -c user.name=docs-bot -c user.email=docs-bot@users.noreply.github.com \
  commit -q -m "docs: sync to $tag"

remote="${PUSH_REMOTE:-https://github.com/${CI_REPO:?CI_REPO is required to push}.git}"
basic_credential=$(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 -w0)
git -c http.extraHeader="Authorization: Basic $basic_credential" push -q "$remote" HEAD:refs/heads/main
