# Seven Plugins Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build 5 new plugins and upgrade 2 existing plugins in the bloodrune-skills-marketplace.

**Architecture:** Each plugin follows the established convention: `.claude-plugin/plugin.json` manifest, `skills/<name>/SKILL.md` with YAML frontmatter, optional `references/`, `agents/`, `commands/`, `hooks/` directories. Plugins are registered in the root `marketplace.json`. New plugins use `plugin-dev:create-plugin` skill; hooks use `plugin-dev:hook-development`; agents use `plugin-dev:agent-development`; skills use `plugin-dev:skill-development`; commands use `plugin-dev:command-development`.

**Tech Stack:** Markdown (SKILL.md, agent .md), YAML frontmatter, Bash (hooks), JSON (plugin.json, marketplace.json)

**Base path:** `/data/dev/skills/claude-skills/`

---

## Plugin 1: git-safety-hooks

**Creation skill:** `plugin-dev:create-plugin` then `plugin-dev:hook-development`

This plugin has NO skill — it is hooks-only. It provides 3 hook categories:
- **PreToolUse hooks:** Block dangerous git commands (force-push, reset --hard) and rm -rf; detect secrets in staged files
- **PostToolUse hooks:** Auto-format after file writes (prettier for .svelte/.ts/.js, rustfmt for .rs)
- **Notification hook:** Desktop ping via `notify-send` on Hyprland when Claude finishes a task

### Task 1.1: Scaffold plugin structure

**Files:**
- Create: `plugins/git-safety-hooks/.claude-plugin/plugin.json`

**Step 1: Create plugin.json**

```json
{
  "name": "git-safety-hooks",
  "version": "1.0.0",
  "description": "Safety hooks for git operations, auto-formatting, and desktop notifications",
  "author": {
    "name": "MrBloodrune"
  },
  "repository": "https://github.com/MrBloodrune/claude-skills",
  "license": "Apache-2.0",
  "keywords": ["git", "hooks", "safety", "formatting", "notifications"]
}
```

**Step 2: Commit**

```bash
git add plugins/git-safety-hooks/.claude-plugin/plugin.json
git commit -m "feat: scaffold git-safety-hooks plugin"
```

### Task 1.2: Create PreToolUse hook — block dangerous commands

**Files:**
- Create: `plugins/git-safety-hooks/hooks/block-dangerous-commands.md`

This is a **prompt-based hook** (`.md` file, not a shell script). It uses the hooks prompt API to inspect Bash tool calls before execution.

**Step 1: Write the hook**

```markdown
---
event: PreToolUse
match_tool: Bash
---

Inspect the Bash command about to be executed. BLOCK (return "BLOCK: <reason>") if ANY of these patterns match:

**Git destructive commands:**
- `git push --force` or `git push -f` (any branch)
- `git push --force-with-lease` to `main` or `master`
- `git reset --hard`
- `git clean -f` or `git clean -fd`
- `git checkout .` or `git restore .` (discards all changes)
- `git branch -D` (force delete branch)
- `git rebase` on `main` or `master`

**Filesystem destructive commands:**
- `rm -rf /` or `rm -rf ~` or `rm -rf .` (broad recursive deletes)
- `rm -rf` on any path containing `.git`, `.env`, `node_modules` (common accidents)
- Any `rm -rf` where the target path has fewer than 3 directory components (too broad)

**If the command is safe**, return nothing (allow it through).

Do NOT block:
- `rm -rf` on specific build/dist/tmp directories (normal cleanup)
- `git push` without `--force`
- `git reset` without `--hard`
- `git branch -d` (safe delete, only works if merged)
```

**Step 2: Commit**

```bash
git add plugins/git-safety-hooks/hooks/block-dangerous-commands.md
git commit -m "feat: add PreToolUse hook to block dangerous git/rm commands"
```

### Task 1.3: Create PreToolUse hook — detect secrets in staged files

**Files:**
- Create: `plugins/git-safety-hooks/hooks/detect-staged-secrets.md`

**Step 1: Write the hook**

```markdown
---
event: PreToolUse
match_tool: Bash
---

If this Bash command is `git commit` (any variant), check for secrets in staged files.

**Before allowing the commit, mentally review if any staged files were recently written/edited and might contain:**
- API keys (patterns like `sk-`, `pk_`, `AKIA`, `ghp_`, `gho_`, `glpat-`)
- Private keys (`-----BEGIN.*PRIVATE KEY-----`)
- Passwords in config files (`.env`, `credentials`, `secrets`)
- OAuth tokens, bearer tokens, JWTs in source code
- Connection strings with embedded passwords

**If you detect potential secrets:** BLOCK with "BLOCK: Potential secret detected in staged files. Review before committing: <description>"

**If this is not a git commit command**, return nothing (allow through).
```

