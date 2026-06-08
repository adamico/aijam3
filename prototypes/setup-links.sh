#!/usr/bin/env bash
# Bridge prototype games into the LittleJS-AI submodule's games/ folder.
#
# The LittleJS engine + build script hardcode games under games/, but our
# real game work lives in prototypes/ (tracked in the superproject, not in
# the third-party submodule). This script symlinks each prototype game into
# games/ and tells the submodule's local git to ignore those symlinks, so
# the submodule never shows dirty and we never commit games upstream.
#
# Re-runnable. Run after a fresh clone, or after adding a new prototype game.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROTO="$ROOT/prototypes"
GAMES="$ROOT/LittleJS-AI/games"
EXCLUDE="$ROOT/.git/modules/LittleJS-AI/info/exclude"

if [[ ! -d "$GAMES" ]]; then
    echo "error: $GAMES not found — is the LittleJS-AI submodule checked out?" >&2
    echo "       run: git submodule update --init" >&2
    exit 1
fi

mkdir -p "$(dirname "$EXCLUDE")"
touch "$EXCLUDE"

# keep macOS cruft out of the submodule's status without editing tracked files
grep -qxF ".DS_Store" "$EXCLUDE" || echo ".DS_Store" >> "$EXCLUDE"

linked=0
for dir in "$PROTO"/*/; do
    [[ -f "$dir/build.json" ]] || continue          # only real game folders
    name="$(basename "$dir")"
    link="$GAMES/$name"

    # (re)create symlink
    if [[ -L "$link" || -e "$link" ]]; then
        rm -rf "$link"
    fi
    ln -s "${dir%/}" "$link"

    # ensure submodule ignores it locally
    line="/games/$name"
    grep -qxF "$line" "$EXCLUDE" || echo "$line" >> "$EXCLUDE"

    echo "linked  games/$name -> prototypes/$name"
    linked=$((linked + 1))
done

echo "done: $linked game(s) bridged."
