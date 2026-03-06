---
name: recall-api-integration
description: This skill covers the Recall.ai API integration for the FillDesk AI Notetaker
---

# Recall.ai API Integration

This skill covers the Recall.ai API integration for the FillDesk AI Notetaker.

Recall.ai is the core provider used by FillDesk to run meeting bots, capture recordings, generate transcripts, and integrate with calendars for automatic scheduling.

## Overview

Recall.ai provides:

- Meeting bots that can join and operate in conferencing platforms
- Recording and media capture APIs
- Real-time and asynchronous transcription workflows
- Calendar integrations to schedule and manage bots from calendar events

For FillDesk AI Notetaker, our integration choices are:

- **Meeting platform (initial):** Google Meet
- **Scheduling strategy:** Calendar V2
- **Regional deployment:** Multi-region (US and EU)
- **Infrastructure:** Backend hosted on AWS

## Table of Contents

- [01. Regions and Multi-Tenancy](docs/01-regions-and-multi-tenancy.md)
- [02. Bot Management](docs/02-bot-management.md)
- [03. Calendar V2 Integration](docs/03-calendar-v2-integration.md)
- [04. Google Calendar OAuth](docs/04-google-calendar-oauth.md)
- [05. Google Meet](docs/05-google-meet.md)
- [06. Transcription](docs/06-transcription.md)
- [07. Webhooks](docs/07-webhooks.md)
- [08. Recordings and Media](docs/08-recordings-and-media.md)
- [09. Bot Configuration](docs/09-bot-configuration.md)

## Key Environment Variables

| Variable                     | Purpose                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `RECALL_API_KEY_US`          | API key for US region (`us-west-2.recall.ai` primary US region, equivalent to `api.recall.ai`) |
| `RECALL_API_KEY_EU`          | API key for EU region (`eu-central-1.recall.ai`)                                               |
| `RECALL_WEBHOOK_SECRET_US`   | Webhook verification secret for US region workspace                                            |
| `RECALL_WEBHOOK_SECRET_EU`   | Webhook verification secret for EU region workspace                                            |
| `GOOGLE_OAUTH_CLIENT_ID`     | Google OAuth 2.0 client ID                                                                     |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth 2.0 client secret                                                                 |

## Recall.ai Workspace Strategy

FillDesk uses **one Recall.ai workspace per stage, per region** (6 total):

| Stage        | Workspace Name    | US API Key          | EU API Key          |
| ------------ | ----------------- | ------------------- | ------------------- |
| Personal Dev | "PipeLaunch GmbH" | `RECALL_API_KEY_US` | `RECALL_API_KEY_EU` |
| Staging      | "staging"         | `RECALL_API_KEY_US` | `RECALL_API_KEY_EU` |
| Production   | "prod"            | `RECALL_API_KEY_US` | `RECALL_API_KEY_EU` |

The env var names are the same across stages — the **values** differ per deployment environment.

## Recall.ai API Base URLs

| Region  | Base URL                                                    |
| ------- | ----------------------------------------------------------- |
| US East | https://us-west-2.recall.ai (`api.recall.ai` is equivalent) |
| EU      | https://eu-central-1.recall.ai                              |

## Official Recall.ai Resources

- Documentation: https://docs.recall.ai/
- API Reference: https://docs.recall.ai/reference
- Sample Apps: https://docs.recall.ai/page/tutorials

## Key GitHub Repositories

- https://github.com/recallai/sample-apps (full sample apps collection)
- https://github.com/recallai/sample-apps/tree/main/calendar_v2 (Calendar V2 demo)
- https://github.com/recallai/meeting-bot (cross-platform meeting bot)
- https://github.com/recallai/zoom-notetaker (notetaker sample)
- https://github.com/recallai/real-time-event-starter-kit (real-time events)
- https://github.com/recallai/sample-apps/tree/main/verify_requests_from_recall (webhook verification)
