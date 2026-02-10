#!/bin/bash
# Full audiobook sync workflow
# Scans Audible, downloads new books, syncs to Audiobookshelf

set -e

echo "=== Audiobook Full Sync ==="
echo ""

# Step 1: Scan for new purchases
echo "[1/3] Scanning Audible for new purchases..."
ssh ashelf "cd /home/bloodrune/Libation && libationcli scan"
echo ""

# Step 2: Download and decrypt
echo "[2/3] Downloading and decrypting new books..."
ssh ashelf "cd /home/bloodrune/Libation && libationcli liberate"
echo ""

# Step 3: Sync to Audiobookshelf
echo "[3/3] Syncing to Audiobookshelf..."
ssh ashelf "sudo /home/bloodrune/sync-books.sh"
echo ""

echo "=== Sync Complete ==="
