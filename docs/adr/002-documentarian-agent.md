# ADR-002: Documentarian Agent for AI Knowledge Management

## Status
Accepted

## Date
2026-02-26

## Context

The project uses an AI-driven multi-agent orchestration system (ADR-001) with 7 specialized agents. However, no agent is responsible for maintaining the AI knowledge infrastructure that all agents depend on:

- **Instructions** (`.github/instructions/`) — Path-scoped coding rules
- **Skills** (`.github/skills/`) — Domain knowledge packages
- **Prompts** (`.github/prompts/`) — Reusable prompt templates
- **Agent definitions** (`.github/agents/`) — Agent role and behavior specifications
- **Project docs** (`AGENTS.md`, `README.md`, `.github/copilot-instructions.md`, `docs/adr/`)

As the codebase grows, this knowledge infrastructure will drift from reality:

1. New patterns emerge but instructions don't get updated
2. New integrations are added but nobody creates skills for them
3. Agent prompts need tuning but nobody owns the feedback loop
4. Architecture decisions aren't documented as ADRs
5. Meta-docs (AGENTS.md, README.md) go stale

In AI-driven development, **stale instructions directly degrade code generation quality**. This makes documentation maintenance more critical than in traditional development.

## Decision

Add a **Documentarian** agent (8th agent) dedicated to maintaining the AI knowledge infrastructure.

### Agent Definition

| Property    | Value                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| Name        | Documentarian                                                                |
| Model       | Claude Opus 4.6                                                              |
| Role        | Maintains instructions, skills, prompts, agent definitions, and project docs |
| Implements? | No production code or tests — only `.md` files                               |

### Responsibilities

1. Maintain `.github/instructions/` as codebase conventions evolve
2. Create/update `.github/skills/` when major integrations or domains are added
3. Maintain `.github/prompts/` for common task patterns
4. Propose updates to `.github/agents/` when agent role boundaries need adjusting
5. Keep `AGENTS.md`, `README.md`, and `copilot-instructions.md` consistent
6. Write ADRs in `docs/adr/` for significant architectural decisions
7. Perform consistency audits across all AI knowledge files on request

### Workflow Integration

The Documentarian runs after the Reviewer quality gate, only when the Orchestrator determines documentation may be impacted:

```
... → Tester → Reviewer → Documentarian (if needed) → Report results
```

The Orchestrator invokes the Documentarian when:
- New patterns, conventions, or architectural decisions are introduced
- A new integration or external API is added
- Existing instructions or skills may be stale
- Project overview docs need updating

The Documentarian is skipped for small bug fixes or minor refactors.

### Model Selection

Claude Opus 4.6 was chosen because this role requires:
- Deep codebase understanding to identify what's changed
- Strong writing ability for clear, precise documentation
- Reasoning to assess what needs updating and what doesn't
- Consistency checking across multiple interconnected files

This aligns with Claude Opus 4.6's strengths (reasoning, analysis, writing) rather than code generation speed.

## Alternatives Considered

### Expand the Planner agent
Rejected — the Planner's hard boundary is "plans only, no file writing." Adding documentation writing would violate its role definition and dilute its focus.

### Expand the Reviewer agent
Rejected — the Reviewer's hard boundary is "feedback only, no code modification." Writing documentation files would violate its role boundary.

### Make the Coder responsible
Rejected — mixing production code and meta-documentation ownership violates single-responsibility. Coders should focus on application code.

### No dedicated agent (manual maintenance)
Rejected — documentation rot is inevitable without ownership assignment, and in AI-driven development the consequences are worse (degraded agent performance).

## Consequences

### Positive
- Clear ownership of AI knowledge infrastructure
- Self-improving system — better docs → better agents → better code
- Consistent, up-to-date instructions across all agents
- Architecture decisions documented systematically as ADRs
- New integrations get proper skill packages

### Negative
- One more agent for the Orchestrator to coordinate (minor complexity increase)
- Additional cost from Claude Opus 4.6 invocations (though infrequent — only on doc-impacting changes)
- Risk of over-documenting if not properly scoped by the Orchestrator

### Mitigations
- Orchestrator only invokes Documentarian when documentation impact is likely
- Documentarian has strict boundaries: no production code, no tests
- Incremental updates preferred over large rewrites

