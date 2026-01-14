#!/usr/bin/env bash
#
# Process Runner - Entry point for headless vault processing
#
# This script provides a clean entry point for running vault processing,
# either manually or via automated triggers (cron, systemd, CI/CD).
#
# Usage:
#   ./process-runner.sh              # Process today's daily note
#   ./process-runner.sh 2026-01-12   # Process specific date
#   ./process-runner.sh --scrape URL # Scrape and file a URL
#   ./process-runner.sh --sync       # Sync vault settings
#
# Environment variables:
#   VAULT_PATH     - Path to vault (default: ~/vaults/RMV0)
#   CLAUDE_BIN     - Path to claude CLI (default: claude)
#   PLUGIN_DIR     - Plugin directory (default: auto-detect)
#   LOG_DIR        - Log directory (default: /var/log/noted)

set -euo pipefail

# Configuration
VAULT_PATH="${VAULT_PATH:-$HOME/vaults/RMV0}"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
PLUGIN_DIR="${PLUGIN_DIR:-}"
LOG_DIR="${LOG_DIR:-/var/log/noted}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Auto-detect plugin directory if not set
if [[ -z "$PLUGIN_DIR" ]]; then
    PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"
fi

# Logging
log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*"
}

# Ensure log directory exists
setup_logging() {
    mkdir -p "$LOG_DIR" 2>/dev/null || true
}

# Validate environment
validate_env() {
    if [[ ! -d "$VAULT_PATH" ]]; then
        log "ERROR" "Vault not found at: $VAULT_PATH"
        exit 1
    fi

    if ! command -v "$CLAUDE_BIN" &> /dev/null; then
        log "ERROR" "Claude CLI not found: $CLAUDE_BIN"
        exit 1
    fi

    if [[ ! -d "$PLUGIN_DIR" ]]; then
        log "ERROR" "Plugin directory not found: $PLUGIN_DIR"
        exit 1
    fi

    log "INFO" "Vault: $VAULT_PATH"
    log "INFO" "Plugin: $PLUGIN_DIR"
}

# Process daily note
process_daily() {
    local date="${1:-$(date +%Y-%m-%d)}"
    local daily_path="$VAULT_PATH/Daily/${date}.md"

    log "INFO" "Processing daily note: $date"

    if [[ ! -f "$daily_path" ]]; then
        log "WARN" "Daily note not found: $daily_path"
        exit 0
    fi

    # Run claude with the plugin (-p enables headless/print mode)
    "$CLAUDE_BIN" \
        -p "Using the vault-processor agent, process the daily note for ${date}. The vault is at ${VAULT_PATH}." \
        --plugin-dir "$PLUGIN_DIR" \
        --allowedTools "Read,Write,Edit,Glob,Grep" \
        2>&1 | tee -a "$LOG_DIR/process-$(date +%Y%m%d).log"

    log "INFO" "Processing complete"
}

# Scrape a URL
scrape_url() {
    local url="$1"

    if [[ -z "$url" ]]; then
        log "ERROR" "URL required for scrape command"
        exit 1
    fi

    log "INFO" "Scraping URL: $url"

    # Slash commands not available in headless mode - describe task instead
    "$CLAUDE_BIN" \
        -p "Scrape the article at ${url}, extract its content, and save it as a note in the vault at ${VAULT_PATH}. Use the link-scraper script if available, or fetch and parse the content directly." \
        --plugin-dir "$PLUGIN_DIR" \
        --allowedTools "Read,Write,Edit,Bash,WebFetch" \
        2>&1 | tee -a "$LOG_DIR/scrape-$(date +%Y%m%d).log"

    log "INFO" "Scraping complete"
}

# Sync settings
sync_settings() {
    local direction="${1:-pull}"

    log "INFO" "Syncing settings: $direction"

    # Slash commands not available in headless mode - describe task instead
    "$CLAUDE_BIN" \
        -p "Sync Obsidian vault settings. Direction: ${direction}. Vault path: ${VAULT_PATH}. Use the vault-management skill to ${direction} settings between the vault and CouchDB." \
        --plugin-dir "$PLUGIN_DIR" \
        --allowedTools "Read,Write,Edit,Bash" \
        2>&1 | tee -a "$LOG_DIR/sync-$(date +%Y%m%d).log"

    log "INFO" "Sync complete"
}

# Show usage
usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS] [ARGUMENTS]

Process Obsidian vault captures using Claude Code.

Commands:
  (no args)          Process today's daily note
  YYYY-MM-DD         Process daily note for specific date
  --scrape URL       Scrape URL and create note
  --sync [push|pull] Sync vault settings (default: pull)
  --help             Show this help message

Environment:
  VAULT_PATH         Path to vault (default: ~/vaults/RMV0)
  CLAUDE_BIN         Path to claude CLI (default: claude)
  PLUGIN_DIR         Plugin directory (auto-detected)
  LOG_DIR            Log directory (default: /var/log/noted)

Examples:
  $(basename "$0")                    # Process today
  $(basename "$0") 2026-01-12         # Process specific date
  $(basename "$0") --scrape https://example.com/article
  $(basename "$0") --sync push        # Push settings to CouchDB
EOF
}

# Main entry point
main() {
    setup_logging

    case "${1:-}" in
        --help|-h)
            usage
            exit 0
            ;;
        --scrape)
            validate_env
            scrape_url "${2:-}"
            ;;
        --sync)
            validate_env
            sync_settings "${2:-pull}"
            ;;
        --*)
            log "ERROR" "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            validate_env
            process_daily "${1:-}"
            ;;
    esac
}

main "$@"
