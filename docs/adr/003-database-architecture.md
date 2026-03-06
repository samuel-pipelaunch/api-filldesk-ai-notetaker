# ADR-003: Database Architecture — Aurora Serverless v2 + DynamoDB + S3

## Status
Accepted

## Date
2026-03-06

## Context

FillDesk AI Notetaker needs a database architecture that supports:

- **2,000 users** in year 1, organized into team/org tenants (~200–500 orgs)
- **15+ meetings per user per week** → ~130K meetings/month
- **US and EU deployments** for GDPR data residency (EU user data must stay in EU)
- **Four query patterns**: CRUD by date/user, full-text transcript search, analytics/dashboards, AI semantic search
- **Multi-tenancy** at the org level with strong isolation
- **OAuth token storage** for Google Calendar connections
- **Recording persistence** in own storage (Recall.ai recordings expire)
- **Healthcare-adjacent sector** — recruiters serving healthcare clients; potential future need for HIPAA BAA compliance for specific customers
- **Budget**: $50–200/month for database services

Recall.ai workspaces are limited to ~50 per organization and must NOT be used for per-customer isolation (see `.github/skills/recall-api-integration/docs/01-regions-and-multi-tenancy.md`). All tenant isolation is FillDesk's responsibility.

## Decision

### Primary Database: Aurora Serverless v2 (PostgreSQL)

One Aurora Serverless v2 PostgreSQL cluster per region (us-west-2, eu-west-1).

| Property | Value |
|----------|-------|
| Engine | PostgreSQL (latest LTS, currently 16.x) |
| Deployment | Aurora Serverless v2, 1 cluster per region |
| Minimum ACU | 0.5 per region |
| Maximum ACU | 4 per region (adjustable) |
| Extensions required | `pgvector`, `pg_trgm` |
| Encryption | At rest (AWS-managed KMS), in transit (TLS enforced) |

#### Why Aurora Serverless v2

- Auto-scales ACUs with load — no manual instance resizing
- Handles traffic spikes (webhook bursts from Recall.ai) without pre-provisioning
- PostgreSQL compatibility means pgvector + full-text search + RLS in one engine
- Less operational burden than RDS Provisioned (no instance type planning)
- Cost: ~$44/month/region at 0.5 ACU minimum (~$88/month total)

### Multi-Tenancy: Shared Schema + Row-Level Security (RLS)

All tenants share the same schema. Every table that contains tenant-scoped data has a `tenant_id` column. PostgreSQL RLS policies enforce isolation at the database engine level.

#### Rules for agents writing database code

- **Every tenant-scoped table MUST have a `tenant_id UUID NOT NULL` column**
- **Every tenant-scoped table MUST have RLS enabled**: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
- **Every tenant-scoped table MUST have a tenant isolation policy**:
  ```sql
  CREATE POLICY tenant_isolation ON <table>
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
  ```
- **The application MUST call `SET app.current_tenant = '<tenant_id>'` on every database connection before executing queries**
- **The application database role MUST NOT have `BYPASSRLS`** — only the migration/admin role should
- **Never use a superuser role in application code**
- **Never add `SECURITY DEFINER` to functions unless explicitly required and reviewed**
- **Cross-tenant queries** (admin dashboards, platform analytics) use a separate connection with a role that has `BYPASSRLS`, accessed only from internal admin services — never from user-facing API routes

#### Why not schema-per-tenant

Schema-per-tenant multiplies operational complexity (migrations × N, connection pooling degradation, catalog bloat increasing ACU cost) without providing true isolation. At 200–500 orgs, shared schema + RLS is the industry standard (used by Salesforce, Notion, Slack). Schema-per-tenant is the worst of both worlds — it has the pain of separate databases without the isolation guarantee.

#### HIPAA / Dedicated Cluster Escape Hatch

FillDesk serves recruiters in the healthcare sector. Recruiters generally handle candidate PII, not clinical PHI — HIPAA typically does not apply. However, if a customer (e.g., a hospital HR department) requires a BAA:

- Offer a **dedicated Aurora cluster** as a premium tier
- Same schema, same application code, different connection string routed by tenant config
- This is a future product/pricing decision, not a default architecture pattern
- **Do not implement dedicated cluster logic until a customer explicitly requires it**

### Full-Text Search: PostgreSQL Built-In (tsvector)

| Property | Value |
|----------|-------|
| Method | `tsvector` column + GIN index |
| Applied to | `transcripts.full_text`, `meetings.title`, `summaries.summary` |
| Language config | `english` (add per-tenant language config later if needed) |

#### Rules for agents writing search code

