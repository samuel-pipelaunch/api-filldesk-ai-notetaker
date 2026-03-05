#!/usr/bin/env bash
# Tear down all FillDesk AI Notetaker CDK stacks from AWS
# Uses Google SSO via AWS IAM Identity Center
#
# Usage:
#   bash scripts/aws-destroy.sh           # Destroy all stacks (dev)
#   bash scripts/aws-destroy.sh staging    # Destroy all stacks (staging)
#
# ⚠️  This will DELETE all deployed resources including the database!
#     RDS snapshots are NOT created automatically — back up first if needed.

set -euo pipefail

STAGE="${1:-dev}"
PROFILE_NAME="AdministratorAccess-588738567629"

if [[ "$STAGE" == "staging" ]]; then
  PROFILE_NAME="AdministratorAccess-471112515517"
elif [[ "$STAGE" == "prod" ]]; then
  echo "❌ Refusing to destroy production. Do it manually if you really mean it."
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  DESTROYING all FillDesk stacks for stage: ${STAGE}"
echo "  AWS Profile: ${PROFILE_NAME}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify credentials
echo "Verifying AWS identity..."
if ! aws sts get-caller-identity --profile "${PROFILE_NAME}" > /dev/null 2>&1; then
  echo "❌ Not authenticated. Run first:"
  echo "   bash scripts/aws-sso-setup.sh login"
  exit 1
fi
echo "✅ Authenticated"
echo ""

# Confirm
read -r -p "⚠️  This will DELETE all resources (Lambda, API Gateway, RDS, SQS, VPC). Continue? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Destroying CDK stacks (this may take several minutes)..."
echo ""

cd "$(dirname "$0")/../infra/cdk"

# Destroy in reverse dependency order: Api → Data → Networking
export AWS_PROFILE="${PROFILE_NAME}"

STACKS=(
  "FillDesk-${STAGE}-Api"
  "FillDesk-${STAGE}-Data"
  "FillDesk-${STAGE}-Networking"
)

for STACK in "${STACKS[@]}"; do
  echo ""
  echo "── Destroying ${STACK} ──"
  if aws cloudformation describe-stacks --stack-name "${STACK}" --profile "${PROFILE_NAME}" > /dev/null 2>&1; then
    npx cdk destroy "${STACK}" --force --profile "${PROFILE_NAME}" 2>&1 || {
      echo "⚠️  CDK destroy failed for ${STACK}, trying CloudFormation directly..."
      aws cloudformation delete-stack --stack-name "${STACK}" --profile "${PROFILE_NAME}"
      echo "Waiting for ${STACK} deletion..."
      aws cloudformation wait stack-delete-complete --stack-name "${STACK}" --profile "${PROFILE_NAME}" || true
    }
  else
    echo "Stack ${STACK} does not exist, skipping."
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All FillDesk ${STAGE} stacks destroyed."
echo ""
echo "Note: The CDK bootstrap stack (CDKToolkit) was NOT removed."
echo "To remove it too:  aws cloudformation delete-stack --stack-name CDKToolkit --profile ${PROFILE_NAME}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
