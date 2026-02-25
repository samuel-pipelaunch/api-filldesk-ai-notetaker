# Secrets, Config, and Environment Boundaries

This document defines how FillDesk manages secrets and configuration across environments.

## Secret Storage Locations

Use stage-scoped secret stores:

- GitHub Environment secrets for CI/CD inputs (`staging`, `prod`)
- AWS Secrets Manager or AWS Systems Manager Parameter Store for runtime secrets

Never commit secrets to the repository.

## Environment Variable Scoping

Each stage has its own environment variables and secret values.

- Personal dev values stay in personal developer environments/accounts
- Staging values apply only to staging resources
- Production values apply only to production resources

No cross-environment secret sharing.

## GitHub Secret Types

| Secret Type | Scope | Recommended Use |
| --- | --- | --- |
| Repository secrets | Entire repository | Shared non-stage-specific values (use sparingly) |
| Environment secrets | Single GitHub environment | Stage-specific deployment values (preferred for deploys) |
| Organization secrets | Multiple repositories (policy-controlled) | Centralized values shared across approved repos |

For deployment credentials and ARNs, prefer environment secrets over repository secrets.

## Runtime Secret Retrieval

Application runtime should load secrets from AWS-managed stores:

- AWS Secrets Manager for sensitive structured values
- SSM Parameter Store for configuration parameters

CI/CD should pass references/configuration, not raw secret material when possible.

## Configuration Source of Truth

Use `.env.example` as the canonical reference for required variables.

- Keep `.env.example` up to date with required keys
- Do not include real secret values
- Ensure stage-specific values are documented per environment
