# Domain Pitfalls

**Domain:** Self-hosted, agent-driven software delivery factory
**Researched:** 2026-11-22
**Confidence:** MEDIUM — the failure modes are grounded in the supplied design and official Docker, Coder, and GitHub documentation. Final providers and the actual Proxmox topology are not yet selected.

## Critical Pitfalls

### 1. Provider state quietly becomes a second workflow authority

**What goes wrong:** A tracker, orchestrator, or adapter independently changes status, ownership, or approval state. The Markdown work item and provider object then disagree, and a restart or provider outage makes it unclear which state to trust.

**Why it happens:** Adapters are built as product integrations instead of projections of one canonical state machine; provider-side actions are accepted without reconciliation.

**Consequences:** Duplicate runs, lost approval decisions, stuck work, or an unsafe release after a stale provider state is replayed.

**Prevention:** Treat the canonical work-item Markdown and validated transitions as authoritative. Give each provider slot one active writer, store external IDs only as references, use explicit field/conflict mappings, and reconcile before resuming after an outage or provider cutover. Keep integration-database rows limited to transient idempotency, correlation, and recovery data.

**Detection:** Two interfaces report different statuses; a provider object exists without its Markdown reference; a restart changes what the factory considers approved or active.

**Address in:** Phase 1 (workflow state contract) and Phase 8 (provider cutover).

### 2. Duplicate, delayed, and out-of-order events start stale or repeated work

**What goes wrong:** A webhook is replayed, arrives after a newer commit/review, or never arrives after a service outage. The adapter starts a duplicate run or lets an old event overwrite newer state.

**Why it happens:** Webhooks are treated as a reliable, ordered command queue. GitHub documents that deliveries can be out of order and failed deliveries are not automatically retried; redelivery preserves its delivery identifier.

**Consequences:** Duplicate PRs/deployments, stale approvals, lost updates, and a gap between a provider action and the recorded run.

**Prevention:** Persist and authenticate events before acknowledging them; verify provider signatures; deduplicate on delivery ID and an operation-specific idempotency key; record event timestamps and provider object versions; make event handlers propose a run rather than authorize a transition. Add polling/reconciliation for missed deliveries and query the provider before retrying an uncertain external action.

**Detection:** The same external ID produces multiple runs; a webhook timestamp predates the item’s current commit; the provider reports a failed delivery absent from local event history.

**Address in:** Phase 1 for local queue idempotency; Phase 6 for durable events and reconciliation; repeat in every provider adapter conformance suite.

### 3. Untrusted repository code crosses into host, runner, or production privileges

**What goes wrong:** A workspace or CI job can access the Docker daemon, host mounts, runner-management credentials, Proxmox APIs, or production deploy secrets. Malicious build scripts or dependencies can then escape the intended project boundary.

**Why it happens:** A container is mistaken for a VM boundary; Docker socket access is treated as an ordinary build capability; persistent self-hosted runners are reused across untrusted code. Docker warns that controlling a rootful daemon grants powerful host access. GitHub warns that untrusted pull-request code can compromise self-hosted runners.

**Consequences:** Host compromise, credential theft, cross-project contamination, unauthorized deployments, or persistence into later runs.

**Prevention:** Keep Docker off the Proxmox host. Run workspace and CI execution in separate managed VMs or equivalent boundaries; never mount a privileged Docker socket or Proxmox credential into agent code. Use disposable, clean workspaces/runners, least-privilege stage-specific tokens, short-lived credentials, read-only reviewer contexts, and no production secrets for build/test code. Configure PR workflows so elevated triggers never execute untrusted checkout content.

**Detection:** A run can list host mounts or runner environment secrets; workspaces retain untracked files between runs; runner-management or production credentials appear in build environments.

**Address in:** Before Phase 3 provisioning; enforce again in Phase 4 review/CI and Phase 5 deployment.

### 4. An approval or successful check is reused for a different change

**What goes wrong:** The work item’s scope, acceptance criteria, PR head, or artifact changes after approval/review, but the old approval or check still unlocks a later transition.

**Why it happens:** Gates are recorded as booleans instead of evidence bound to a specific work-item revision, commit, artifact digest, and policy version.