**Step 2: Commit**

```bash
git add plugins/git-safety-hooks/hooks/detect-staged-secrets.md
git commit -m "feat: add PreToolUse hook to detect secrets before git commit"
```

### Task 1.4: Create PostToolUse hook — auto-format

**Files:**
- Create: `plugins/git-safety-hooks/hooks/auto-format.md`

**Step 1: Write the hook**

```markdown
---
event: PostToolUse
match_tool: Write,Edit
---

After a file was written or edited, check the file extension and suggest running the appropriate formatter:

- **`.svelte`, `.ts`, `.tsx`, `.js`, `.jsx`, `.css`, `.json`** — Run: `npx prettier --write <filepath>`
- **`.rs`** — Run: `rustfmt <filepath>`

Only suggest formatting if the tool call succeeded. Do not format files in `node_modules/`, `target/`, `dist/`, or `build/` directories.
```

**Step 2: Commit**

```bash
git add plugins/git-safety-hooks/hooks/auto-format.md
git commit -m "feat: add PostToolUse hook for auto-formatting"
```

### Task 1.5: Create Notification hook — desktop ping

**Files:**
- Create: `plugins/git-safety-hooks/hooks/notify-complete.sh`

**Step 1: Write the hook**

```bash
#!/bin/bash
# Notification hook: Desktop ping on Hyprland when Claude finishes
# Event: Notification

notify-send \
  --app-name="Claude Code" \
  --urgency=normal \
  --expire-time=5000 \
  "Claude Code" \
  "${CLAUDE_NOTIFICATION:-Task complete}"
```

**Step 2: Make executable**

```bash
chmod +x plugins/git-safety-hooks/hooks/notify-complete.sh
```

**Step 3: Commit**

```bash
git add plugins/git-safety-hooks/hooks/notify-complete.sh
git commit -m "feat: add notification hook for Hyprland desktop pings"
```

### Task 1.6: Register in marketplace.json

**Files:**
- Modify: `.claude-plugin/marketplace.json`

**Step 1: Add entry to plugins array**

Add to the `plugins` array in marketplace.json:

```json
{
  "name": "git-safety-hooks",
  "description": "Safety hooks for git operations, auto-formatting, and desktop notifications",
  "source": "./plugins/git-safety-hooks",
  "strict": false
}
```

**Step 2: Commit**

```bash
git add .claude-plugin/marketplace.json
git commit -m "feat: register git-safety-hooks in marketplace"
```

### Task 1.7: Validate plugin

**Step 1: Run validation**

Use `plugin-dev:plugin-validator` to validate the git-safety-hooks plugin structure.

---

## Plugin 2: rust-development

**Creation skill:** `plugin-dev:create-plugin` then `plugin-dev:skill-development`

Skill-only plugin. Covers Rust edition 2024 conventions, inline test modules, cargo workspace patterns, error handling (thiserror/anyhow), async patterns (tokio), and common crate idioms.

### Task 2.1: Scaffold plugin and write SKILL.md

**Files:**
- Create: `plugins/rust-development/.claude-plugin/plugin.json`
- Create: `plugins/rust-development/skills/rust-development/SKILL.md`

**Step 1: Create plugin.json**

```json
{
  "name": "rust-development",
  "version": "1.0.0",
  "description": "Rust edition 2024 development patterns, cargo workspaces, error handling, async, and testing conventions",
  "author": {
    "name": "MrBloodrune"
  },
  "repository": "https://github.com/MrBloodrune/claude-skills",
  "license": "Apache-2.0",
  "keywords": ["rust", "cargo", "tokio", "thiserror", "anyhow", "testing"]
}
```

**Step 2: Create SKILL.md**

```markdown
---
name: Rust Development
description: >-
  This skill should be used when writing Rust code, creating cargo projects,
  working with cargo workspaces, implementing error handling, writing async code,
  or structuring Rust tests. Triggers on "rust", "cargo", "tokio", "thiserror",
  "anyhow", "async rust", "rust tests", "cargo workspace".
---

# Rust Development — Edition 2024

## Edition & Toolchain

- Always use **edition 2024** in `Cargo.toml`
- Minimum Rust version: 1.85+ (edition 2024 stabilized)
- Use `rust-analyzer` conventions for project structure

## Project Structure

### Single Crate

```
project/
├── Cargo.toml
├── src/
│   ├── main.rs          # Binary entry (or lib.rs for library)
│   └── module_name.rs   # Flat module files (not module_name/mod.rs)
└── tests/
    └── integration.rs   # Integration tests only
```

### Cargo Workspace

```toml
# Root Cargo.toml
[workspace]
resolver = "3"  # Edition 2024 uses resolver 3
members = ["crates/*"]

