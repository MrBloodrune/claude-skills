# Sync Script Reference

## Script Location

`/home/bloodrune/sync-books.sh` on ashelf (10.0.101.10)

## Full Script Source

```bash
#!/bin/bash

# Simple sync script for bloodrune to run with sudo
# Copies books from ~/Books to Audiobookshelf library

# Configuration
SOURCE_DIR="/home/bloodrune/Libation/Books"
DEST_DIR="/home/abyss_host/audiobookshelf/audiobooks"
LOG_FILE="/home/abyss_host/libation-sync.log"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_message "Starting book sync (run by: $(whoami))"

# Check if destination exists
if [ ! -d "$DEST_DIR" ]; then
    log_message "Creating destination directory: $DEST_DIR"
    mkdir -p "$DEST_DIR"
    chown abyss_host:abyss_host "$DEST_DIR"
fi

# Check if source exists
if [ ! -d "$SOURCE_DIR" ]; then
    log_message "ERROR: Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Count books
BOOK_COUNT=$(find "$SOURCE_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l)

if [ "$BOOK_COUNT" -eq 0 ]; then
    log_message "No books found to sync"
    exit 0
fi

log_message "Found $BOOK_COUNT book(s) to sync"

# Move each book directory
find "$SOURCE_DIR" -mindepth 1 -maxdepth 1 -type d -print0 | while IFS= read -r -d '' book_dir; do
    book_name=$(basename "$book_dir")

    if [ -d "$DEST_DIR/$book_name" ]; then
        log_message "Skipping '$book_name' - already exists"
        continue
    fi

    log_message "Copying: $book_name"

    # Copy and set ownership in one go
    if cp -r "$book_dir" "$DEST_DIR/" && chown -R abyss_host:abyss_host "$DEST_DIR/$book_name"; then
        log_message "Success: $book_name"
    else
        log_message "ERROR: Failed to copy $book_name"
    fi
done

log_message "Sync completed"
```

## Script Behavior

### Prerequisites
- Must run with sudo (writes to abyss_host's directory)
- Source directory must exist: `/home/bloodrune/Libation/Books`

### Operations
1. Creates destination directory if missing
2. Counts books in source directory
3. For each book directory:
   - Skips if already exists in destination
   - Copies entire directory
   - Sets ownership to abyss_host:abyss_host
4. Logs all operations with timestamps

### Logging
All operations logged to: `/home/abyss_host/libation-sync.log`

Log format:
```
[2025-12-23 19:59:34] Starting book sync (run by: root)
[2025-12-23 19:59:34] Found 377 book(s) to sync
[2025-12-23 19:59:34] Skipping 'Book Title [ASIN]' - already exists
[2025-12-23 19:59:35] Copying: New Book [ASIN]
[2025-12-23 19:59:35] Success: New Book [ASIN]
[2025-12-23 19:59:35] Sync completed
```

## Customization

### Change Source Directory
Edit `SOURCE_DIR` variable to change where books are read from.

### Change Destination Directory
Edit `DEST_DIR` variable. Ensure Audiobookshelf is configured to scan this location.

### Delete After Copy
To move instead of copy (freeing space in Libation):

```bash
# Replace cp -r with mv
if mv "$book_dir" "$DEST_DIR/" && chown -R abyss_host:abyss_host "$DEST_DIR/$book_name"; then
```

**Warning**: Only do this if Libation is configured to re-download if needed.

### Add Notification
Add webhook or notification after sync:

```bash
# At end of script
curl -X POST "https://ntfy.sh/your-topic" -d "Sync completed: $BOOK_COUNT books"
```

## Automation

### Cron Job
To run daily at 3 AM:

```bash
sudo crontab -e
# Add:
0 3 * * * /home/bloodrune/sync-books.sh
```

### Systemd Timer
Create timer unit for more control over scheduling:

```ini
# /etc/systemd/system/libation-sync.timer
[Unit]
Description=Daily Libation Sync

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/libation-sync.service
[Unit]
Description=Sync Libation to Audiobookshelf

[Service]
Type=oneshot
ExecStart=/home/bloodrune/sync-books.sh
User=root
```

Enable:
```bash
sudo systemctl enable --now libation-sync.timer
```
