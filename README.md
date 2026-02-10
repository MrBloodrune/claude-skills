# Bloodrune Skills Marketplace

A curated collection of Claude Code skills for development, media processing, and productivity. Each plugin contains exactly one skill for granular installation.

## Quick Start

```bash
# Add the marketplace
/plugin marketplace add MrBloodrune/claude-skills

# Browse and install individual plugins
/plugin install proxmox-oci@bloodrune-skills-marketplace
/plugin install svelte-component-writer@bloodrune-skills-marketplace
/plugin install process-daily@bloodrune-skills-marketplace
```

## Available Plugins

### Web & Media

| Plugin | Description |
|--------|-------------|
| **html-tools** | Create single-file HTML tools for browser-based utilities, converters, and generators following Simon Willison's pattern |
| **ascii-image-converter** | Convert images to ASCII or braille art using the `ascii-image-converter` CLI tool |

### Homelab Administration

| Plugin | Description |
|--------|-------------|
| **proxmox-oci** | Create LXC containers from Docker/OCI images in Proxmox VE 9.1+ using the native OCI-to-LXC feature |
| **nvidia-gpu-passthrough** | Configure NVIDIA GPU access in Proxmox LXC containers for AI/ML workloads, transcoding, and CUDA applications |
| **livesync-setup** | Set up Obsidian LiveSync with CouchDB and Tailscale for cross-device vault synchronization |
| **audiobook-sync** | Sync Audible audiobooks to Audiobookshelf using Libation CLI |

### Svelte / bits-ui Development

| Plugin | Description |
|--------|-------------|
| **svelte-component-writer** | Create production-quality Svelte 5 components with bits-ui primitives, runes, and Tailwind CSS v4 styling |
| **svelte-code-reviewer** | Review Svelte 5 / bits-ui code for pattern compliance, accessibility, TypeScript quality, and performance |

### Obsidian Vault Automation

| Plugin | Description |
|--------|-------------|
| **process-daily** | Process raw captures from Daily notes into structured, linked notes with intelligent categorization |
| **secrets-management** | Manage secrets with HashiCorp Vault AppRole authentication and environment variable injection |
| **vault-management** | Manage Obsidian vault configuration, LiveSync settings, and plugin synchronization |

### Design

| Plugin | Description |
|--------|-------------|
| **design-engineer** | Design engineering for Claude Code — craft, direction, memory, enforcement |

## Repository Structure

```
claude-skills/
├── .claude-plugin/
│   └── marketplace.json
├── plugins/
│   ├── html-tools/
│   │   └── skills/html-tools/
│   ├── ascii-image-converter/
│   │   └── skills/ascii-image-converter/
│   ├── proxmox-oci/
│   │   └── skills/proxmox-oci/
│   ├── nvidia-gpu-passthrough/
│   │   └── skills/nvidia-gpu-passthrough/
│   ├── livesync-setup/
│   │   └── skills/livesync-setup/
│   ├── audiobook-sync/
│   │   └── skills/audiobook-sync/
│   ├── svelte-component-writer/
│   │   ├── skills/component-writer/
│   │   └── agents/
│   ├── svelte-code-reviewer/
│   │   ├── skills/code-reviewer/
│   │   └── agents/
│   ├── process-daily/
│   │   └── skills/process-daily/
│   ├── secrets-management/
│   │   └── skills/secrets-management/
│   ├── vault-management/
│   │   └── skills/vault-management/
│   └── design-engineer/
│       ├── skills/design-engineer/
│       ├── commands/
│       ├── hooks/
│       └── reference/
└── README.md
```

Each plugin follows this structure:

```
plugins/<plugin-name>/
├── .claude-plugin/plugin.json
├── skills/
│   └── <skill-name>/
│       ├── SKILL.md
│       ├── references/
│       ├── scripts/    (optional)
│       └── assets/     (optional)
└── agents/             (optional)
```

## Contributing

1. Fork the repository
2. Create your plugin following the structure above
3. Add it to `.claude-plugin/marketplace.json`
4. Submit a pull request

## License

Apache 2.0

## Resources

- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Anthropic Skills Repository](https://github.com/anthropics/skills)
- [Creating Custom Skills Guide](https://support.claude.com/en/articles/12512198-creating-custom-skills)
