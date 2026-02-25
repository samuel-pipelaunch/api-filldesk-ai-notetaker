# Regions and Multi-Tenancy

This document defines how FillDesk AI Notetaker uses Recall.ai regions and implements tenant isolation.

## Regions and Base URLs

Recall.ai currently supports multiple regions:

- **US West** (`us-west-2`)
- **US East** (`us-east-1`)
- **EU** (`eu-central-1`)
- **Asia** (`ap-northeast-1`)

Each region is a completely separate Recall.ai deployment:

- Login credentials are different per region
- API keys are different per region
- All resources are region-local and must be accessed from the same region where they were created

### Base API URLs

| Region | Base URL | Notes |
| --- | --- | --- |
| US West | https://us-west-2.recall.ai | Pay-as-you-go signup available |
| US East | https://us-east-1.recall.ai | `api.recall.ai` is equivalent |
| EU | https://eu-central-1.recall.ai | Pay-as-you-go signup available |
| Asia | https://ap-northeast-1.recall.ai | APAC deployment (not used by FillDesk — listed for reference only) |

Source: https://docs.recall.ai/docs/regions

## Multi-Tenancy Architecture for FillDesk

Recall.ai is a multi-tenant platform and does **not** provide first-class per-customer data isolation. FillDesk must enforce tenant isolation in our own database and application layer.

### 1) Region Routing

Each FillDesk tenant is assigned to either a US or EU Recall region.

- Store `recall_region` for each tenant in our database
- Route all API calls to the tenant’s assigned region base URL
- Use separate API keys per region (`RECALL_API_KEY_US`, `RECALL_API_KEY_EU`)
- Treat each Recall region as a separate workspace domain with its own settings, webhooks, and credentials

### 2) Custom Metadata for Tenant Tagging

Use Recall.ai custom metadata to tag resources with tenant identifiers.

- When creating bots, include metadata such as `{"tenant_id": "xxx", "user_id": "yyy"}`
- Query bots by metadata filters, for example: `GET /api/v1/bot/?metadata__tenant_id=xxx`
- Metadata supports only string key-value pairs
- Maximum value length is 500 characters per metadata value
- Metadata is **not** a security boundary
- FillDesk must enforce authorization in our own API before exposing any Recall resource

Source: https://docs.recall.ai/docs/custom-metadata

### 3) Workspaces by Environment

Use separate Recall workspaces for development lifecycle environments (dev, staging, production).

- Workspaces isolate bot data, webhook URLs, calendars, platform credentials, and transcription credentials
- Recall allows up to 50 workspaces per organization
- Do **not** use workspaces to isolate end-customer data
- End-customer isolation must be implemented by FillDesk

Source: https://docs.recall.ai/docs/environments

### 4) Implementation Pattern

```typescript
// Determine the base URL for a tenant
function getRecallBaseUrl(region: 'us' | 'eu'): string {
  const urls = {
    // FillDesk uses us-east-1 as the primary US region (equivalent to api.recall.ai)
    us: 'https://us-east-1.recall.ai',
    eu: 'https://eu-central-1.recall.ai',
  };
  return urls[region];
}

// Get the API key for a tenant's region
function getRecallApiKey(region: 'us' | 'eu'): string {
  const keys = {
    us: process.env.RECALL_API_KEY_US,
    eu: process.env.RECALL_API_KEY_EU,
  };
  const key = keys[region];
  if (!key) throw new Error(`Missing RECALL_API_KEY for region: ${region}`);
  return key;
}
```

## Notes for FillDesk Backend (AWS)

- Keep region routing deterministic at request boundaries
- Include tenant and region context in structured logs
- Ensure webhook handlers validate origin and map events back to tenant records
- Never assume Recall resource IDs are globally unique across regions without tenant context

## See Also

- [09-bot-configuration.md](09-bot-configuration.md) - Custom metadata details and bot settings
- [07-webhooks.md](07-webhooks.md) - Webhook handling and region-specific webhook setup