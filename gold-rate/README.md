# Gold Rates Web + AWS Lambda Proxy

This project contains:
- A frontend page showing gold and silver rates.
- An AWS Lambda proxy with CORS.
- An API endpoint that returns date-wise historical data from S3.
- Deployment scripts for:
  - Lambda Function URL
  - API Gateway HTTP API

## Files
- `index.html` - UI page
- `styles.css` - UI styles
- `script.js` - frontend API fetch/render logic
- `config.js` - frontend endpoint config (auto-updated by deploy scripts)
- `lambda/gold-rates-proxy/index.mjs` - Lambda handler
- `lambda/gold-rates-archiver/index.mjs` - Daily S3 archiver Lambda handler
- `lambda/gold-rates-history/index.mjs` - S3 history reader Lambda handler
- `template.yaml` - SAM template for both Lambda functions + S3 + schedule
- `scripts/deploy_lambda.sh` - deploy using Lambda Function URL
- `scripts/deploy_apigw_http_api.sh` - deploy using API Gateway HTTP API

## Prerequisites
- AWS CLI configured (`aws configure`)
- `zip` installed
- IAM role for Lambda with basic execution permissions (for first-time create)

## Deploy Option 1: Lambda Function URL
First-time create:

```bash
./scripts/deploy_lambda.sh gold-rates-proxy ap-south-1 arn:aws:iam::123456789012:role/lambda-exec-role
```

Update existing:

```bash
./scripts/deploy_lambda.sh gold-rates-proxy ap-south-1
```

## Deploy Option 2: API Gateway HTTP API
First-time create:

```bash
./scripts/deploy_apigw_http_api.sh gold-rates-proxy ap-south-1 arn:aws:iam::123456789012:role/lambda-exec-role
```

Update existing:

```bash
./scripts/deploy_apigw_http_api.sh gold-rates-proxy ap-south-1
```

## How frontend wiring works
Both deploy scripts automatically overwrite `config.js` with the deployed public endpoint URL:

```js
window.GOLD_API_URL = "https://...";
```

The page loads `config.js` before `script.js`, so your frontend uses the latest deployed endpoint automatically.

## Run locally
```bash
python3 -m http.server
```

Then open:
- http://localhost:8000

## Deploy with AWS SAM (Both Lambdas)
This deploys:
- `GoldRatesProxyFunction` (current day rates API)
- `GoldRatesArchiverFunction` (runs every day at 12 PM)
- `GoldRatesHistoryFunction` (date-wise history API from S3)
- S3 bucket for daily JSON snapshots

Quick deploy using script:

```bash
./scripts/deploy_sam.sh
```

Example with options:

```bash
./scripts/deploy_sam.sh \
  --stack-name gold-rates-stack \
  --region us-east-1 \
  --timezone Asia/Kolkata \
  --archive-prefix gold-rates \
  --latest-key gold-rates/latest.json \
  --store-daily false
```

Build:

```bash
sam build
```

Guided deploy:

```bash
sam deploy --guided
```

Non-guided deploy example:

```bash
sam deploy \
  --stack-name gold-rates-stack \
  --region us-east-1 \
  --capabilities CAPABILITY_IAM
```

Optional parameter overrides:

```bash
sam deploy \
  --stack-name gold-rates-stack \
  --region us-east-1 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides ScheduleTimezone=Asia/Kolkata ArchivePrefix=gold-rates
```

Notes:
- The daily trigger is set in `template.yaml` as `cron(0 12 * * ? *)` and uses `ScheduleTimezone`.
- A fixed key is overwritten daily for chart apps: `gold-rates/latest.json`.
- Default mode keeps only one file (`StoreDailySnapshot=false`) and appends each day into `series` inside that same JSON.
- Optional history can be enabled as `gold-rates/YYYY-MM-DD.json` (set `StoreDailySnapshot=true`).
- History API endpoint: `/default/gold-history?limit=30`

Example deploy to keep only one rolling JSON file (no history):

```bash
sam deploy \
  --stack-name gold-rates-stack \
  --region us-east-1 \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --parameter-overrides ScheduleTimezone=Asia/Kolkata ArchivePrefix=gold-rates LatestObjectKey=gold-rates/latest.json StoreDailySnapshot=false
```