[workspace.package]
edition = "2024"
license = "Apache-2.0"
repository = "https://github.com/user/project"

[workspace.dependencies]
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
thiserror = "2"
anyhow = "1"
tracing = "0.1"
```

```toml
# Member Cargo.toml
[package]
name = "crate-name"
version = "0.1.0"
edition.workspace = true

[dependencies]
tokio = { workspace = true }
```

## Testing Convention — Inline `#[cfg(test)]`

**Always** use inline test modules at the bottom of the source file. Never create separate `tests/` files for unit tests.

```rust
// src/parser.rs

pub fn parse(input: &str) -> Result<Ast, ParseError> {
    // implementation
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_empty_input() {
        assert!(parse("").is_err());
    }

    #[test]
    fn parses_valid_expression() {
        let ast = parse("1 + 2").unwrap();
        assert_eq!(ast.evaluate(), 3);
    }
}
```

Integration tests (cross-crate, external API) go in `tests/` directory.

## Error Handling

### Library Crates — `thiserror`

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("failed to parse config: {0}")]
    Config(#[from] toml::de::Error),

    #[error("database query failed: {0}")]
    Database(#[from] sqlx::Error),

    #[error("{context}: {source}")]
    Io {
        context: String,
        #[source]
        source: std::io::Error,
    },
}
```

### Binary Crates / Application Layer — `anyhow`

```rust
use anyhow::{Context, Result};

fn main() -> Result<()> {
    let config = load_config()
        .context("failed to load application config")?;
    run_server(config).await
        .context("server exited with error")?;
    Ok(())
}
```

### Conversion Rule

- **Expose `thiserror` enums** from library crates (callers can match on variants)
- **Use `anyhow::Result`** in binaries and `main()` (no one matches on your errors)
- **Never** use `unwrap()` in library code. Use `expect()` only for invariants with a message.

## Async Patterns — Tokio

### Runtime Setup

```rust
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::init();
    // application code
    Ok(())
}
```

### Task Spawning

```rust
// CPU-bound work — use spawn_blocking
let result = tokio::task::spawn_blocking(move || {
    expensive_computation(&data)
}).await?;

// IO-bound concurrent work — use JoinSet
let mut set = tokio::task::JoinSet::new();
for url in urls {
    set.spawn(async move { fetch(url).await });
}
while let Some(result) = set.join_next().await {
    let response = result??;
    process(response);
}
```

### Cancellation Safety

```rust
// Use tokio::select! carefully — only with cancel-safe futures
tokio::select! {
    result = connection.read() => handle_read(result),
    _ = shutdown.recv() => return Ok(()),
}
```

## Common Patterns

### Builder Pattern

```rust
#[derive(Default)]
pub struct ServerConfig {
    port: u16,
    host: String,
}

impl ServerConfig {
    pub fn port(mut self, port: u16) -> Self {
        self.port = port;
        self
    }

    pub fn host(mut self, host: impl Into<String>) -> Self {
        self.host = host.into();
        self
    }

    pub fn build(self) -> Server {
        Server { config: self }
    }
}
```

### Type State Pattern

```rust
pub struct Connection<S> { inner: TcpStream, _state: S }
pub struct Disconnected;
pub struct Connected;

impl Connection<Disconnected> {
    pub async fn connect(addr: &str) -> Result<Connection<Connected>> {
        let inner = TcpStream::connect(addr).await?;
        Ok(Connection { inner, _state: Connected })
    }
}

impl Connection<Connected> {
    pub async fn send(&mut self, data: &[u8]) -> Result<()> { /* ... */ }
}
```

### Newtype for Validation

```rust
pub struct Port(u16);

impl Port {
    pub fn new(value: u16) -> Result<Self, PortError> {
        if value == 0 { return Err(PortError::Zero); }
        Ok(Self(value))
    }
}
```

## Crate Recommendations

| Purpose | Crate | Notes |
|---------|-------|-------|
| Error handling (lib) | `thiserror` | Derive Error for enums |
| Error handling (app) | `anyhow` | Contextual error chains |
| Async runtime | `tokio` | Full features for servers |
| Serialization | `serde` + `serde_json`/`toml` | Always derive |
| HTTP client | `reqwest` | Async, built on hyper |
| HTTP server | `axum` | Tower-based, async |
| Database | `sqlx` | Compile-time checked queries |
| CLI args | `clap` | Derive API |
| Logging | `tracing` + `tracing-subscriber` | Structured, async-aware |
| Testing | `insta` | Snapshot testing |

## Additional Resources

### Reference Files

- **`references/cargo-toml-templates.md`** — Cargo.toml templates for single crate, workspace, and binary+lib layouts
- **`references/common-patterns.md`** — Extended patterns: From impls, Display, iterator adapters, smart pointers
```

