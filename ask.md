Here is a comprehensive architectural review combining the insights from all the models. Your foundation—using Recall.ai and the JWT/Apex token exchange pattern—is solid. However, there are several critical areas, edge cases, and hidden risks you need to address before scaling.

### 1. The "Unlimited" Cost & Business Risk
Offering "unlimited" transcripts is a massive financial risk that becomes an architectural constraint. 
*   **The Math:** A 1-hour meeting is ~15K-20K tokens. With GPT-4-class models, extraction costs add up quickly, alongside Recall.ai bot-hour costs and S3 storage. A power user doing 8 meetings/day could cost you $2-$5/day in variable costs.
*   **Mitigation:** 
    *   Implement internal telemetry to track token usage and compute costs per tenant.
    *   Enforce "fair use" guardrails (soft limits, max meeting hours/day, max bot concurrency) even if they aren't exposed to the user.
    *   Implement strict S3 lifecycle policies (e.g., auto-delete video/audio after 30-90 days, keep only text transcripts) to control storage costs.

### 2. Salesforce Multi-Org & Sandbox Strategy
Salesforce sandboxes clone user IDs but change the Org ID, which will cause data contamination if not handled correctly.
*   **Environment Flagging:** Your JWT payload must encode `{ clientId, orgId, environment: "production" | "sandbox" }`.
*   **Tenant Modeling:** Treat the Salesforce Org ID as an environment instance, not the root tenant identity. Model it as: `Customer Account` → `SF Connections (Prod + Sandboxes)` → `Licensed Users`.
*   **User Mapping:** Map sandbox users to production users by **email**, not by Salesforce User ID (since IDs are cloned and will collide). Keep sandbox and production data strictly isolated.

### 3. Candidate Association (The Hardest Problem)
Relying solely on exact email matches will fail frequently (personal vs. work emails, agency aliases, phone screens, forwarded invites).
*   **Multi-Signal Matching:** Use a weighted matching strategy:
    1. Exact email match from calendar invitees.
    2. Fuzzy name matching from the meeting platform (Zoom/Meet participants).
    3. Calendar event metadata (title parsing, e.g., "Interview - John Smith").
    4. Phone numbers (normalized E.164) extracted via Recall.ai caller ID or transcripts.
*   **The UX Escape Hatch:** You *must* build an **"Unassigned Meetings" inbox**. Auto-suggest candidates with a confidence score, but require the recruiter to manually link or confirm the association in 1-2 clicks. 

### 4. Dynamic Prompts & AI Extraction
Handling different prompts per client/ATS requires a structured configuration system, not hardcoded strings.
*   **Template Hierarchy:** Store prompts in the database with a fallback structure: `Base Prompt` → `Client Override` → `User Override`.
*   **Structured Output:** Define strict JSON schemas for what the LLM must output. The ATS integration layer defines "what fields exist" (which varies wildly between Bullhorn, Seven20, etc.), and the prompt defines "how to extract them."
*   **Verification:** LLMs hallucinate. Your UI should link extracted data points directly to the transcript timestamps so recruiters can verify the source.
*   **Prompt Injection:** Protect against adversarial candidates saying things on the call designed to break your JSON extraction.

### 5. Data Residency, Security & Multi-Tenancy
Your instinct to separate US and EU regions is correct for GDPR compliance.
*   **Infrastructure:** Use separate AWS accounts or distinct regional endpoints (e.g., `us-east-1` and `eu-west-1`). The Salesforce Named Credential should point to the correct regional API.
*   **Data Isolation:** A database-per-tenant is likely too expensive right now. Use a shared database with **Logical Isolation** (strict Row-Level Security in PostgreSQL using `tenant_id`) combined with **Physical Isolation** for media (dedicated S3 buckets/prefixes per region and tenant).
*   **Encryption:** Use AWS KMS to encrypt OAuth tokens, transcripts, and recordings at rest. Ensure your JWT API keys are scoped strictly by `org_id` + `user_id`.

### 6. Asynchronous Processing & Webhook Reliability
Recall.ai is heavily asynchronous. Do not process webhooks synchronously.
*   **Event-Driven Pipeline:** Ingest webhooks into a message queue (AWS SQS or EventBridge). This handles traffic spikes, out-of-order delivery, and retries.
*   **State Machine:** Track meeting states explicitly: `scheduled` → `joining` → `recording` → `transcribing` → `extracting` → `synced to ATS` / `failed`.
*   **Security:** Always verify Recall.ai webhook signatures to prevent spoofing.

