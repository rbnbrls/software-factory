# Roadmap: Software Factory

## Overview

The roadmap first establishes a provider-independent Markdown workflow, then adds a local model route, isolated coding, commit-bound checks and review, and controlled deployment. Phases 1–6 deliver the first dependable application from an approved work item through deployment, with recovery and restore evidence. Phases 7–9 complete the v1 scope by adding optional tracker/orchestrator integrations, temporary Proxmox CI runners, and a tested second-provider migration. Provider, hardware, network, backup, and example-application choices remain open until their relevant phases.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Local Work Items and Queue** - Define, approve, validate, prioritize, and recover local Markdown work.
- [ ] **Phase 2: Local Model Route** - Run bounded explore, implement, and review tasks through one measured local model route.
- [ ] **Phase 3: Isolated Coding Run** - Use a disposable workspace to implement an approved item and open a linked change.
- [ ] **Phase 4: Checks and Human Review** - Verify the exact commit, run an independent review, and retain owner acceptance.
- [ ] **Phase 5: Preview and Controlled Release** - Publish an immutable artifact, preview it, and deploy only with approval.
- [ ] **Phase 6: Recovery and Operations** - Reconcile provider effects, observe failures, and prove clean-environment restore.
- [ ] **Phase 7: Tracker and Orchestrator Adapters** - Add optional interfaces without moving workflow ownership from Markdown.
- [ ] **Phase 8: Temporary CI Runners** - Move checks to disposable, isolated Proxmox-hosted runners.
- [ ] **Phase 9: Second-Provider Cutover** - Prove one service slot can migrate and roll back without changing work items.

## Phase Details

### Phase 1: Local Work Items and Queue
**Goal:** The operator can safely define, approve, prioritize, and resume work from local Markdown.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** WF-01, WF-02, WF-03, WF-04, WF-05, WF-06, WF-07, WF-08, PROJ-01
**Success Criteria** (what must be TRUE):
  1. The operator can create and validate a complete work item for any configured personal repository without a network connection or tracker.
  2. Editing scope or acceptance criteria invalidates the approval recorded for the earlier work-item revision.
  3. The queue selects only the lowest-priority eligible item, enforces dependencies, and never grants two active work-item leases.
  4. After an interruption, the operator can inspect durable run state and safely resume or close the run before another writer starts.
**Plans:** TBD

### Phase 2: Local Model Route
**Goal:** The factory can run its task profiles through one measured local model route with controlled failure behavior.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** MODEL-01, MODEL-02, MODEL-03
**Success Criteria** (what must be TRUE):
  1. Explore, implement, and review tasks can use the configured local gateway route with working streaming and tool calls.
  2. A model-route outage ends within configured bounds and does not silently send prompts to an external provider.
  3. A run record identifies the actual model route and model used, or clearly records when that information is unavailable.
**Plans:** TBD

### Phase 3: Isolated Coding Run
**Goal:** An approved item can produce a linked code change through a bounded, disposable agent run.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** RUN-01, RUN-02, RUN-03, RUN-04, RUN-05, GIT-01
**Success Criteria** (what must be TRUE):
  1. Each run gets a pinned, fresh workspace and can produce a branch and linked PR/MR for the configured repository.
  2. The agent receives only the credentials it needs and cannot access Proxmox management or production secrets.
  3. Timeouts stop execution; a human question blocks and ends the run without holding a workspace.
  4. The operator can verify that the workspace and temporary data were deleted after both success and failure.
**Plans:** TBD

### Phase 4: Checks and Human Review
**Goal:** The operator can distinguish passing checks, independent agent review, and human acceptance for the current change.
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** QUAL-01, QUAL-02, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):
  1. The operator can see deterministic check results tied to the exact commit under review.
  2. An independent read-only reviewer reports findings for that same commit without modifying implementation code.
  3. Review rejection leads to bounded rework and fresh checks/review for the changed commit.
  4. Agent approval cannot substitute for the operator's accept/reject decision.
