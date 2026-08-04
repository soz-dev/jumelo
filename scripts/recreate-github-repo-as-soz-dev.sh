#!/usr/bin/env bash
# Recreate soz-dev/jumelo on GitHub to purge Contributors cache.
# REQUIRES explicit confirmation: pass --i-understand-delete-remote
set -euo pipefail

REPO_OWNER="soz-dev"
REPO_NAME="jumelo"
FULL="$REPO_OWNER/$REPO_NAME"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "${1:-}" != "--i-understand-delete-remote" ]]; then
  cat <<USAGE
This WILL permanently delete https://github.com/$FULL then recreate it.

Usage:
  $0 --i-understand-delete-remote

Prerequisites:
  - GH_TOKEN or gh auth login as soz-dev
  - Local repo at $ROOT with the desired tree on current branch
USAGE
  exit 1
fi

# Prefer existing token from git credential if GH_TOKEN unset
if [[ -z "${GH_TOKEN:-}" ]]; then
  if command -v gh >/dev/null && gh auth token >/dev/null 2>&1; then
    export GH_TOKEN="$(gh auth token)"
  else
    CREDS=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill)
    export GH_TOKEN=$(echo "$CREDS" | awk -F= '/^password=/{print substr($0,10)}')
  fi
fi

cd "$ROOT"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="${TMPDIR:-/tmp}/jumelo-github-export-$STAMP"
mkdir -p "$BACKUP_DIR"

echo "==> 1) Export bundle + notes"
git bundle create "$BACKUP_DIR/jumelo.bundle" --all
git rev-parse HEAD > "$BACKUP_DIR/HEAD.txt"
git remote -v > "$BACKUP_DIR/remotes.txt"
gh api "repos/$FULL" > "$BACKUP_DIR/repo-metadata.json" || true
echo "Backup: $BACKUP_DIR"

echo "==> 2) Ensure single clean root commit as soz-dev (local orphan)"
export GIT_AUTHOR_NAME="soz-dev"
export GIT_AUTHOR_EMAIL="48012094+soz-dev@users.noreply.github.com"
export GIT_COMMITTER_NAME="soz-dev"
export GIT_COMMITTER_EMAIL="48012094+soz-dev@users.noreply.github.com"
TMP_BRANCH="recreate-$STAMP"
git checkout --orphan "$TMP_BRANCH"
git add -A
git commit -m "chore: initial import as soz-dev"
git branch -M main

echo "==> 3) DELETE remote repo $FULL"
gh api -X DELETE "repos/$FULL"
echo "Deleted. Waiting 3s..."
sleep 3

echo "==> 4) CREATE public repo $FULL"
gh api -X POST user/repos \
  -f name="$REPO_NAME" \
  -f description="Jumelo" \
  -F private=false \
  -F has_issues=true \
  -F has_projects=false \
  -F has_wiki=false \
  -F auto_init=false >/dev/null

echo "==> 5) Push only as soz-dev"
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$FULL.git"
git push -u origin main

# Optional feature branch alias
git branch -f cursor/mvp-scaffold-218e main
git push -u origin cursor/mvp-scaffold-218e

echo "==> 6) Verify contributors"
sleep 2
gh api "repos/$FULL/contributors" --jq '[.[]|{login,contributions}]'
echo "Done. Backup kept at: $BACKUP_DIR"
echo "Re-add any GitHub secrets, webhooks, Pages, branch protection manually."