**Step 3: Commit**

```bash
git add plugins/rust-development/
git commit -m "feat: add rust-development plugin with edition 2024 patterns"
```

### Task 2.2: Create reference files

**Files:**
- Create: `plugins/rust-development/skills/rust-development/references/cargo-toml-templates.md`
- Create: `plugins/rust-development/skills/rust-development/references/common-patterns.md`

**Step 1: Write cargo-toml-templates.md**

Document 3 Cargo.toml templates:
1. Single binary crate with common dependencies
2. Library crate with features
3. Workspace root + member crate

Include edition 2024, resolver 3, workspace inheritance, and feature flag patterns.

**Step 2: Write common-patterns.md**

Document extended patterns:
- `From` and `Into` implementations
- Iterator adapter chains
- `Arc<Mutex<T>>` vs `Arc<RwLock<T>>` guidance
- `Cow<'_, str>` for flexible string APIs
- Trait objects vs generics decision guide

**Step 3: Commit**

```bash
git add plugins/rust-development/skills/rust-development/references/
git commit -m "feat: add Rust reference docs for cargo templates and patterns"
```

### Task 2.3: Register in marketplace and validate

**Step 1:** Add marketplace.json entry (same pattern as Task 1.6)
**Step 2:** Commit
**Step 3:** Run `plugin-dev:plugin-validator`

---

## Plugin 3: podman-oci

**Creation skill:** `plugin-dev:create-plugin` then `plugin-dev:skill-development`

Skill-only plugin. Covers rootless Podman, pod composition, Quadlet/systemd integration, Containerfile best practices, volume management, registry auth — all Podman-native, never Docker.

### Task 3.1: Scaffold plugin and write SKILL.md

**Files:**
- Create: `plugins/podman-oci/.claude-plugin/plugin.json`
- Create: `plugins/podman-oci/skills/podman-oci/SKILL.md`

**Step 1: Create plugin.json**

```json
{
  "name": "podman-oci",
  "version": "1.0.0",
  "description": "Podman container workflows: rootless networking, Quadlet systemd units, pod composition, Containerfile patterns, and registry auth",
  "author": {
    "name": "MrBloodrune"
  },
  "repository": "https://github.com/MrBloodrune/claude-skills",
  "license": "Apache-2.0",
  "keywords": ["podman", "oci", "containers", "quadlet", "systemd", "rootless"]
}
```

**Step 2: Create SKILL.md**

Write a comprehensive SKILL.md covering:

**Frontmatter triggers:** "podman", "container", "containerfile", "quadlet", "pod", "systemd container", "rootless container", "podman-compose", "buildah". Explicitly state: "Never suggest Docker — always use Podman equivalents."

**Sections:**
1. **Rootless Podman** — `podman run --userns=keep-id`, subuid/subgid, socket path `$XDG_RUNTIME_DIR/podman/podman.sock`
2. **Containerfile Best Practices** — Multi-stage builds, layer caching, `RUN --mount=type=cache`, non-root USER, LABEL conventions, `.containerignore`
3. **Pod Composition** — `podman pod create`, `podman pod play kube`, YAML pod spec, infra container, shared network namespace
4. **Quadlet/Systemd Integration** — `.container`, `.pod`, `.volume`, `.network`, `.kube` unit files in `~/.config/containers/systemd/`, `systemctl --user daemon-reload`, auto-start with `loginctl enable-linger`
5. **Volume Management** — Named volumes, bind mounts with `:Z`/`:z` SELinux labels, tmpfs, volume inspect/prune
6. **Networking** — `podman network create`, pasta (default rootless), slirp4netns, port mapping, DNS in pods
7. **Registry Auth** — `podman login`, `auth.json` location, `containers-registries.conf` for mirrors
8. **Common Commands Quick Reference** — Table of everyday commands

**Step 3: Commit**

```bash
git add plugins/podman-oci/
git commit -m "feat: add podman-oci plugin with rootless and Quadlet patterns"
```

### Task 3.2: Create reference files

**Files:**
- Create: `plugins/podman-oci/skills/podman-oci/references/quadlet-templates.md`
- Create: `plugins/podman-oci/skills/podman-oci/references/containerfile-patterns.md`

**Step 1:** Write Quadlet templates — complete `.container`, `.pod`, `.volume` unit file examples for common services (web server, database, app + db pod)

**Step 2:** Write Containerfile patterns — multi-stage Rust build, Svelte/Node build, Python app, and a base image pattern

**Step 3: Commit**

```bash
git add plugins/podman-oci/skills/podman-oci/references/
git commit -m "feat: add Podman reference docs for Quadlet and Containerfile patterns"
```

