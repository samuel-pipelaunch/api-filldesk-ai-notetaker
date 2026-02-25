# Calendar V2 Integration

Source: https://docs.recall.ai/docs/calendar-v2-integration-guide

## Overview

- Calendar V2 gives the most control and configurability, but requires more implementation on our side.
- Sample app: https://github.com/recallai/sample-apps/tree/main/calendar_v2
- Calendar V2 requires handling webhooks manually and controlling scheduling logic.

## Integration Steps

1. **Initial Setup**: Create API key in Recall dashboard.
2. **Setup OAuth Clients**: Create Google OAuth 2.0 client (see `04-google-calendar-oauth.md`).
   - Keep note of `CLIENT_ID` and `CLIENT_SECRET`.
3. **Authorize User & Get Refresh Token**: Implement OAuth 2.0 authorization code flow.
   - Redirect user to Google authorization endpoint.
   - Receive callback with authorization code.
   - Exchange for `refresh_token`.
4. **Create Calendar**: Call Create Calendar API endpoint with:
   - `oauth_client_id` (from step 2)
   - `oauth_client_secret` (from step 2)
   - `oauth_refresh_token` (from step 3)
   - `platform`: `google_calendar`
   - Store returned `id` (calendar ID) linked to user/tenant.
5. **Handle Calendar Webhooks**: Set up webhook handler for calendar events.
   - `calendar.update` - calendar data changed (e.g. disconnected)
   - `calendar.sync_events` - events created/updated/deleted
6. **Fetch Calendar Events**: Use List Calendar Events API to display to users.

## Scheduling Guide

Source: https://docs.recall.ai/docs/scheduling-guide

1. **Sync Events**: Handle `calendar.sync_events` webhooks.
   - Fetch updated events via List Calendar Events with `updated_at__gte` = `last_updated_ts` from webhook.
   - Use `is_deleted` field to check if event was removed (Recall never deletes events).
   - Filter out deleted events when displaying to users.

2. **Determine Recording Status**: Business logic to decide if event should be recorded.
   - Check attendees for external/internal (from `raw` data).
   - Check response status (`accepted`/`tentative`/`declined`).
   - Check `ical_uid` for recurring events.
   - See Calendar Event Platform Data: https://docs.recall.ai/docs/calendar-event-platform-data

3. **Add/Remove Bot from Event**:
   - Schedule: `POST /api/v2/calendar-events/{id}/bot/` with `deduplication_key` and `bot_config`.
   - Remove: `DELETE /api/v2/calendar-events/{id}/bot/`.
   - For rescheduled events: just call Schedule again (auto-overrides previous).
   - Deleted events: bots automatically unscheduled.
   - Common errors: calendar disconnected, event ended, event cancelled, missing meeting URL.

4. **Bot Deduplication**:
   - `deduplication_key` is REQUIRED.
   - Recommended: `{event.start_time}-{event.meeting_url}` (one bot per meeting).
   - Per-company: `{event.start_time}-{event.meeting_url}-{calendar_email_domain}`.
   - No dedup: `{event.start_time}-{event.meeting_url}-{event.id}`.
   - Keys scoped to workspace - different workspaces won't dedup with each other.
   - Keep dedup logic consistent - changing schemes requires deleting and recreating calendars.

5. **Caveats**:
   - Handle `507` for preponed events (retry).
   - Handle `409` for parallel requests (retry with backoff).
   - Update bots via Schedule Bot endpoint (not Update Bot endpoint).
   - Make changes at least 10 minutes before event start.
   - Both endpoints have rate limits - avoid past events, process in chronological order.

## Webhook Processing Best Practices

- **Idempotency**: Process each webhook idempotently. Use `webhook-id` header as a deduplication key in your database to avoid processing the same event twice.
- **Out-of-order delivery**: Webhooks may arrive out of order. Always re-fetch the latest state from the API after receiving a webhook rather than applying deltas from the webhook payload.
- **Retry on failure**: If your endpoint returns a non-2xx response, Recall will retry the webhook delivery. Ensure your handler can safely process retries.
- **Timeouts**: Respond to webhooks within 15 seconds. Offload heavy processing (e.g., transcription, AI summarization) to a background job queue.
- **Error recovery**: If calendar event fetch fails after a `calendar.sync_events` webhook, log the error and retry. Do NOT silently drop webhook events — use a dead-letter queue or alarm mechanism.

## Important Notes

- OAuth refresh tokens are long-lived - only need updating if revoked.
- Calendars are NOT automatically deduplicated on creation - implement dedup in your app (see sample: https://github.com/recallai/sample-apps/blob/main/calendar_v2/src/api/handlers/calendar_oauth_callback.ts#L77-L110).
- If Google OAuth client is in "testing" mode, refresh tokens expire after 7 days.
- Calendar events are synced within window: 1 day prior to 28 days future.
- Events outside 28 day window will trigger webhook when they enter the window.

## Calendar Disconnection

- Recommended: Have a button in your app that calls Delete Calendar API.
  - Immediately cleans up all scheduled bots.
- If user revokes via Google settings: Can be delayed hours before Recall detects.
- When a calendar disconnects, you receive a `calendar.update` webhook.

## API Endpoints Reference

- Create Calendar: `POST /api/v2/calendars/`
- Retrieve Calendar: `GET /api/v2/calendars/{id}/`
- Update Calendar: `PATCH /api/v2/calendars/{id}/`
- Delete Calendar: `DELETE /api/v2/calendars/{id}/`
- List Calendar Events: `GET /api/v2/calendar-events/`
- Schedule Bot For Calendar Event: `POST /api/v2/calendar-events/{id}/bot/`
- Delete Bot From Calendar Event: `DELETE /api/v2/calendar-events/{id}/bot/`

## See Also

- [04-google-calendar-oauth.md](04-google-calendar-oauth.md) - OAuth setup for Google Calendar
- [07-webhooks.md](07-webhooks.md) - Webhook verification and processing
- [02-bot-management.md](02-bot-management.md) - Bot lifecycle and management patterns