# Emergence Roadmap Status

Fetch and display the current project roadmap from GitHub Issues.

## Steps

1. Run the following commands to gather roadmap data:

```bash
echo "=== OPEN ROADMAP ITEMS ==="
gh issue list --label roadmap --json number,title,labels --jq '.[] | "#\(.number) \(.title) [\(.labels | map(.name) | join(", "))]"'

echo ""
echo "=== STASHED IDEAS ==="
gh issue list --label idea --json number,title,labels --jq '.[] | "#\(.number) \(.title) [\(.labels | map(.name) | join(", "))]"'

echo ""
echo "=== RECENTLY COMPLETED ==="
gh issue list --label roadmap --state closed --json number,title,closedAt --jq '.[:5] | .[] | "#\(.number) \(.title) (closed \(.closedAt | split("T")[0]))"'
```

2. Read the memory file for current focus:
   Read: `~/.claude/projects/-Users-austinbrace-Developer-fullcreative/memory/MEMORY.md`

3. Present the results in this format:

```
EMERGENCE ROADMAP

Current Focus: [from MEMORY.md]

Open Roadmap (by phase):
  Phase 1 - Cognitive Depth:
    [P1-high items first, then P2-medium, then untagged]
  Phase 2 - Environmental Richness:
    ...
  Phase 3 - Social Dynamics:
    ...
  Phase 4 - Spectator Intelligence:
    ...
  Phase 5 - Deep Evolution:
    ...

Stashed Ideas:
  [idea-labeled items]

Recently Completed:
  [last 5 closed roadmap items with dates]
```

## Quick Actions

Remind the user of these commands:
- `gh issue create --label roadmap --title "..."` - add a roadmap item
- `gh issue close <number>` - mark done
- `gh issue edit <number> --add-label idea --remove-label roadmap` - stash for later
- `gh issue edit <number> --add-label roadmap --remove-label idea` - promote idea to roadmap
