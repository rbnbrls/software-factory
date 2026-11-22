# Phase 1: Local Work Items and Queue - Context

**Gathered:** 2026-11-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the local, provider-independent Markdown workflow and CLI for the operator's personal project repositories. The operator writes and prioritizes work items directly in Markdown, reviews a summary before approving a specific revision, and uses the CLI to validate, inspect, and execute the queue. The queue remains globally serial and recovers safely from interruptions. A built-in demonstration runner exercises the lifecycle with a harmless sample artifact and run receipt; it must not execute arbitrary repository shell commands. Phase 1 excludes external tracker, git-host, model, workspace, CI, and deployment integrations.

</domain>

<decisions>
## Implementation Decisions

### Work-item authoring and approval
- **D-01:** The operator creates and edits work-item Markdown directly. The CLI validates those files and owns controlled status transitions.
- **D-02:** The operator edits priority directly in Markdown; the CLI validates that the value fits the item category and queue rules.
- **D-03:** An approval command presents a summary of the work item and asks for confirmation before recording approval for the current revision.
- **D-04:** If scope or acceptance criteria change after approval, the CLI marks the item blocked until the operator approves the revised item.

### Queue visibility
- **D-05:** Queue inspection defaults to JSON for automation. This output is a CLI contract; changing it after scripts depend on it would require compatibility handling. — **Reversibility:** costly — callers may depend on field names and exit/status semantics.
- **D-06:** Queue output includes the next eligible item and a short count summary.
- **D-07:** If no item is eligible, output explains the blockers and names affected work-item IDs.
- **D-08:** An idle queue is a successful, explicit state for scripts, not an error exit.

### Local demo execution
- **D-09:** One CLI invocation processes eligible approved items sequentially until the queue is idle.
- **D-10:** The built-in demo runner writes a small harmless sample artifact and a run receipt. It does not execute arbitrary shell commands.
- **D-11:** If one demo run fails, the CLI blocks that item and continues with other eligible items.
- **D-12:** After a process interruption, the next run inspects the active run and provider/local state, then resumes the same run only when safe; otherwise it records interruption before starting a replacement.
- **D-13:** A run ends when human input or acceptance is required. The CLI records the pending decision; it does not keep a run waiting for the operator.

### Carried forward from project decisions
- Work items are canonical local Markdown with a persistent UUID, human-readable fields, and machine-readable status metadata. Status transitions and file moves are validated and atomic.
- The queue selects the lowest-priority eligible item from `ready/`; all dependencies must be `done`. Unknown dependencies and cycles are validation errors. A blocked item does not hold the global active slot or prevent unrelated eligible work.
- The operator sets priorities in Phase 1. Scope changes require human reapproval. Checks, agent review, and human acceptance remain distinct decisions.
- Phase 1 includes only a built-in demonstration runner behind an explicit runner interface. External providers and arbitrary shell execution are out of scope.

### the agent's Discretion
- Exact CLI command names, work-item filename conventions beyond the persistent UUID requirement, JSON field naming, sample artifact content/location, and the human-readable diagnostic wording, provided the decisions above and the project plan's acceptance criteria are preserved.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope, workflow, and acceptance
- `software-factory-projectplan.md` §2 — workflow terms, canonical Markdown, priority bands, serial queue, approval invalidation, and safe run recovery.
- `software-factory-projectplan.md` §6 — required work-item content and the separate human approval/review/deployment gates.
- `software-factory-projectplan.md` §11, Phase 1 — explicit demo-runner boundary, local CLI behavior, queue rules, interruption handling, and acceptance criteria.
- `.planning/PROJECT.md` — project vision, core value, hosting/security constraints, and locked project decisions.
- `.planning/REQUIREMENTS.md` — phase requirements WF-01–WF-08 and PROJ-01.
- `.planning/ROADMAP.md` — Phase 1 goal, dependencies, and observable success criteria.
- `.planning/research/SUMMARY.md` — research implications for local workflow, state ownership, and recovery.

### Repository guidance and current state
- `README.md` — intended local CLI commands and the documented toolchain; it currently describes a local TypeScript CLI that is absent from the working tree.
- `project-setup.md` — repository organization and agent-instruction conventions.
- `AGENTS.md` — current GSD workflow and project guidance.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No current source implementation is present in the working tree. The documented project plan, README, and setup guide are the reusable design assets.

### Established Patterns
- `README.md` specifies a Node.js/npm/TypeScript CLI with `check`, `test`, and `cli` commands, but the corresponding `package.json`, lockfile, TypeScript configuration, `src/`, and `test/` files are absent from the current working tree. Resolve this documentation/worktree discrepancy before relying on existing implementation patterns.
- `project-setup.md` favors responsibility boundaries, minimal structure, explicit adapter interfaces, and documented commands; it treats example repository layouts as guidance rather than templates.

### Integration Points
- The CLI will create or update canonical Markdown under `factory/work-items/{ready,in-progress,blocked,done}/`, validate `factory/WORKFLOW.md` and the work-item schema, and append run records under `factory/runs/` as described by the project plan.
- No existing TypeScript modules or tests are available to extend in the current worktree.

</code_context>

<specifics>
## Specific Ideas

- The demonstration run should leave a small, harmless sample artifact as well as a run receipt, so its result is visible and auditable without executing arbitrary project commands.
- Queue output should be automation-first JSON, with an explicit idle result and blocker details when no item can run.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 1 scope.

</deferred>

---

*Phase: 1-Local Work Items and Queue*
*Context gathered: 2026-11-22*
