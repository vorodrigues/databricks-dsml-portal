#!/usr/bin/env bash
# Creates the Postgres database of the portal catalog in the Lakebase project (idempotent).
# Run once before the first `databricks bundle deploy`: the app database resource requires it.
# Usage: scripts/create_database.sh [profile] [instance] [database]
# instance: Lakebase project ID; the script uses its default branch and read-write endpoint
set -euo pipefail

PROFILE="${1:-vr-workspace}"
INSTANCE="${2:-feature-store-online}"
DATABASE="${3:-dsml_portal}"

# Lakebase project -> default branch -> read-write endpoint (Postgres API)
BRANCH=$(databricks -p "$PROFILE" postgres list-branches "projects/$INSTANCE" -o json \
  | python3 -c "import json,sys; print(next(b['name'] for b in json.load(sys.stdin) if b['status'].get('default')))")
read -r ENDPOINT HOST < <(databricks -p "$PROFILE" postgres list-endpoints "$BRANCH" -o json \
  | python3 -c "import json,sys; e=next(e for e in json.load(sys.stdin) if e['status']['endpoint_type']=='ENDPOINT_TYPE_READ_WRITE'); print(e['name'], e['status']['hosts']['host'])")
USER_NAME=$(databricks -p "$PROFILE" current-user me -o json \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['userName'])")
# Short-lived OAuth credential of the signed-in user, used as Postgres password
PGPASSWORD=$(databricks -p "$PROFILE" postgres generate-database-credential "$ENDPOINT" -o json \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])")
export PGPASSWORD

PSQL=(psql "host=$HOST port=5432 dbname=databricks_postgres user=$USER_NAME sslmode=require" -v ON_ERROR_STOP=1 -qtA)

if [[ "$("${PSQL[@]}" -c "SELECT 1 FROM pg_database WHERE datname = '$DATABASE'")" == "1" ]]; then
  echo "Database $DATABASE already exists in $INSTANCE"
else
  "${PSQL[@]}" -c "CREATE DATABASE \"$DATABASE\""
  echo "Database $DATABASE created in $INSTANCE"
fi