### Task 3.3: Register in marketplace and validate

**Step 1:** Add marketplace.json entry
**Step 2:** Commit
**Step 3:** Run `plugin-dev:plugin-validator`

---

## Plugin 4: svelte-playwright

**Creation skill:** `plugin-dev:create-plugin` then `plugin-dev:skill-development`

Skill-only plugin. Covers Playwright testing for Svelte 5 components — autonomous browser testing, accessibility tree interaction, component rendering verification, and visual regression patterns.

### Task 4.1: Scaffold plugin and write SKILL.md

**Files:**
- Create: `plugins/svelte-playwright/.claude-plugin/plugin.json`
- Create: `plugins/svelte-playwright/skills/svelte-playwright/SKILL.md`

**Step 1: Create plugin.json**

```json
{
  "name": "svelte-playwright",
  "version": "1.0.0",
  "description": "Playwright testing patterns for Svelte 5 components: browser automation, accessibility testing, visual regression, and component verification",
  "author": {
    "name": "MrBloodrune"
  },
  "repository": "https://github.com/MrBloodrune/claude-skills",
  "license": "MIT",
  "keywords": ["playwright", "svelte", "testing", "e2e", "accessibility", "visual-regression"]
}
```

**Step 2: Create SKILL.md**

Write a comprehensive SKILL.md covering:

**Frontmatter triggers:** "playwright", "e2e test", "browser test", "component test", "visual regression", "accessibility test", "svelte test".

**Sections:**
1. **Project Setup** — `@playwright/test` install, `playwright.config.ts` for SvelteKit (`webServer` config pointing at `vite dev`), multiple browsers
2. **Page Object Pattern for Svelte** — Encapsulate component interaction, use `getByRole`/`getByLabel`/`getByTestId` selectors (accessibility tree preferred)
3. **Component Testing Patterns** — Test reactive state ($state), test bindings ($bindable), test events, test slots, test transitions
4. **Accessibility Testing** — `expect(page).toPassAxeTests()` with `@axe-core/playwright`, ARIA role verification, keyboard navigation, focus management, screen reader compatibility
5. **Visual Regression** — `expect(page).toHaveScreenshot()`, threshold config, update snapshots workflow, CI considerations
6. **SvelteKit Routing Tests** — Navigation, load functions, form actions, error pages, layout nesting
7. **Authentication Flows** — `storageState` for persistent auth, global setup, parallel test isolation
8. **Common Selectors** — Table mapping component to recommended selector strategy

**Step 3: Commit**

```bash
git add plugins/svelte-playwright/
git commit -m "feat: add svelte-playwright plugin for e2e testing patterns"
```

### Task 4.2: Create reference files

**Files:**
- Create: `plugins/svelte-playwright/skills/svelte-playwright/references/playwright-config.md`
- Create: `plugins/svelte-playwright/skills/svelte-playwright/references/test-examples.md`

**Step 1:** Write playwright-config.md — complete `playwright.config.ts` template for SvelteKit projects, with projects for chromium/firefox/webkit, webServer config, reporter config, and screenshot settings

**Step 2:** Write test-examples.md — 5-6 complete test examples: basic page test, form interaction, component state test, accessibility audit, visual regression, authenticated test

**Step 3: Commit**

```bash
git add plugins/svelte-playwright/skills/svelte-playwright/references/
git commit -m "feat: add Playwright reference docs for SvelteKit testing"
```

### Task 4.3: Register in marketplace and validate

**Step 1:** Add marketplace.json entry
**Step 2:** Commit
**Step 3:** Run `plugin-dev:plugin-validator`

---

## Plugin 5: homelab-inventory

**Creation skill:** `plugin-dev:create-plugin` then `plugin-dev:skill-development`

Skill-only plugin. Unified topology reference consolidating knowledge from proxmox-oci, nvidia-gpu-passthrough, and livesync-setup into a single source of truth for the homelab.

### Task 5.1: Gather inventory data from existing plugins

**Files:**
- Read: `plugins/proxmox-oci/skills/proxmox-oci/SKILL.md`
- Read: `plugins/nvidia-gpu-passthrough/skills/nvidia-gpu-passthrough/SKILL.md`
- Read: `plugins/livesync-setup/skills/livesync-setup/SKILL.md`

**Step 1:** Read all three existing homelab plugin SKILL.md files and their references to extract:
- CT IDs and their purposes
- IP addresses and network layout
- GPU allocation details
- Storage configuration
- Service dependencies

### Task 5.2: Scaffold plugin and write SKILL.md

**Files:**
- Create: `plugins/homelab-inventory/.claude-plugin/plugin.json`
- Create: `plugins/homelab-inventory/skills/homelab-inventory/SKILL.md`

