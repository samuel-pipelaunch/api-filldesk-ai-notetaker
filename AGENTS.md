# AGENTS.md — FillDesk AI Notetaker

## Project Summary

FillDesk AI Notetaker is a full-stack SaaS application that records, transcribes, and summarizes meetings using the Recall.ai API as its core engine. Part of the FillDesk brand.

## Quick Start

```bash
# Setup and run commands will be defined once the tech stack is chosen.
# See .env.example for required environment variables.
```

## Validation Commands

Always run these before considering work complete:

```bash
# Type checking, linting, and testing commands TBD.
# Each agent should check .github/copilot-instructions.md for current commands.
```

## Architecture

**Not yet defined.** The tech stack and project structure will be decided in a future planning session. The agents and orchestration system are ready to support any stack.

## Custom Agents

| Agent           | Model             | Role                                            |
| --------------- | ----------------- | ----------------------------------------------- |
| `orchestrator`  | Claude Opus 4.6   | Delegates work to specialists, never implements |
| `planner`       | GPT-5.3-Codex     | Research, architecture, implementation plans    |
| `coder`         | GPT-5.3-Codex     | Writes production code                          |
| `designer`      | Gemini 3 Pro      | UI/UX design, visual design, accessibility      |
| `reviewer`      | Claude Opus 4.6   | Code review, security, performance, quality     |
| `tester`        | GPT-5.3-Codex     | Writes and runs tests                           |
| `debugger`      | GPT-5.3-Codex     | Bug diagnosis, reproduce → fix → verify         |
| `documentarian` | Claude Opus 4.6   | Maintains AI knowledge: instructions, skills, prompts, docs |

## Agent Workflow

```
User Request
    │
    ▼
Orchestrator (Claude Opus 4.6)
    │
    ├──► Planner (GPT-5.3-Codex)
    │       │
    │       ▼ Returns implementation plan with file assignments
    │
    ├──► Parse plan into parallel/sequential phases
    │
    ├──► Phase 1: Execute (parallel tasks where files don't overlap)
    │       ├── Coder (GPT-5.3-Codex) → logic, APIs, backend
    │       └── Designer (Gemini 3 Pro) → UI/UX, styling
    │
    ├──► Phase 2: Execute (depends on Phase 1)
    │       └── Coder / Designer as needed
    │
    ├──► Tester (GPT-5.3-Codex) → write and run tests
    │
    ├──► Reviewer (Claude Opus 4.6) → quality gate
    │       │
    │       ├── Pass → continue
    │       └── Fail → Route back to Coder/Debugger for fixes
    │
    ├──► Documentarian (Claude Opus 4.6) → update instructions, skills, prompts, docs (if needed)
    │
    └──► Report results to user
```

## Model Selection Rationale

| Model                 | Best For                               | Used By                                   |
| --------------------- | -------------------------------------- | ----------------------------------------- |
| **Claude Opus 4.6**   | Reasoning, coordination, analysis      | Orchestrator                              |
| **Claude Opus 4.6**   | Deep reasoning, thorough code review   | Reviewer                                  |
| **Claude Opus 4.6**   | Writing, codebase analysis, knowledge  | Documentarian                             |
| **GPT-5.3-Codex**     | Code generation, speed, cost-effective | Planner, Coder, Tester, Debugger          |
| **Gemini 3 Pro**      | UI/UX design, visual creativity        | Designer                                  |

## Hard Boundaries

- **Orchestrator**: No direct implementation. Delegation only.
- **Planner**: No code writing. Plans and research only.
- **Reviewer**: No code writing. Feedback only.
- **Documentarian**: No production code or tests. Only documentation, instructions, skills, and prompts.
- **Debugger**: No speculative fixes. Must reproduce first.
- **Designer**: No business logic or backend changes.
- **Coder/Tester**: Follow repository patterns and delegated scope.

## Key Settings

Enable these VS Code settings for the orchestration to work:

```jsonc
{
  "chat.agent.enabled": true,
  "chat.customAgentInSubagent.enabled": true,
  "chat.useAgentSkills": true,
}
```

## Commit Convention

Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

Trust these instructions. Only search the codebase if the information here is incomplete or incorrect.
