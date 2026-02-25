```instructions
---
applyTo: "**/.github/workflows/**/*,**/infra/**/*,**/cdk/**/*,**/terraform/**/*,**/scripts/deploy/**/*,**/serverless.*,**/sam-template.*"
---

# Infrastructure & Deployment

- Use OIDC-based authentication for GitHub Actions → AWS. Never use long-lived access keys.
- Never hardcode AWS account IDs in code. Use configuration files, environment variables, or constants that are clearly labeled.
- All infrastructure changes require pull request review before merging.
- Maintain strict environment isolation: dev, staging, and prod must never share resources or credentials.
- Use least-privilege IAM policies. Start with minimal permissions and expand only as needed.
- Tag all AWS resources with at minimum: `Project`, `Stage`, and `Owner` tags for cost tracking.
- Prefer declarative IaC (CDK, Terraform, SST) over manual console changes or imperative scripts.
- Include rollback procedures or safe-deploy strategies (canary, blue/green) for production deployments.
- Secrets belong in GitHub environment secrets or AWS Secrets Manager — never in code, config files, or CI logs.
- GitHub Actions workflows must use pinned action versions (SHA or tag), not `@latest` or `@main`.
- Production deployments require environment protection rules with manual approval.
- Document environment-specific configuration differences in `.env.example`.
```