**Step 1: Create plugin.json**

```json
{
  "name": "homelab-inventory",
  "version": "1.0.0",
  "description": "Unified homelab topology: Proxmox hosts, container assignments, IP layout, GPU allocation, storage, and service map",
  "author": {
    "name": "MrBloodrune"
  },
  "repository": "https://github.com/MrBloodrune/claude-skills",
  "license": "Apache-2.0",
  "keywords": ["homelab", "proxmox", "inventory", "network", "infrastructure"]
}
```

**Step 2: Create SKILL.md**

Write a comprehensive SKILL.md covering:

**Frontmatter triggers:** "homelab", "proxmox", "container list", "CT", "IP address", "which container", "what runs on", "infrastructure", "network layout", "GPU", "storage".

**Sections:**
1. **Proxmox Hosts** — Table of PVE hosts with hostname, IP, role, CPU/RAM specs
2. **Container Inventory** — Table of all CTs with ID, hostname, IP, purpose, OS, resources (CPU/RAM/disk)
3. **Network Layout** — Subnet map, VLAN assignments, gateway, DNS servers, bridge interfaces
4. **GPU Allocation** — Which host has which GPU, which CTs have passthrough, device nodes, driver version
5. **Storage** — ZFS pools, LVM-thin, NFS shares, backup targets, per-CT storage mapping
6. **Service Map** — Table of services with name, CT, port, URL, dependencies
7. **Service Dependencies** — Dependency graph showing which services depend on which (e.g., LiveSync → CouchDB → Vault)

Populate with real data extracted from existing plugins in Task 5.1.

**Step 3: Commit**

```bash
git add plugins/homelab-inventory/
git commit -m "feat: add homelab-inventory plugin with unified topology"
```

### Task 5.3: Create reference files

**Files:**
- Create: `plugins/homelab-inventory/skills/homelab-inventory/references/network-map.md`

**Step 1:** Write network-map.md — detailed network topology with IP assignments, port forwards, firewall rules, and inter-CT communication paths

**Step 2: Commit**

```bash
git add plugins/homelab-inventory/skills/homelab-inventory/references/
git commit -m "feat: add homelab network map reference"
```

### Task 5.4: Register in marketplace and validate

**Step 1:** Add marketplace.json entry
**Step 2:** Commit
**Step 3:** Run `plugin-dev:plugin-validator`

---

## Plugin 6: secrets-management (UPGRADE)

**Creation skill:** `plugin-dev:agent-development` (for the new agent)

Upgrade existing v0.1.0 plugin to v1.0.0. Add a dedicated agent that can read/write vault paths via CLI, rotate secrets, and verify AppRole health. Update SKILL.md with agent reference.

### Task 6.1: Create vault-agent

**Files:**
- Create: `plugins/secrets-management/agents/vault-agent.md`

**Step 1: Write the agent definition**

```markdown
---
name: vault-agent
description: >-
  Use this agent when the user asks to "read vault secrets", "write to vault",
  "rotate secret ID", "check vault health", "verify AppRole", "list vault paths",
  or needs to perform any HashiCorp Vault operation interactively.

<example>
Context: User needs to check if Vault is healthy
user: "Is vault reachable? Check the noted secrets"
assistant: "I'll use the vault-agent to check Vault health and verify secrets."
<commentary>
User wants vault status check — triggers vault-agent for interactive Vault operations.
</commentary>
</example>

<example>
Context: User needs to rotate the AppRole secret ID
user: "The secret ID is about to expire, rotate it"
assistant: "I'll use the vault-agent to generate a new secret ID and deploy it."
<commentary>
Secret rotation request — triggers vault-agent for Vault CLI operations.
</commentary>
</example>

<example>
Context: User wants to read a secret value
user: "What's the CouchDB password in vault?"
assistant: "I'll use the vault-agent to fetch the CouchDB secret from Vault."
<commentary>
Secret read request — triggers vault-agent.
</commentary>
</example>

model: inherit
color: red
tools: ["Bash", "Read", "Glob", "Grep"]
---

You are a HashiCorp Vault operations agent for the noted system.

## Environment

- **Vault address:** https://vault.mrbloodrune.dev
- **AppRole:** noted-agent (role ID: 16a3f81a-a8d0-cb58-8623-1e33973919af)
- **CIDR bound:** 10.0.99.27/32 (CT 223 only)
- **Secret paths:** secret/noted/couchdb, secret/noted/livesync, secret/noted/claude
- **Credential files:** /etc/vault.d/role-id, /etc/vault.d/secret-id
- **vault-env script:** /usr/local/bin/vault-env

## Capabilities

1. **Health Check** — Verify Vault is unsealed and responsive
   ```bash
   curl -sk https://vault.mrbloodrune.dev/v1/sys/health | jq .
   ```

2. **Read Secrets** — Authenticate and fetch secret values
   ```bash
   source <(/usr/local/bin/vault-env)
   # Then access exported variables
   ```

3. **Rotate Secret ID** — Generate new secret ID and deploy
   - Requires admin Vault token (prompt user)
   - Generate via AppRole API
   - Deploy to CT 223 via ssh/pct

4. **Verify AppRole** — Check role configuration and token TTL
   ```bash
   curl -sk -H "X-Vault-Token: $TOKEN" \
     https://vault.mrbloodrune.dev/v1/auth/approle/role/noted-agent | jq .
   ```

5. **Update Secrets** — Write new secret values to vault paths
   - Always confirm with user before writing
   - Never log secret values in output

## Safety Rules

- **NEVER** display full secret values — show only first 4 characters + "..."
- **NEVER** store Vault tokens in files or commit them
- **ALWAYS** confirm before writing/updating secrets
- **ALWAYS** verify CIDR restrictions match expected container IP
- If Vault is sealed, instruct user on unsealing — do NOT attempt automatic unseal
```

