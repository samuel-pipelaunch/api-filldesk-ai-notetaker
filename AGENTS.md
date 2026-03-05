# AGENTS.md — FillDesk AI Notetaker

## Custom Agents

| Agent             | Model           | Role                                                 |
| ----------------- | --------------- | ---------------------------------------------------- |
| `orchestrator`    | Claude Opus 4.6 | Delegates work, never implements                     |
| `planner`         | GPT-5.3-Codex   | Research + implementation plans                      |
| `coder`           | GPT-5.3-Codex   | Writes production code                               |
| `designer`        | Gemini 3.1 Pro  | UI/UX design                                         |
| `reviewer`        | Claude Opus 4.6 | Code review + quality gates                          |
| `tester`          | GPT-5.3-Codex   | Writes and runs tests                                |
| `debugger`        | GPT-5.3-Codex   | Bug diagnosis and fixes                              |
| `architect`       | Claude Opus 4.6 | Multi-model architecture advisor (Claude+Gemini+GPT) |
| `documentarian`   | Claude Opus 4.6 | Maintains instructions, skills, prompts, and docs    |

### Architect Subagents (internal — not called directly)

| Agent              | Model           | Purpose                      |
| ------------------ | --------------- | ---------------------------- |
| `consultant-claude`| Claude Opus 4.6 | Architecture consultant      |
| `consultant-gemini`| Gemini 3.1 Pro  | Architecture consultant      |
| `consultant-gpt`   | GPT-5.3-Codex   | Architecture consultant      |

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
    │       └── Designer (Gemini 3.1 Pro) → UI/UX, styling
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

### Architect Workflow (standalone — called directly by user)

```
User Request → @architect
    │
    ├──► Phase 1: Clarification
    │       ├── Consultant Claude ─┐
    │       ├── Consultant Gemini  ├── Generate questions (parallel)
    │       └── Consultant GPT ────┘
    │       └── Deduplicate → present to user → wait for answers
    │
    ├──► Phase 2: Architecture Proposals
    │       ├── Consultant Claude ─┐
    │       ├── Consultant Gemini  ├── Propose architecture (parallel)
    │       └── Consultant GPT ────┘
    │
    └──► Phase 3: Synthesis
            ├── Consensus points (2+ models agree)
            ├── Conflicts needing user input
            └── Wild card ideas worth exploring
```

## Model Selection Rationale

| Model                 | Best For                               | Used By                                   |
| --------------------- | -------------------------------------- | ----------------------------------------- |
| **Claude Opus 4.6**   | Reasoning, coordination, analysis      | Orchestrator, Reviewer, Architect, Documentarian |
| **GPT-5.3-Codex**     | Code generation, speed, cost-effective | Planner, Coder, Tester, Debugger, Consultant GPT |
| **Gemini 3.1 Pro**    | UI/UX design, visual creativity        | Designer, Consultant Gemini               |

## Hard Boundaries

- **Orchestrator**: No direct implementation. Delegation only.
- **Planner**: No code writing. Plans and research only.
- **Reviewer**: No code writing. Feedback only.
- **Documentarian**: No production code or tests. Only documentation, instructions, skills, and prompts.
- **Debugger**: No speculative fixes. Must reproduce first.
- **Designer**: No business logic or backend changes.
- **Coder/Tester**: Follow repository patterns and delegated scope.

Trust these instructions. Only search the codebase if the information here is incomplete or incorrect.
