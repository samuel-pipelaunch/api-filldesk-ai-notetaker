# AWS SSO and Local Access

This document defines local AWS access for FillDesk developers using IAM Identity Center (SSO) via Google.

## SSO Configuration

- Identity Provider: Google
- Access System: AWS IAM Identity Center (SSO)
- SSO Start URL: `https://pipelaunch.awsapps.com/start/`
- SSO Region: Configured in IAM Identity Center

## Login Flow (Google -> AWS SSO)

1. Run `aws configure sso`
2. Enter the SSO Start URL: `https://pipelaunch.awsapps.com/start/`
3. Enter the IAM Identity Center region
4. Complete browser login with Google
5. Select the AWS account and role
6. Save the profile name

## Profile Naming Conventions

Use role-and-account aligned profile names where possible.

Examples:

- Sam personal dev account: `AdministratorAccess-588738567629`
- Staging account role profile: `AdministratorAccess-471112515517`
- Production account role profile: `AdministratorAccess-975050325894`

## Session Expiry and Re-Login

SSO sessions expire. Re-authenticate when commands fail due to expired credentials:

```bash
aws sso login --profile <profile>
```

## Local Environment Selection

Set `AWS_PROFILE` to choose the active account/role for local development.

```bash
export AWS_PROFILE=AdministratorAccess-588738567629
```

PowerShell:

```powershell
$env:AWS_PROFILE = "AdministratorAccess-588738567629"
```

## Example ~/.aws/config

```ini
[profile AdministratorAccess-588738567629]
sso_start_url = https://pipelaunch.awsapps.com/start/
sso_region = us-east-1
sso_account_id = 588738567629
sso_role_name = AdministratorAccess
region = us-east-1
output = json
```

Use the IAM Identity Center region configured by your organization if it differs from this example.
