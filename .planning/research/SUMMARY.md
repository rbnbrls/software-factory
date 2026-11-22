# Project Research Summary

**Project:** Software Factory
**Domain:** Self-hosted, Markdown-driven, agent-assisted software delivery for one operator and multiple personal projects
**Researched:** 2026-11-22
**Confidence:** MEDIUM

## Executive Summary

The project is a personal, self-hosted factory that should take one approved local Markdown work item through isolated agent work, commit-bound checks and review, a preview, and a human-authorized deployment. The strongest approach is to keep Markdown and a small TypeScript CLI responsible for canonical workflow state, then connect one provider at a time through narrow contracts. A disposable Coder workspace running OpenCode, one tested Ollama-backed model route, one git/CI path, and one deployment provider are enough to prove the first complete delivery; implementing all provider candidates up front would add risk without proving more value.

The biggest risks are split-brain workflow state, stale or duplicate provider events, unsafe execution privileges, and approvals or checks reused for a different commit. Prevent these by binding approvals and evidence to work-item revisions, commit SHAs, and immutable image digests; using a serialized claim/lease with verify-before-retry recovery; keeping untrusted code off the Proxmox host and away from production credentials; and testing cleanup and restore. The first delivery milestone should include a basic but real recovery path and verified workspace/preview cleanup, not defer all reliability work until after production deployment.

## Key Findings

### Recommended Stack

The approved design's TypeScript CLI direction is viable. Node.js `24.22.3`, npm `11.19.1`, TypeScript `7.0.2`, and `@types/node` `24.19.2` are published and compatible as proposed. Node 26 is also LTS, so confirm dependency and tooling support before locking Node 24 for the project. Keep local Markdown as workflow truth and use PostgreSQL only for integration concerns such as event inboxes, idempotency, temporary provider mappings, and recovery checkpoints.

**Core technologies:**

- **Node.js + TypeScript CLI:** Validate and atomically update work items, state transitions, leases, and run history.
- **Coder Community + Linux workspace VM:** Provide version-pinned, disposable agent workspaces; prove a supported Community provisioning path because external provisioners are a Premium feature.
- **OpenCode:** Run bounded, non-interactive engineering tasks inside the temporary workspace.
- **Ollama behind one model-gateway contract:** Start with one measured local route; test streaming and multi-turn tool calls on the actual model, with external fallback and prompt transformations disabled.
- **One git/CI provider:** Choose Forgejo for a private self-hosted path or GitHub if its hosting boundary and branch-protection plan are acceptable. Keep CI commands in the repository and CI YAML thin.
- **One deployment provider:** Coolify fits the self-hosted target; Vercel is a hosted alternative. Preview code is untrusted and must not receive production secrets.
- **Docker Compose on separate Linux VMs, PostgreSQL, Prometheus/Alertmanager, and Grafana/Loki/Alloy:** Use for bounded services, integration records, and independent operations visibility; never run untrusted code or Docker Engine on the Proxmox host.

Pin image and template versions when each phase begins. Keep lockfiles and model/skill/image versions with run evidence. Official product capabilities and licenses change, so verify current APIs and support matrices before implementing each adapter.

### Expected Features

**Must have (table stakes):**

- Canonical, revision-bound Markdown work items with explicit scope, criteria, dependencies, approvals, and provider references.
- Validated state transitions, dependency-aware queueing, a single global active claim/lease, and safe recovery after interruption.
- Isolated, bounded agent execution with stage-specific credentials and verified deletion of temporary workspaces.
- Checks and independent read-only review tied to the exact commit, plus a separate human acceptance decision.
- A reviewable preview tied to the reviewed immutable artifact; an explicit production gate; deployment health/smoke evidence and a known-digest rollback.
- Operator-readable run evidence, event/action idempotency, reconciliation before retry, and a concise result recorded in the work item.

**Should have (differentiating):**

- Markdown workflow usable offline or without a tracker/orchestrator.
- Replaceable service slots with capability contracts, conformance tests, single-writer cutover, and rollback procedures.
- One consistent workflow usable across the operator's multiple projects, with evidence linked from work item through deployment.
- Runs end promptly when human input is needed, release scarce resources, and resume only after a new decision.

**Defer (v2+):**

