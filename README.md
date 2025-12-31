# Bloodrune Skills Marketplace

A curated collection of Claude Code skills for development, media processing, and productivity.

## Quick Start

```bash
# Add the marketplace
/plugin marketplace add MrBloodrune/claude-skills

# Browse and install plugins
/plugin install web-tools@bloodrune-skills-marketplace
/plugin install media-tools@bloodrune-skills-marketplace
/plugin install homelab-admin@bloodrune-skills-marketplace
/plugin install bits-ui-dev@bloodrune-skills-marketplace
```

## Available Plugins

### bits-ui-dev

Svelte 5 / bits-ui component library development tools with component writing patterns and code review guidance.

| Skill | Description |
|-------|-------------|
| **component-writer** | Create production-quality Svelte 5 components with bits-ui primitives, runes ($state, $derived, $props, $bindable), and Tailwind CSS v4 styling |
| **code-reviewer** | Review code for pattern compliance, accessibility, TypeScript quality, and performance in bits-ui projects |

**Triggers on:** "create a component", "add a button variant", "implement [x] component", "review this code", "check my component", "code review"

**Reference files include:**
- Live component examples (button, switch, dialog)
- Review checklist and common issues quick reference

### web-tools

Web development tools including HTML utilities following Simon Willison's single-file pattern.

| Skill | Description |
|-------|-------------|
| **html-tools** | Create single-file HTML tools for browser-based utilities, converters, and generators |

### media-tools

Media processing tools for images, video, and audio conversion.

| Skill | Description |
|-------|-------------|
| **ascii-image-converter** | Convert images to ASCII or braille art using the `ascii-image-converter` CLI tool |

### homelab-admin

Proxmox homelab administration including OCI container deployment, NVIDIA GPU passthrough, and audiobook sync workflows.

| Skill | Description |
|-------|-------------|
| **proxmox-oci** | Create LXC containers from Docker/OCI images in Proxmox VE 9.1+ using the native OCI-to-LXC feature |
| **nvidia-gpu-passthrough** | Configure NVIDIA GPU access in Proxmox LXC containers for AI/ML workloads, transcoding, and CUDA applications |
| **audiobook-sync** | Sync Audible audiobooks to Audiobookshelf using Libation CLI |

**Triggers on:** "pull OCI image", "create OCI container", "docker to LXC", "GPU passthrough Proxmox", "NVIDIA in LXC", "nvidia-smi in container", "run Ollama with GPU", "sync audiobooks"

**Reference files include:**
- PVE 9.1 OCI known issues and workarounds
- LXC GPU config templates (Ollama, TensorFlow, Jellyfin)
- NVIDIA driver installation for PVE 8.x/9.x kernels

## Repository Structure

```
claude-skills/
├── .claude-plugin/
│   └── marketplace.json        # Claude Code plugin configuration
├── plugins/
│   ├── bits-ui-dev/
│   │   └── skills/
│   │       ├── component-writer/
│   │       │   ├── SKILL.md
│   │       │   └── references/
│   │       └── code-reviewer/
│   │           ├── SKILL.md
│   │           └── references/
│   ├── web-tools/
│   │   └── skills/
│   │       └── html-tools/
│   │           ├── SKILL.md
│   │           ├── assets/
│   │           └── references/
│   ├── media-tools/
│   │   └── skills/
│   │       └── ascii-image-converter/
│   │           ├── SKILL.md
│   │           └── references/
│   └── homelab-admin/
│       └── skills/
│           ├── proxmox-oci/
│           │   ├── SKILL.md
│           │   └── references/
│           ├── nvidia-gpu-passthrough/
│           │   ├── SKILL.md
│           │   └── references/
│           └── audiobook-sync/
│               ├── SKILL.md
│               ├── scripts/
│               └── references/
└── README.md
```

## Creating Your Own Skills

### Skill Structure

```
plugins/
└── my-plugin/
    └── skills/
        └── my-skill/
            ├── SKILL.md           # Required: Main skill file
            ├── assets/            # Optional: Templates, images, etc.
            └── references/        # Optional: Reference documentation
```

### SKILL.md Template

```markdown
---
name: my-skill-name
description: A clear description of what this skill does and when Claude should use it. Include trigger phrases.
---

# Skill Title

## Overview
Brief description of what the skill does.

## Prerequisites
List any required tools or dependencies.

## Usage
Instructions for how to use the skill.

## Examples
Provide concrete examples.
```

### Adding a New Plugin

1. Create a new plugin directory under `plugins/`
2. Add `skills/` subdirectory with your skill folders
3. Add the plugin to `.claude-plugin/marketplace.json`:

```json
{
  "name": "my-plugin",
  "description": "Description of the plugin",
  "source": "./plugins/my-plugin",
  "strict": false
}
```

## Contributing

1. Fork the repository
2. Create your plugin following the structure above
3. Add it to the marketplace.json
4. Submit a pull request

## License

Apache 2.0

## Resources

- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Anthropic Skills Repository](https://github.com/anthropics/skills)
- [Creating Custom Skills Guide](https://support.claude.com/en/articles/12512198-creating-custom-skills)
