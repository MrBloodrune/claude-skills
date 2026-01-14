# Obsidian Settings Structure

Complete guide to the `.obsidian/` configuration folder.

## Directory Layout

```
.obsidian/
├── app.json                  # Core application settings
├── appearance.json           # Visual appearance
├── community-plugins.json    # Installed community plugins
├── core-plugins.json         # Core plugin toggles
├── core-plugins-migration.json
├── hotkeys.json              # Custom keybindings
├── workspace.json            # Current workspace state
├── graph.json                # Graph view settings
├── bookmarks.json            # Bookmarked files
├── templates.json            # Templates plugin config
├── plugins/                  # Community plugin data
│   └── plugin-id/
│       ├── data.json         # Plugin settings
│       ├── main.js           # Plugin code
│       ├── manifest.json     # Plugin metadata
│       └── styles.css        # Plugin styles
├── themes/                   # Custom themes
│   └── theme-name/
│       ├── manifest.json
│       └── theme.css
└── snippets/                 # Custom CSS snippets
    └── custom.css
```

## Core Configuration Files

### app.json

Main application settings.

```json
{
  "promptDelete": true,
  "alwaysUpdateLinks": true,
  "newFileLocation": "folder",
  "newFileFolderPath": "Inbox",
  "attachmentFolderPath": "Attachments",
  "showLineNumber": true,
  "spellcheck": true,
  "spellcheckLanguages": ["en"],
  "readableLineLength": true,
  "strictLineBreaks": false,
  "autoConvertHtml": true,
  "defaultViewMode": "source",
  "livePreview": true
}
```

**Sync safe:** Yes

### appearance.json

Theme and visual settings.

```json
{
  "accentColor": "#7c3aed",
  "theme": "obsidian",
  "cssTheme": "Minimal",
  "baseFontSize": 16,
  "textFontFamily": "",
  "monospaceFontFamily": "",
  "interfaceFontFamily": "",
  "translucency": false,
  "nativeMenus": true
}
```

**Sync safe:** Yes

### community-plugins.json

List of enabled community plugins.

```json
[
  "obsidian-livesync",
  "obsidian-kanban",
  "recent-files-obsidian",
  "obsidian-admonition",
  "obsidian-projects",
  "dataview"
]
```

**Sync safe:** Yes (but plugins must be installed on each device)

### core-plugins.json

Core plugin enable/disable state.

```json
{
  "file-explorer": true,
  "global-search": true,
  "switcher": true,
  "graph": true,
  "backlink": true,
  "outgoing-link": true,
  "tag-pane": true,
  "page-preview": true,
  "daily-notes": true,
  "templates": true,
  "note-composer": false,
  "command-palette": true,
  "slash-command": false,
  "editor-status": true,
  "bookmarks": true,
  "markdown-importer": false,
  "zk-prefixer": false,
  "random-note": false,
  "outline": true,
  "word-count": true,
  "slides": false,
  "audio-recorder": false,
  "workspaces": false,
  "file-recovery": true,
  "publish": false,
  "sync": false
}
```

**Sync safe:** Yes

### hotkeys.json

Custom keyboard shortcuts.

```json
[
  {
    "key": "Mod+Shift+D",
    "command": "daily-notes"
  },
  {
    "key": "Mod+Shift+T",
    "command": "insert-template"
  }
]
```

**Sync safe:** Yes

### workspace.json

Current workspace state.

```json
{
  "main": {
    "type": "split",
    "children": [
      {
        "type": "leaf",
        "state": {
          "type": "markdown",
          "file": "Daily/2026-01-13.md"
        }
      }
    ]
  },
  "left": { ... },
  "right": { ... },
  "active": "leaf-id"
}
```

**Sync safe:** NO - Device-specific

## Plugin Data

Each community plugin stores data in `plugins/<plugin-id>/`:

### obsidian-livesync

```json
// plugins/obsidian-livesync/data.json
{
  "couchDB_URI": "https://...",
  "couchDB_USER": "admin",
  "couchDB_PASSWORD": "...",
  "couchDB_DBNAME": "vault-db",
  "liveSync": true,
  "syncOnStart": true,
  "syncOnSave": true,
  "batchSave": false,
  "encrypt": false
}
```

**Sync safe:** Partial - Credentials are device-specific, settings can sync

### dataview

```json
// plugins/dataview/data.json
{
  "renderNullAs": "\\-",
  "taskCompletionTracking": false,
  "taskCompletionText": "completion",
  "recursiveSubTaskCompletion": false,
  "warnOnEmptyResult": true,
  "refreshEnabled": true,
  "refreshInterval": 2500,
  "defaultDateFormat": "MMMM dd, yyyy",
  "maxRecursiveRenderDepth": 4
}
```

**Sync safe:** Yes

### obsidian-kanban

```json
// plugins/obsidian-kanban/data.json
{
  "new-note-folder": "Inbox",
  "new-note-template": "",
  "prepend-archive-date": false,
  "date-format": "YYYY-MM-DD",
  "time-format": "HH:mm"
}
```

**Sync safe:** Yes

## Sync Decision Matrix

| File/Folder | Sync | Reason |
|-------------|------|--------|
| `app.json` | ✅ | User preferences |
| `appearance.json` | ✅ | Visual consistency |
| `community-plugins.json` | ✅ | Plugin list |
| `core-plugins.json` | ✅ | Core features |
| `hotkeys.json` | ✅ | Keyboard shortcuts |
| `templates.json` | ✅ | Template settings |
| `graph.json` | ✅ | Graph preferences |
| `bookmarks.json` | ✅ | User bookmarks |
| `workspace.json` | ❌ | Device window state |
| `workspace-mobile.json` | ❌ | Mobile layout |
| `plugins/*/data.json` | ⚠️ | Most yes, check credentials |
| `plugins/*/main.js` | ❌ | Installed per-device |
| `themes/` | ✅ | Custom themes |
| `snippets/` | ✅ | Custom CSS |

## Migration Considerations

When moving settings between devices:

1. **Plugin Installation**: Community plugins must be installed on each device before their settings will work
2. **Theme Installation**: Themes must be installed separately
3. **Credential Handling**: Some plugin settings contain API keys or passwords that may need per-device configuration
4. **Path Differences**: Some settings reference absolute paths that differ between OS

## Backup Strategy

Recommend backing up these files:
- All JSON files in `.obsidian/`
- `plugins/*/data.json` (settings only)
- `themes/` folder
- `snippets/` folder

Do NOT backup:
- `workspace*.json`
- `plugins/*/main.js` (reinstall from community)
- Large cache files