### 7. Bot Operations & Calendar Lifecycle
*   **Bot Failures:** Bots get stuck in waiting rooms, get denied entry, or hit passcode walls. Your system must gracefully handle these and surface real-time alerts to the recruiter.
*   **Calendar Sync:** OAuth tokens expire. Build monitoring to alert users when their Google/Outlook calendar disconnects. (Note: You must support Outlook, as it is heavily used in enterprise recruiting).
*   **Consent:** Ensure you handle recording consent (audible disclaimers or participant consent flags) as required by local laws.

### 8. ATS Write-Back Conflicts
Pushing data back to Salesforce, Bullhorn, or Seven20 is fraught with edge cases.
*   **Conflicts:** Handle locked candidate records, strict validation rules that reject your AI's data, and aggressive ATS API rate limits.
*   **Updates:** Decide if multiple meetings for the same candidate append to existing notes or overwrite them.
*   **GDPR Deletions:** If a candidate invokes their "Right to be Forgotten" in the ATS, you need a webhook or polling mechanism to cascade that deletion to your database and S3 buckets.

### 9. Missing Features to Plan For
*   **Global Search:** Recruiters will need to search across all historical transcripts for specific keywords.
*   **Human-in-the-Loop:** Recruiters will want to edit the AI summaries before they are pushed to the ATS.
*   **Sharing/Collaboration:** The ability to securely share a specific meeting recording/transcript with a hiring manager who does not have a FillDesk license.















---------------


High-level architecture sanity check (and likely hidden risks)
1) “Unlimited transcripts” is a product promise that becomes an architecture constraint
Cost control: Recall.ai + transcription + LLM extraction + storage/egress can spike unpredictably. “Unlimited” usually needs fair-use guardrails (soft limits, throttling, per-seat caps, max meeting hours/day, max bot concurrency).
Abuse vectors: leaked API key, misconfigured calendar, or a user invites the bot to recurring all-day meetings.
Recommendation: enforce tenant-level quotas (even if not exposed), plus anomaly detection and kill switches per tenant.
2) Tenant identity in Salesforce (multi-org + sandbox) is trickier than it looks
You need a stable concept of “tenant” that survives:

Multiple production orgs for one company
Sandboxes cloned from prod (IDs cloned / diverge depending on object)
Username/email differences
Recommendation:

Treat Salesforce Org ID as an environment instance, not the tenant identity.
Model: customer_account (e.g., apple.com + internal id) → many sf_connections (prod org + sandboxes) → many licensed_users.
Require admins to label sandbox vs prod at connect time and keep them isolated by default (no data sharing between them unless explicitly enabled).
3) Candidate association is the core “make-or-break” problem
Email-only matching will fail often (personal email vs work email, aliases, agency recruiters, forwarded invites, phone interviews, etc.).

Stronger matching signals you should capture:

Meeting attendees list + organizer + domain heuristics
Calendar event metadata (title, description, location, conferencing URL)
Recruiter identity (the user who scheduled / connected calendar)
Phone numbers (normalized E.164), if present in invites/transcript
ATS context when scheduling (best case: meeting scheduled from ATS or via your SF component so you have a candidate ID upfront)
Product/UX escape hatches you’ll need:

“Unmatched meetings inbox” where users manually link to a candidate in 1–2 clicks (and you learn from it)
A confidence score + explanation (“Matched by email”, “Matched by phone”, “Matched by event title contains req #”)
Ability to link one meeting to multiple candidates (panel interviews) and one candidate to multiple meetings
4) Prompting/extraction must be treated like configuration + versioned schemas, not ad-hoc prompts
Dynamic prompts per client/user are doable, but you’ll want:

Tenant-level extraction templates stored as configuration (not code), with versioning
Structured output: define schemas (JSON fields) per “extraction pack” (Recruiting summary, Scorecard, Red flags, Skills, Next steps)
Evaluation harness: sample transcripts → expected outputs (even lightweight) to prevent prompt drift/regressions
Guardrails: PII policies (what not to extract), and “unknown” defaults (don’t hallucinate)
5) Data residency + isolation: decide early what “EU vs US” means
Key questions:

Is it where the customer is located, where the meeting occurs, or where the SF org is?
Do you need regional processing (LLM calls, Recall.ai region support), or only regional at-rest storage?
Pragmatic approach many SaaS take:

