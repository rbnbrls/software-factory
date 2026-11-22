# Requirements: Software Factory

**Defined:** 2026-11-22  
**Core Value:** One approved work item can move safely and traceably from idea to a tested, human-reviewed deployment, and the workflow can recover after failures without losing its authoritative state.

## v1 Requirements

All categories are in v1. The first meaningful milestone is one complete app delivery; temporary CI runners and a second-provider migration follow that vertical delivery path.

### Workflow and Projects

- [ ] **WF-01**: The operator can create a canonical work item as local Markdown without a tracker.
- [ ] **WF-02**: Each work item has a persistent ID, category, priority, scope, acceptance criteria, dependencies, approvals, provider references, and run history.
- [ ] **WF-03**: Approval is bound to a work-item revision and becomes invalid if scope or acceptance criteria change.
- [ ] **WF-04**: The CLI validates status transitions and atomically updates status and work-item location.
- [ ] **WF-05**: The queue chooses the lowest-priority ready item whose dependencies are complete, and rejects unknown dependencies and cycles.
- [ ] **WF-06**: At most one work item is globally active; a lease prevents duplicate execution.
- [ ] **WF-07**: After interruption or lease expiry, the factory checks the run and provider state before resuming or starting a replacement run.
- [ ] **WF-08**: The operator can validate and use the local workflow without a network connection or optional provider.
- [ ] **PROJ-01**: The operator can configure multiple personal project repositories with distinct provider references and policy.

### Model

- [ ] **MODEL-01**: The factory can run explore, implement, and review tasks through one tested local model route.
- [ ] **MODEL-02**: Tool calls, streaming, and bounded model failure work through the configured model gateway.
- [ ] **MODEL-03**: Run records identify the actual model route and model; external fallback is disabled unless explicitly configured.

### Agent Execution

- [ ] **RUN-01**: The factory provisions a disposable, version-pinned agent workspace for each run.
- [ ] **RUN-02**: The agent follows the work-item task contract within a bounded timeout.
- [ ] **RUN-03**: Agent workspaces receive only stage-specific credentials and no Proxmox-management or production secrets.
- [ ] **RUN-04**: When a run needs human input, it records the question, marks the item blocked, and releases its workspace.
- [ ] **RUN-05**: Workspace deletion, including temporary persistent data, is verified after success and failure.

### Git, Checks, Review, and CI

- [ ] **GIT-01**: A run can create a change on one configured git provider and link its branch and PR/MR to the work item.
- [ ] **QUAL-01**: Deterministic checks are recorded against the exact commit SHA being considered.
- [ ] **QUAL-02**: An independent reviewer evaluates that commit in a read-only context.
- [ ] **QUAL-03**: Rework is bounded; changed code receives fresh checks and review evidence.
- [ ] **QUAL-04**: The operator can accept or reject the reviewed change; agent review does not replace human acceptance.
- [ ] **CI-01**: Checks run on temporary CI runners separate from agent workspaces.
- [ ] **CI-02**: CI runner credentials and working data are removed after each job.

### Artifact and Release

- [ ] **DEP-01**: A successful build publishes an immutable artifact and records its digest.
- [ ] **DEP-02**: The operator can inspect a preview built from the artifact tied to the reviewed commit.
- [ ] **DEP-03**: Production deployment requires explicit operator authorization for that artifact.
- [ ] **DEP-04**: The factory records deployment health and smoke-check results.
- [ ] **DEP-05**: The operator can roll back to a known prior artifact digest.
- [ ] **DEP-06**: Rejected or closed work removes its preview and records cleanup status.

### Reliability and Operations

