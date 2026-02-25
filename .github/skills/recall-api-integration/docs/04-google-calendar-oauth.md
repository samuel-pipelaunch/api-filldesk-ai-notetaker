# Google Calendar OAuth Setup

Source: https://docs.recall.ai/docs/calendar-v2-google-calendar

## Creating Google OAuth 2.0 Client

1. Enable the Google Calendar API in your Google Cloud project.
   - https://support.google.com/googleapi/answer/6158841
2. Obtain OAuth 2.0 client credentials.
   - https://support.google.com/googleapi/answer/6158849
3. Configure permission scopes in consent screen:
   - `calendar.events.readonly` (sensitive scope)
   - `userinfo.email` (non-sensitive scope)
4. Add Authorized redirect URI in Credentials section.
   - Must NOT include Recall's domain - use your own app domain.
   - Must verify domain ownership for production publish.

## Implementing OAuth 2.0 Authorization Code Flow

- Reference: https://developers.google.com/identity/protocols/oauth2/web-server
- Code samples from Calendar V2 Demo:
  - https://github.com/recallai/calendar-integration-demo/blob/v2/v2-demo/logic/oauth.js
  - https://github.com/recallai/calendar-integration-demo/blob/v2/v2-demo/routes/oauth-callback/google-calendar.js#L27

## Going to Production: Getting Google Approval

- Fill app information: https://console.cloud.google.com/apis/credentials/consent/edit
- Required scopes: `calendar.events.readonly` and `userinfo.email`
- Explanation template for scope usage: "We need access to the /auth/calendar.events.readonly scope in order to automatically record our user's video conference meetings on their 'primary' calendar. We read event data in order to find video conference events that our users have scheduled."
- Demo video required: Walk through signup, OAuth flow, and meeting recording interface.
- Official guide: https://support.google.com/cloud/answer/9110914

## FAQs

- **Testing mode expiry**: If OAuth client is in "testing", connections expire after 7 days. Publish to fix.
- **Display name**: NOT guaranteed to be populated for all attendees. Don't rely on it.
- **Primary calendar only**: Calendar V2 only fetches from user's primary calendar.
- **Calendar disconnect with `invalid_grant`**: Likely testing mode expiry.