# Architecture Research

**Domain:** Self-hosted, provider-agnostic software delivery factory for one operator and multiple projects
**Researched:** 2026-11-22
**Confidence:** MEDIUM

The proposed architecture below follows the established project design in [`software-factory-projectplan.md`](../../software-factory-projectplan.md). Current official documentation was checked for webhook delivery behavior, Coder template versioning, PostgreSQL locking, and OCI image identity. Deployment-provider and orchestrator-specific API details remain phase-specific validation work.

## Standard Architecture

### System Overview

```text
┌────────────────────── Human control plane ──────────────────────────┐
│  Local Markdown work items / WORKFLOW.md / tasks / decisions        │
│  Optional tracker UI (a synchronized projection, never authority)   │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ validate → approve → claim
┌──────────────────── Factory control plane ──────────────────────────┐
│  CLI / local trigger → queue + state-transition service              │
│  Provider-neutral contracts → adapters → durable event inbox        │
│  Run log / idempotency / provider references in PostgreSQL            │
└───────────────┬──────────────────┬─────────────────┬────────────────┘
                │                  │                 │
        Workspace adapter    Git + CI adapters   Deployment adapter
                │                  │                 │
┌───────────────▼───────┐  ┌───────▼────────┐  ┌────▼────────────────┐
│ Isolated agent VM /   │  │ Temporary CI   │  │ Preview / staging / │
│ Coder workspace       │  │ runner         │  │ controlled prod     │
│ OpenCode + tools      │  │ checks/build   │  │ provider            │
└──────────┬────────────┘  └───────┬────────┘  └────▲────────────────┘
           │                       │                 │
           ├── model gateway ──────┘                 │
           │          └── Ollama                     │
           └── Git host → PR / commit → registry ────┘

Independent operations plane: metrics, logs, alerts, backups and restore tests
```

The factory control plane interprets policy and records intent; it does not execute untrusted repository code. The Markdown repository owns workflow truth. External products provide execution, collaboration, code hosting, artifact storage, deployment, and observability through replaceable adapters.

### Component Responsibilities

| Component | Responsibility | Typical implementation |
|-----------|----------------|------------------------|
| Canonical workflow repository | Work-item specification, approvals, state, tasks, decisions, run summaries, and provider references | Versioned local Markdown plus JSON frontmatter; validated and mutated by the TypeScript CLI |
| Queue and transition service | Validate schema, dependencies and priority; claim at most one runnable item; enforce allowed transitions and approvals | Local CLI/service with atomic claim/lease and explicit transition functions |
| Trigger/orchestrator adapter | Turn a timer, manual command, or provider event into a proposed run; never own policy or status | Local CLI first; later adapter for a selected orchestrator such as Paperclip or Hermes |
| Integration/event service | Verify inbound events, normalize provider payloads, persist deliveries before acknowledgment, deduplicate and reconcile | Small integration service with durable inbox/idempotency records in PostgreSQL |
| Workspace adapter | Create, inspect, execute in, and delete a temporary agent workspace | Coder API/CLI; per-run template version pinned in run metadata |
| Agent task runner | Execute Explore/Implement/Review tasks within explicit repository and credential limits | OpenCode plus pinned task and engineering-skill definitions |
| Model gateway adapter | Route named explore/implement/review profiles to an approved model service | 9router or OmniRoute-compatible contract; Ollama as the initial model service |
| Git and CI adapters | Create branches/PRs, associate checks with a commit, receive review/check events, and retain code history | One authoritative git provider per repository; provider-neutral check commands and CI adapter |
| Artifact/deployment adapters | Publish OCI images, deploy a chosen digest to preview/staging, then release only after human approval | One active registry and deployment provider per environment; deployment desired-state reference stays in Markdown |
| Operations plane | Collect logs, metrics, alerts, backup configuration/data, and prove recovery independently | Prometheus/Alertmanager, Grafana/Loki/Alloy and documented restore path |

The database supports integrations; it is not a second workflow database. Keep transient resource IDs, webhook inbox/deduplication, idempotency keys, and recovery checkpoints there. The Markdown work item and append-only run record remain the durable explanation of what the factory intends and has done.