- [ ] **OBS-01**: Each run records its work item and revision, commit, workspace/template version, model/skills, checks, artifacts, provider IDs, outcome, and cleanup status.
- [ ] **EV-01**: Provider events are authenticated and durably recorded before acknowledgment, or handled through a documented polling path.
- [ ] **EV-02**: Duplicate events and external actions are safely deduplicated.
- [ ] **EV-03**: The factory reconciles uncertain provider actions before retrying them.
- [ ] **OPS-01**: Logs, metrics, and alerts let the operator trace a failure across a run and its provider actions.
- [ ] **OPS-02**: Canonical workflow records and required service data are backed up off the Proxmox server.
- [ ] **OPS-03**: A restore to a clean environment is tested.

### Provider Portability

- [ ] **ADPT-01**: Each provider slot has a capability contract, adapter, conformance checks, and recovery notes.
- [ ] **ADPT-02**: The operator can connect one optional tracker that mirrors work items while Markdown remains canonical.
- [ ] **ADPT-03**: The operator can connect one orchestrator to start runs without transferring ownership of workflow state.
- [ ] **ADPT-04**: The operator can migrate one service slot to a second provider with one active writer, reconciled references, and a documented rollback.

## v2 Requirements

None currently. Provider portability, temporary CI runners, and a second-provider migration are included in v1 as requested.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Autonomous merges or production releases | The operator retains explicit authority over integration and production deployment. |
| Unlimited concurrent agent teams | Start with one active work item so claims and recovery remain understandable and verifiable. |
| Kubernetes | Linux VMs and Docker Compose meet the initial self-hosted architecture without adding cluster operations. |
| Custom ticket application | Local Markdown is the canonical workflow; a tracker is an optional adapter. |
| Custom model trainer | Model training is not required to prove the delivery workflow. |
| Automatic external model fallback | External providers remain disabled initially so model routing stays controlled and auditable. |
| Autonomous database repair | Recovery and destructive data changes require a reviewable plan and human authorization. |

## Traceability

Which phase covers each requirement. Each v1 requirement is assigned to exactly one phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WF-01 | Phase 1 | Pending |
| WF-02 | Phase 1 | Pending |
| WF-03 | Phase 1 | Pending |
| WF-04 | Phase 1 | Pending |
| WF-05 | Phase 1 | Pending |
| WF-06 | Phase 1 | Pending |
| WF-07 | Phase 1 | Pending |
| WF-08 | Phase 1 | Pending |
| PROJ-01 | Phase 1 | Pending |
| MODEL-01 | Phase 2 | Pending |
| MODEL-02 | Phase 2 | Pending |
| MODEL-03 | Phase 2 | Pending |
| RUN-01 | Phase 3 | Pending |
| RUN-02 | Phase 3 | Pending |
| RUN-03 | Phase 3 | Pending |
| RUN-04 | Phase 3 | Pending |
| RUN-05 | Phase 3 | Pending |
| GIT-01 | Phase 3 | Pending |
| QUAL-01 | Phase 4 | Pending |
| QUAL-02 | Phase 4 | Pending |
| QUAL-03 | Phase 4 | Pending |
| QUAL-04 | Phase 4 | Pending |
| DEP-01 | Phase 5 | Pending |
| DEP-02 | Phase 5 | Pending |
| DEP-03 | Phase 5 | Pending |
| DEP-04 | Phase 5 | Pending |
| DEP-05 | Phase 5 | Pending |
| DEP-06 | Phase 5 | Pending |
| OBS-01 | Phase 6 | Pending |
| EV-01 | Phase 6 | Pending |
| EV-02 | Phase 6 | Pending |
| EV-03 | Phase 6 | Pending |
| OPS-01 | Phase 6 | Pending |
| OPS-02 | Phase 6 | Pending |
| OPS-03 | Phase 6 | Pending |
| ADPT-01 | Phase 7 | Pending |
| ADPT-02 | Phase 7 | Pending |
| ADPT-03 | Phase 7 | Pending |
| CI-01 | Phase 8 | Pending |
| CI-02 | Phase 8 | Pending |
| ADPT-04 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0 ✓

---
*Requirements defined: 2026-11-22*
*Last updated: 2026-11-22 after roadmap creation*