Region is chosen at tenant provisioning and is immutable without migration.
Store transcripts/recordings strictly in-region (S3 + DB).
Use separate encryption keys per tenant (KMS) and enforce tenant_id on every row/object path.
Ensure no cross-region logs leak transcript content (common mistake: verbose logs, error payloads, tracing).
6) Recording consent, compliance, and retention are usually missing in v1 plans
You’ll likely need:

Consent handling (varies by jurisdiction): audible disclaimer, participant consent flags, or customer responsibility language + controls
Retention policies per tenant (e.g., delete after 30/90/365 days)
Right to be forgotten (GDPR): delete by candidate, meeting, or attendee email
Audit logs: who accessed which transcript/recording, and when
DLP/redaction options: redact SSNs, addresses, etc. (at least transcript-side)
7) Operational concerns with Recall.ai + calendars
Common failure modes to design for:

Bot can’t join (waiting room, meeting password, organizer restrictions, capacity limits)
Calendar event changes after scheduling (time moved, link updated)
Duplicate events / recurring series
Webhooks arrive late/out-of-order; retries; idempotency required
Partial transcription (speaker diarization errors, missing segments)
Recommendation: event-driven pipeline with explicit states:
scheduled → joining → recording → transcribing → extracting → delivered → linked/unlinked

8) Security model notes on your JWT license approach
Your “long-lived API key JWT → short-lived platform token” pattern is reasonable, but watch for:

Key rotation and revocation (immediate disable for compromised customers)
JWT audience/issuer scoping per environment (sandbox vs prod)
Prevent tokens from being replayed across tenants (embed tenant_id + org_connection_id + strict aud)
Ensure the Salesforce “named credentials” + Apex proxy is not a single point where tokens can be exfiltrated via logs
Things most teams forget but matter for this product
Search across transcripts (per-tenant indexing, access control, PII redaction)
Deliverability into ATS: where do notes live (candidate record, activity timeline, attachments)? What about updates/overwrites?
Human-in-the-loop: recruiters will want to edit summaries; you must preserve provenance (what came from transcript vs user edits)
Latency expectations: “meeting ended → notes ready in X minutes” with status UI + notifications
Vendor lock-in: fallback/abstraction if Recall.ai has outages or feature gaps (at least isolate integration behind a boundary)
Clarifying questions (answers will drive architecture choices)
Is the bot invited to every meeting on a calendar, or only meetings explicitly flagged/created via your component?
Do you need to store audio/video recordings, or are transcripts + summaries sufficient for v1?
Which side is the “system of record” for linking: ATS candidate ID first, or “meeting object” first with later linking?
What’s your compliance target (SOC 2, GDPR only, HIPAA none, etc.) and do you need DPA + subprocessor lists?
If you answer those, a concrete reference architecture (tenancy model, region strategy, pipeline states, and matching strategy) can be sketched with fewer unknowns.











# Architecture Review — FillDesk AI Notetaker for Recruiting

This is a solid foundation. Let me walk through your architecture systematically, validate your concerns, and surface the gaps you're not seeing yet.

---

## What You Have Right

1. **Recall.ai as the engine** — correct choice. Don't build bot/recording infra yourself.
2. **JWT-based licensing with Salesforce Named Credentials** — the short-lived token exchange pattern via Apex is sound. Keeping the API key server-side and never exposing it to the browser/LWC is the right call.
3. **User-based licensing with unlimited transcripts** — simple pricing model, easy to enforce.

---

## Your Concerns — Addressed

### 1. Candidate Association (Email Matching)

This is your **hardest problem** and you're right to worry. Here's the full picture:

**Why email alone will fail:**
- Candidates use personal email for calendar invites but the ATS has their work email (or vice versa)
- Recruiters often schedule via an agency email, not the candidate's
- Phone screens have no email at all
- Calendar invites may only have the recruiter + a generic meeting link

**Recommended multi-signal matching strategy:**

| Signal | Reliability | Source |
|--------|------------|--------|
| Email (exact match) | High | Calendar invite participants |
| Email (domain + name fuzzy) | Medium | Calendar invite + ATS |
| Meeting title parsing | Medium | Calendar event (e.g., "Interview — John Smith") |
| Recruiter's explicit link | Highest | Let the recruiter tag the candidate pre-meeting |
| Phone number | Medium-High | For phone screens, caller ID via Recall |
| Transcript name detection | Low-Medium | Speaker identification + NER on transcript |

