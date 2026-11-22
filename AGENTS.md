<!-- GSD:project-start source:PROJECT.md -->

## Project

**Software Factory**

Software Factory is a self-hosted, 24/7 software delivery system running on the user's Proxmox server. It turns human-approved Markdown work items into tested code, pull requests, reviewable previews, and controlled deployments across the user's own projects. Provider integrations are replaceable, while local versioned Markdown remains the authoritative source for scope, status, decisions, and workflow policy.

**Core Value:** One approved work item can move safely and traceably from idea to a tested, human-reviewed deployment, and the workflow can recover after failures without losing its authoritative state.

### Constraints

- **Hosting**: Self-host on the user's Proxmox server — this is the target environment and part of the project goal.
- **Cost**: Base the stack on self-hosted, freely available software — hardware, electricity, administration, and any external model costs are outside this constraint.
- **Workflow source of truth**: Versioned local Markdown and provider-neutral configuration define work and status — provider systems are replaceable executors or interfaces, not sole owners of workflow state.
- **Execution isolation**: Run untrusted repository code in isolated workspaces/runners, not on the Proxmox host — containers share their VM kernel and are not equivalent to VM isolation.
- **Human control**: Scope changes, acceptance, and production authorization require human decisions — agent output alone cannot authorize these transitions.
- **Initial concurrency**: Globally serialize active work items — leases and recovery must prevent duplicate work before concurrency is increased.
- **Implementation stack**: The project plan specifies Node.js 24.22.3, npm 11.19.1, TypeScript 7.0.2, and `@types/node` 24.19.2 for the initial CLI toolchain; pin and validate these when implementation starts.
- **Infrastructure decisions**: Hardware sizing, network layout, domains, TLS, final providers, backup destination, retention, and the final local model remain open until their corresponding implementation phase.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | `24.22.3` per the project plan | Runtime for the local workflow CLI and integration service | This exact release exists and is LTS. It bundles npm 11.19.1. Node 26.13.1 is also now LTS, so compare dependency support in phase 0 before treating Node 24 as a permanent pin. [Node 24.22.3 release](https://nodejs.org/en/blog/release/v24.22.3), [release schedule](https://nodejs.org/en/about/previous-releases) |
| npm | `11.19.1` | Reproducible package installation | Verified both in the npm changelog and as the version bundled with Node 24.22.3. Commit the lockfile and use `npm ci` in workspaces and CI. [npm 11.19.1 changelog](https://docs.npmjs.com/cli/v11/using-npm/changelog/), [Node archive](https://nodejs.org/en/download/archive/v24.22.3) |
| TypeScript | `7.0.2` | Typed local CLI and adapter contracts | This is a published stable 7.0 release; the official TypeScript site marks 7.1 as beta. Recheck compiler and editor-tool compatibility before implementation. [TypeScript](https://www.typescriptlang.org/), [npm package](https://www.npmjs.com/package/typescript) |
| `@types/node` | `24.19.2` with Node 24 | Node API types for TypeScript | The plan's exact version is published and matches the Node 24 major line. If the project moves to Node 26, move the type package with it. [npm package versions](https://www.npmjs.com/package/%40types/node?activeTab=versions) |
| Local Markdown + TypeScript CLI | Pin with repository lockfiles and schemas | Canonical work items, status transitions, queue/lease, and append-only run evidence | Keeps scope and workflow resumable without a tracker, cloud orchestrator, or network. Use atomic file updates for canonical status; reserve a database for integration state and idempotency records. |
| Coder Community | Pin a tested server/template release at phase 3 | Human and temporary coding workspaces | Coder supports Docker-backed workspaces on Linux. Keep the control plane and Docker workspace host in separate Linux VMs. Community's built-in provisioner is the starting path; official docs label external provisioner daemons Premium. [Docker install](https://coder.com/docs/install/server/docker), [provisioners](https://coder.com/docs/install/operate/provisioners) |
| OpenCode | Pin a release and image digest at phase 3 | Headless coding agent inside disposable workspaces | Its CLI has a non-interactive run command for scripts/CI and a server mode for shared or remote use. Use isolated per-run state and remove the workspace and temporary data after collecting artifacts. [CLI](https://opencode.ai/docs/cli/), [server](https://opencode.ai/docs/cli/web) |
| Ollama | Select and pin at model-evaluation phase | Local model inference | It has a local API and documented tool calling, plus an OpenAI-compatible API subset. The compatibility claim does not guarantee full agent behavior, so run the exact streamed multi-turn tool-call tests with the chosen model. Do not pick a model or GPU requirement before measuring the available Proxmox hardware. [OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility), [tool calling](https://docs.ollama.com/capabilities/tool-calling) |
| Model gateway contract; 9router or OmniRoute behind it | Pin a release/commit at phase 2 | Stable internal interface for model profiles, routing, and usage details | Both projects document OpenAI-compatible integration paths, including custom/local compatible upstreams. Their feature sets move quickly. Start with one Ollama route; disable external fallback, prompt rewriting, and tool-output compression until representative tasks prove them safe. [9router integrations](https://github.com/decolua/9router/blob/master/gitbook/content/en/integration/other-tools.md), [OmniRoute user guide](https://github.com/cheaper-inference/OmniRoute/blob/release/v3.8.54/docs/guides/USER_GUIDE.md) |
| Forgejo or GitHub | Select and pin/configure at git integration phase | Git, PR/MR review, status checks, and event delivery | Forgejo suits a private, self-hosted setup and documents branch protection, webhooks, and Actions. GitHub has mature PR/check integrations, but its Free branch-protection feature is for public repositories; private protection requires a paid plan. Keep check commands provider-neutral because Forgejo Actions is familiar to GitHub Actions but not fully compatible. [Forgejo protection](https://forgejo.org/docs/latest/user/repository/protection/), [Forgejo webhooks](https://forgejo.org/docs/latest/user/repository/webhooks/), [Actions compatibility](https://forgejo.org/docs/latest/user/actions/overview/), [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) |
| Docker Engine + Compose on Linux VMs | Pin supported package versions during provisioning | Workspace, CI runner, and application containers | Matches the plan's Proxmox deployment approach. Never run arbitrary repository code on the Proxmox host. Docker daemon access is host-administrative power: protect remote access with SSH or mutual TLS, and keep its credentials away from agent containers. [Docker security](https://docs.docker.com/engine/security/), [protect daemon access](https://docs.docker.com/engine/security/protect-access/) |
| Coolify; Vercel as a hosted alternative | Pin a tested release/configuration at phase 5 | Preview, staging, deployment status, and release/rollback actions | Coolify is self-hostable and documents deploy-only API tokens, preview deploys, and image rollback. Vercel offers managed preview/prod deployments and REST APIs but is not the self-hosted option. For either provider, preview code is untrusted and must not receive production secrets. [Coolify docs](https://coolify.io/docs), [deploy webhooks](https://coolify.io/docs/core/automation/deploy-webhooks), [previews](https://coolify.io/docs/applications/deployments/preview-deployments), [rollback](https://coolify.io/docs/applications/deployments/rollbacks), [Vercel deployments](https://vercel.com/docs/deployments) |
| PostgreSQL | `18.7` for a new integration database, subject to each product's support matrix | Idempotency keys, event inbox/outbox, and provider-reference mappings | PostgreSQL 18.7 is supported and current; 19.0 was released only on 2026-11-19. Coder recommends external PostgreSQL 13+ for production, and Forgejo supports PostgreSQL 14+. Use separate databases/roles per service if sharing an instance. Keep Markdown as workflow truth and exercise database restore independently. [Version policy](https://www.postgresql.org/support/versioning/), [backup and restore](https://www.postgresql.org/docs/current/backup.html), [Coder production database guidance](https://coder.com/docs/install/server/docker), [Forgejo database support](https://forgejo.org/docs/latest/admin/installation/database-preparation/) |
| Prometheus + Alertmanager; Grafana + Loki + Alloy | Pin at monitoring phase | Metrics, alerts, and centralized run/service logs | These are the project's selected monitoring/logging roles. Keep collection independent from agent health, attach a run correlation ID, redact credentials, and set log/prompt retention before production. Pin versions when implementing rather than copying an unverified version here. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No additional runtime library selected | — | Keep phase 1 CLI dependency-light | Choose schema validation and process-execution libraries only after the work-item schema and runner contract are implemented. Prefer standard Node APIs where sufficient; pin and review any package that can execute repository code. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript + `@types/node` | Build and typecheck the CLI | Pin exact versions in `package.json` and the lockfile. The versions in the plan are published, but verify the Node 24 vs Node 26 choice and any TypeScript 7 tooling compatibility before coding. |
| Docker Compose | Reproduce management services and local integrations | Run it in a management Linux VM, not on the Proxmox host. Use explicit image tags/digests and persistent volumes with documented backup and restore. |
| Provider-neutral check/build scripts | Give local development and each CI host the same commands | Treat GitHub Actions or Forgejo Actions YAML as a thin caller of repository scripts. Put temporary runners on a separate execution VM and remove job data/credentials after each run. |
| OpenCode CLI | Run the coding task in a Coder workspace | Choose a private/standalone process for an ephemeral run when session isolation requires it. Persist only the intended report and artifacts before cleanup. |

## Installation

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Node 24.22.3 per plan | Node 26.13.1 LTS | Choose Node 26 if the selected libraries, OpenCode/Coder images, and deployment toolchain pass the same compatibility gate and the newer runtime is valuable. Node 24 remains a supported LTS line; do not switch without checking native package support. |
| Forgejo for private self-hosted repos | GitHub | Use GitHub if managed hosting is acceptable and the selected plan supplies the required branch protection for private repos. The project plan's provider adapter should keep CI scripts portable. |
| Coolify for self-hosted deploys | Vercel | Use Vercel if managed hosting is acceptable for the app and its data/secrets. It has preview/prod deployment workflows but does not satisfy an all-self-hosted provider choice. |
| One gateway contract with Ollama route | Ollama's API directly | Direct access is simpler during a local model spike. Retain it for production only if the required model-profile, routing, usage, and error semantics are not needed; otherwise exercise the gateway contract end to end. |
| PostgreSQL 18.7 | PostgreSQL 19.0 | Move to 19 only after Coder and every selected integration service explicitly supports it and the upgrade/restore path is tested. |
| Coder built-in provisioners in Community | Coder external provisioners | Use external provisioners only if a license tier that includes them is chosen and the extra isolation/scaling benefit justifies it. They are not a Community assumption. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Docker on the Proxmox host | Workspace or CI code could reach host management or damage the hypervisor. | Separate Linux VMs for management, workspaces/runners, and deployment workloads. |
| An unrestricted Docker socket or TCP port 2375 in a workspace | Docker daemon credentials can control the host; TLS credentials also grant host-level authority. | Keep daemon access in the Coder management/provisioning boundary, connect to a dedicated workspace VM over SSH/mTLS, and never mount the socket or key into agent code. |
| Coder Premium external provisioners as a Community baseline | The current Coder docs label external provisioner daemons Premium. | Validate the built-in provisioner and remote Docker host route in a small proof before committing to Coder templates. |
| A hosted tracker/orchestrator as the only state store | It would contradict the offline-resumable canonical Markdown contract and create provider lock-in. | Local Markdown as authority; sync tracker/orchestrator state as reconciled provider projections only. |
| Autonomous model fallback to external providers in the first release | It can send private code/prompts outside the local route and produce unobserved model changes. | One tested Ollama route; fail closed on model service failure and record the actual model/provider. |
| Open-ended preview deployment credentials | Preview changes can run untrusted application code on the deployment server. | Per-stage least-privilege tokens, isolated preview environment/data, and no production credentials in preview runs. |
| Kubernetes for the first deployment | The project has one operator and one serialized run; Kubernetes adds an unnecessary operations layer. | Docker Compose on clearly bounded Proxmox VMs, as specified by the project plan. |
| Treating a PR runner as trusted because the repository is private | A PR can alter workflow files and run arbitrary code; Forgejo's own security guide describes this risk. | Isolated temporary runner, restrictive token scopes, review gates, and no production credentials on untrusted PR checks. [Forgejo Actions security](https://forgejo.org/docs/latest/admin/actions/security/) |

## Stack Patterns by Variant

- Prefer Forgejo as the first Git host, with protected `main`, required checks, a narrowly scoped webhook token, and a runner that is separate from agent workspaces.
- Because Forgejo Actions is not a strict GitHub Actions implementation, keep CI behavior in repository scripts and test action compatibility rather than assuming YAML portability.
- Confirm the account/organization plan can enforce private-repository branch protection; on GitHub Free those rules are documented for public repositories only.
- Use GitHub for reviews/events only if the operator accepts the external Git SaaS boundary. The factory's canonical work state remains local Markdown.
- Start with its built-in provisioner and a dedicated Linux Docker workspace VM. Confirm the selected template can reach the Docker Engine through the supported path without exposing that host to agents.
- If that route only works by mounting a privileged socket broadly or requires Premium external provisioners, stop and choose a different runner path or license decision before building the adapter.
- Use an authenticated deploy-only token for an already-created preview where possible; creation or changing preview inputs may require additional write permission.
- Restrict which PRs can deploy and ensure preview networks/data cannot reach production services. Verify the deployment by status, health check, and smoke check; an accepted API request is not proof of a healthy release.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Node.js `24.22.3` | npm `11.19.1` | npm version is bundled in the official Node archive. |
| Node.js `24.x` | `@types/node` `24.19.2` | Keep runtime and API type major versions aligned. |
| TypeScript `7.0.2` | Node.js `24.22.3` | Published stable TypeScript 7 release; validate downstream compiler APIs and editor/linter plugins before adoption. |
| PostgreSQL `18.7` | Coder requiring PostgreSQL `>=13`; Forgejo requiring PostgreSQL `>=14` | Meets both documented minimums; still check every selected product's exact release support before sharing a database instance. |
| OpenCode ↔ Ollama/gateway | Model-specific | OpenAI-compatible APIs are subsets and gateways translate requests. Test streaming, repeated tool-call turns, tool schema conversion, cancellation/timeouts, and usage reporting for the actual model route. |
| Forgejo Actions ↔ GitHub Actions | Partial workflow familiarity, not full compatibility | Keep CI definitions thin and check supported actions/runner isolation for the exact Forgejo version. |

## Sources

- [Node.js 24.22.3 release](https://nodejs.org/en/blog/release/v24.22.3) — exact LTS release and date.
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases) — supported release lines.
- [Node.js 24.22.3 archive](https://nodejs.org/en/download/archive/v24.22.3) — bundled npm `11.19.1`.
- [npm CLI v11 changelog](https://docs.npmjs.com/cli/v11/using-npm/changelog/) — npm `11.19.1` release date.
- [TypeScript](https://www.typescriptlang.org/) and [TypeScript npm package](https://www.npmjs.com/package/typescript) — 7.0 stable/7.1 beta and package version.
- [@types/node versions](https://www.npmjs.com/package/%40types/node?activeTab=versions) — `24.19.2` exists.
- [Coder Docker install](https://coder.com/docs/install/server/docker), [Coder provisioners](https://coder.com/docs/install/operate/provisioners) — Linux/Docker deployment and Community/Premium provisioning boundary.
- [OpenCode CLI](https://opencode.ai/docs/cli/), [OpenCode server](https://opencode.ai/docs/cli/web) — scripted run and dedicated server modes.
- [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility), [Ollama tool calling](https://docs.ollama.com/capabilities/tool-calling) — API subset and tool-call support.
- [9router repository](https://github.com/decolua/9router), [9router generic OpenAI-compatible setup](https://github.com/decolua/9router/blob/master/gitbook/content/en/integration/other-tools.md) — project/version and local endpoint pattern.
- [OmniRoute repository](https://github.com/cheaper-inference/OmniRoute), [OmniRoute custom OpenAI-compatible provider guide](https://github.com/cheaper-inference/OmniRoute/blob/release/v3.8.54/docs/guides/USER_GUIDE.md) — local/custom gateway connections.
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), [Forgejo protected branches](https://forgejo.org/docs/latest/user/repository/protection/), [Forgejo webhooks](https://forgejo.org/docs/latest/user/repository/webhooks/), [Forgejo Actions overview](https://forgejo.org/docs/latest/user/actions/overview/) — Git provider capabilities and limitations.
- [Coolify docs](https://coolify.io/docs), [deploy webhooks](https://coolify.io/docs/core/automation/deploy-webhooks), [preview deployments](https://coolify.io/docs/applications/deployments/preview-deployments), [rollbacks](https://coolify.io/docs/applications/deployments/rollbacks) — self-hosted deployment APIs and preview/rollback behavior.
- [Vercel deployments](https://vercel.com/docs/deployments) — managed preview/production deployment APIs.
- [Docker daemon security](https://docs.docker.com/engine/security/), [protecting daemon access](https://docs.docker.com/engine/security/protect-access/) — remote Docker access security.
- [PostgreSQL version policy](https://www.postgresql.org/support/versioning/), [backup and restore](https://www.postgresql.org/docs/current/backup.html) — current support and recovery guidance.

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `$gsd-fast` for a trivial task inline, with no subagents and no PLAN.md
- `$gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `$gsd-debug` for investigation and bug fixing
- `$gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `$gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