**Step 2: Commit**

```bash
git add plugins/secrets-management/agents/vault-agent.md
git commit -m "feat: add vault-agent for interactive Vault operations"
```

### Task 6.2: Update plugin.json version

**Files:**
- Modify: `plugins/secrets-management/.claude-plugin/plugin.json`

**Step 1:** Bump version from `"0.1.0"` to `"1.0.0"`

**Step 2: Commit**

```bash
git add plugins/secrets-management/.claude-plugin/plugin.json
git commit -m "chore: bump secrets-management to v1.0.0"
```

### Task 6.3: Update SKILL.md with agent reference

**Files:**
- Modify: `plugins/secrets-management/skills/secrets-management/SKILL.md`

**Step 1:** Add a section at the end before "Additional Resources":

```markdown
## Interactive Operations

For interactive Vault operations (reading secrets, rotating IDs, health checks), the **vault-agent** is available. It authenticates with Vault and performs operations safely with secret masking.

Trigger it by asking to "check vault", "rotate secret ID", "read vault secrets", or similar.
```

**Step 2: Commit**

```bash
git add plugins/secrets-management/skills/secrets-management/SKILL.md
git commit -m "feat: add vault-agent reference to secrets-management SKILL.md"
```

### Task 6.4: Validate plugin

**Step 1:** Run `plugin-dev:plugin-validator` on secrets-management

---

## Plugin 7: process-daily (UPGRADE)

**Creation skill:** `plugin-dev:agent-development` (for the agent) + `plugin-dev:command-development` (for /process-today)

Upgrade existing v0.1.0 plugin to v1.0.0. Add a dedicated autonomous agent and a `/process-today` slash command that triggers it.

### Task 7.1: Create daily-processor agent

**Files:**
- Create: `plugins/process-daily/agents/daily-processor.md`

**Step 1: Write the agent definition**

```markdown
---
name: daily-processor
description: >-
  Use this agent when the user asks to "process daily notes", "process today",
  "file my captures", "sort today's notes", "organize daily entries",
  "process quick capture", or mentions processing Obsidian daily note captures.

<example>
Context: User wants to process today's captures
user: "process today's daily note"
assistant: "I'll use the daily-processor agent to classify and file your captures."
<commentary>
User wants daily note processing — triggers daily-processor for autonomous capture filing.
</commentary>
</example>

<example>
Context: User mentions quick captures need filing
user: "I dumped a bunch of stuff in my daily note, can you sort it?"
assistant: "I'll use the daily-processor agent to parse and categorize your captures."
<commentary>
Captures need classification — triggers daily-processor.
</commentary>
</example>

model: inherit
color: green
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"]
---

You are the Obsidian Daily Note processor for the RMV0 vault.

## Vault Location

`~/Documents/rmv0/`

## Process

Follow the process-daily skill exactly. For each session:

1. **Find today's daily note** at `Daily/YYYY-MM-DD.md` (use today's date)
2. **Read the note** and extract content between `# Quick Capture` and the next heading
3. **If no captures found**, report "No captures to process" and stop
4. **Parse captures** — split by blank lines, bullets are sub-items of preceding capture
5. **Classify each capture** using the categorization rules in the skill
6. **Safety check** — skip any capture matching secret patterns (API keys, passwords, private keys). Report skipped items to user.
7. **Process each capture:**
   - Tasks → add to `# To Do` section as checkboxes
   - Links → create note in appropriate category using link-scraper.js if available, else create placeholder
   - Content → create structured note using templates, file to correct vault folder
8. **Update daily note** — clear `# Quick Capture`, populate `# Processed` with wikilinks to created notes
9. **Report summary** — list what was created/filed, any items skipped

