# Phase 1: Local Work Items and Queue - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-11-22
**Phase:** 1-Local Work Items and Queue
**Areas discussed:** Creating and approving work items, Queue visibility, Starting the local demo run

---

## Creating and approving work items

| Option | Description | Selected |
|--------|-------------|----------|
| Write Markdown directly | Operator creates and edits the canonical file; CLI validates and manages transitions. | ✓ |
| CLI creates editable starter | CLI scaffolds a file that the operator edits. | |
| Interactive CLI form | CLI prompts for all work-item fields. | |

**User's choice:** Write Markdown directly.
**Notes:** The operator also edits priority directly in Markdown. A priority selection was initially sent numerically, then clarified as direct Markdown editing.

### Approval preview

| Option | Description | Selected |
|--------|-------------|----------|
| Summary then confirm | Show the item summary and ask for confirmation before recording approval. | ✓ |
| Open the Markdown for review, then confirm | Open the source file before asking for approval. | |
| Just require an explicit approve command | Record approval without showing a summary or second confirmation. | |

**User's choice:** Summary then confirm.
**Notes:** Scope or acceptance-criteria edits after approval block the item until reapproval.

---

## Queue visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Next eligible item plus a short count summary | Keep routine inspection concise. | ✓ |
| All ready and blocked items with reasons | Show every item on each inspection. | |
| Explain the blockers and item IDs when idle | Diagnose why no item can run. | ✓ |
| JSON by default for automation | Make queue output machine-readable without an extra flag. | ✓ |
| Human-readable summary; JSON via a flag | Prioritize interactive terminal use. | |
| Success with an explicit idle status | Treat no eligible work as a normal queue state. | ✓ |
| Non-zero to signal no work | Treat idle as a command failure. | |

**User's choice:** JSON output by default; show the next eligible item and short counts, include blocker IDs when idle, and return a successful explicit idle status.
**Notes:** The human-readable diagnostic wording remains an implementation choice.

---

## Starting the local demo run

| Option | Description | Selected |
|--------|-------------|----------|
| Run one item, then exit | Process only one eligible work item per invocation. | |
| Process ready items until idle | Execute eligible approved items sequentially until none remain. | ✓ |
| A deterministic run receipt only | Demonstrate lifecycle state without a sample output artifact. | |
| A small harmless sample artifact plus receipt | Make each demonstration result visible and auditable. | ✓ |
| Mark the failed item blocked and continue | Preserve other eligible work after one item fails. | ✓ |
| Stop the batch on the first failure | Require operator action before proceeding. | |
| Inspect and resume if safe | Reconcile state after interruption and continue the same run only when safe. | ✓ |
| Require explicit resume command | Always require a separate operator command after interruption. | |

**User's choice:** Drain ready items until idle; create a harmless sample artifact and receipt; block a failed item and continue; inspect and resume an interrupted run only when safe.
**Notes:** The plan's constraints remain: no arbitrary shell commands, and a run ends rather than waiting for human input.

---

## the agent's Discretion

- Exact command names, JSON field names, sample artifact content/location, and human-readable diagnostic wording, as long as the captured decisions and project-plan acceptance criteria are preserved.

## Deferred Ideas

None.