## Recommended Project Structure

Use the structure already laid out in the project plan, adding clear ports and implementations as integrations are actually needed:

```text
factory/
├── WORKFLOW.md                 # states, gates, approvals and transition rules
├── providers.yaml              # one active implementation per service slot
├── schemas/                    # frontmatter and transition validation
├── tasks/                      # explore, specify, implement, review, release
├── work-items/                 # ready / in-progress / blocked / done
├── decisions/                  # append-only decisions and scope approvals
└── runs/                       # append-only run summaries and evidence links
services/factory-integration/
├── src/contracts/              # provider-neutral ports and capability shapes
├── src/adapters/               # tracker, runner, git, model, CI, deploy adapters
├── src/events/                  # authenticated intake, normalization, inbox
├── src/reconciliation/         # inspect provider state before retry or resume
├── src/state/                  # atomic Markdown mutations and lease management
└── tests/                       # schema, conformance, retry and recovery tests
infra/
├── compose/                    # management services, databases, observability
├── coder/templates/            # factory-run and developer templates
└── monitoring/                 # scrape targets, alert rules and dashboards
agent/
├── Dockerfile                  # pinned agent/runtime image
├── tasks/                      # agent task contracts
├── skills/                     # pinned engineering skills
└── versions.json               # reproducible model/skill/image metadata
config/                          # secret-free example config and limits
scripts/                         # check, build, smoke, backup and restore
```

### Structure Rationale

- **`factory/`** is the human-readable, versioned workflow boundary. Keep the state transition rules beside the records they govern so work remains inspectable without a service UI.
- **`services/factory-integration/src/contracts/`** defines only concrete service slots needed by the delivery path. Keep each provider behind a small adapter that exposes capabilities and conformance tests; avoid a generic plugin framework until a second implementation is real.
- **`events/` and `reconciliation/`** separate notification from truth. An event is evidence that provider state may have changed; reconciliation checks that state against the associated item, commit, run, and approvals before applying a transition.
- **`infra/` and `agent/`** make workspace and service versions reproducible while preserving the trust boundary between management, code execution, CI, and production.
- **`config/`** contains examples only; real credentials are injected into the stage that needs them and never committed.

## Architectural Patterns

### Pattern 1: Canonical files with replaceable adapters

**What:** Work-item identity, scope, acceptance criteria, approvals, state, policy, and run summary live in the local Markdown repository. Provider IDs and current execution facts are links or evidence, not substitutes for these records. A stable internal contract lets each provider slot change independently.

**When to use:** Always. This is the defining architecture and is what makes offline specification, provider migration, and recovery possible.

**Trade-offs:** Markdown is easy to review and version, but concurrent writes and compound transitions need a single CLI mutation path. Integrations must also reconcile mirror conflicts rather than assuming bidirectional sync is automatically safe.

**Example:** A `git.createPullRequest` adapter returns a provider PR reference. The CLI appends that reference to the run record and updates the work item through the allowed transition function; the git provider does not set canonical status itself.

### Pattern 2: Claim/lease plus verify-before-retry

**What:** Acquire a short atomic global claim for a runnable work item and assign a persistent run ID. Persist every state change before moving to the next external side effect. A lease timeout only signals uncertainty: inspect the existing run/workspace/provider resources first, then resume that run or mark it interrupted and start a new one.

**When to use:** Queue processing and every provider operation that may be repeated after a timeout or crash.

