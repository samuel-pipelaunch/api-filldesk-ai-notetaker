# Transcription

Source: https://docs.recall.ai/docs/transcription

## Overview

- Transcription is NOT enabled by default - must configure a transcription method
- Recall captures audio, routes to speech-to-text provider, applies speaker attribution
- Consistent format regardless of provider chosen

## Transcription Providers

### 1. Recall.ai Transcription (Recommended for getting started)

- Zero setup - works through Recall directly
- Multiple language support
- Higher quality transcriptions
- Additional cost
- Guide: https://docs.recall.ai/docs/recallai-transcription

### 2. Third-Party Transcription

Officially supported providers:

| Provider | Bots Real-time | Bots Async | Desktop SDK Real-time |
|----------|---------------|------------|----------------------|
| Assembly AI | Yes | Yes | Yes |
| Deepgram | Yes | Yes | Yes |
| Gladia | Yes | Yes | Yes |
| AWS Transcribe | Yes | Yes | No |
| Rev | Yes | Yes | No |
| Speechmatics | Yes | Yes | No |
| Google Cloud STT | Yes | No | No |

- Advanced features: custom word dictionaries, spelling
- Guide: https://docs.recall.ai/docs/ai-transcription

### 3. Meeting Caption Transcription

- Free option using meeting platform's native captions
- Google Meet captions available
- Lower quality, not 100% reliable
- Real-time only, no multilingual support
- Guide: https://docs.recall.ai/docs/meeting-caption-transcription

## Transcription Methods

### Real-Time Transcription

- Delivered continuously during the call via webhook or websocket
- Bot guide: https://docs.recall.ai/docs/bot-real-time-transcription
- Lower accuracy than async

### Async Transcription (Post-Call)

- Highest overall quality - prefer unless real-time needed
- Guide: https://docs.recall.ai/docs/async-transcription

### Retrieving Transcripts

After a bot's call completes (signaled by the `done` bot status change webhook), retrieve the transcript:

```bash
curl -X GET "https://REGION.recall.ai/api/v1/bot/{BOT_ID}/transcript/" \
	-H "Authorization: Token $RECALL_API_KEY"
```

The response contains an array of transcript segments with speaker attribution:

```json
[
	{
		"speaker": "John Doe",
		"speaker_id": 1,
		"words": [
			{
				"text": "Hello everyone",
				"start_time": 1.5,
				"end_time": 2.3,
				"confidence": 0.98
			}
		],
		"is_final": true,
		"language": "en"
	}
]
```

**Workflow:**
1. Receive `done` webhook for the bot
2. Call `GET /api/v1/bot/{id}/transcript/` to fetch the full transcript
3. Store transcript in your database, associated with the meeting/tenant
4. Trigger any post-processing (AI summarization, action item extraction)

Source: https://docs.recall.ai/reference/bot_transcript_list

## Diarization (Speaker Attribution)

- Automatic speaker timeline diarization by default
- Perfect Diarization available for higher accuracy
- Guide: https://docs.recall.ai/docs/diarization

## Best Practices

- Source: https://docs.recall.ai/docs/transcription-best-practices
- Multilingual support: https://docs.recall.ai/docs/multilingual-transcription

## See Also

- [07-webhooks.md](07-webhooks.md) - Webhook setup for receiving `done` events
- [08-recordings-and-media.md](08-recordings-and-media.md) - Recordings retrieval
- [09-bot-configuration.md](09-bot-configuration.md) - Enabling transcription in bot config
