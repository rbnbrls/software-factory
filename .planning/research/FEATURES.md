# Feature Landscape

**Domain:** Self-hosted, Markdown-driven software delivery factory for one operator and multiple personal projects
**Researched:** 2026-11-22
**Confidence:** MEDIUM — the project plan is detailed and authoritative for intended behavior; official docs confirm selected GitHub and Coder capabilities, but provider candidates and the final first application remain to be selected.

## Table Stakes

Capabilities required for the factory to deliver its core promise. The first complete delivery should include a narrow, working version of each relevant item.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Canonical, reviewable work item | The operator needs a durable statement of requested behavior, acceptance criteria, scope exclusions, dependencies, repository, and required preview. | Medium | Local Markdown is the authoritative record; tracker records are optional projections. Bind each approval to a revision/hash so edits during execution invalidate approval. |
| Safe status transitions and a durable queue | A 24/7 factory must make it clear what is ready, active, blocked, or complete and must not duplicate work after restart. | High | Local CLI validates transitions, unique priorities, dependencies, and cycles; use a global single-run claim/lease initially. A blocked item must not stall unrelated ready work. |
| Isolated, bounded agent execution | Repository code and agent actions must not gain access to factory management or production credentials. | High | Use a disposable `factory-run` workspace with a pinned template/image, minimal credentials, a hard deadline, and explicit termination. The project plan requires Linux VM / Docker isolation and forbids running arbitrary project code on the Proxmox host. |
| Deterministic, commit-specific checks | A passing check must mean the exact reviewed code passed the project’s agreed tests, lint/type checks, build, and smoke checks. | Medium | Re-run checks for the latest commit and after merge where the merge commit differs. Persist the full commit SHA and result; skipped or stale checks must not satisfy policy by accident. GitHub's protected-branch and status-check controls can enforce required reviews/checks at the branch boundary, subject to the chosen provider's capabilities. |
| Independent review and human acceptance | Automated checks and an agent reviewer catch different failure classes; the owner retains scope and merge decisions. | Medium | Reviewer receives a fresh, read-only context and comments against a specific commit. Review findings lead to bounded rework; changed scope returns to the owner. Do not treat agent review as human approval. |
| Reviewable preview from the intended artifact | The owner needs to inspect the running change before release, and the preview must correspond to the commit under review. | High | Associate preview URL/resource and immutable image digest with the PR/work item. A later build must not silently overwrite the preview; PR closure or rejection removes it. |
| Explicit production release gate and post-deploy verification | A factory is not complete when code is merged; production is a distinct, higher-risk action. | High | Deploy only an authorized release/artifact digest. Save deployment identity, environment/config version, healthcheck and smokecheck results. Keep rollback bounded and based on a known previous digest. If provider-side required-review features vary by plan/visibility, preserve the canonical Markdown approval gate. |
| Run evidence and operator-readable results | When a run fails at any provider boundary, the owner needs to know what changed and what action is pending. | Medium | Record work-item revision, run/task IDs, commit, workspace/template version, skills and model, timings/exit status, check/review results, artifacts, external IDs, and cleanup state. Publish a concise outcome and next human action into the work item. |
| Reconciliation, idempotency, and safe recovery | External APIs, callbacks, and local storage cannot be committed atomically together; blind retries can create duplicate PRs or deployments. | High | Persist intent before external writes; deduplicate event/action IDs; look up effects before retry; check lease expiry against actual runner state. Resume the same run only when safe, otherwise mark it interrupted and require explicit disposition. |
| Explicit workspace and preview cleanup | Temporary workspaces and previews can retain source, credentials, or cost after a run. | Medium | Delete resources by recorded provider ID and verify deletion; `stop` is not equivalent to delete. Coder documents that a delete build runs `terraform destroy` for persistent and ephemeral resources, whereas stopping preserves persistent resources. |

## Differentiators

