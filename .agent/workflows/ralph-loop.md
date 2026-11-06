---
description: Autonomous Ralph Loop execution workflow (PRD.md -> single task -> verify -> progress.txt -> commit)
---

# Ralph Loop Workflow for Antigravity

The **Ralph Loop** runs autonomous development cycles using disk memory to eliminate context rot:

```
┌────────────────────────────────────────────────────────┐
│                   RALPH LOOP CYCLE                     │
│                                                        │
│  1. Read PRD.md (Task list, read-only specification)   │
│  2. Read progress.txt (Current completed milestones)   │
│  3. Pick NEXT SINGLE atomic uncompleted task           │
│  4. Implement code with minimal changes (Ponytail rule)│
│  5. Run automated test suite (Zero regression gate)    │
│  6. Git commit atomic change                           │
│  7. Append completion details to progress.txt          │
│  8. Loop until all tasks in PRD.md are completed       │
└────────────────────────────────────────────────────────┘
```

### Ralph Loop Files
* `PRD.md`: Master specification of pending features and tasks.
* `progress.txt`: Append-only journal of completed items, roadblocks, and decisions.
* `scripts/ralph.ps1`: Automated PowerShell loop runner.

