# bits-ui-dev

Svelte 5 / bits-ui component library development tools with component writing patterns, code review guidance, and autonomous validation agents.

## Overview

This plugin provides comprehensive guidance for developing production-quality UI components using:
- **Svelte 5** with runes ($props, $state, $derived, $bindable)
- **bits-ui** headless component primitives
- **Tailwind CSS v4** with @theme tokens and oklch colors
- **tailwind-merge + clsx** for intelligent class merging

## Components

### Skills

| Skill | Trigger Phrases |
|-------|-----------------|
| **component-writer** | "create a component", "add a button variant", "implement [X] component", "build a dropdown" |
| **code-reviewer** | "review this code", "check my component", "code review", "audit this component" |

### Agents

| Agent | Purpose | Triggers |
|-------|---------|----------|
| **component-writer** | Autonomous component creation following library patterns | Proactive on component development tasks |
| **code-reviewer** | Autonomous code review with severity levels | Proactive on review/audit requests |

## Installation

```bash
/plugin install bits-ui-dev@bloodrune-skills-marketplace
```

Or use directly with plugin-dir:
```bash
claude --plugin-dir /path/to/plugins/bits-ui-dev
```

## Key Features

### Component Patterns

- **Simple Stateless**: Badge, Button, Card
- **Stateful with bits-ui**: Switch, Checkbox, Toggle
- **Compound Components**: Dialog, Accordion, DropdownMenu
- **Portal-based Overlays**: Dialog, Popover, Tooltip

### Advanced Patterns (in references/)

- Physics-based state management (momentum scrolling)
- Orientation-aware components (horizontal/vertical layouts)
- Snippet children with state parameters
- Custom animations (ripple, gradient, staggered)
- Mixed export patterns for compound components

### Code Review Categories

| Priority | Category | Examples |
|----------|----------|----------|
| P0 | Critical | XSS, accessibility violations, breaking bugs |
| P1 | Architecture | Wrong patterns, props violations, state issues |
| P2 | Quality | TypeScript issues, code style |
| P3 | Styling | Hardcoded colors, missing states |
| P4 | Polish | Missing docs, edge cases |

## Critical Rules

1. **Always use cn()** for class merging
2. **Rename class to className**: `class: className = ''`
3. **Use $bindable()** for ref and two-way props
4. **Define explicit types** for Variant, Size, Props
5. **Use semantic tokens** (bg-primary, not bg-blue-500)
6. **Include all states**: hover, focus-visible, disabled
7. **Use bits-ui primitives** for complex interactions
8. **Never use export let** - use $props() rune

## File Structure

```
bits-ui-dev/
├── .claude-plugin/
│   └── plugin.json
├── agents/
│   ├── component-writer.md
│   └── code-reviewer.md
├── skills/
│   ├── component-writer/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── advanced-patterns.md
│   │       ├── button-example.svelte
│   │       ├── switch-example.svelte
│   │       └── dialog-example.svelte
│   └── code-reviewer/
│       ├── SKILL.md
│       └── references/
│           ├── review-checklist.md
│           └── common-issues.md
└── README.md
```

## Context7 Integration

For up-to-date documentation, the skills reference Context7:
- `/huntabyte/bits-ui` - bits-ui component primitives API
- `/tailwindlabs/tailwindcss` - Tailwind CSS v4 @theme syntax

## License

MIT