Capabilities that make this factory fit its stated operating model especially well.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Local Markdown remains usable without providers | Work can still be defined, inspected, and resumed if a tracker, git host, orchestrator, or network service is unavailable. | Medium | The provider interfaces may execute work, but cannot become a second, unreconciled state machine. |
| Replaceable service slots with conformance and cutover | The owner can change a tracker, git host, model gateway, runner, or deploy provider without rewriting work items and task policy. | High | Add an adapter only when a concrete provider is needed. Maintain one active writer and an explicit migration/rollback procedure per slot. |
| Single operator, multi-project workflow | One operator can apply the same work-item and approval discipline across distinct repositories without building a multi-tenant ticket product. | Medium | Configure repository bindings, provider resources, branches, and environments per project; keep the central factory state separate from application code. |
| Offline/local CLI path | The factory’s most basic workflow remains inspectable and testable without a tracker or hosted orchestrator. | Medium | The plan explicitly starts with a local Markdown queue and demo task before external integrations. |
| Human questions end a run cleanly | Agents do not hold scarce workspaces while waiting for decisions. | Low | Write questions to the item, transition it to `blocked`, end the run, and start a new run after an owner decision. |
| Evidence-linked deployment and recovery | A release can be traced from approved work item to commit, check results, image digest, deployment, and rollback. | High | This is more useful than a collection of independent service dashboards; use a stable correlation ID across adapters and logs. |

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Autonomous merge or production release | Removes the project’s explicit human authority over scope and production. | Require owner approval before merge/integration and a separate release authorization where policy requires it. |
| A hosted tracker or orchestrator as the only source of state | Outages or provider changes would make work impossible to understand or recover. | Keep state and decisions in local Markdown; sync external systems as projections and execution services. |
| Unbounded concurrency or agent teams in v1 | Makes branch, workspace, lease, and recovery races harder to reason about before the single-run path is proven. | Start with one globally active work item; increase concurrency only after the integration and recovery tests pass. |
| A custom ticket application or generic plugin framework | Both add product surface without improving the first complete delivery. | Use Markdown and small typed provider adapters; build a second provider only when a real migration/use case requires it. |
| Kubernetes or Docker directly on the Proxmox host | Adds operational burden or collapses the boundary between management and untrusted project code. | Use Linux VMs and Compose for base services; place runner containers inside a dedicated execution VM and document the residual shared-kernel risk. |
| Long-running runs waiting for a person | Holds resources and makes recovery ambiguous. | Record the question, mark the item blocked, release the workspace, and resume through a new run after a decision. |
| Automatic external model fallback | Can send prompts to an unintended provider and make model use hard to audit. | Keep external providers/fallback off initially; record the actual route/model and fail in a bounded way. |
| Automatic database/schema recovery by an agent | A failed automated repair can compound data loss and leave no clear recovery point. | Require an explicit, reviewable migration/restore plan and human authorization for destructive recovery. |
| Treating successful process exit as successful delivery | A CLI can exit successfully while producing the wrong branch, commit, PR, or deployment. | Verify expected provider objects, branch/commit identity, immutable artifact digest, health, and smokecheck before closing the work item. |

## Feature Dependencies

```text
Canonical work item + acceptance criteria + approval revision
  → validated workflow states + serialized claim/lease
  → isolated agent workspace + bounded execution
  → commit/PR + deterministic checks on current commit
  → independent commit-bound review + human acceptance
  → immutable artifact + preview associated with the PR
  → human-authorized release + deployment health/smoke verification
  → durable run evidence + cleanup + reconciled final status

Event ingestion + idempotency + provider references
  → safe retry/recovery across every external-action boundary

Capability contracts + adapter conformance
  → provider replacement/cutover without changing work-item/task policy
```

## MVP Recommendation

The selected first meaningful milestone is **one complete representative app delivery from an approved local Markdown work item to a human-reviewed deployment**. Build one vertical path through these capabilities rather than completing every optional provider and operational feature first:

1. Define the work-item schema, approval/revision binding, validated status machine, local queue/lease, and append-only run record.
2. Provision one local model route and one disposable runner/agent path with bounded time, least-privilege credentials, and verified deletion.
3. Connect one git provider and make the exact commit's deterministic checks and separate read-only review evidence visible to the operator.
4. Produce one immutable artifact and a reviewable preview; require explicit human acceptance before the production release step.
5. Verify the deployment with health/smoke checks, record the full chain in Markdown, and exercise cleanup plus at least one safe interruption/reconciliation path.

Defer optional ticket tracker/orchestrator, multiple provider implementations, provider migration, higher concurrency, scheduled architecture routines, Proxmox-hosted CI runner migration, broad incident automation, and production-scale monitoring/restore drills to later phases. Keep security boundaries, bounded timeouts, event/action deduplication, provider references, basic logs, and a manual recovery path from the first slice; these are prerequisites for safely testing the vertical path rather than optional polish.

## Sources

- Project requirements and phase boundaries: [`software-factory-projectplan.md`](../../software-factory-projectplan.md), especially sections 2–13.
- Project intent and scope: [`PROJECT.md`](../PROJECT.md).
- [GitHub Docs: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) — required reviews/status checks and branch restrictions; available enforcement depends on provider and plan.
- [GitHub Docs: Status checks](https://docs.github.com/en/pull-requests/reference/status-checks) — checks attach to commits; required checks gate protected-branch merges.
- [GitHub Docs: Reviewing deployments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments) — deployments can await approval; required-reviewer availability varies by repository visibility/plan.
- [Coder Docs: Workspace lifecycle](https://coder.com/docs/user-guides/workspace-lifecycle/) — workspace state and delete behavior.
- [Coder Docs: Resource persistence](https://coder.com/docs/admin/templates/extending-templates/resource-persistence) — templates define which workspace resources persist.

---
*Research confidence: MEDIUM. Feature prioritization follows the user-approved project plan; GitHub and Coder behavior was checked in official docs, but the final providers and example application are intentionally undecided.*
