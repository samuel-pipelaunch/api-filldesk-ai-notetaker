# Recordings and Media

Sources: https://docs.recall.ai/docs/receive-a-recording, https://docs.recall.ai/docs/recordings-and-media

## Configuring Recording

When creating a bot, specify `recording_config`:

```bash
curl -X POST "https://us-east-1.recall.ai/api/v1/bot/" \
  -H "Authorization: $RECALL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "meeting_url": "https://meet.google.com/xxx-xxxx-xxx",
    "recording_config": {
      "video_mixed_mp4": {}
    }
  }'
```

## Fetching Recordings

After bot's call completes, receive `done` Bot Status Change Webhook, then:

```bash
curl -X GET "https://REGION.recall.ai/api/v1/bot/{BOT_ID}/" \
  -H "Authorization: $RECALL_API_KEY"
```

Response includes:

- `recordings` array with recording objects
- `media_shortcuts.video_mixed.data.download_url` - pre-signed S3 URL for download
- Recording statuses: `processing`, `done`, `error`

## Recording Response Example

```json
{
  "id": "bot-uuid",
  "recordings": [
    {
      "id": "recording-uuid",
      "created_at": "2024-12-03T02:54:11Z",
      "started_at": "2024-12-03T02:54:43Z",
      "completed_at": "2024-12-03T02:55:03Z",
      "expires_at": "2024-12-10T02:55:03Z",
      "status": { "code": "done" },
      "media_shortcuts": {
        "video_mixed": {
          "data": {
            "download_url": "https://recallai-production-bot-data.s3.amazonaws.com/..."
          },
          "format": "mp4"
        }
      }
    }
  ]
}
```

## Media Types Available

### Video + Audio

| Type | Delivery | Guide |
|------|----------|-------|
| Mixed MP4 | Async (File) | https://docs.recall.ai/docs/how-to-get-mixed-video-mp4 |
| Mixed Stream | Real-time | https://docs.recall.ai/docs/stream-real-time-video-rtmp |

### Audio Only

| Type | Delivery | Guide |
|------|----------|-------|
| Mixed MP3 | Async (File) | https://docs.recall.ai/docs/how-to-get-mixed-audio-async |
| Mixed Stream | Real-time | https://docs.recall.ai/docs/how-to-get-mixed-audio-real-time |
| Per Participant | Async | https://docs.recall.ai/docs/how-to-get-separate-audio-per-participant-async |
| Per Participant | Real-time | https://docs.recall.ai/docs/how-to-get-separate-audio-per-participant-realtime |

### Video Only (Separate per participant)

| Type | Delivery | Guide |
|------|----------|-------|
| Per Participant | Async | https://docs.recall.ai/docs/how-to-get-separate-videos-per-participant-async |
| Per Participant | Real-time | https://docs.recall.ai/docs/how-to-get-separate-videos-per-participant-realtime |

## Recording Control

- Start/stop recording during a call
- Source: https://docs.recall.ai/docs/recording-control

## Data Retention

- Recordings have expiration dates (see `expires_at` field)
- Source: https://docs.recall.ai/docs/storage-and-playback

### Recording Persistence Strategy

> **Important:** Recall.ai recordings expire (see `expires_at` field). FillDesk **must** download and store recordings in its own storage before expiration.

**Recommended pipeline:**
1. Receive `done` bot status change webhook
2. Fetch bot details via `GET /api/v1/bot/{id}/`
3. Extract `download_url` from `recordings[].media_shortcuts.video_mixed.data.download_url`
4. Download the recording file from the pre-signed S3 URL
5. Upload to FillDesk's own AWS S3 bucket, organized by tenant and meeting
6. Store the S3 object key in FillDesk's database linked to the meeting record
7. Mark the recording as persisted

**Implementation notes:**
- The `download_url` is a pre-signed S3 URL that expires - download promptly after the webhook
- Use a background job queue (e.g., SQS + Lambda, or Bull/BullMQ) to handle downloads asynchronously
- Implement retry logic with exponential backoff for download failures
- Monitor for recordings that weren't persisted before `expires_at`

## Speaker Timelines

- Timestamps of when different participants started speaking
- Source: https://docs.recall.ai/docs/speaker-timeline

## Meeting Participants & Events

- List of participants, camera on/off, screenshare, mic, chat events
- Source: https://docs.recall.ai/docs/meeting-participants-events

## Meeting Metadata

- Meeting title and other metadata
- Source: https://docs.recall.ai/docs/meeting-metadata

## See Also

- [06-transcription.md](06-transcription.md) - Transcript retrieval follows same webhook trigger
- [07-webhooks.md](07-webhooks.md) - Webhook setup
- [01-regions-and-multi-tenancy.md](01-regions-and-multi-tenancy.md) - S3 bucket per region
