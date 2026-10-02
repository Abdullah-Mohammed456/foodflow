#!/bin/sh
set -eu

BASE="${1:-http://localhost:4000}"
FRONTEND_ORIGIN="${FRONTEND_URL:-http://localhost:3000}"
STAMP="$(date +%s)"
EMAIL="smoke-${STAMP}@example.test"
PASSWORD="Smoke-Test-Pass-123"

fail() {
  echo "smoke failed: $1" >&2
  exit 1
}

COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT INT TERM

step() {
  echo "→ $1"
}

check() {
  [ "$2" = "$3" ] || fail "$1 expected $3 got $2"
}

step "health checks"
check "liveness" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/health")" "200"
check "readiness" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/health/ready")" "200"

step "register + login"
check "register" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' --data "{\"email\":\"$EMAIL\",\"name\":\"Smoke\",\"password\":\"$PASSWORD\"}")" "202"
check "login" "$(curl -s -o /dev/null -w '%{http_code}' -c "$COOKIE_JAR" -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")" "200"

step "public menu"
check "menu" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/restaurants/public/foodflow/menu")" "200"

step "unauthorized admin is denied"
check "admin denial" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/restaurants/branch/admin/overview")" "401"

step "cross-origin mutation is denied"
check "origin denial" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/orders" -H 'Content-Type: application/json' -H "Origin: https://evil.example" --data '{}')" "403"

step "security headers"
HEADERS="$(curl -s -D - -o /dev/null "$BASE/health")"
echo "$HEADERS" | grep -qi 'x-request-id:' || fail "missing x-request-id header"
echo "$HEADERS" | grep -qi 'x-content-type-options:' || fail "missing helmet headers"
echo "$HEADERS" | grep -qi 'x-powered-by:' && fail "x-powered-by must be disabled"

echo "smoke passed against $BASE"
