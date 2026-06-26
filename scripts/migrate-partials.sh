#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

for src in src/partials/*.mdx; do
  partial=$(basename "$src" .mdx)
  # Find a wrapper importing exactly this partial; prefer the latest version so
  # the canonical title/description come from it. Exact ".mdx" avoids prefix
  # collisions (nik-containers vs nik-containers-hardened).
  w=$(grep -rl "@partials/${partial}\.mdx" src/content/docs | grep '25.0.3b11' | head -1 || true)
  [ -z "$w" ] && w=$(grep -rl "@partials/${partial}\.mdx" src/content/docs | head -1)
  if [ -z "$w" ]; then echo "WARN: no wrapper for $partial" >&2; continue; fi
  # Target path = wrapper path with the version segment removed.
  target=$(echo "$w" | sed -E 's#/(25\.0\.3b11|21\.0\.6b10)##')
  mkdir -p "$(dirname "$target")"
  # Frontmatter (lines 1-5 of every wrapper) with the version stripped from the
  # slug, a blank line, then the partial body.
  { sed -n '1,5p' "$w" | sed -E '/^slug:/ s#/(25\.0\.3b11|21\.0\.6b10)##'; echo; cat "$src"; } > "$target"
  # Partials referenced TagPicker via a relative path from src/partials/; from
  # src/content/docs/ that path is wrong — use the @components alias.
  sed -i "s#from '\.\./components/#from '@components/#g" "$target"
done