**My recommendation:** Don't rely solely on automatic matching. Build a **"link candidate" step** where the recruiter can confirm/select the candidate before or after the meeting. Auto-suggest candidates, but always allow manual override. This also gives you a training signal to improve matching over time.

### 2. Dynamic Prompts per Client/User

This is a feature architecture question. You need a **prompt template system**:

```
Base Prompt (your default extraction template)
  └── Client-level overrides (e.g., Bullhorn clients want different fields)
       └── User-level overrides (individual recruiter preferences)
```

**Key considerations:**
- Store prompt templates in your database, not hardcoded
- Version them — when you improve the base prompt, clients with overrides shouldn't break
- Define a **schema contract** for what the LLM must output (JSON schema), separate from the prompt that generates it
- The ATS integration layer should define "what fields exist" and the prompt layer should define "how to extract them"
- Consider a **field mapping config** per ATS: Bullhorn has different fields than Lever has different fields than Seven20

**Watch out for:** Prompt injection via meeting content. If a candidate says something adversarial in a call, it shouldn't corrupt your extraction. Use structured output (function calling / JSON mode) and validate the output schema before writing to the ATS.

### 3. Multi-Region Security & Data Isolation

Your instincts are right but the implementation has nuance:

**Tenant isolation model — choose one:**

| Model | Complexity | Isolation | Cost |
|-------|-----------|-----------|------|
| Shared DB, row-level tenant ID | Low | Weak (bug = data leak) | Low |
| Schema-per-tenant | Medium | Medium | Medium |
| Database-per-tenant | High | Strong | High |
| Account-per-region (US/EU) | Medium-High | Strong | Medium |

**My recommendation for your stage:** Shared database with **strict row-level tenant isolation** enforced at the ORM/repository layer (every query automatically scoped by `org_id`), with **separate AWS accounts per region** (US/EU). Store recordings in region-specific S3 buckets. This gives you GDPR compliance without the operational overhead of per-tenant databases.

**Critical: Recordings and transcripts must NEVER be stored with only a user-scoped key. Always scope to `org_id` + `user_id`.** A middleware/repository pattern that automatically injects the tenant scope is essential.

---

## What You're Missing

### 4. Salesforce Sandbox/Production Org Management

You mentioned this concern but haven't solved it. This is **tricky**:

- When a Salesforce sandbox is created, org ID changes, but user IDs are cloned
- If a customer refreshes their sandbox, should it consume licenses? Probably not.
- You need a concept of **"environment type"** (production vs. sandbox) in your licensing

**Recommendation:**
- The JWT API key should encode: `{ clientId, orgId, environment: "production" | "sandbox" }`
- Sandbox environments should either share the production license pool or have a separate "sandbox" mode with full functionality but clearly marked as non-production
- When an org connects, detect if it's a sandbox (Salesforce provides `isSandbox` via Apex) and handle accordingly
- **Map sandbox users to production users** by email (not by user ID, since those are cloned and will collide)

### 5. Calendar Connection Lifecycle

You said "users connect their Google calendar via Recall.ai" — but consider:

- **What about Microsoft/Outlook calendars?** Many enterprise recruiters use Outlook. Recall.ai supports both, but your onboarding flow needs to handle both.
- **Token refresh failures** — OAuth tokens expire. What happens when a user's calendar connection drops? You need monitoring + notification ("Your calendar disconnected, reconnect to keep recording meetings").
- **Calendar filtering** — Recruiters don't want every meeting recorded. You need rules: only record meetings matching certain patterns, only external meetings, only meetings with certain attendees, etc.
- **Consent and notification** — Does the bot announce itself? Do all participants get notified? This is a **legal requirement** in many jurisdictions.

### 6. Bot Join Failures & Reliability

Recall.ai bots can fail to join. You need:

- **Status tracking** per meeting: scheduled → bot joining → recording → processing → complete / failed
- **Retry logic** with user notification
- **A dashboard** showing upcoming meetings, active recordings, and failures
- **What if the meeting platform blocks the bot?** Some orgs have admin policies that reject unknown participants. The recruiter needs to know immediately.

### 7. Transcript Processing Pipeline

You haven't described the async processing pipeline. This is a core architectural component:

```
Meeting Ends
  → Recall.ai webhook: recording ready
  → Download recording + transcript
  → Store in S3 (region-appropriate bucket)
  → Queue for AI extraction
  → Run extraction (LLM call with dynamic prompt)
  → Validate extraction output against schema
  → Store structured data
  → Push to ATS (Salesforce/Bullhorn/Seven20)
  → Notify user: "Your meeting notes are ready"
```

