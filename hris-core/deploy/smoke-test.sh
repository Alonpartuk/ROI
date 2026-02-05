#!/bin/bash
# =============================================================================
# Octup HRIS - Smoke Test Script
# =============================================================================
# Verifies that the deployed services are healthy and responding correctly.
#
# Usage:
#   ./deploy/smoke-test.sh                    # Auto-detect URLs from gcloud
#   ./deploy/smoke-test.sh <API_URL> <WEB_URL>  # Manual URLs
#
# Exit Codes:
#   0 - All tests passed
#   1 - One or more tests failed
# =============================================================================

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-me-west1}"
API_SERVICE_NAME="hris-api"
WEB_SERVICE_NAME="hris-web"
TIMEOUT=30
VERBOSE="${VERBOSE:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}${BOLD}  OCTUP HRIS - SMOKE TEST${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_test() {
    echo -e "${BLUE}▶${NC} Testing: $1"
}

print_pass() {
    echo -e "  ${GREEN}✅ PASS${NC} - $1"
}

print_fail() {
    echo -e "  ${RED}❌ FAIL${NC} - $1"
}

print_warn() {
    echo -e "  ${YELLOW}⚠️  WARN${NC} - $1"
}

print_info() {
    if [ "$VERBOSE" = "true" ]; then
        echo -e "  ${CYAN}ℹ️${NC}  $1"
    fi
}

# HTTP request with response capture
http_get() {
    local url="$1"
    local response
    local http_code
    local body

    response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo -e "\n000")
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    echo "$http_code|$body"
}

# =============================================================================
# MAIN
# =============================================================================

print_header

# Get service URLs
if [ $# -ge 2 ]; then
    API_URL="$1"
    WEB_URL="$2"
    echo "Using provided URLs:"
else
    echo "Fetching service URLs from GCP..."
    API_URL=$(gcloud run services describe "$API_SERVICE_NAME" --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "")
    WEB_URL=$(gcloud run services describe "$WEB_SERVICE_NAME" --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "")

    if [ -z "$API_URL" ] || [ -z "$WEB_URL" ]; then
        echo -e "${RED}Error: Could not fetch service URLs. Are the services deployed?${NC}"
        echo ""
        echo "Usage with manual URLs:"
        echo "  $0 <API_URL> <WEB_URL>"
        exit 1
    fi
fi

echo -e "  API: ${BOLD}$API_URL${NC}"
echo -e "  Web: ${BOLD}$WEB_URL${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TESTS_PASSED=0
TESTS_FAILED=0
TESTS_WARNED=0

# =============================================================================
# TEST 1: API Health Check (Basic)
# =============================================================================

print_test "API Health Check (/health)"

result=$(http_get "$API_URL/health")
http_code=$(echo "$result" | cut -d'|' -f1)
body=$(echo "$result" | cut -d'|' -f2-)

if [ "$http_code" = "200" ]; then
    print_pass "Returned HTTP 200"
    TESTS_PASSED=$((TESTS_PASSED + 1))

    # Check response body
    if echo "$body" | grep -q "healthy"; then
        print_info "Response contains 'healthy'"
    fi
else
    print_fail "Expected HTTP 200, got $http_code"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# =============================================================================
# TEST 2: API Readiness Check (With Database)
# =============================================================================

print_test "API Readiness Check (/health/ready)"

result=$(http_get "$API_URL/health/ready")
http_code=$(echo "$result" | cut -d'|' -f1)
body=$(echo "$result" | cut -d'|' -f2-)

if [ "$http_code" = "200" ]; then
    print_pass "Returned HTTP 200"
    TESTS_PASSED=$((TESTS_PASSED + 1))

    # Check database connection
    if echo "$body" | grep -q '"connected":true'; then
        print_info "Database connection verified"
    else
        print_warn "Database connection status unclear"
        TESTS_WARNED=$((TESTS_WARNED + 1))
    fi
else
    print_fail "Expected HTTP 200, got $http_code"
    print_info "This usually indicates a database connection issue"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# =============================================================================
# TEST 3: API Version Endpoint
# =============================================================================

print_test "API Version Endpoint (/api)"

result=$(http_get "$API_URL/api")
http_code=$(echo "$result" | cut -d'|' -f1)
body=$(echo "$result" | cut -d'|' -f2-)

if [ "$http_code" = "200" ]; then
    print_pass "Returned HTTP 200"
    TESTS_PASSED=$((TESTS_PASSED + 1))

    # Check response contains expected fields
    if echo "$body" | grep -q "HRIS"; then
        print_info "Response contains 'HRIS'"
    fi
    if echo "$body" | grep -q "version"; then
        print_info "Response contains version info"
    fi
else
    print_fail "Expected HTTP 200, got $http_code"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# =============================================================================
# TEST 4: API Employees Endpoint
# =============================================================================

print_test "API Employees Endpoint (/api/employees)"

result=$(http_get "$API_URL/api/employees")
http_code=$(echo "$result" | cut -d'|' -f1)
body=$(echo "$result" | cut -d'|' -f2-)

if [ "$http_code" = "200" ]; then
    print_pass "Returned HTTP 200"
    TESTS_PASSED=$((TESTS_PASSED + 1))

    # Check response is valid JSON array
    if echo "$body" | grep -q '^\['; then
        print_info "Response is a valid JSON array"
    fi
else
    print_fail "Expected HTTP 200, got $http_code"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# =============================================================================
# TEST 5: Web Frontend
# =============================================================================

print_test "Web Frontend (root)"

result=$(http_get "$WEB_URL")
http_code=$(echo "$result" | cut -d'|' -f1)
body=$(echo "$result" | cut -d'|' -f2-)

if [ "$http_code" = "200" ]; then
    print_pass "Returned HTTP 200"
    TESTS_PASSED=$((TESTS_PASSED + 1))

    # Check for HTML content
    if echo "$body" | grep -qi "<html"; then
        print_info "Response contains HTML"
    fi
    if echo "$body" | grep -qi "hris\|octup"; then
        print_info "Response contains app identifier"
    fi
else
    print_fail "Expected HTTP 200, got $http_code"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# =============================================================================
# TEST 6: Web Health/API Proxy
# =============================================================================

print_test "Web API Health Endpoint (/api/health - if proxied)"

result=$(http_get "$WEB_URL/api/health")
http_code=$(echo "$result" | cut -d'|' -f1)

if [ "$http_code" = "200" ]; then
    print_pass "Returned HTTP 200"
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$http_code" = "404" ]; then
    print_warn "Endpoint not proxied (HTTP 404) - this may be expected"
    TESTS_WARNED=$((TESTS_WARNED + 1))
else
    print_warn "Unexpected response: HTTP $http_code"
    TESTS_WARNED=$((TESTS_WARNED + 1))
fi

# =============================================================================
# TEST 7: Response Time Check
# =============================================================================

print_test "API Response Time"

start_time=$(date +%s%3N)
curl -s -o /dev/null --max-time "$TIMEOUT" "$API_URL/health"
end_time=$(date +%s%3N)
response_time=$((end_time - start_time))

if [ "$response_time" -lt 1000 ]; then
    print_pass "Response time: ${response_time}ms (< 1s)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$response_time" -lt 3000 ]; then
    print_warn "Response time: ${response_time}ms (1-3s, may indicate cold start)"
    TESTS_WARNED=$((TESTS_WARNED + 1))
