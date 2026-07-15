#!/bin/bash
# ============================================
# Narriv Health Monitoring Script
# ============================================
# Run via cron: */5 * * * * /opt/narriv/scripts/health-check.sh
#
# Monitors:
# - API health endpoints
# - Database connectivity
# - Redis connectivity
# - Frontend availability
# - SSL certificate expiry
# ============================================

set -e

# Configuration
API_URL="${HEALTH_API_URL:-https://api.narriv.digital}"
FRONTEND_URL="${HEALTH_FRONTEND_URL:-https://app.narriv.digital}"
ALERT_EMAIL="${HEALTH_ALERT_EMAIL:-admin@narriv.digital}"
LOG_FILE="${HEALTH_LOG_FILE:-/var/log/narriv/health.log}"
SLACK_WEBHOOK="${HEALTH_SLACK_WEBHOOK:-}"

# Thresholds
MAX_RESPONSE_TIME_MS=3000
MAX_FAILED_CHECKS=3

# State files
STATE_DIR="/var/run/narriv"
FAILED_CHECKS_FILE="$STATE_DIR/health_failed_checks"
LAST_SUCCESS_FILE="$STATE_DIR/health_last_success"

# Ensure state directory exists
mkdir -p "$STATE_DIR"

# Logging
log() {
    local level=$1
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

alert() {
    local message="$1"
    local severity="${2:-critical}"

    log "ALERT" "$message (severity: $severity)"

    # Send email alert
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "[Narriv $severity] $message" "$ALERT_EMAIL" 2>/dev/null || true
    fi

    # Send Slack alert
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"[$severity] Narriv Health Alert: $message\"}" 2>/dev/null || true
    fi
}

check_endpoint() {
    local url=$1
    local name=$2
    local start_time=$(date +%s%3N)

    response=$(curl -s -w "\n%{http_code}\n%{time_total}" -o /dev/null "$url" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -1)
    time_ms=$(echo "$response" | tail -2 | head -1)

    if [ "$http_code" = "200" ]; then
        # Check response time
        if [ "${time_ms%.*}" -gt "$MAX_RESPONSE_TIME_MS" ]; then
            log "WARN" "$name slow response: ${time_ms}s (threshold: ${MAX_RESPONSE_TIME_MS}ms)"
            return 1
        fi
        log "OK" "$name: OK (${time_ms}s)"
        return 0
    else
        log "ERROR" "$name: FAILED (HTTP $http_code)"
        return 1
    fi
}

check_api_runtime() {
    local response=$(curl -s "$API_URL/health/runtime" 2>/dev/null)

    if [ -z "$response" ]; then
        log "ERROR" "Runtime health check failed: no response"
        return 1
    fi

    # Check for critical failures
    if echo "$response" | grep -q '"status":"error"'; then
        log "ERROR" "Runtime health: $(echo "$response" | jq -r '.checks[] | select(.status == "error") | .name' 2>/dev/null || echo 'unknown component')"
        return 1
    fi

    log "OK" "Runtime health: OK"
    return 0
}

check_ssl_cert() {
    local domain=$(echo "$API_URL" | sed -E 's|https?://||' | cut -d':' -f1 | cut -d'/' -f1)
    local expiry=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2)

    if [ -z "$expiry" ]; then
        log "WARN" "SSL certificate: Could not retrieve expiry date"
        return 1
    fi

    local expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$expiry" +%s 2>/dev/null)
    local now_epoch=$(date +%s)
    local days_left=$(( ($expiry_epoch - $now_epoch) / 86400 ))

    if [ "$days_left" -lt 30 ]; then
        alert "SSL certificate expires in $days_left days (on $expiry)" "high"
        return 1
    fi

    log "OK" "SSL certificate: OK ($days_left days remaining)"
    return 0
}

check_disk_space() {
    local threshold=90
    local usage=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')

    if [ "$usage" -gt "$threshold" ]; then
        alert "Disk space critical: ${usage}% used" "high"
        return 1
    fi

    log "OK" "Disk space: ${usage}% used"
    return 0
}

check_memory() {
    local available=$(free -m | awk 'NR==2 {print $7}')
    local total=$(free -m | awk 'NR==2 {print $2}')
    local usage_percent=$(( ($total - $available) * 100 / $total ))

    if [ "$available" -lt 256 ]; then
        alert "Low memory: ${available}MB available" "medium"
        return 1
    fi

    log "OK" "Memory: ${usage_percent}% used (${available}MB available)"
    return 0
}

record_success() {
    echo "$(date +%s)" > "$LAST_SUCCESS_FILE"
    rm -f "$FAILED_CHECKS_FILE" 2>/dev/null || true
}

record_failure() {
    local count=$(($(cat "$FAILED_CHECKS_FILE" 2>/dev/null || echo "0") + 1))
    echo "$count" > "$FAILED_CHECKS_FILE"

    if [ "$count" -ge "$MAX_FAILED_CHECKS" ]; then
        alert "Health check failed $count consecutive times" "critical"
    fi
}

# Main health check
main() {
    log "INFO" "Starting health check..."

    local failed=0

    # Check API health
    if ! check_endpoint "$API_URL/health" "API Health"; then
        ((failed++))
    fi

    # Check API runtime health
    if ! check_api_runtime; then
        ((failed++))
    fi

    # Check frontend
    if ! check_endpoint "$FRONTEND_URL" "Frontend"; then
        ((failed++))
    fi

    # Check SSL certificate
    if ! check_ssl_cert; then
        ((failed++))
    fi

    # Check system resources
    if ! check_disk_space; then
        ((failed++))
    fi

    if ! check_memory; then
        ((failed++))
    fi

    # Record result
    if [ "$failed" -eq 0 ]; then
        record_success
        log "INFO" "All health checks passed"
        exit 0
    else
        record_failure
        log "ERROR" "$failed health check(s) failed"
        exit 1
    fi
}

# Run main
main
