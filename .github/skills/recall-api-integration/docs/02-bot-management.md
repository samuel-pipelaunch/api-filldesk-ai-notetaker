# Bot Management

Source references:
- https://docs.recall.ai/docs/bot-overview
- https://docs.recall.ai/docs/creating-and-scheduling-bots

## What is a Bot?

- A bot is a single-use entity that joins a meeting as a participant.
- Each bot maps to a single meeting (one bot per meeting).
- Bots exist as participants in the call with access to all meeting features.
- Fully white-label: customize name, appearance, and behavior.
- Bots can access: video, audio, transcription, participants, metadata, and chat messages.
- Both real-time (during call) and post-call access.

## Supported Platforms

| Platform | Supported | Setup Required |
|----------|-----------|---------------|
| Google Meet | Yes | No setup needed |
| Zoom | Yes | No |
| Microsoft Teams | Yes | No |
| Webex | Yes | Yes |
| Slack Huddles (Beta) | Yes | Yes |
| Go-To Meeting (Beta) | Yes | No |

> **Note:** FillDesk initially targets **Google Meet only**. Other platforms may be added in the future. See [05-google-meet.md](05-google-meet.md) for Google Meet-specific configuration.

## Creating and Scheduling Bots

### Scheduled Bots (> 10 minutes in advance) — RECOMMENDED

- Set `join_at` to more than 10 minutes in the future.
- Guaranteed to join on-time, never late.
- No concurrent bot limits.
- Schedule as early as possible (when you have meeting URL + start time).

```bash
curl -X POST https://$RECALL_REGION.recall.ai/api/v1/bot \
  -H 'Authorization: Token $RECALL_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "join_at": "2025-03-01T10:00:00Z",
    "meeting_url": "https://meet.google.com/abc-defg-hij",
    "bot_name": "FillDesk Notetaker"
  }'
```

### Ad-hoc Bots (< 10 minutes or immediate)

- For spontaneous/on-demand meetings.
- Limited pool of warm bots — can get 507 errors during spikes.
- Retry every 30s if 507 error.
- 30 concurrent ad-hoc bot limit.
- Should be secondary to scheduled bots.

## Updating Scheduled Bots

- Editable until they start joining (10 min before `join_at`).
- Can update any field except `join_at` while not yet joining.
- Cannot update once bot has started joining or is in the call.
- For Calendar V2 bots: use Schedule Bot For Calendar Event endpoint (NOT Update Bot endpoint).

## Deleting Scheduled Bots

- More than 10 min before `join_at`: Call Delete Scheduled Bot.
- Less than 10 min before `join_at`: Bot already initialized, call Leave Call endpoint.
- After bot joins: Call Leave Call endpoint.
- Bulk delete script: https://github.com/recallai/sample-apps/tree/main/bot_delete_scheduled_bots

## Listing Bots

```bash
curl -X GET 'https://REGION.recall.ai/api/v1/bot/?join_at_after=CURRENT_ISO8601_TIMESTAMP' \
  -H 'Authorization: API_KEY'
```

## Bot Deduplication

- Calendar V2 supports deduplication via `deduplication_key`.
- For direct Create Bot calls: implement manual deduplication.
  - Maintain `bot_id <> dedup_key` table (1:1).
  - Maintain `bot_id <> user_id` table (1:many).
  - Check dedup_key before creating new bot.

## Customizing Bots

- `bot_name`: Sets the bot's display name in the meeting.
- Display image: Can output through camera or screenshare.
- Audio: Can play audio/speak using Output Media API.
- For AI agents: Stream live avatar + real-time audio.

## Key API Endpoints

- Create Bot: `POST /api/v1/bot/`
- Retrieve Bot: `GET /api/v1/bot/{id}/`
- Update Bot: `PATCH /api/v1/bot/{id}/`
- Delete Bot: `DELETE /api/v1/bot/{id}/`
- List Bots: `GET /api/v1/bot/`
- Leave Call: `POST /api/v1/bot/{id}/leave_call/`
- Start Recording: `POST /api/v1/bot/{id}/start_recording/`
- Stop Recording: `POST /api/v1/bot/{id}/stop_recording/`

## See Also

- [03-calendar-v2-integration.md](03-calendar-v2-integration.md) - Calendar V2 bot deduplication and scheduling flow
- [05-google-meet.md](05-google-meet.md) - Google Meet-specific behavior and setup
- [09-bot-configuration.md](09-bot-configuration.md) - Bot configuration reference