else
    print_fail "Response time: ${response_time}ms (> 3s)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# =============================================================================
# TEST 8: HTTPS/SSL Check
# =============================================================================

print_test "SSL Certificate Validity"

ssl_expiry=$(echo | openssl s_client -servername "${API_URL#https://}" -connect "${API_URL#https://}:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2)

if [ -n "$ssl_expiry" ]; then
    expiry_epoch=$(date -d "$ssl_expiry" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$ssl_expiry" +%s 2>/dev/null || echo "0")
    now_epoch=$(date +%s)
    days_until_expiry=$(( (expiry_epoch - now_epoch) / 86400 ))

    if [ "$days_until_expiry" -gt 30 ]; then
        print_pass "SSL certificate valid for $days_until_expiry days"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$days_until_expiry" -gt 7 ]; then
        print_warn "SSL certificate expires in $days_until_expiry days"
        TESTS_WARNED=$((TESTS_WARNED + 1))
    else
        print_fail "SSL certificate expires in $days_until_expiry days!"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    print_warn "Could not check SSL certificate"
    TESTS_WARNED=$((TESTS_WARNED + 1))
fi

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo -e "${BOLD}Test Results:${NC}"
echo -e "  ${GREEN}Passed:${NC}  $TESTS_PASSED"
echo -e "  ${RED}Failed:${NC}  $TESTS_FAILED"
echo -e "  ${YELLOW}Warnings:${NC} $TESTS_WARNED"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ALL SMOKE TESTS PASSED! ✅                      ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║              SOME SMOKE TESTS FAILED! ❌                      ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  • Check Cloud Run logs: gcloud run services logs read hris-api --region=$REGION"
    echo "  • Verify secrets are set: gcloud secrets versions access latest --secret=hris-db-password"
    echo "  • Check Cloud SQL: gcloud sql instances describe hris-postgres"
    exit 1
fi
