# Bot Configuration Reference

Source reference:
- https://docs.recall.ai/docs/automatic-leaving-behavior

## Automatic Leave Configuration

Control when bots automatically leave calls. Important for cost/usage management.

### Default Timeouts

```json
{
  "automatic_leave": {
    "silence_detection": {
      "timeout": 3600,
      "activate_after": 1200
    },
    "bot_detection": {
      "using_participant_events": {
        "timeout": 600,
        "activate_after": 1200
      },
      "using_participant_names": {
        "timeout": 3600,
        "activate_after": 1200
      }
    },
    "everyone_left_timeout": {
      "timeout": 2,
      "activate_after": 0
    },
    "waiting_room_timeout": 1200,
    "noone_joined_timeout": 1200,
    "in_call_not_recording_timeout": 3600,
    "recording_permission_denied_timeout": 30
  }
}
```

### Participant Timeouts

- **Silence Detection**: Leave after continuous silence. Default: 3600s (60 min). Activates after 1200s (20 min).
- **Everyone Left**: Leave after all participants gone. Default: 2s. Needs at least 1 participant first.
- **No-One Joined**: Leave if no one else joins. Default: 1200s (20 min).

### Waiting Room Timeout

- Default: 1200s (20 min).
- Google Meet: No platform-enforced limit (unlike Teams' 30 min limit).

### Recording Timeouts

- **In Call Not Recording**: Max time bot stays in call while not recording. Default: 3600s.
- **In Call Recording**: Max recording time per meeting (e.g., limit free accounts to 30 min).
- **Recording Permission Denied**: Time to wait after recording denied. Default: 30s.

### Bot Detection Settings

- **Using Participant Events**: Marks participants as bots if no `active_speaker` or `screenshare_start` events. Less reliable on Google Meet.
- **Using Participant Names** (RECOMMENDED for Google Meet): Substring match against participant names.
  - Set `matches` array with strings like `['notetaker', 'filldesk', 'bot']`.

## Custom Metadata

Source: https://docs.recall.ai/docs/custom-metadata

- Attach string key-value pairs to bots/recordings.
- Use for tenant tracking: `metadata: { "tenant_id": "xxx", "user_id": "yyy" }`.
- Query by metadata: `GET /api/v1/bot/?metadata__tenant_id=xxx`.
- Max 500 chars per value, no nested objects.

## Recording Configuration

When creating a bot, configure recording via `recording_config`:

```json
{
  "recording_config": {
    "video_mixed_mp4": {}
  }
}
```