**Trade-offs:** Verification adds code and operational steps, but blind retries can create duplicate workspaces, PRs, or deployments. PostgreSQL advisory locks can implement an application-defined exclusive claim and are released when the database session ends; they are cooperative locks, so the CLI must still enforce the rule and keep lock-holding transactions short. See the [PostgreSQL locking documentation](https://www.postgresql.org/docs/current/explicit-locking.html).

**Example:** Store `{workItemId, runId, owner, expiresAt}` in a unique claim record. Before reclaiming an expired claim, query the runner and Git/deployment providers for the recorded `runId`/idempotency key. Record an interrupted run before releasing the item for a new run.

### Pattern 3: Durable event inbox and reconciliation

**What:** Authenticate an incoming provider event, persist its raw delivery identity and normalized event, acknowledge quickly, and process it asynchronously. Use provider delivery IDs and idempotency keys to deduplicate. Reconcile provider state before transitioning Markdown, because webhooks may be repeated, delayed, missing, or out of order.

**When to use:** Git, CI, tracker, deployment, and monitoring webhooks; also useful for polling-based adapters.

**Trade-offs:** An inbox and reconciliation logic add a small PostgreSQL-backed service, but avoid losing an event between provider acknowledgment and local processing. GitHub recommends HMAC verification, HTTPS, minimal subscriptions, prompt acknowledgment, and deduplication using `X-GitHub-Delivery`; redelivery reuses that ID, and event order is not guaranteed. See [GitHub webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks), [signature validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries), and [troubleshooting out-of-order events](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/troubleshooting-webhooks).

**Example:** Normalize a `check completed` event to `{provider, deliveryId, repository, commitSha, checkName, result, occurredAt}`. Apply it only if that SHA is still the commit under review; keep stale results as evidence without using them to authorize a newer revision.

### Pattern 4: Immutable execution inputs and release artifacts

**What:** Record the exact workspace template version, agent image/skill versions, model profile, commit SHA, check run, and OCI digest used by each run. Promote the same digest from preview to staging and production, and roll back by redeploying a previously verified digest.

**When to use:** Each run and each deployment stage.

**Trade-offs:** Version pinning requires an update workflow, but a run remains explainable and reproducible after templates or images change. Coder supports selecting a specific template version for workspace operations; capture it instead of relying on the active version. Docker documents digests as immutable content identifiers, unlike mutable tags; deploy the digest that passed review and checks. Sources: [Coder workspace management](https://coder.com/docs/user-guides/workspace-management/) and [Docker digest validation](https://docs.docker.com/build/policies/validate-images/).

## Data Flow

### Request Flow

```text
Human approves Markdown work item
    ↓
CLI validates schema, dependencies, priority, and approval
    ↓
Atomic global claim + run ID + append-only run-start record
    ↓
Runner adapter provisions pinned temporary workspace
    ↓
Agent executes bounded task → commit/PR reference
    ↓
CI checks exact commit SHA → independent read-only agent review
    ↓
Human accepts change and preview
    ↓
Build/publish OCI digest → preview/staging → explicit production approval
    ↓
Deployment result and evidence reconcile into run record/work item
    ↓
Workspace and temporary data are deleted; item is marked done
```

The run ends when it needs a human decision. Questions are recorded in the work item and the item becomes `blocked`; a later decision starts a new run or a safe resume. Do not keep an agent or runner occupying the queue while waiting.

### State Management

```text
Markdown frontmatter + allowed transition service
    ├── owns: scope, approved criteria, status, priority, dependencies, gates
    ├── references: run IDs, provider resource IDs, commit SHAs, image digests
    └── is committed/appended atomically with an audit trail

PostgreSQL integration records
    ├── owns: webhook inbox, idempotency keys, ephemeral resource mappings
    └── stores: retry/reconciliation checkpoints and provider operation results

External systems
    ├── Git host owns code and commit/PR/review records
    ├── CI owns check results for a particular commit
    ├── registry owns image bytes addressed by digest
    └── deployment provider owns actual rollout/runtime status
```

### Key Data Flows

1. **Local work intake:** A human creates and approves a UUID-keyed Markdown work item. The CLI validates priority/category and dependency references, rejects unknown or cyclic dependencies, and selects the lowest-priority executable item. A blocked item releases the global active slot.
2. **Execution:** The runner receives only the task contract, project checkout, pinned tool versions, and stage-specific credentials. The factory management plane never mounts a Docker socket, Proxmox credential, model gateway admin token, or production secret into an agent workspace.
3. **Checks and review:** CI results attach to a commit SHA. Agent review receives a separate read-only context. Human acceptance is another independent record; passing checks or a positive agent review does not imply approval.
4. **Deployment:** Build once, record the OCI digest, create preview/staging from that digest, run health and smoke checks, and wait for human production authorization. The deployment adapter rejects a request for an unapproved work item or an image other than the reviewed digest.
5. **Provider events:** Verify signature and event type, deduplicate by stable delivery ID, persist before acknowledgment, then reconcile the event with current provider state. Event arrival proposes work; it does not authorize it.
6. **Recovery:** On restart, inspect the Markdown state, active run, lease, and provider references. Query providers before repeating uncertain operations. Record every decision to resume, interrupt, retry, or compensate so recovery itself is auditable.

## Scaling Considerations

This is a single-operator system, so scale by reliability and project count before throughput. Keep the CLI, integration service, and PostgreSQL in a small management environment; keep model inference separately resource-bounded; put temporary untrusted code in isolated workspace/runner VMs. The first throughput limit is intentionally one active work item, not CPU parallelism.

### Scaling Priorities

1. **First bottleneck:** Human review and the reliability of sequential runs. Improve queue visibility, safe retry, and cleanup before adding concurrent agents.
2. **Second bottleneck:** Resource contention between model inference, workspaces, CI, and hosted applications. Measure actual CPU/RAM/storage/GPU needs before assigning VM sizes or adding concurrency.
3. **Later only if needed:** Partition queues by repository or trust domain, but preserve globally unique leases where policy requires them. Keep provider slots independently replaceable; do not split services solely to anticipate many users.

## Anti-Patterns

### Anti-Pattern 1: External provider owns canonical workflow status

**What people do:** Let the ticket tracker or orchestrator be the only place that says whether a work item is approved, blocked, done, or safe to deploy.

**Why it's wrong:** The factory cannot resume when that service is unavailable, and migration couples policy to one provider's state machine.

**Do this instead:** Keep status, scope, approvals, and policy in Markdown. Treat provider status as evidence to reconcile and mirror it only as a projection.

### Anti-Pattern 2: Blind retry after an uncertain external call

**What people do:** Retry create workspace/PR/deployment after a timeout without checking whether the provider accepted the first request.

**Why it's wrong:** It creates duplicate resources or rolls out stale versions.

**Do this instead:** Send stable idempotency keys where supported, store provider references, and query provider state before retrying. Test a process crash after provider success but before local acknowledgment.

### Anti-Pattern 3: Treating webhook delivery as ordered truth

**What people do:** Apply each webhook immediately and assume it is unique and arrives in sequence.

**Why it's wrong:** Providers retry deliveries and may deliver out of order; a late event can move the item backward or mark the wrong commit as passed.

**Do this instead:** Authenticate and deduplicate, persist an inbox entry, compare event commit/resource revisions with current provider state, and make state transitions monotonic where possible.

### Anti-Pattern 4: Shared credentials and execution kernel

**What people do:** Give agent workspaces Proxmox admin, deployment admin, CI registration, and production credentials or run arbitrary code directly on the host.

**Why it's wrong:** A compromised dependency or agent can cross from code execution into service management or production. A Docker container shares the VM's kernel and is not the same boundary as a separate VM.

**Do this instead:** Separate management, workspace, CI runner, and production networks/identities; issue narrow short-lived credentials by task stage; keep workspaces on a Linux VM and never run untrusted work on the Proxmox host.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Optional tracker | Projection/sync adapter with explicit field ownership and conflict rules | Local Markdown remains sufficient to create and run work; do not require a ticket ID |
| Optional orchestrator | Trigger/assignment adapter | May start runs but cannot bypass Markdown gates or mutate status outside the transition API |
| Coder/workspace provider | Create, inspect, execute, timeout, and delete adapter | Pin a template version per run; `factory-run` must delete temporary home/volume data, not just stop the workspace |
| Model gateway/Ollama | Named profile and streaming/tool-call contract | External providers and fallback remain disabled initially; log actual provider/model without storing secrets |
| Git host | Repository/branch/PR/check/review contract | Exactly one authoritative host per repo; protect main branch independently of Markdown approval |
| CI/runners | Fixed repo check commands and commit-bound results | Keep runner credentials distinct from agent and production credentials; use temporary runners as maturity allows |
| OCI registry | Push and resolve digest contract | Store digest in the work item/run record; don't promote mutable tags as release identity |
| Deployment provider | Deploy, inspect health, preview cleanup, rollback contract | Exactly one active writer per environment; production request requires a human-approved digest |
| Monitoring/event sources | Signed webhook or polling adapter | Keep operations monitoring independent from agent health; deduplicate incidents by fingerprint |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Human ↔ workflow | Markdown and CLI/UI | Human decision is explicit and captured before transition |
| Workflow ↔ queue | In-process domain functions plus atomic claim/lease | One place enforces schema, dependencies, allowed transitions, and global serialization |
| Queue ↔ provider adapters | Typed ports/capabilities | Adapter exposes provider effects, not a second state machine |
| Event ingress ↔ workflow | Durable normalized inbox records | Asynchronous; event delivery never blocks on a long agent run |
| Agent ↔ workspace | Narrow task contract and stage-specific credentials | Workspace is temporary, versioned, and removed after result publication |
| CI ↔ release workflow | Commit and image digest evidence | A green result for another SHA is not release evidence |
| Deployment ↔ workflow | Desired digest and observed rollout status | A provider's successful API response is not health-check success |
| Operations ↔ all services | Correlation IDs, structured logs, metrics, alerts | Redact secrets and set explicit retention for prompts and execution logs |

## Suggested Build Order for the First Complete Delivery

1. **Local workflow core:** Work-item schema, status transitions, dependencies, priority, global claim/lease, run IDs/logs, interruption/recovery model. Exercise the complete local queue without external services first.
2. **Boundary and security setup:** Choose VM/network boundaries and secret handling before provisioning code execution. Keep bootstrap and restore steps runnable without the deployment platform.
3. **First model route and task contract:** Choose one model gateway and model after a representative tool-use trial; keep Explore/Implement/Review as logical profiles even when they route to one model.
4. **Temporary agent execution:** Provision the `factory-run` workspace from a pinned template version, run OpenCode with a bounded task and short-lived Git credentials, publish a branch/PR, and prove cleanup on success and failure.
5. **Commit-bound quality gates:** Add fixed checks, CI evidence, independent read-only review, and human acceptance; test a stale/old review against a newer commit.
6. **Artifact and deployment vertical slice:** Build once, record the image digest, deploy preview/staging, require human review/authorization, deploy production, verify health, and support rollback and preview cleanup.
7. **Recovery and operations:** Add durable event intake, idempotency/reconciliation, central logs/alerts, backups, and a restore on an empty test environment. These are acceptance requirements for calling the vertical chain dependable, not optional polish.
8. **Provider expansion later:** Add a second provider for one slot only after the first delivery works; exercise cutover with one active writer and preserve work-item/task definitions.

This order combines the plan's local CLI-first sequence with the user's first-milestone goal: the local workflow is established first, then the minimum provider path is assembled into one end-to-end application delivery. Do not implement every provider candidate in parallel before this slice succeeds.

## Sources

- [Project design and implementation plan](../../software-factory-projectplan.md) — owner-approved requirements, component ownership, phase sequence, acceptance criteria, trust boundaries, and recovery expectations.
- [GitHub webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks) — verify, acknowledge quickly, deduplicate, and handle retries.
- [GitHub webhook signature validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) — HMAC validation and secure secret handling.
- [GitHub webhook troubleshooting](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/troubleshooting-webhooks) — events may arrive out of order.
- [Coder workspace management](https://coder.com/docs/user-guides/workspace-management/) — target a specific template version for a workspace update/start.
- [Coder template management](https://coder.com/docs/admin/templates/managing-templates/) — template version/change-management behavior.
- [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html) — application-defined advisory locks and lock lifetime considerations.
- [Docker digest validation](https://docs.docker.com/build/policies/validate-images/) — tags are mutable while digests identify immutable image content.
- [Docker image provenance by digest](https://docs.docker.com/learn/content/prove-where-your-image-came-from/) — verify and deploy by digest.

---
*Architecture research for: self-hosted, provider-agnostic software delivery factory*
*Researched: 2026-11-22*
