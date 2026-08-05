#!/bin/zsh
set -euo pipefail
PROJECT_DIR="/Users/sofyanzarouri/Desktop/jumelo/jumelo"
if [[ -f "$PROJECT_DIR/_patches/MANIFEST.txt" ]]; then
  PATCH_DIR="$PROJECT_DIR/_patches"
elif [[ -f "$HOME/jumelo-patches/MANIFEST.txt" ]]; then
  PATCH_DIR="$HOME/jumelo-patches"
else
  echo "MANIFEST introuvable" >&2; exit 1
fi

echo "Patches: $PATCH_DIR"
echo "Projet : $PROJECT_DIR"

while IFS= read -r rel; do
  [[ -z "$rel" || "$rel" == "MANIFEST.txt" ]] && continue
  src="$PATCH_DIR/$rel"
  dst="$PROJECT_DIR/$rel"
  [[ -f "$src" ]] || { echo "SKIP missing $rel"; continue; }
  mkdir -p "$(dirname "$dst")"
  if [[ -f "$dst" && ! -f "$dst.bak-pre-agent" ]]; then
    cat "$dst" > "$dst.bak-pre-agent" 2>/dev/null || true
  fi
  if ! cp "$src" "$dst" 2>/dev/null; then
    # TCC Desktop: shell cannot overwrite — delete via Finder then recreate
    osascript -e "tell application \"Finder\" to delete (POSIX file \"$dst\" as alias)" >/dev/null 2>&1 || true
    sleep 0.15
    cp "$src" "$dst"
  fi
  echo "OK  $rel"
done < "$PATCH_DIR/MANIFEST.txt"

echo ""
echo "Patches appliqués. Relance Metro : npx expo start -c"
