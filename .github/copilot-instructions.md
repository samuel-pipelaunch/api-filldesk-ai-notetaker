# FillDesk AI Notetaker — Copilot Instructions

## Project Overview

FillDesk AI Notetaker is a full-stack SaaS application that records, transcribes, and summarizes meetings using the **Recall.ai** API as its core engine. It is part of the **FillDesk** brand and targets teams that need automated meeting intelligence.

### Key Features (Planned)

- **Bot-based meeting recording** — AI bots join Zoom, Google Meet, and Teams meetings via Recall.ai
- **Real-time transcription** — Speaker-identified transcripts with timestamps
- **AI summaries** — Automatic meeting notes, action items, and key decisions
- **Meeting library** — Searchable archive of all past meetings
- **Team collaboration** — Share meetings and notes across your team

### Core Integration

The **Recall.ai** API is the engine of this application. All meeting bot management, recording, transcription, and webhook handling flows through Recall.ai. Any agent or developer working on this project should understand the Recall.ai skill in `.github/skills/recall-api-integration/`.

## AI-Driven Development

This project uses a multi-agent orchestration system. See `AGENTS.md` for the full workflow.

### Quick Reference

| Agent             | Model           | Role                                                 |
| ----------------- | --------------- | ---------------------------------------------------- |
| **Orchestrator**  | Claude Opus 4.6 | Delegates work, never implements                     |
| **Planner**       | GPT-5.3-Codex   | Research + implementation plans                      |
| **Coder**         | GPT-5.3-Codex   | Writes production code                               |
| **Designer**      | Gemini 3.1 Pro  | UI/UX design                                         |
| **Reviewer**      | Claude Opus 4.6 | Code review + quality gates                          |
| **Tester**        | GPT-5.3-Codex   | Writes and runs tests                                |
| **Debugger**      | GPT-5.3-Codex   | Bug diagnosis and fixes                              |
| **Architect**     | Claude Opus 4.6 | Multi-model architecture advisor (Claude+Gemini+GPT) |
| **Documentarian** | Claude Opus 4.6 | Maintains instructions, skills, prompts, and docs    |

### Workflow

```
User Request → Orchestrator → Planner → [Coder / Designer] → Tester → Reviewer → Documentarian (if needed)
```

Start with the **Orchestrator** agent — it will automatically delegate to the right specialists.

## Coding Principles

These principles apply regardless of the tech stack chosen:

### 1. Structure

- Use a consistent, predictable project layout
- Group code by feature; keep shared utilities minimal
- Create simple, obvious entry points

### 2. Architecture

- Prefer flat, explicit code over abstractions or deep hierarchies
- Avoid clever patterns, metaprogramming, and unnecessary indirection
- Minimize coupling so files can be safely regenerated

### 3. Functions and Modules

- Keep control flow linear and simple
- Use small-to-medium functions; avoid deeply nested logic
- Pass state explicitly; avoid globals

### 4. Naming and Comments

- Use descriptive-but-simple names
- Comment only to note invariants, assumptions, or external requirements

### 5. Logging and Errors

- Emit detailed, structured logs at key boundaries
- Make errors explicit and informative
- Never expose internal details in user-facing errors

### 6. Regenerability

- Write code so any file/module can be rewritten from scratch without breaking the system
- Prefer clear, declarative configuration

### 7. Quality

- Favor deterministic, testable behavior
- Keep tests simple and focused on verifying observable behavior
- Always validate inputs at system boundaries

## Infrastructure

FillDesk AI Notetaker uses **AWS** with a multi-account stage strategy, deployed via **GitHub Actions**.

### AWS Accounts

| Stage        | Account ID                           | Purpose            |
| ------------ | ------------------------------------ | ------------------ |
| Personal Dev | Per-developer (e.g., `588738567629`) | Individual sandbox |
| Staging      | `471112515517`                       | Pre-production     |
| Production   | `975050325894`                       | Live environment   |

### Key Details

- **AWS SSO** via Google — Start URL: `https://pipelaunch.awsapps.com/start/#/?tab=accounts`
- **CI/CD**: GitHub Actions with OIDC authentication to AWS (no long-lived keys)
- **Environments**: `staging` and `prod` in GitHub Actions (dev is manual deployment)
- **Regions**: `us-east-1` (primary), `eu-west-1`
- **Promotion**: Personal Dev → Staging → Production

### Infrastructure Skill

Full infrastructure documentation including account topology, SSO setup, deployment patterns, and IaC guidelines is in `.github/skills/aws-infrastructure/`. Any agent or developer working on infrastructure or deployments should read that skill.

## Commit Convention

Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

## Environment Variables

All env vars are documented in `.env.example`. Never hardcode secrets.