**Key decisions:**
- Use a **queue** (SQS) for processing — don't do this synchronously in the webhook handler
- **Idempotency** — Recall.ai may send duplicate webhooks
- **Cost tracking** — LLM calls per transcript cost money. With "unlimited transcripts," you're eating this cost. Model the economics: average meeting = X minutes = Y tokens = $Z. Can your user license price absorb this?

### 8. Cost Model Risk — "Unlimited Transcripts"

This is a **business architecture concern** that will hit you technically:

- A 1-hour meeting transcript ≈ 10,000-15,000 words ≈ ~15K-20K tokens input to your LLM
- With GPT-4-class models, that's ~$0.10-0.30 per meeting for extraction alone
- Recall.ai charges per bot-hour
- S3 storage for recordings accumulates
- A power user doing 8 meetings/day = ~$2-5/day in variable costs

**Recommendations:**
- Set a **soft cap** in your licensing (e.g., "unlimited" = 500 meetings/month, with overage alerts)
- Implement **recording retention policies** — auto-delete recordings after 90 days unless the user opts to keep them (reduces S3 costs)
- Consider offering transcript-only (no recording storage) as the default and recording storage as a premium feature
- Track costs per org in real-time

### 9. ATS Write-Back Conflict Handling

When you push extracted data to Bullhorn/Seven20/Salesforce:

- **What if the candidate record is locked?** (Salesforce record locking)
- **What if fields have validation rules** that reject your data?
- **What if multiple meetings happen for the same candidate?** Do you append notes or overwrite?
- **What if the ATS rate-limits you?** Bullhorn has aggressive rate limits.
- **Field mapping varies per client** — even within the same ATS, custom fields differ between orgs

You need a **write-back status** per meeting: pending → synced → failed (with error detail), and a retry/manual-fix UI.

### 10. Missing Features You Should Plan For

| Feature | Why It Matters |
|---------|---------------|
| **Meeting search** | Recruiters need to find "that call where they discussed salary" across all meetings |
| **Transcript viewer with timestamps** | Clickable transcript that jumps to the recording timestamp |
| **Sharing/collaboration** | Recruiter A records, wants to share notes with Recruiter B or hiring manager |
| **Compliance/audit log** | Enterprise clients will ask "who accessed what recording when" |
| **GDPR right to deletion** | A candidate requests deletion — you must purge ALL their data across recordings, transcripts, and extracted data |
| **Webhook → Salesforce push** | Rather than polling, push meeting completion events to Salesforce so the LWC can show real-time status |
| **Multi-language support** | Recruiting calls happen in many languages. Recall.ai supports this, but your extraction prompts need to handle it |

### 11. Security Gaps

- **Encryption at rest** for transcripts and recordings (S3 SSE-KMS, database encryption)
- **Encryption in transit** (TLS everywhere, obviously)
- **Access logging** — who downloaded which recording
- **API rate limiting** per org to prevent abuse
- **Webhook signature verification** from Recall.ai — don't blindly trust inbound webhooks
- **PII handling** — transcripts contain names, emails, phone numbers, possibly SSNs or salary info. This is sensitive data. Classify it and handle accordingly.

---

## Suggested Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   Salesforce Org                     │
│  ┌─────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   LWC   │  │  Apex Class  │  │Named Credential│  │
│  │(UI comp) │→│(token exchange)│→│  (API Key/JWT) │  │
│  └─────────┘  └──────────────┘  └───────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ Short-lived JWT
                       ▼
┌──────────────────────────────────────────────────────┐
│              FillDesk API (Your Service)              │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Auth/JWT  │  │ License  │  │ Tenant Middleware  │ │
│  │ Validator │  │ Manager  │  │ (org_id scoping)   │ │
│  └──────────┘  └──────────┘  └────────────────────┘ │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Meeting  │  │ Calendar │  │  ATS Integration   │ │
│  │ Manager  │  │  Sync    │  │ (Bullhorn/Seven20) │ │
│  └──────────┘  └──────────┘  └────────────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │          Processing Pipeline (SQS)           │    │
│  │  Webhook → Download → Extract → Store → Push │    │
│  └──────────────────────────────────────────────┘    │
└───────────┬──────────────────┬───────────────────────┘
            │                  │
            ▼                  ▼
     ┌─────────────┐   ┌─────────────┐
     │  Recall.ai  │   │    AWS      │
     │   (Bots,    │   │  S3 (US/EU) │
     │ Transcripts)│   │  RDS/Dynamo │
     └─────────────┘   │  SQS        │
                       └─────────────┘