## Critical Rules

- NEVER modify content outside `# Quick Capture` and `# Processed` sections
- NEVER modify files in Templates/, .obsidian/, Canvas/, Attachments/
- NEVER overwrite existing notes — append or create new
- NEVER process credentials, API keys, 2FA codes, or private keys
- Always use wikilinks `[[Note Name]]` for cross-references
- Always add YAML frontmatter with tags to new notes
- Use the templates from references/templates.md
- File to folders according to references/vault-structure.md
```

**Step 2: Commit**

```bash
git add plugins/process-daily/agents/daily-processor.md
git commit -m "feat: add daily-processor agent for autonomous capture filing"
```

### Task 7.2: Create /process-today command

**Files:**
- Create: `plugins/process-daily/commands/process-today.md`

**Step 1: Write the command**

```markdown
---
description: Process today's Obsidian daily note captures into structured, categorized notes
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

Process today's daily note from the RMV0 vault (`~/Documents/rmv0/`).

1. Read `Daily/$ARGUMENTS.md` if arguments provided, otherwise use today's date (`Daily/$(date +%Y-%m-%d).md`)
2. Follow the process-daily skill workflow to classify and file all captures from `# Quick Capture`
3. Report a summary of what was processed
```

**Step 2: Commit**

```bash
git add plugins/process-daily/commands/process-today.md
git commit -m "feat: add /process-today command for daily note processing"
```

### Task 7.3: Update plugin.json version

**Files:**
- Modify: `plugins/process-daily/.claude-plugin/plugin.json`

**Step 1:** Bump version from `"0.1.0"` to `"1.0.0"`

**Step 2: Commit**

```bash
git add plugins/process-daily/.claude-plugin/plugin.json
git commit -m "chore: bump process-daily to v1.0.0"
```

### Task 7.4: Update SKILL.md with agent and command reference

**Files:**
- Modify: `plugins/process-daily/skills/process-daily/SKILL.md`

**Step 1:** Add section before "Additional Resources":

```markdown
## Automated Processing

### Agent
The **daily-processor** agent handles the full workflow autonomously. Trigger it by asking to "process today" or "file my captures".

### Command
Use `/process-today` to run processing for today's date, or `/process-today 2026-02-10` for a specific date.
```

**Step 2: Commit**

```bash
git add plugins/process-daily/skills/process-daily/SKILL.md
git commit -m "feat: add agent and command references to process-daily SKILL.md"
```

### Task 7.5: Validate plugin

**Step 1:** Run `plugin-dev:plugin-validator` on process-daily

---

## Final Task: Validate all and update marketplace

### Task 8.1: Final marketplace.json update

Ensure all 5 new plugins are registered. The 2 upgraded plugins are already registered.

New entries to add:
1. `git-safety-hooks`
2. `rust-development`
3. `podman-oci`
4. `svelte-playwright`
5. `homelab-inventory`

### Task 8.2: Full validation sweep

Run `plugin-dev:plugin-validator` on the entire marketplace.

### Task 8.3: Final commit

```bash
git add .
git commit -m "feat: add 5 new plugins, upgrade 2 existing plugins

- git-safety-hooks: PreToolUse safety gates, auto-format, desktop notifications
- rust-development: Edition 2024 patterns, cargo workspaces, async/error handling
- podman-oci: Rootless Podman, Quadlet systemd, pod composition
- svelte-playwright: E2E testing patterns for Svelte 5 components
- homelab-inventory: Unified infrastructure topology reference
- secrets-management v1.0.0: Added vault-agent for interactive operations
- process-daily v1.0.0: Added daily-processor agent and /process-today command"
```

---

## Implementation Order

| # | Plugin | Skill to Use | Depends On |
|---|--------|-------------|------------|
| 1 | git-safety-hooks | `plugin-dev:create-plugin` → `plugin-dev:hook-development` | — |
| 2 | rust-development | `plugin-dev:create-plugin` → `plugin-dev:skill-development` | — |
| 3 | podman-oci | `plugin-dev:create-plugin` → `plugin-dev:skill-development` | — |
| 4 | svelte-playwright | `plugin-dev:create-plugin` → `plugin-dev:skill-development` | — |
| 5 | homelab-inventory | `plugin-dev:create-plugin` → `plugin-dev:skill-development` | Read existing plugins first |
| 6 | secrets-management | `plugin-dev:agent-development` | — |
| 7 | process-daily | `plugin-dev:agent-development` → `plugin-dev:command-development` | — |

**Parallelizable:** Plugins 1-4 have no dependencies and can be built concurrently. Plugin 5 depends on reading existing plugins. Plugins 6-7 are independent upgrades.
