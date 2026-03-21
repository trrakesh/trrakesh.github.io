#!/usr/bin/env bash
set -euo pipefail

# Deploy both Lambda functions and supporting resources from template.yaml.
#
# Usage:
# ./scripts/deploy_sam.sh [options]
#
# Options:
#   --stack-name <name>          CloudFormation stack name (default: gold-rates-stack)
#   --region <region>            AWS region (default: us-east-1)
#   --timezone <tz>              Schedule timezone (default: Asia/Kolkata)
#   --archive-prefix <prefix>    S3 prefix for dated snapshots (default: gold-rates)
#   --latest-key <key>           Fixed S3 key updated each run (default: gold-rates/latest.json)
#   --store-daily <true|false>   Keep dated snapshots too (default: false)
#   --guided                     Use sam deploy --guided
#   --no-build                   Skip sam build
#   -h, --help                   Show help

STACK_NAME="gold-rates-stack"
REGION="us-east-1"
SCHEDULE_TIMEZONE="Asia/Kolkata"
ARCHIVE_PREFIX="gold-rates"
LATEST_OBJECT_KEY="gold-rates/latest.json"
STORE_DAILY_SNAPSHOT="false"
USE_GUIDED="false"
SKIP_BUILD="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stack-name)
      STACK_NAME="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --timezone)
      SCHEDULE_TIMEZONE="$2"
      shift 2
      ;;
    --archive-prefix)
      ARCHIVE_PREFIX="$2"
      shift 2
      ;;
    --latest-key)
      LATEST_OBJECT_KEY="$2"
      shift 2
      ;;
    --store-daily)
      STORE_DAILY_SNAPSHOT="$2"
      shift 2
      ;;
    --guided)
      USE_GUIDED="true"
      shift
      ;;
    --no-build)
      SKIP_BUILD="true"
      shift
      ;;
    -h|--help)
      sed -n '1,40p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help to see available options."
      exit 1
      ;;
  esac
done

if [[ "$STORE_DAILY_SNAPSHOT" != "true" && "$STORE_DAILY_SNAPSHOT" != "false" ]]; then
  echo "Error: --store-daily must be true or false"
  exit 1
fi

if ! command -v sam >/dev/null 2>&1; then
  echo "Error: SAM CLI is not installed"
  exit 1
fi

if [[ "$SKIP_BUILD" == "false" ]]; then
  echo "[1/2] Building SAM application..."
  sam build
fi

echo "[2/2] Deploying SAM stack..."
if [[ "$USE_GUIDED" == "true" ]]; then
  sam deploy --guided
else
  sam deploy \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --capabilities CAPABILITY_IAM \
    --resolve-s3 \
    --parameter-overrides \
      ScheduleTimezone="$SCHEDULE_TIMEZONE" \
      ArchivePrefix="$ARCHIVE_PREFIX" \
      LatestObjectKey="$LATEST_OBJECT_KEY" \
      StoreDailySnapshot="$STORE_DAILY_SNAPSHOT"
fi

echo "Done."
