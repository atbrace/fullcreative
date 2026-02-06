#!/bin/bash
# Roadmap hygiene hook - runs on Claude Code session stop.
# If implementation work was done, reminds to close completed issues and update MEMORY.md.

UNCOMMITTED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
STAGED=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
RECENT_COMMITS=$(git log --oneline --since="30 minutes ago" 2>/dev/null | wc -l | tr -d ' ')

if [ "$UNCOMMITTED" -gt 0 ] || [ "$STAGED" -gt 0 ] || [ "$RECENT_COMMITS" -gt 0 ]; then
  echo '{"ok":false,"reason":"Roadmap hygiene: run gh issue list --label roadmap and close any completed issues. Update MEMORY.md current focus if changed."}'
else
  echo '{"ok":true}'
fi
