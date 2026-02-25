# Account Topology and Stage Strategy

This document defines the AWS account model and stage promotion flow for FillDesk AI Notetaker.

## Three-Tier Account Model

FillDesk uses three account tiers:

1. Personal developer accounts (one per developer)
2. Shared staging account
3. Shared production account

### Account Topology

| Stage | Account Type | Account ID | Purpose | Sharing Model |
| --- | --- | --- | --- | --- |
| Personal Dev (Sam) | Developer sandbox | 588738567629 | Fast iteration, local testing, feature validation | Not shared |
| Staging | Shared pre-production | 471112515517 | Integration testing and release validation | Shared by team |
| Production | Shared live environment | 975050325894 | Customer-facing workloads | Restricted access |

Personal dev accounts are per-developer sandboxes. They are **not** shared environments.

## Stage Responsibilities and Constraints

| Stage | Responsibilities | Constraints |
| --- | --- | --- |
| Personal Dev | Build features, run local/manual deploys, test infrastructure changes safely | No shared-team dependency; no customer data; no production trust assumptions |
| Staging | Validate integrated changes, verify deployment automation, run pre-release checks | Must mirror production patterns; no bypass of CI/CD controls |
| Production | Serve live traffic, run approved releases only | Deployments only through approved GitHub Actions workflows and protected environments |

## Promotion Path

Promotion moves one direction:

`Personal Dev -> Staging -> Production`

- Dev deployment is manual and account-local
- Staging and production deployments are automated via GitHub Actions
- No direct promotion from personal dev to production

## Promotion Gates (Staging to Production)

Before promoting from staging to production, all of the following should pass:

- CI status checks are green
- Deployment to staging succeeded
- Smoke/integration tests pass in staging
- Required reviewers approve the change
- Production environment protection rules are satisfied

## Branch-to-Environment Mapping Conventions

See [03. GitHub Actions Deployment Patterns](03-github-actions-deployment-patterns.md) for branch-to-environment mapping.

These conventions keep deployment intent explicit and reduce accidental cross-stage changes.
