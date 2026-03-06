# GitHub Actions Deployment Patterns

This document defines deployment patterns for FillDesk using GitHub Actions.

## CI/CD Engine

GitHub Actions is the CI/CD engine for staging and production deployments.

- `staging` and `prod` are the only deployment environments in GitHub
- There is no `dev` GitHub environment
- Dev deployments are manual and happen in personal AWS accounts

## Authentication Model

Use OIDC-based authentication to AWS for GitHub Actions.

- Prefer OIDC over long-lived AWS access keys
- Require `permissions: id-token: write` for jobs that assume AWS roles
- Use `aws-actions/configure-aws-credentials` to assume target deployment roles

## Reusable Workflow Pattern

Use reusable workflows to centralize deployment logic.

- Caller workflow determines target environment from branch/event
- Reusable workflow receives environment and role ARN as inputs
- Environment-specific secrets are resolved by GitHub Environment (`staging` or `prod`)

## Branch-to-Environment Mapping

| Branch Pattern | Target Environment |
| --- | --- |
| `main` | `prod` |
| `develop` or `staging` | `staging` |
| Feature branches | No shared environment deployment |

## Environment Protection Rules

Apply stricter protection for production:

- Required reviewers/approvals for `prod`
- Restricted branch deployment rules for `prod`
- Optional wait timer and deployment gates where needed

`staging` can be less restrictive but should still require branch controls.

## Dependabot and Fork PR Considerations

Secrets are not available to workflows from untrusted forks and some automated contexts.

- Do not run deploy jobs from fork PR events
- Keep deploy jobs scoped to trusted events (for example, `push` to protected branches)
- Split CI (build/test) from deploy jobs so external PRs can still validate safely

## Conceptual Workflow Skeleton

This example is conceptual and not a final implementation.

```yaml
name: deploy

on:
  push:
    branches: [main, develop, staging]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.ref_name == 'main' && 'prod' || 'staging' }}
    steps:
      - uses: actions/checkout@v6
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ github.ref_name == 'main' && secrets.AWS_ROLE_ARN_PROD_DEPLOY || secrets.AWS_ROLE_ARN_STAGING_DEPLOY }}
          aws-region: us-west-2
      - name: Deploy
        run: ./scripts/deploy.sh
```