- Optional tracker and orchestrator adapters, second providers/migrations, increased concurrency, scheduled architecture routines, and larger-scale incident automation.
- Kubernetes, a custom ticket application, a generic plugin framework before a second real provider, automatic external model fallback, autonomous merges/releases, and autonomous database repair.

### Architecture Approach

Use a human control plane of Markdown work items, policies, task definitions, decisions, and run summaries; a small factory control plane that validates and records intent; and replaceable provider adapters for workspace, model, git/CI, registry, and deployment services. A separate operations plane handles metrics, logs, alerts, backups, and restore. PostgreSQL may retain transient integration state, but it must not become a second workflow authority. Persist and authenticate events before acknowledgment, process them asynchronously, and reconcile them with current provider state before changing Markdown.

**Major components:**

1. **Canonical workflow repository and CLI:** Owns work-item scope, approvals, state, queueing, task policy, and append-only run summaries.
2. **Integration/event service:** Normalizes signed events, persists inbox and idempotency records, maps provider references, and coordinates verify-before-retry recovery.
3. **Workspace and agent runner:** Provisions a pinned temporary Coder workspace, runs OpenCode under a bounded task contract, and removes workspace data after result publication.
4. **Git, CI, registry, and deployment adapters:** Attach checks/reviews to commit SHA, publish immutable image digests, deploy the reviewed digest, and report observed health/status.
5. **Operations plane:** Correlates logs and metrics, alerts on failure, and supports backup/restore independently from the deployment system.

### Critical Pitfalls

1. **Provider becomes a second workflow authority** — keep Markdown canonical, define field ownership, use one writer per slot, and reconcile before resume or cutover.
2. **Duplicate, delayed, or out-of-order events trigger stale work** — authenticate and persist events, deduplicate delivery/action IDs, check current provider state, and verify before retry.
3. **Untrusted code gains management or production access** — use separate Linux VMs, disposable workspaces/runners, short-lived scoped credentials, read-only review contexts, and no privileged Docker socket or Proxmox credentials in agent code.
4. **Approval/check evidence is reused for changed code** — bind approvals to the work-item revision and checks/review/deployment to the commit SHA and image digest; invalidate gates after scope or code changes.
5. **Lease expiry or a stopped workspace is mistaken for completion** — inspect run/provider state before retry and verify actual workspace deletion, including persistent volumes.

Also plan a manual bootstrap path and off-host backup with a clean-environment restore test; a factory must be able to recover when its own deployment service is unavailable.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Project foundation and local workflow
**Rationale:** Every provider depends on one validated work-item contract and source of truth.
**Delivers:** Repository/toolchain setup, schemas, workflow gates, CLI queue, dependencies/priorities, atomic status changes, serialized lease, run IDs/history, and local demo execution.
**Addresses:** Canonical work item, safe queue, revision-bound approval, operator-readable status.
**Avoids:** Provider state becoming authoritative; duplicate claims and unsafe lease expiry.

### Phase 2: Proxmox execution and security boundaries
**Rationale:** A safe trust boundary must exist before any repository code is executed.
**Delivers:** Documented management/workspace/CI/production separation, credential policy, pinned base images, and an independently executable bootstrap/recovery route.
**Addresses:** Isolated, bounded execution and multi-project separation.
**Avoids:** Host compromise, persistent credential leakage, and recovery depending on the service being restored.

### Phase 3: Model route and task contract
**Rationale:** The runner needs a stable, testable model interface, but final hardware/model choices should follow a representative trial.
**Delivers:** One local Ollama route through the chosen gateway contract, logical explore/implement/review profiles, bounded failure behavior, and model provenance in run records.
**Uses:** Ollama and one of 9router/OmniRoute candidates.
**Avoids:** Silent external fallback or untested tool-call/prompt transformations.

### Phase 4: Disposable agent workspace
**Rationale:** Once policy, security, and model interaction are defined, prove one isolated coding run.
**Delivers:** A version-pinned `factory-run` workspace, OpenCode execution, bounded timeout, short-lived Git credentials, branch/PR output, and verified cleanup on success and failure.
**Uses:** Coder Community only after its built-in provisioning path is proven; otherwise select a supported alternate runner.
**Avoids:** Premium-only assumptions, reused home state, privileged Docker access, and workspace leaks.

