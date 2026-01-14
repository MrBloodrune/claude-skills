#!/usr/bin/env bash
#
# CouchDB Watcher - Monitor changes feed and trigger vault processing
#
# This script monitors the CouchDB changes feed for modifications to Daily notes
# and triggers the vault processing pipeline when changes are detected.
#
# Usage: ./couchdb-watcher.sh
#
# Environment variables:
#   COUCHDB_URI      - CouchDB server URI (required)
#   COUCHDB_USER     - CouchDB username (required)
#   COUCHDB_PASSWORD - CouchDB password (required)
#   COUCHDB_DATABASE - Database name (default: rmv0-vault)
#   VAULT_PATH       - Local vault mirror path (default: ~/vaults/RMV0)
#   CLAUDE_BIN       - Path to claude CLI (default: claude)
#   COOLDOWN         - Seconds between processing runs (default: 60)
#   DEBOUNCE         - Seconds to wait for edits to settle (default: 5)
#
# Install as systemd service for persistent operation.

set -euo pipefail

# Configuration with defaults
COUCHDB_URI="${COUCHDB_URI:-}"
COUCHDB_USER="${COUCHDB_USER:-}"
COUCHDB_PASSWORD="${COUCHDB_PASSWORD:-}"
COUCHDB_DATABASE="${COUCHDB_DATABASE:-rmv0-vault}"
VAULT_PATH="${VAULT_PATH:-$HOME/vaults/RMV0}"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
COOLDOWN="${COOLDOWN:-60}"
DEBOUNCE="${DEBOUNCE:-5}"

# State tracking
LAST_SEQ_FILE="/var/lib/noted/last_seq"
LOG_FILE="/var/log/noted/watcher.log"
LAST_PROCESS_TIME=0

# Logging function
log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

# Validate configuration
validate_config() {
    local missing=()

    [[ -z "$COUCHDB_URI" ]] && missing+=("COUCHDB_URI")
    [[ -z "$COUCHDB_USER" ]] && missing+=("COUCHDB_USER")
    [[ -z "$COUCHDB_PASSWORD" ]] && missing+=("COUCHDB_PASSWORD")

    if [[ ${#missing[@]} -gt 0 ]]; then
        log "ERROR" "Missing required environment variables: ${missing[*]}"
        exit 1
    fi

    if [[ ! -d "$VAULT_PATH" ]]; then
        log "ERROR" "Vault path does not exist: $VAULT_PATH"
        exit 1
    fi

    if ! command -v "$CLAUDE_BIN" &> /dev/null; then
        log "WARN" "Claude CLI not found at $CLAUDE_BIN, processing will fail"
    fi

    if ! command -v curl &> /dev/null; then
        log "ERROR" "curl is required but not installed"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log "ERROR" "jq is required but not installed"
        exit 1
    fi
}

# Create required directories
setup_directories() {
    mkdir -p "$(dirname "$LAST_SEQ_FILE")"
    mkdir -p "$(dirname "$LOG_FILE")"
}

# Get last processed sequence number
get_last_seq() {
    if [[ -f "$LAST_SEQ_FILE" ]]; then
        cat "$LAST_SEQ_FILE"
    else
        echo "now"
    fi
}

# Save sequence number
save_seq() {
    echo "$1" > "$LAST_SEQ_FILE"
}

# Build CouchDB URL with auth
build_url() {
    local path="$1"
    echo "${COUCHDB_URI}/${COUCHDB_DATABASE}${path}"
}

# Test CouchDB connection
test_connection() {
    local url
    url=$(build_url "")

    log "INFO" "Testing connection to CouchDB..."

    if curl -sf -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" "$url" > /dev/null; then
        log "INFO" "Successfully connected to CouchDB"
        return 0
    else
        log "ERROR" "Failed to connect to CouchDB at $COUCHDB_URI"
        return 1
    fi
}

# Check if we should process (respects cooldown)
should_process() {
    local now
    now=$(date +%s)
    local elapsed=$((now - LAST_PROCESS_TIME))

    if [[ $elapsed -lt $COOLDOWN ]]; then
        log "DEBUG" "Cooldown active, ${COOLDOWN}s required, ${elapsed}s elapsed"
        return 1
    fi

    return 0
}

# Trigger vault processing
trigger_processing() {
    local doc_id="$1"

    log "INFO" "Triggering processing for: $doc_id"

    LAST_PROCESS_TIME=$(date +%s)

    # Run claude in headless mode with the plugin
    if "$CLAUDE_BIN" --headless \
        --plugin noted-vault-manager \
        --print \
        "Process the daily note at $doc_id using the vault-processor agent" \
        >> "$LOG_FILE" 2>&1; then
        log "INFO" "Processing completed successfully"
    else
        log "ERROR" "Processing failed with exit code $?"
    fi
}

# Process a single change event
process_change() {
    local line="$1"

    # Skip empty lines (heartbeats)
    [[ -z "$line" ]] && return

    # Skip last_seq marker
    [[ "$line" == *'"last_seq"'* ]] && return

    # Parse the change
    local doc_id
    local seq
    local deleted

    doc_id=$(echo "$line" | jq -r '.id // empty')
    seq=$(echo "$line" | jq -r '.seq // empty')
    deleted=$(echo "$line" | jq -r '.deleted // false')

    # Skip if not a document change
    [[ -z "$doc_id" ]] && return

    # Save sequence for resume
    [[ -n "$seq" ]] && save_seq "$seq"

    # Skip deleted documents
    [[ "$deleted" == "true" ]] && return

    # Check if it's a Daily note
    if [[ "$doc_id" == Daily/* && "$doc_id" == *.md ]]; then
        log "INFO" "Change detected: $doc_id"

        # Debounce - wait for edits to settle
        log "DEBUG" "Debouncing for ${DEBOUNCE}s..."
        sleep "$DEBOUNCE"

        # Check cooldown and process
        if should_process; then
            trigger_processing "$doc_id"
        else
            log "INFO" "Skipping due to cooldown"
        fi
    fi
}

# Main watch loop
watch_changes() {
    local since
    since=$(get_last_seq)

    log "INFO" "Starting changes feed from seq: $since"

    local url
    url=$(build_url "/_changes?feed=continuous&since=${since}&heartbeat=30000&include_docs=false")

    # Long-poll the changes feed
    while true; do
        log "DEBUG" "Connecting to changes feed..."

        curl -sN -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" "$url" | \
        while IFS= read -r line; do
            process_change "$line"
        done

        # If curl exits, wait and reconnect
        log "WARN" "Changes feed disconnected, reconnecting in 10s..."
        sleep 10

        # Update since for reconnection
        since=$(get_last_seq)
        url=$(build_url "/_changes?feed=continuous&since=${since}&heartbeat=30000&include_docs=false")
    done
}

# Signal handlers
cleanup() {
    log "INFO" "Shutting down watcher..."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Main entry point
main() {
    log "INFO" "=== CouchDB Vault Watcher Starting ==="
    log "INFO" "Database: $COUCHDB_DATABASE"
    log "INFO" "Vault: $VAULT_PATH"
    log "INFO" "Cooldown: ${COOLDOWN}s, Debounce: ${DEBOUNCE}s"

    setup_directories
    validate_config

    if ! test_connection; then
        exit 1
    fi

    watch_changes
}

main "$@"