**Consequences:** Humans approve one change while a different commit reaches production; stale CI or review evidence is mistaken for current evidence.

**Prevention:** Bind approval to the approved content hash/scope revision and bind checks and agent review to an exact commit. Invalidate gates on scope or acceptance-criteria changes. Require a separate read-only reviewer context and verify that the deployment artifact corresponds to the latest approved commit before publishing.

**Detection:** A `ready` or deployment transition has no commit/revision reference; the PR head differs from the reviewed SHA; acceptance criteria changed without renewed approval.

**Address in:** Phase 1 (approval and transition model), Phase 4 (checks/review), and Phase 5 (release authorization).

### 5. “Stopped” is mistaken for cleaned up, leaving workspaces and secrets behind

**What goes wrong:** A run ends or times out, but the workspace is only stopped; persistent home volumes, credentials, processes, or orphaned resources remain and are reused by another run.

**Why it happens:** Workspace lifecycle operations are asynchronous and templates may declare persistent resources. Coder distinguishes stopped from deleted: deletion destroys resources, while a stopped workspace can retain persistent state. Failed or unhealthy workspaces and orphan-resource paths also exist.

**Consequences:** Cross-run context leakage, disk/resource exhaustion, stale credentials, or hidden costs on a 24/7 host.

**Prevention:** Pin the template version per run; design `factory-run` resources as ephemeral; delete the workspace after artifact publication; verify the workspace and temporary volumes are actually gone. Record cleanup outcomes, inventory orphans, set bounded timeouts, and test cleanup after provision failure, agent crash, and network loss. Keep a separate persistent developer template for human use.

**Detection:** A completed run still has a running/stopped Coder workspace or a volume; the next run sees prior home-directory files; an API success is logged without checking final resource state.

**Address in:** Phase 3 (workspace adapter and templates), with periodic orphan detection in Phase 6.

### 6. Expired lease is treated as proof the old run stopped

**What goes wrong:** A process pauses or loses connectivity while holding work, its lease expires, and the queue starts another run even though the old workspace can still write code or call providers.

**Why it happens:** Lease expiry is used as a liveness check rather than a signal to reconcile the run and its external side effects.

**Consequences:** Two agents act on the same item, duplicate external objects are created, or a late old run overwrites newer state.

**Prevention:** On lease expiry, query run/workspace/provider state first. Resume the same run only when its identity and side effects are known; otherwise mark it interrupted, revoke or terminate its execution capability, record completed external actions, then start a new run with a new ID. Make claim and status-file changes atomic and preserve append-only history.

**Detection:** A lease can expire while an execution process is still active; the system starts a new run without a provider/workspace check; two run IDs have write access to the same item.

**Address in:** Phase 1 (queue/lease recovery); exercise hard crashes again in Phase 6.

### 7. Mutable tags or stale deployment events select the wrong artifact

**What goes wrong:** A deployment refers to a mutable image tag or an event from an older build. A retry or delayed event deploys an older image over a newer approved release.

**Why it happens:** The workflow correlates on branch/PR or tag names rather than immutable commit and artifact identity, or records provider success without verifying the deployed digest.

**Consequences:** The running application does not match the reviewed source; rollback may restore an unintended build; deployment status becomes misleading.

**Prevention:** Carry work-item UUID, run ID, commit SHA, registry digest, deployment ID, and environment through each stage. Deploy and rollback by immutable digest; reject stale events against the currently desired release; verify health/smoke checks against the deployed artifact and record results before completing the item.

**Detection:** A deployment record lacks an image digest/commit SHA; the current deployment digest differs from its work item; an older event can alter desired production state.

**Address in:** Phase 5 (artifact/deployment contract), test delayed and duplicate events in Phase 6.

### 8. The factory cannot recover itself after its own deployment service fails

**What goes wrong:** The factory depends on a deployment provider or service it manages, and that dependency is unavailable during an outage. Backups consist only of VM snapshots or have never been restored outside the source host.

**Why it happens:** Service installation is mistaken for recoverability; bootstrap configuration, encryption keys, database-consistent backups, and provider metadata are not preserved independently.

