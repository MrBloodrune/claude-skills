# Libation Configuration Reference

## Installation

Libation is installed via RPM on ashelf (AlmaLinux 9):

```bash
# Package info
rpm -qa | grep libation
# libation-12.4.5-1.x86_64

# Executables
/usr/bin/libation      # GUI application
/usr/bin/libationcli   # CLI application
/usr/lib64/libation/   # Library files
```

## Configuration Files

### AccountsSettings.json
Location: `/home/bloodrune/Libation/AccountsSettings.json`

Contains Audible account authentication. Do not edit manually - use the GUI to re-authenticate if needed.

### Settings.json
Location: `/home/bloodrune/Libation/Settings.json`

Key settings:
- Output format (M4B recommended for chapter support)
- Download location
- Naming conventions
- Decryption preferences

### LibationContext.db
SQLite database containing:
- Library catalog
- Download status for each book
- Metadata cache

## Output Format

Libation outputs audiobooks to `/home/bloodrune/Libation/Books/` with structure:

```
Books/
├── Book Title [ASIN]/
│   ├── Book Title.m4b          # Audio file with chapters
│   ├── cover.jpg               # Cover art
│   └── Book Title.pdf          # Companion PDF (if available)
```

The ASIN in brackets ensures unique directory names even for books with identical titles.

## CLI vs GUI

### When to Use CLI
- Automated/scheduled syncs
- Headless operation
- Scripted workflows
- Remote execution via SSH

### When to Use GUI
- Initial account setup
- Re-authentication when session expires
- Browsing library visually
- Troubleshooting download issues
- Managing account settings

## Audible Regions

Libation supports multiple Audible marketplaces. The account configuration stores:
- Region/marketplace
- Authentication tokens
- Account preferences

If books from a specific region aren't syncing, verify the correct marketplace is configured in the GUI.
