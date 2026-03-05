#!/usr/bin/env bash
# AWS SSO Profile Setup for FillDesk AI Notetaker
# Uses Google SSO via AWS IAM Identity Center
#
# Usage:
#   bash scripts/aws-sso-setup.sh          # Interactive setup + login
#   bash scripts/aws-sso-setup.sh login     # Just re-login (session expired)
#   bash scripts/aws-sso-setup.sh whoami    # Check current identity

set -euo pipefail

PROFILE_NAME="AdministratorAccess-588738567629"
SSO_START_URL="https://pipelaunch.awsapps.com/start/"
SSO_REGION="us-east-1"
ACCOUNT_ID="588738567629"
ROLE_NAME="AdministratorAccess"
DEFAULT_REGION="us-east-1"

AWS_CONFIG_FILE="${HOME}/.aws/config"

# ─── Functions ───────────────────────────────────────────────────────────────

ensure_profile() {
  echo "Checking AWS SSO profile: ${PROFILE_NAME}"

  if grep -q "\[profile ${PROFILE_NAME}\]" "${AWS_CONFIG_FILE}" 2>/dev/null; then
    echo "✅ Profile '${PROFILE_NAME}' already exists in ${AWS_CONFIG_FILE}"
  else
    echo "Creating profile '${PROFILE_NAME}' in ${AWS_CONFIG_FILE}..."
    mkdir -p "$(dirname "${AWS_CONFIG_FILE}")"
    cat >> "${AWS_CONFIG_FILE}" <<EOF

[profile ${PROFILE_NAME}]
sso_start_url = ${SSO_START_URL}
sso_region = ${SSO_REGION}
sso_account_id = ${ACCOUNT_ID}
sso_role_name = ${ROLE_NAME}
region = ${DEFAULT_REGION}
output = json
EOF
    echo "✅ Profile created"
  fi
}

sso_login() {
  echo ""
  echo "Logging in via AWS SSO (Google)..."
  echo "A browser window will open — sign in with your Google account."
  echo ""
  aws sso login --profile "${PROFILE_NAME}"
  echo ""
  echo "✅ SSO login successful"
}

verify_identity() {
  echo ""
  echo "Verifying AWS identity..."
  aws sts get-caller-identity --profile "${PROFILE_NAME}" 2>/dev/null && echo "" && echo "✅ Authenticated to account ${ACCOUNT_ID}" || {
    echo "❌ Not authenticated. Run: bash scripts/aws-sso-setup.sh login"
    exit 1
  }
}

print_usage() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "To use this profile, set AWS_PROFILE:"
  echo ""
  echo "  # Bash / Git Bash / WSL:"
  echo "  export AWS_PROFILE=${PROFILE_NAME}"
  echo ""
  echo "  # PowerShell:"
  echo '  $env:AWS_PROFILE = "'"${PROFILE_NAME}"'"'
  echo ""
  echo "  # Then run CDK commands:"
  echo "  cd infra/cdk && npx cdk bootstrap aws://${ACCOUNT_ID}/${DEFAULT_REGION}"
  echo "  cd infra/cdk && STAGE=dev npx cdk deploy --all"
  echo ""
  echo "  # If session expires, re-login:"
  echo "  bash scripts/aws-sso-setup.sh login"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ─── Main ────────────────────────────────────────────────────────────────────

case "${1:-setup}" in
  login)
    sso_login
    verify_identity
    ;;
  whoami)
    verify_identity
    ;;
  setup|*)
    ensure_profile
    sso_login
    verify_identity
    print_usage
    ;;
esac
