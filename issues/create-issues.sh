#!/usr/bin/env bash
# Creates the labels + provider issues on github.com/bristinWild/cliper-sdk
# Requires: gh CLI, authenticated (gh auth login), repo public or you as owner.
set -e
REPO="bristinWild/cliper-sdk"

# Labels (idempotent-ish: ignore "already exists" errors)
gh label create "provider"         --repo $REPO --color 6D5DFB --description "New memory provider implementation" || true
gh label create "help wanted"      --repo $REPO --color 22C55E --description "Extra attention is needed" || true
gh label create "good first issue" --repo $REPO --color F59E0B --description "Good for newcomers" || true

for f in neo4j memgraph pgvector graphiti lancedb supermemory local-json; do
  title=$(grep -m1 '^title:' "$f.md" | sed 's/title: *"\(.*\)"/\1/')
  # strip the frontmatter for the body
  body=$(sed '1,/^---$/d' "$f.md" | sed '1,/^---$/d')
  gh issue create --repo $REPO \
    --title "$title" \
    --label "provider" --label "help wanted" --label "good first issue" \
    --body "$body"
  echo "Created: $title"
done
