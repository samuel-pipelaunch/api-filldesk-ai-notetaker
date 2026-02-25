# Google Meet Integration

Source reference:
- https://docs.recall.ai/docs/google-meet

## Setup

- No setup or configuration needed — Google Meet works out-of-the-box with Recall.ai.

## Joining Behavior

- **Default (Anonymous)**: Bots need to be manually admitted into calls.
  - Dialog shown to participants: "Someone wants to join this call"
  - Any signed-in participant in the host's Google Workspace can admit the bot.
- **Authenticated Bots**: Auto-join Google Meet calls.
  - Requires signed-in bot setup: https://docs.recall.ai/docs/google-meet-login-getting-started
  - Still subject to waiting room settings enabled by host.

## Meeting URL Format

- Format: `https://meet.google.com/xxx-xxxx-xxx`
- Source: https://docs.recall.ai/docs/meeting-urls

## Google Meet-Specific Considerations

- **Bot Detection**: Google Meet occasionally emits false positive participant events for bots.
  - Use a combination of participant events + participant names for reliable bot detection.
  - Recommended: Set `automatic_leave.bot_detection.using_participant_names.matches` with identifiable terms like `notetaker`, `FillDesk`.
- **Breakout Rooms**: NOT supported.
- **Livestreams**: NOT supported.
- **Captions**: Google Meet provides native closed captions (can be used for free transcription).

## Recommended Bot Configuration for Google Meet

```json
{
  "meeting_url": "https://meet.google.com/xxx-xxxx-xxx",
  "bot_name": "FillDesk Notetaker",
  "automatic_leave": {
    "waiting_room_timeout": 1200,
    "noone_joined_timeout": 1200,
    "everyone_left_timeout": {
      "timeout": 2,
      "activate_after": 0
    },
    "bot_detection": {
      "using_participant_names": {
        "matches": ["notetaker", "filldesk", "bot"],
        "timeout": 3600,
        "activate_after": 1200
      }
    }
  }
}
```
