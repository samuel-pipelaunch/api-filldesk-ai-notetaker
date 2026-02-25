---
name: aws-infrastructure
description: AWS multi-account infrastructure, GitHub Actions CI/CD, and deployment patterns for FillDesk AI Notetaker
---

# AWS Infrastructure and Deployment

This skill documents the AWS infrastructure model, account boundaries, and deployment strategy for FillDesk AI Notetaker.

## Overview

FillDesk runs backend infrastructure on AWS using a multi-account strategy with GitHub Actions for CI/CD.

- Local development uses per-developer personal AWS accounts
- Shared staging and production accounts are used for team testing and live workloads
- AWS access is managed through IAM Identity Center (SSO) via Google

## Account Topology

| Stage              | Account ID   | Purpose                             | Access                                         |
| ------------------ | ------------ | ----------------------------------- | ---------------------------------------------- |
| Personal Dev (Sam) | 588738567629 | Individual developer sandbox        | `AdministratorAccess-588738567629` SSO profile |
| Staging            | 471112515517 | Pre-production, integration testing | Shared team access via SSO                     |
| Production         | 975050325894 | Live customer-facing environment    | Restricted, deployment via CI/CD only          |

Each developer has their own personal AWS dev account. The account above is Sam's. Other developers will have different account IDs.

## AWS SSO

- Provider: Google (via IAM Identity Center)
- SSO Start URL: `https://pipelaunch.awsapps.com/start/#/?tab=accounts`
- SSO Region: Configured in IAM Identity Center

## Stage Promotion Strategy

`Personal Dev -> Staging -> Production`

- Dev: Manual deployment by individual developers to their own accounts
- Staging and Prod: Automated deployment via GitHub Actions
- GitHub Environments: `staging` and `prod`
- No `dev` GitHub environment (dev uses manual deployment)

## AWS Regions

- `us-east-1` (primary)
- `eu-west-1`

## Table of Contents

- [01. Account Topology and Stage Strategy](docs/01-account-topology-and-stage-strategy.md)
- [02. AWS SSO and Local Access](docs/02-aws-sso-and-local-access.md)
- [03. GitHub Actions Deployment Patterns](docs/03-github-actions-deployment-patterns.md)
- [04. Cross-Account Deployments](docs/04-cross-account-deployments.md)
- [05. Secrets, Config, and Environment Boundaries](docs/05-secrets-config-and-env-boundaries.md)
- [06. IaC and Deployment Guardrails](docs/06-iac-and-deployment-guardrails.md)

## Key Environment Variables

| Variable                      | Purpose                                                       |
| ----------------------------- | ------------------------------------------------------------- |
| `AWS_PROFILE`                 | Selects local AWS CLI profile for personal dev account access |
| `AWS_REGION`                  | Active AWS region for local/CI commands (default `us-east-1`) |
| `AWS_ACCOUNT_ID_DEV`          | Personal dev account ID (for example, Sam: `588738567629`)    |
| `AWS_ACCOUNT_ID_STAGING`      | Shared staging account ID (`471112515517`)                    |
| `AWS_ACCOUNT_ID_PROD`         | Shared production account ID (`975050325894`)                 |
| `AWS_DEPLOY_ROLE_ARN_STAGING` | IAM role ARN assumed by GitHub Actions for staging deploys    |
| `AWS_DEPLOY_ROLE_ARN_PROD`    | IAM role ARN assumed by GitHub Actions for production deploys |

AWS CLI SSO configuration values such as `AWS_DEFAULT_REGION`, `sso_start_url`, and `sso_region` are configured in `~/.aws/config` via SSO profile setup, not as project environment variables.

## Official Resources

- GitHub OIDC for AWS: https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- aws-actions/configure-aws-credentials: https://github.com/aws-actions/configure-aws-credentials
- AWS IAM Identity Center: https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html
