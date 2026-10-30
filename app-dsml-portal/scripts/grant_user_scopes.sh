#!/usr/bin/env bash
# Adds the extra user-authorization scopes (MLflow, Unity Catalog models, SCIM, artifact download)
# to the app OAuth integration at account level (idempotent; requires an account admin profile).
# Run after every `databricks bundle deploy`: updating `user_api_scopes` resets the integration scopes.
# Users must sign in to the app again to receive a token with the new scopes.
# Usage: scripts/grant_user_scopes.sh [workspace_profile] [account_profile] [app_name]
set -euo pipefail

WS_PROFILE="${1:-vr-workspace}"
ACCOUNT_PROFILE="${2:-admin-account}"
APP_NAME="${3:-dsml-portal}"
EXTRA_SCOPES='["mlflow", "unity-catalog", "scim", "all-apis"]'

CLIENT_ID=$(databricks -p "$WS_PROFILE" apps get "$APP_NAME" -o json \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['oauth2_app_client_id'])")

BODY=$(databricks -p "$ACCOUNT_PROFILE" account custom-app-integration get "$CLIENT_ID" -o json \
  | python3 -c "
import json, sys
current = json.load(sys.stdin).get('scopes', [])
extra = json.loads(sys.argv[1])
print(json.dumps({'scopes': current + [s for s in extra if s not in current]}))
" "$EXTRA_SCOPES")

databricks -p "$ACCOUNT_PROFILE" account custom-app-integration update "$CLIENT_ID" --json "$BODY"
databricks -p "$ACCOUNT_PROFILE" account custom-app-integration get "$CLIENT_ID" -o json \
  | python3 -c "import json,sys; print('scopes:', sorted(json.load(sys.stdin)['scopes']))"