**Consequences:** The operator cannot restore workflow state, secrets/configuration, or essential provider references after host or service loss.

**Prevention:** Keep a manual, independently executable bootstrap and recovery path for factory management services. Back up canonical Markdown, templates, required service data, encrypted configuration/keys, and non-reconstructible provider metadata; keep at least one copy off the Proxmox host. Test restore on a clean environment and verify work-item reconciliation before resuming runs. A VM snapshot alone is not restore evidence.

**Detection:** Restore procedures require the unavailable deployment UI; backups are only on the same physical server; no clean-room restore has been completed.

**Address in:** Define during Phase 0; implement and prove in Phase 6 before production use.

## Moderate Pitfalls

### Building a generic plugin framework before proving a second provider

**What goes wrong:** Time is spent designing abstract provider machinery and supporting many products before one end-to-end path is reliable.

**Prevention:** Define the smallest stable service contract and capability description needed by the first selected provider. Implement conformance tests and a migration path, then add a second provider only when a real migration test can validate the abstraction.

**Address in:** Phases 2–5 for the chosen vertical path; Phase 8 for validating provider portability.

### Silent model routing or prompt/tool transformations change agent behavior

**What goes wrong:** A gateway falls back externally, rewrites prompts, compresses tool output, or changes the selected model without a recorded policy decision.

**Prevention:** Keep external fallback and behavior-changing routing disabled initially; bound retries/timeouts; test streaming and tool calls on representative work; record the actual model/provider per run and fail clearly when the route is unavailable.

**Address in:** Phase 2 (model route) and Phase 6 (operational alerts).

## Phase-Specific Warnings

| Phase | Likely pitfall | Mitigation |
|---|---|---|
| 1 — Markdown workflow and CLI | Non-atomic status changes, unsafe lease expiry, or scope changes retaining approval | Schema validation, atomic mutations, append-only run evidence, revision-bound approval, crash/restart and duplicate-claim cases |
| 2 — Model route | Unintended external fallback or untested tool/stream behavior | One internal route, bounded failure, explicit model provenance, representative task evaluations |
| 3 — Coder and agent execution | Persistent workspaces, privileged Docker access, or provisioner assumptions not supported by the chosen Coder edition | Prove a supported Docker-VM provisioning path; pin templates; isolate and verify deletion/cleanup |
| 4 — Checks and review | Reviewer sees mutable implementation state or approves stale commits | Separate read-only context; bind all evidence to commit SHA; invalidate after changes |
| 5 — Deployment | Mutable image identity or approval bypass | Deploy by digest; enforce human gate and branch/release policy; health-check the exact artifact |
| 6 — Reliability | Duplicate/lost events and untested restore | Verify webhook signature, durable inbox, idempotency/reconciliation; restore into a clean environment |
| 7 — Proxmox CI runners | Persistent runners retain malicious state or credentials | Disposable runner lifecycle, stage-specific credentials, tested cleanup, no production access |
| 8 — Provider switch | Two providers write concurrently or reference IDs are lost | Pause writes, reconcile/migrate references, run one end-to-end item, enforce single active writer and documented rollback |

## Sources

- Project-specific failure cases and boundaries: [`software-factory-projectplan.md`](../../software-factory-projectplan.md), especially sections 2–3, 5, 9, 11–14.
- [Docker Engine security](https://docs.docker.com/engine/security/) — rootful daemon attack surface, host mounts, and capability reduction.
- [Coder workspace lifecycle](https://coder.com/docs/user-guides/workspace-lifecycle/) — stopped/deleted behavior, persistent resources, and failed/unhealthy/orphan states.
- [GitHub webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks) — signatures, delivery IDs, short acknowledgement, redelivery.
- [GitHub webhook troubleshooting](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/troubleshooting-webhooks) — out-of-order event delivery and timestamps.
- [GitHub Actions security: pull_request_target](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target) — untrusted PR code and elevated secrets/token risks.
- [GitHub self-hosted runner security](https://docs.github.com/en/organizations/managing-organization-settings/disabling-or-limiting-github-actions-for-your-organization#limiting-the-use-of-self-hosted-runners) — untrusted code can compromise persistent runners and access their credentials.
