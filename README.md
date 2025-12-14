# Bloodrune Skills Marketplace

A curated collection of Claude Code skills for development, media processing, and productivity.

## Quick Start

### Install via Claude Code Plugin (Recommended)

```bash
# Add the marketplace
/plugin marketplace add MrBloodrune/claude-skills

# Browse and install skills
/plugin install web-tools@bloodrune-skills-marketplace
/plugin install media-tools@bloodrune-skills-marketplace
```

### Install via CLI

```bash
# Clone the repository
git clone git@github.com:MrBloodrune/claude-skills.git
cd claude-skills

# List available skills
./marketplace/install.sh list

# Get info about a skill
./marketplace/install.sh info ascii-image-converter

# Install a skill
./marketplace/install.sh install html-tools
```

## Available Skills

### Web Tools

| Skill | Description |
|-------|-------------|
| **html-tools** | Create single-file HTML tools following Simon Willison's pattern for browser-based utilities, converters, and generators |

### Media Tools

| Skill | Description |
|-------|-------------|
| **ascii-image-converter** | Convert images to ASCII or braille art using the `ascii-image-converter` CLI tool |

## Skill Categories

- **web-tools** - Web development and HTML utility tools
- **media-tools** - Image, video, and audio processing tools
- **development** - Software development and coding tools
- **productivity** - Workflow and productivity enhancement tools

## Using the Marketplace CLI

```bash
# Show help
./marketplace/install.sh help

# List all skills
./marketplace/install.sh list

# Search for skills
./marketplace/install.sh search ascii

# List skills by category
./marketplace/install.sh category media-tools

# Show detailed skill info
./marketplace/install.sh info html-tools

# Install a skill (shows installation options)
./marketplace/install.sh install ascii-image-converter
```

## Manual Installation

Copy skills directly to your Claude Code configuration:

```bash
# Copy a skill to your project
mkdir -p .claude/skills
cp -r skills/html-tools .claude/skills/

# Or symlink for development
ln -s "$(pwd)/skills/html-tools" .claude/skills/html-tools
```

## Creating Your Own Skills

### Skill Structure

```
skills/
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

### Adding to the Catalog

1. Create your skill directory under `skills/`
2. Add the skill to `marketplace/catalog.json`:

```json
{
  "id": "my-skill",
  "name": "My Skill",
  "description": "What it does",
  "category": "development",
  "version": "1.0.0",
  "author": "YourName",
  "path": "skills/my-skill",
  "tags": ["tag1", "tag2"],
  "requires": []
}
```

3. Add the skill to the appropriate plugin in `.claude-plugin/marketplace.json`

## Repository Structure

```
claude-skills/
├── .claude-plugin/
│   └── marketplace.json     # Claude Code plugin configuration
├── marketplace/
│   ├── catalog.json         # Skill catalog with metadata
│   └── install.sh           # CLI installer script
├── skills/
│   ├── html-tools/          # Web development tools
│   │   ├── SKILL.md
│   │   ├── assets/
│   │   └── references/
│   └── ascii-image-converter/  # Image to ASCII converter
│       ├── SKILL.md
│       └── references/
└── README.md
```

## Contributing

1. Fork the repository
2. Create your skill following the structure above
3. Add it to the catalog
4. Submit a pull request

## License

Apache 2.0

## Resources

- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Anthropic Skills Repository](https://github.com/anthropics/skills)
- [Creating Custom Skills Guide](https://support.claude.com/en/articles/12512198-creating-custom-skills)
