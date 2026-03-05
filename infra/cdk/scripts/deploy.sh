#!/bin/bash
set -e

STAGE=${1:-dev}

echo "Deploying stage: $STAGE"

cd ../../apps/api
pnpm build

cd ../../infra/cdk
npx cdk deploy --all --require-approval never -c stage=$STAGE
