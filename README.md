# FillDesk AI Notetaker

> AI-powered meeting recording, transcription, and summarization — powered by [Recall.ai](https://recall.ai).

## What is this?

FillDesk AI Notetaker is a SaaS application that automatically joins your meetings, records them, generates transcriptions, and produces AI-powered summaries. It's part of the **FillDesk** productivity suite.

### Planned Features

- **Bot-based meeting recording** — AI bots join Zoom, Google Meet, and Teams meetings
- **Real-time transcription** — Speaker-identified transcripts with timestamps
- **AI summaries** — Automatic meeting notes, action items, and key decisions
- **Meeting library** — Searchable archive of all past meetings
- **Team collaboration** — Share meetings and notes across your team

## Project Status

**Pre-implementation** — The AI development infrastructure is set up. Tech stack and implementation will be decided in a future planning session.

## AI-Assisted Development

This project uses a multi-agent orchestration system with GitHub Copilot. See:

- [AGENTS.md](AGENTS.md) — Agent workflow and orchestration overview
- [.github/copilot-instructions.md](.github/copilot-instructions.md) — Project-wide coding standards
- [.github/agents/](.github/agents/) — 8 specialized agents (orchestrator, planner, coder, designer, reviewer, tester, debugger, documentarian)
- [.github/prompts/](.github/prompts/) — Reusable prompt templates
- [.github/skills/](.github/skills/) — Domain skills (Recall.ai, API design, code quality, testing, security)

### Quick Start with Agents

1. Open VS Code with GitHub Copilot enabled
2. Ensure these settings are active:
   ```jsonc
   {
     "chat.agent.enabled": true,
     "chat.customAgentInSubagent.enabled": true,
     "chat.useAgentSkills": true
   }
   ```
3. Start a chat with the **@orchestrator** agent — it will delegate to the right specialists

### Agent Roster

| Agent | Model | Role |
|-------|-------|------|
| Orchestrator | Claude Opus 4.6 | Delegates work, never implements |
| Planner | GPT-5.3-Codex | Research + implementation plans |
| Coder | GPT-5.3-Codex | Writes production code |
| Designer | Gemini 3.1 Pro | UI/UX design |
| Reviewer | Claude Opus 4.6 | Code review + quality gates |
| Tester | GPT-5.3-Codex | Writes and runs tests |
| Debugger | GPT-5.3-Codex | Bug diagnosis and fixes |
| Documentarian | Claude Opus 4.6 | Maintains instructions, skills, prompts, docs |

## Environment Variables

See `.env.example` for required environment variables.

## Contributing

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, etc.
3. Submit a PR for review

## License

Proprietary — FillDesk brand.
