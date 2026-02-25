---
name: recall-api-integration
description: "Skill for integrating with the Recall.ai REST API. Covers bot management, meeting recording, transcription retrieval, and webhook handling. Use when working on any Recall.ai features."
---

# Recall.ai API Integration Skill

This skill provides guidance for integrating with the Recall.ai API — the core engine of FillDesk AI Notetaker.

## Recall.ai Overview

Recall.ai provides a unified API for meeting bots that can join, record, and transcribe meetings across platforms (Zoom, Google Meet, Microsoft Teams, etc.).

**API Base URL**: `https://api.recall.ai/api/v1`
**Authentication**: `Authorization: Token <API_KEY>`

## Key API Endpoints

### Bot Management

- `POST /api/v1/bot` — Create a bot to join a meeting
- `GET /api/v1/bot/{id}` — Get bot status
- `GET /api/v1/bot` — List all bots
- `DELETE /api/v1/bot/{id}` — Remove bot from meeting

### Transcription

- `GET /api/v1/bot/{id}/transcript` — Get meeting transcript
- Transcripts include speaker identification and timestamps

### Recording

- `GET /api/v1/bot/{id}/media` — Get recording media URLs

### Webhooks

- Recall.ai sends webhooks for bot status changes
- Events: `bot.status_change`, `bot.transcription.complete`, `bot.media.ready`

## Bot Status Lifecycle

```
ready → joining → in_call → recording → done
                                     └─► error / fatal
```

## Integration Patterns

### 1. Centralized Client

All Recall.ai API calls should go through a centralized client module — never call the API directly from route handlers or UI code.

### 2. Input/Output Validation

Define schemas for all Recall.ai data structures. Validate both requests (outgoing) and responses (incoming) to catch API changes early.

### 3. Webhook Handling

- Create a dedicated webhook endpoint
- Verify webhook signatures using the webhook secret
- Process events idempotently (webhooks may be retried)
- Update local database state based on webhook events

### 4. Error Handling

- The API returns standard HTTP errors
- Rate limits apply — implement retry with backoff
- Network failures should be handled gracefully
- Never expose raw API errors to users

## Create Bot Request Shape

```json
{
  "meeting_url": "https://zoom.us/j/123456789",
  "bot_name": "FillDesk Notetaker",
  "transcription_options": {
    "provider": "default"
  }
}
```

## Bot Response Shape

```json
{
  "id": "bot_abc123",
  "meeting_url": "https://zoom.us/j/123456789",
  "status": {
    "code": "ready"
  },
  "bot_name": "FillDesk Notetaker"
}
```

## Transcript Response Shape

```json
[
  {
    "speaker": "John Doe",
    "words": [{ "text": "Hello", "start_time": 0.0, "end_time": 0.5 }]
  }
]
```

## Environment Variables

- `RECALL_API_KEY` — API authentication key
- `RECALL_WEBHOOK_SECRET` — Webhook signature verification secret

## Common Pitfalls

1. **Don't poll for status** — Use webhooks instead of polling for bot status changes.
2. **Validate webhook signatures** — Always verify the webhook secret before processing events.
3. **Handle rate limits** — Implement exponential backoff for API calls.
4. **Store transcripts locally** — Don't rely on the Recall.ai API as a permanent store. Save transcripts to your own database.
5. **Test with mocks** — Use an API mocking layer for development and testing instead of calling the real API.
