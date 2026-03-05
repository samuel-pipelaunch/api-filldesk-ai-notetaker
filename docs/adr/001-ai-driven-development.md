# ADR-001: AI-Driven Development with Multi-Agent Orchestration

## Status
Accepted

## Date
2026-02-25

## Context

FillDesk AI Notetaker uses AI-assisted development with GitHub Copilot. We need a structured multi-agent workflow that maximizes AI effectiveness while maintaining code quality. This follows the "Ultralight Orchestration" pattern popularized by Burke Holland, extended with additional specialist agents.

## Decision

### Agent Architecture

We define 7 specialized agents in `.github/agents/`, each with a specific model optimized for its role:

| Agent | Model | Role | Implements Code? |
|-------|-------|------|-----------------|
| **Orchestrator** | Claude Opus 4.6 | Breaks down requests, delegates to specialists | No |
| **Planner** | GPT-5.3-Codex | Research, architecture, implementation plans | No |
| **Coder** | GPT-5.3-Codex | Writes production code | Yes |
| **Designer** | Gemini 3.1 Pro | UI/UX design, visual design, accessibility | Yes (UI only) |
| **Reviewer** | Claude Opus 4.6 | Code review, security, quality gates | No |
| **Tester** | GPT-5.3-Codex | Writes and runs tests | Yes |
| **Debugger** | GPT-5.3-Codex | Bug diagnosis, reproduce → fix → verify | Yes |

### Model Selection Rationale

- **Claude Opus 4.6**: Best at reasoning, coordination, analysis — used for orchestration and review
- **GPT-5.3-Codex**: Fast, capable code generation at 1x cost — used for all coding tasks
- **Gemini 3.1 Pro**: Best at visual/creative design work — used exclusively for Designer

### Orchestration Workflow

```
User Request → Orchestrator → Planner → [Coder / Designer] → Tester → Reviewer
```

1. Orchestrator receives the request and calls Planner
2. Planner returns implementation steps with file assignments
3. Orchestrator parses steps into parallel/sequential phases based on file overlap
4. Orchestrator delegates each phase to Coder/Designer (parallel when possible)
5. Orchestrator runs Tester for test coverage
6. Orchestrator runs Reviewer as quality gate
7. If review fails, routes back to Coder/Debugger

### Hard Boundaries

- Orchestrator: delegation only, never implements
- Planner/Reviewer: no code writing
- Debugger: no speculative fixes, must reproduce first
- Designer: no business logic or backend changes

### Supporting Infrastructure

- **Instructions** (`.github/instructions/`): Path-specific coding rules applied automatically
- **Prompts** (`.github/prompts/`): Reusable prompt templates for common tasks
- **Skills** (`.github/skills/`): Domain knowledge packages (Recall.ai, API design, security, testing, code quality)

## Consequences

- All work flows through the Orchestrator for consistent quality
- Parallel execution reduces overall time for multi-file features
- Strict role boundaries prevent agents from overstepping
- Quality gate (Reviewer) catches issues before they reach the user
- Model selection optimizes cost: Claude Sonnet for thinking, GPT-5.3-Codex for coding, Gemini for design
- VS Code settings must be configured for subagent support (`chat.customAgentInSubagent.enabled`)
