# Software Factory

## What This Is

Software Factory is a self-hosted, 24/7 software delivery system running on the user's Proxmox server. It turns human-approved Markdown work items into tested code, pull requests, reviewable previews, and controlled deployments across the user's own projects. Provider integrations are replaceable, while local versioned Markdown remains the authoritative source for scope, status, decisions, and workflow policy.

## Core Value

One approved work item can move safely and traceably from idea to a tested, human-reviewed deployment, and the workflow can recover after failures without losing its authoritative state.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] A human can define and approve work in local Markdown without requiring an external ticket tracker.
- [ ] The factory can deliver one representative application change end to end: isolated agent execution, checks, independent review, human acceptance, preview, and controlled deployment.
- [ ] Workflow state and run evidence remain recoverable from canonical files and provider references after service or process failures.
- [ ] The system can serve the user's different projects while keeping execution, credentials, and production access within explicit boundaries.
- [ ] Provider integrations can be changed per service contract without rewriting work items or task policies.

### Out of Scope

- Fully autonomous merges or production releases — human review and approval remain explicit gates.
- Unlimited parallel agent teams or concurrent coding runs — start with one globally active work item to make recovery and serialization reliable.
- Kubernetes, a custom ticket application, and a custom model trainer — these add operational scope without establishing the core delivery chain.
- Automatic external model fallback — external providers remain disabled initially to keep model routing controlled.
- Autonomous recovery of database changes — recovery must be explicit and reviewable.

## Context

- The authoritative design and implementation plan is [`software-factory-projectplan.md`](../software-factory-projectplan.md), version 1.2, dated 2026-11-22. It defines the architecture, integration contracts, security boundaries, phases, and acceptance criteria; implementation must verify product versions and API contracts when each integration is built.
- This is a greenfield repository. The project owner intends to operate the system personally across several of their own projects.
- The first meaningful milestone is one complete application delivery from approved work item through deployment. The project plan's incremental sequence begins with the local Markdown workflow and CLI, then adds model routing, isolated agent workspaces, checks and review, and deployment.
- Markdown work items, workflow policy, decisions, task definitions, and run records are canonical and should remain useful without a tracker, orchestrator, git host, or network connection.
- Initial design choices include Coder Community workspaces, OpenCode agent execution, Ollama as the default model service, and provider slots for model gateway, git, CI, tracker/orchestration, and deployment. Examples such as 9router/OmniRoute, GitHub/Forgejo, Plane, Paperclip/Hermes Agent, and Coolify/Vercel are configurable candidates, not hard requirements.
- The design starts with one active coding run at a time. Agents receive only the credentials needed for their stage; ordinary coding agents do not receive Proxmox management or production secrets.
- Monitoring, logs, backups, restore testing, and safe cleanup are part of a reliable factory. An independently executable recovery route is required for management services.

## Constraints

- **Hosting**: Self-host on the user's Proxmox server — this is the target environment and part of the project goal.
- **Cost**: Base the stack on self-hosted, freely available software — hardware, electricity, administration, and any external model costs are outside this constraint.
- **Workflow source of truth**: Versioned local Markdown and provider-neutral configuration define work and status — provider systems are replaceable executors or interfaces, not sole owners of workflow state.
- **Execution isolation**: Run untrusted repository code in isolated workspaces/runners, not on the Proxmox host — containers share their VM kernel and are not equivalent to VM isolation.
- **Human control**: Scope changes, acceptance, and production authorization require human decisions — agent output alone cannot authorize these transitions.
- **Initial concurrency**: Globally serialize active work items — leases and recovery must prevent duplicate work before concurrency is increased.
- **Implementation stack**: The project plan specifies Node.js 24.22.3, npm 11.19.1, TypeScript 7.0.2, and `@types/node` 24.19.2 for the initial CLI toolchain; pin and validate these when implementation starts.
- **Infrastructure decisions**: Hardware sizing, network layout, domains, TLS, final providers, backup destination, retention, and the final local model remain open until their corresponding implementation phase.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build for one operator across multiple personal projects first | Matches the owner's initial use and avoids adding multi-tenant access requirements before the delivery chain works | — Pending |
| Make local Markdown the canonical workflow and state source | Keeps work understandable and resumable when optional providers are unavailable or replaced | — Pending |
| Define the first meaningful milestone as one app delivered end to end | Demonstrates the factory's core value across the complete workflow rather than only installing infrastructure | — Pending |
| Keep human approval gates for scope, review, and production | Prevents agent execution from silently expanding scope or authorizing releases | — Pending |
| Start with a single global active run and add provider slots behind contracts | Reduces duplicate execution and makes recovery testable while preserving future provider choice | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-22 after initialization*