**Plans:** TBD

### Phase 5: Preview and Controlled Release
**Goal:** The operator can inspect and release the reviewed artifact, then verify or roll it back by immutable identity.
**Mode:** mvp
**Depends on:** Phase 4
**Requirements:** DEP-01, DEP-02, DEP-03, DEP-04, DEP-05, DEP-06
**Success Criteria** (what must be TRUE):
  1. The built artifact has an immutable digest linked to the reviewed commit, and the preview runs that artifact.
  2. Production receives only the artifact explicitly authorized by the operator.
  3. Deployment health and smoke-check results are recorded, and the operator can restore a known prior digest.
  4. A rejected or closed change has its preview removed and cleanup status recorded.
**Plans:** TBD

### Phase 6: Recovery and Operations
**Goal:** The operator can understand failures across providers, reconcile uncertain actions safely, and restore the factory's required data.
**Mode:** mvp
**Depends on:** Phase 5
**Requirements:** OBS-01, EV-01, EV-02, EV-03, OPS-01, OPS-02, OPS-03
**Success Criteria** (what must be TRUE):
  1. A run is traceable from work-item revision through commit, workspace, model, checks, artifact, provider actions, outcome, and cleanup.
  2. Duplicate, delayed, or uncertain provider events/actions do not create duplicate work; state is reconciled before retry.
  3. The operator can follow correlated logs, metrics, and alerts to diagnose a failed delivery.
  4. Required data has an off-host backup, and a clean-environment restore is demonstrated before the first dependable delivery milestone is declared complete.
**Plans:** TBD

### Phase 7: Tracker and Orchestrator Adapters
**Goal:** The operator can use optional tracker and orchestration interfaces while local Markdown continues to own workflow decisions and state.
**Mode:** mvp
**Depends on:** Phase 6
**Requirements:** ADPT-01, ADPT-02, ADPT-03
**Success Criteria** (what must be TRUE):
  1. Each implemented provider slot has a declared capability contract, adapter behavior, conformance checks, and a recovery path.
  2. One selected tracker mirrors and reconciles work items without becoming the only source of their status or decisions.
  3. One selected orchestrator can start and follow runs but cannot bypass Markdown workflow gates.
**Plans:** TBD

### Phase 8: Temporary CI Runners
**Goal:** The operator can run checks on disposable CI workers isolated from agent workspaces and production.
**Mode:** mvp
**Depends on:** Phase 7
**Requirements:** CI-01, CI-02
**Success Criteria** (what must be TRUE):
  1. A CI job runs on a temporary runner separate from the coding workspace and uses the existing provider-neutral check commands.
  2. After completion or failure, the runner, job data, and credentials are removed and the outcome remains visible in run evidence.
**Plans:** TBD

### Phase 9: Second-Provider Cutover
**Goal:** The operator can replace one real provider while preserving workflow policy, history, and a safe rollback path.
**Mode:** mvp
**Depends on:** Phase 8
**Requirements:** ADPT-04
**Success Criteria** (what must be TRUE):
  1. One selected service slot passes conformance checks against a second provider implementation.
  2. Provider references and required artifacts are migrated with exactly one active writer throughout cutover.
  3. A representative work item completes the same gates on the new provider, and rollback to the prior provider is documented and demonstrated.
**Plans:** TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Local Work Items and Queue | 0/TBD | Not started | - |
| 2. Local Model Route | 0/TBD | Not started | - |
| 3. Isolated Coding Run | 0/TBD | Not started | - |
| 4. Checks and Human Review | 0/TBD | Not started | - |
| 5. Preview and Controlled Release | 0/TBD | Not started | - |
| 6. Recovery and Operations | 0/TBD | Not started | - |
| 7. Tracker and Orchestrator Adapters | 0/TBD | Not started | - |
| 8. Temporary CI Runners | 0/TBD | Not started | - |
| 9. Second-Provider Cutover | 0/TBD | Not started | - |
