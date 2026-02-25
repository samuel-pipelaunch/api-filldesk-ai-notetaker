# Cross-Account Deployments

This document describes how GitHub Actions deploys across FillDesk AWS accounts.

## Target Accounts

- Staging deployments target account `471112515517`
- Production deployments target account `975050325894`

Deployments are executed from GitHub Actions by assuming account-local IAM deployment roles.

## OIDC Trust Relationship (GitHub -> AWS)

Each target account must trust GitHub's OIDC provider:

- OIDC provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`
- Trust policy conditions should constrain `sub` to this repository and allowed environment/branch scope

Example trust condition shape:

```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:pipelaunch/api-filldesk-ai-notetaker:environment:prod"
    }
  }
}
```

Use equivalent `sub` patterns for staging roles.

## IAM Role Assumption Model

1. Workflow requests an OIDC token from GitHub (`id-token: write`)
2. `aws-actions/configure-aws-credentials` exchanges token for AWS credentials
3. Workflow assumes a deployment role in target account
4. Deployment uses short-lived credentials only

## Least Privilege for Deployment Roles

Deployment roles should:

- Allow only required actions for the deployment toolchain
- Scope resources by ARN where possible
- Restrict trust to expected repository, branch, and/or environment claims
- Deny sensitive actions not required by deployment

## Trust Boundaries Between Accounts

- Personal dev accounts are isolated from shared staging/prod accounts
- Staging and production use separate IAM roles and policies
- Production role trust and permissions are stricter than staging

## Credential Policy

- No long-lived AWS access keys for CI/CD
- OIDC-only authentication for GitHub Actions deployments
- Rotate and review IAM role policies regularly