### Phase 5: Commit-bound checks, review, and human acceptance
**Rationale:** A branch or successful agent run is not evidence that the reviewed change is safe.
**Delivers:** Provider-neutral check/build commands, CI evidence for the exact SHA, an independent read-only agent review, bounded rework, and explicit owner acceptance.
**Implements:** Git/CI adapters and commit-bound gate policy.
**Avoids:** Stale check/review evidence, trust in untrusted PR runners, and conflating agent review with human approval.

### Phase 6: Immutable artifact, preview, and controlled deployment
**Rationale:** After the code quality gates work, carry the verified commit into a reviewable release path.
**Delivers:** One build identified by OCI digest, preview/staging from that digest, human inspection/authorization, production deployment, health/smoke verification, rollback, and preview cleanup.
**Uses:** One registry and one active deployment provider (Coolify for self-hosting or Vercel if hosted deployment is accepted).
**Avoids:** Mutable tags, stale deployment events, and preview access to production secrets/data.

### Phase 7: Reliability, reconciliation, and restore proof
**Rationale:** External actions cannot be committed atomically with local files, so recovery must be proven before declaring the delivery dependable.
**Delivers:** Durable event inbox/outbox, signature validation, deduplication, reconciliation for uncertain effects, correlated logs/alerts, backups, and restore into a clean environment.
**Addresses:** Safe retries and operator observability across all provider boundaries.
**Avoids:** Duplicate PR/deployments, lost events, stuck runs, and untested recovery. Include at least one safe interruption/reconciliation path in the first complete-delivery milestone.

### Phase 8: Temporary Proxmox CI runners
**Rationale:** Move CI execution to self-hosted temporary runners after the provider-neutral checks and artifact chain are already working.
**Delivers:** Disposable runner lifecycle, per-job credentials, cleanup, and capacity/failure reporting.
**Avoids:** Persistent self-hosted runner compromise and CI dependence on Coder workspace semantics.

### Phase 9: Provider portability and final cutover
**Rationale:** A replaceable contract is only proven when a second implementation passes conformance and migration tests.
**Delivers:** One selected service-slot migration, provider reference migration, one-active-writer cutover, full work-item replay, and documented rollback.
**Avoids:** Building abstractions for hypothetical providers, dual-writer state, and lost external metadata.

### Phase Ordering Rationale

- The Markdown workflow and local CLI precede external providers so requirements, gates, state transitions, and run identity remain provider-neutral.
- Security boundaries are defined before workspace or CI provisioning; model, workspace, git/CI, artifact, and deployment stages then follow their execution dependencies.
- Basic cleanup, evidence, bounded timeouts, and recovery are part of each vertical slice. Phase 7 adds durable events and a clean restore proof before the first app-delivery milestone is called dependable.
- Build one provider path end to end before optional tracker/orchestrator integrations, second providers, or greater concurrency. Add provider conformance and migration only when a real second implementation is selected.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 2:** Proxmox VM/network topology, resource limits, secret delivery, and independent bootstrap/restore path are unspecified.
- **Phase 3:** Select the model gateway, verify current Ollama compatibility and actual hardware capacity; evaluate streaming/tool-call behavior with representative work.
- **Phase 4:** Verify Coder Community provisioning path, workspace template lifecycle, OpenCode isolation, and deletion semantics for the chosen release.
- **Phase 5:** Choose one git/CI provider and verify branch protection, webhook behavior, runner trust model, and commit-bound check semantics.
- **Phase 6:** Choose registry/deployment provider, preview isolation, required approval support, digest promotion, health checks, and rollback capabilities.
- **Phase 7:** Choose webhook or polling topology, backup destination/retention, and operational logging policy; prove clean restore.
- **Phase 8:** Validate temporary self-hosted runner registration, isolation, credential cleanup, and concurrency/capacity behavior.
- **Phase 9:** Research the concrete migration and metadata parity for the selected second provider.

Phases with standard patterns (skip research-phase):

- **Phase 1:** Local Markdown schema, TypeScript CLI, atomic queue/status transitions, and single-operator serial execution are conventional and already specified in the project plan; plan against its acceptance criteria.

### Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Exact Node/npm/TypeScript pins and current product documentation were checked, but provider releases, licensing, support matrices, hardware, and APIs need phase-time validation. |
| Features | MEDIUM | Priorities closely follow the owner's detailed plan; final example app and selected providers are undecided. |
| Architecture | MEDIUM | State ownership, event reconciliation, and artifact identity are supported by official docs; deployment/orchestrator specifics remain open. |
| Pitfalls | MEDIUM | Domain-specific failures are grounded in official Docker, Coder, GitHub docs and the plan; actual network and provider topology are unknown. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **First example application and repo:** Pick a small representative project that exercises tests, build, preview, and deployment without introducing unrelated product complexity.
- **Proxmox capacity/topology:** Measure CPU, memory, storage, and any available GPU; select VM boundaries and network rules before provisioning. No infrastructure inventory is assumed.
- **First providers and service accounts:** Choose one Git/CI, model gateway, registry, workspace, and deployment provider; verify license, rights, webhook support, and private-branch/review enforcement.
- **Coder Community route:** Prove the supported built-in provisioner can reach the dedicated Docker VM; external provisioners are not a Community baseline.
- **Recovery policy:** Select off-host backup target, encryption/retention, log and prompt retention, and restore success criteria before production use.
- **Toolchain compatibility:** Recheck Node 24 vs Node 26 and TypeScript 7 editor/linter compatibility before finalizing phase 0 dependencies.

## Sources

### Primary (HIGH confidence)

- [Project design and implementation plan](../../software-factory-projectplan.md) — owner-approved scope, architecture, boundaries, build sequence, and acceptance criteria.
- [Node.js 24.22.3 release](https://nodejs.org/en/blog/release/v24.22.3), [Node release schedule](https://nodejs.org/en/about/previous-releases), and [Node archive](https://nodejs.org/en/download/archive/v24.22.3) — Node/npm availability and bundled npm version.
- [TypeScript](https://www.typescriptlang.org/) and [@types/node versions](https://www.npmjs.com/package/%40types/node?activeTab=versions) — compiler and type-package releases.
- [Coder Docker install](https://coder.com/docs/install/server/docker), [provisioners](https://coder.com/docs/install/operate/provisioners), [workspace lifecycle](https://coder.com/docs/user-guides/workspace-lifecycle/) — Linux/Docker setup, edition boundary, versioning, and cleanup behavior.
- [OpenCode CLI](https://opencode.ai/docs/cli/) — non-interactive task execution.
- [Ollama tool calling](https://docs.ollama.com/capabilities/tool-calling) and [OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility) — local API behavior requiring route-specific tests.
- [Docker Engine security](https://docs.docker.com/engine/security/) and [daemon access](https://docs.docker.com/engine/security/protect-access/) — daemon and host boundary risks.
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) and [Forgejo protection](https://forgejo.org/docs/latest/user/repository/protection/) — provider-specific review/check enforcement.
- [GitHub webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks), [signature validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries), and [troubleshooting](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/troubleshooting-webhooks) — authentication, deduplication, retries, and event ordering.
- [Docker digest validation](https://docs.docker.com/build/policies/validate-images/) and [image provenance](https://docs.docker.com/learn/content/prove-where-your-image-came-from/) — immutable artifact identity.
- [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html) and [backup/restore](https://www.postgresql.org/docs/current/backup.html) — cooperative locking and recovery requirements.
- [Coolify preview deployments](https://coolify.io/docs/applications/deployments/preview-deployments) and [rollbacks](https://coolify.io/docs/applications/deployments/rollbacks) — self-hosted preview and recovery behavior.

### Secondary (MEDIUM confidence)

- [9router repository and integration guide](https://github.com/decolua/9router/blob/master/gitbook/content/en/integration/other-tools.md) and [OmniRoute user guide](https://github.com/cheaper-inference/OmniRoute/blob/release/v3.8.54/docs/guides/USER_GUIDE.md) — candidate gateway integrations; pin a commit/release before use.
- [Forgejo Actions overview](https://forgejo.org/docs/latest/user/actions/overview/) — GitHub Actions familiarity does not guarantee full workflow compatibility.
- [Vercel deployment docs](https://vercel.com/docs/deployments) — hosted alternative for preview and production deployment.
- [Project feature landscape](FEATURES.md), [stack research](STACK.md), [architecture research](ARCHITECTURE.md), and [domain pitfalls](PITFALLS.md) — detailed findings and sources used in this synthesis.

### Tertiary (LOW confidence)

- None. No unverified ecosystem/community claim is relied on as a stack decision; hardware sizing and final provider fit remain open rather than guessed.

---
*Research completed: 2026-11-22*
*Ready for roadmap: yes*