```

---

## Top 5 Risks, Ranked

1. **Candidate matching accuracy** — if it doesn't reliably link meetings to candidates, the product is useless. Invest heavily here.
2. **Cost per meeting eating your margins** — model the economics before committing to "unlimited."
3. **Calendar connection reliability** — silent disconnections = missed recordings = angry users.
4. **ATS write-back complexity** — every ATS is different, custom fields vary per org, and error handling is painful.
5. **Data isolation failure** — one tenant seeing another's transcripts is an extinction-level event.

---

Want me to go deeper on any of these? I'd suggest the **candidate matching system** and the **async processing pipeline** as the two areas most worth detailed design work next.




Here is an architectural review of your proposed system, addressing your concerns and highlighting missing aspects you should consider.

### 1. Addressing Your Concerns

**Candidate Association (Email Mismatch)**
Relying solely on email will result in orphaned transcripts (e.g., candidates using personal emails for the call but work emails in the ATS).
*   **Solution:** Implement a multi-factor matching strategy. 
    1. Match by calendar invitee emails.
    2. Fuzzy match by participant names extracted from the meeting platform (Zoom/Meet).
    3. **Crucial:** Build an "Unassigned Meetings" UI queue where recruiters can manually link orphaned calls to ATS records.

**Dynamic Prompts per Client/User**
*   **Solution:** Store prompt templates in your database linked to the `tenant_id` or `user_id`. Use variables (e.g., `{{candidate_name}}`, `{{role}}`) injected at runtime.
*   **Verification:** LLMs hallucinate. Your UI must link extracted data points directly to the transcript timestamps so recruiters can verify the source of the extraction.

**Security, Regions, and Multi-tenancy**
Your infrastructure plan (AWS `us-east-1` and `eu-west-1`) supports this.
*   **Routing:** Provide different API endpoints for US and EU. The Salesforce Named Credential should point to the correct regional endpoint.
*   **Data Isolation:** Separate databases per client are expensive and hard to maintain. Use **Logical Isolation** (a `tenant_id` on every table with Row-Level Security in PostgreSQL) combined with **Physical Isolation for Media** (dedicated S3 prefixes or buckets per tenant for recordings).

### 2. Missing Architectural Considerations

**1. Sandbox vs. Production Data Contamination**
Since Salesforce sandboxes clone user IDs, a user testing in a sandbox might accidentally overwrite or mix data with their production account.
*   **Fix:** Your JWT payload must include the Salesforce `OrgId` and an `Environment` flag (Sandbox/Prod). Treat sandboxes as entirely separate tenants in your database.

**2. Webhook Reliability (Recall.ai)**
Recall.ai is heavily asynchronous and relies on webhooks (bot joined, transcript ready, video ready).
*   **Fix:** Do not process webhooks synchronously. Ingest them into a message queue (e.g., AWS SQS or EventBridge) to handle retries, out-of-order delivery, and traffic spikes without dropping data.

**3. The "Unlimited" Cost Trap**
Offering "unlimited" transcripts and LLM extractions is a massive financial risk.
*   **Fix:** Implement internal telemetry to track token usage and compute costs per tenant. You need a "fair use" policy or internal rate-limiting circuit breakers to prevent abuse or runaway LLM costs.

**4. GDPR, CCPA, and Data Retention**
Recruiting data is highly sensitive. Candidates have the right to be forgotten.
*   **Fix:** If a candidate is deleted or anonymized in Bullhorn/Seven20, you need a webhook or polling mechanism to cascade that deletion to your database and S3 buckets. Implement strict S3 lifecycle policies (e.g., delete video after 30 days, keep only text).

**5. Bot Edge Cases and UX**
Bots do not always successfully record.
*   **Fix:** Your system must gracefully handle and surface errors to the user when:
    *   The bot is stuck in a waiting room.
    *   The host denies the bot entry.
    *   The meeting platform requires a passcode that wasn't in the calendar invite.

**6. OAuth Token Storage**
When users connect their Google/Microsoft calendars, you will receive OAuth refresh tokens.
*   **Fix:** These tokens must be encrypted at rest (e.g., AWS KMS) and strictly mapped to the `OrgId` + `UserId` to ensure a sandbox refresh doesn't break the production calendar sync.