- **Add a `search_vector tsvector` column** to tables that need full-text search
- **Create a GIN index** on the `search_vector` column
- **Use a trigger or generated column** to keep `search_vector` in sync with source text
- **Query with `@@` operator**: `WHERE search_vector @@ plainto_tsquery('english', $1)`
- **Do NOT add OpenSearch/Elasticsearch** — PostgreSQL FTS is sufficient at this scale. Revisit only if search quality becomes a user-reported problem at 10K+ users.

### AI Semantic Search: pgvector

| Property | Value |
|----------|-------|
| Extension | `pgvector` |
| Column type | `vector(1536)` (for OpenAI embeddings) or adjust to match chosen model |
| Index type | `ivfflat` initially, switch to `hnsw` at scale |
| Applied to | `transcripts.embedding` |

#### Rules for agents writing vector search code

- **Store embeddings as `vector(N)` columns** where N matches the embedding model dimension
- **Create an ivfflat index**: `CREATE INDEX ON transcripts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`
- **Query with distance operator**: `ORDER BY embedding <=> $1 LIMIT 10`
- **Always include `tenant_id` in the WHERE clause** — RLS enforces this, but be explicit for query planning
- **Generate embeddings asynchronously** (background job after transcript is stored), never in the request path

### Secondary Database: DynamoDB (On-Demand)

One DynamoDB table per region for ephemeral, high-frequency data.

| Use Case | Partition Key | Sort Key | TTL |
|----------|--------------|----------|-----|
| Webhook deduplication | `webhook_id` (from `webhook-id` header) | — | 24 hours |
| Bot status cache | `bot_id` | `timestamp` | 1 hour |

#### Rules for agents writing DynamoDB code

- **Use on-demand (pay-per-request) pricing** — never provision capacity
- **Always set TTL** on items — this table is for ephemeral data only
- **Never store tenant-scoped business data in DynamoDB** — it belongs in PostgreSQL
- **Check DynamoDB for webhook dedup BEFORE processing any Recall.ai webhook**

### Object Storage: S3 (Per Region)

| Property | Value |
|----------|-------|
| Bucket naming | `filldesk-recordings-{stage}-{region}` |
| Path convention | `/{tenant_id}/{meeting_id}/{recording_id}.{format}` |
| Encryption | SSE-S3 (AES-256) |
| Lifecycle | Intelligent-Tiering or: Standard → Glacier after 90d → Delete after 365d |
| Access | Pre-signed URLs only — never public |

#### Rules for agents writing S3 code

- **Never make S3 objects public**
- **Always generate pre-signed URLs** with short expiry (15 minutes) for user downloads
- **Include `tenant_id` in the S3 key path** — enables per-tenant lifecycle policies and auditing
- **Download recordings from Recall.ai immediately** after receiving the `done` webhook — Recall recordings expire (see `expires_at` field)
- **Use a background job** (SQS + Lambda or similar) for recording downloads — never block the webhook handler

### OAuth Token Storage: Encrypted Columns in PostgreSQL

| Property | Value |
|----------|-------|
| Column | `calendar_connections.oauth_refresh_token_encrypted` |
| Encryption | Application-level AES-256-GCM, key from AWS KMS |
| Access pattern | Decrypt on read, encrypt on write — in the service layer |

#### Rules for agents writing OAuth code

- **Never store OAuth tokens in plaintext**
- **Never log OAuth tokens** — not even at debug level
- **Use AWS KMS `GenerateDataKey`** for envelope encryption — the KMS key ID comes from environment config, never hardcoded
- **Do NOT use AWS Secrets Manager for per-user tokens** — at $0.40/secret/month, it costs $800/month at 2,000 users

## Data Model Sketch

