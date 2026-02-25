# IaC and Deployment Guardrails

This document defines infrastructure and deployment safety expectations for FillDesk AWS environments.

## Infrastructure as Code Standard

All infrastructure changes must be managed as code.

- Tooling is currently TBD (for example: CDK, Terraform, SST)
- Keep definitions declarative and reviewable
- Avoid manual console-first infrastructure changes

## Change Management

- All infrastructure changes go through pull requests
- PRs must include context on impact, rollback path, and target environments
- CI checks should validate IaC syntax/plan before merge

## Drift Prevention

Expected controls:

- Treat IaC as source of truth
- Detect and reconcile drift regularly
- Avoid persistent manual changes in staging/production

## Production Deployment Controls

- Production deployments require review and approval
- Use protected GitHub environment rules for `prod`
- Restrict deploy jobs to approved branches/workflows

## Rollback Expectations

Every production deployment should have a rollback path.

- Define rollback procedure in deployment runbook
- Prefer reversible, incremental infrastructure and application changes
- Validate rollback in staging for high-risk changes

## Security Defaults

Use secure-by-default IAM and network controls:

- Deny by default
- Allow explicitly with least privilege
- Scope trust and permissions to exact deployment needs

## Tagging Standards

Apply consistent tags for cost tracking and ownership.

| Tag Key | Example | Purpose |
| --- | --- | --- |
| `Project` | `filldesk-ai-notetaker` | Cost allocation and grouping |
| `Environment` | `personal-dev`, `staging`, `production` | Stage identification |
| `Owner` | `team-platform` | Operational ownership |
| `ManagedBy` | `iac` | Distinguish managed resources |
| `Service` | `api`, `worker`, `storage` | Service-level visibility |