```
tenants
├── id: UUID (PK)
├── name: VARCHAR
├── recall_region: ENUM('us', 'eu')
├── plan: VARCHAR
├── settings: JSONB
└── created_at: TIMESTAMPTZ

users
├── id: UUID (PK)
├── tenant_id: UUID (FK → tenants) [RLS]
├── email: VARCHAR (UNIQUE per tenant)
├── role: VARCHAR
└── created_at: TIMESTAMPTZ

calendar_connections
├── id: UUID (PK)
├── tenant_id: UUID (FK → tenants) [RLS]
├── user_id: UUID (FK → users)
├── platform: ENUM('google_calendar')
├── calendar_email: VARCHAR
├── recall_calendar_id: VARCHAR
├── oauth_refresh_token_encrypted: BYTEA
└── created_at: TIMESTAMPTZ

meetings
├── id: UUID (PK)
├── tenant_id: UUID (FK → tenants) [RLS]
├── recall_bot_id: VARCHAR
├── calendar_event_id: VARCHAR (nullable)
├── title: VARCHAR
├── meeting_url: VARCHAR
├── started_at: TIMESTAMPTZ
├── ended_at: TIMESTAMPTZ
├── status: VARCHAR
├── search_vector: TSVECTOR (GIN indexed)
└── created_at: TIMESTAMPTZ

transcripts
├── id: UUID (PK)
├── meeting_id: UUID (FK → meetings)
├── tenant_id: UUID (FK → tenants) [RLS]
├── full_text: TEXT
├── segments: JSONB (speaker-attributed transcript array)
├── search_vector: TSVECTOR (GIN indexed)
├── embedding: VECTOR(1536) (ivfflat indexed)
└── created_at: TIMESTAMPTZ

summaries
├── id: UUID (PK)
├── meeting_id: UUID (FK → meetings)
├── tenant_id: UUID (FK → tenants) [RLS]
├── summary: TEXT
├── action_items: JSONB
├── key_decisions: JSONB
├── search_vector: TSVECTOR (GIN indexed)
└── created_at: TIMESTAMPTZ

recordings
├── id: UUID (PK)
├── meeting_id: UUID (FK → meetings)
├── tenant_id: UUID (FK → tenants) [RLS]
├── s3_key: VARCHAR
├── format: VARCHAR
├── size_bytes: BIGINT
├── duration_seconds: INTEGER
├── persisted: BOOLEAN DEFAULT false
└── created_at: TIMESTAMPTZ
```

## Growth Path

| Milestone | Action | Trigger |
|-----------|--------|---------|
| Launch | Aurora Serverless v2 (0.5 ACU min) + DynamoDB + S3 | — |
| 5K users | Monitor ACU scaling; likely auto-handles | ACU consistently > 2 |
| 10K users | Add read replicas for analytics queries | Analytics queries impacting write latency |
| Search quality complaints | Add OpenSearch as read-only projection | User-reported search inadequacy |
| HIPAA customer | Spin up dedicated Aurora cluster as premium tier | Customer requests BAA |
| 50K+ users | Evaluate sharding strategy or Aurora Global Database | Cross-region read latency issues |

## Alternatives Considered

| Option | Rejected Because |
|--------|-----------------|
| RDS Provisioned (db.t4g.small) | Manual scaling; less operational flexibility; Aurora Serverless v2 preferred for auto-scaling |
| DynamoDB as primary | Loses SQL, joins, full-text search, pgvector; forces single-table design for relational data |
| Schema-per-tenant | Multiplies migration complexity × N, degrades connection pooling, increases ACU cost via catalog bloat |
| OpenSearch for search | $100–350+/month; PostgreSQL FTS is sufficient for 1–2 years |
| Separate vector DB (Pinecone, Weaviate) | Adds operational cost + complexity; pgvector handles this at our scale |
| Secrets Manager for tokens | $0.40/secret × 2000 users = $800/month |
| Neon (serverless Postgres) for dev | Interesting for non-prod cost savings but adds second provider; not worth the complexity yet |

## Estimated Monthly Cost

| Service | Per Region | Both Regions |
|---------|-----------|-------------|
| Aurora Serverless v2 (0.5 ACU min) | ~$44 | ~$88 |
| Aurora Storage (20 GB) | ~$2.30 | ~$4.60 |
| DynamoDB on-demand | ~$1 | ~$2 |
| **Total database cost** | **~$47** | **~$95** |

S3 cost is usage-dependent and excluded from this estimate.

## Consequences

### Positive
- Single PostgreSQL engine handles relational, search, and vector workloads — simple stack, less to operate
- RLS provides engine-level tenant isolation — bugs in application code cannot leak data across tenants
- Aurora Serverless v2 auto-scales for Recall.ai webhook bursts without pre-provisioning
- pgvector and FTS avoid $100+/month in additional service costs
- DynamoDB handles ephemeral hot-path data without polluting the relational model
- Clear growth path from $95/month to enterprise-scale without re-architecting
- HIPAA escape hatch is a product decision (dedicated cluster upsell), not an infrastructure rearchitecture

### Negative
- Aurora Serverless v2 has a higher cost floor (~$88/month) than RDS Provisioned (~$50/month)
- pgvector search quality may lag behind dedicated vector DBs at very large scale (100K+ documents)
- PostgreSQL FTS is adequate but not as feature-rich as OpenSearch (no fuzzy matching, weaker ranking)
- Two regions means two independent clusters — no automatic cross-region replication (by design, for GDPR)
- RLS adds a small performance overhead per query (negligible at this scale)
