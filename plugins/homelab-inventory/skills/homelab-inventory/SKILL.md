---
name: Homelab Inventory
description: >-
  This skill should be used when the user asks about "homelab", "proxmox",
  "container list", "CT", "IP address", "which container", "what runs on",
  "infrastructure", "network layout", "GPU", "storage", or mentions looking up
  homelab topology, container assignments, service locations, or network details.
  Provides a unified reference of all hosts, containers, IPs, GPUs, and services.
---

# Homelab Inventory

Unified topology reference for the homelab. Answers "what's where?" across hosts, containers, networking, GPU allocation, and services.

## Proxmox Hosts

| Hostname | PVE Version | Kernel | GPU | Driver | CUDA | Bridge | Subnet | Gateway |
|----------|-------------|--------|-----|--------|------|--------|--------|---------|
| PV01 | 9.1+ | 6.17+ | NVIDIA RTX A5500 Laptop GPU | 550.163.01 | 12.4 | vmbr0 | 10.0.99.0/24 | 10.0.99.254 |

**Important**: The hostname `PV01` is CASE-SENSITIVE. All Proxmox API paths must use the exact case (e.g., `/nodes/PV01/...`). Using `/nodes/pv01/...` causes "proxy loop detected" errors.

## Container Inventory

| CTID | Hostname | IP | Purpose | OS | Resources | Notes |
|------|----------|-----|---------|-----|-----------|-------|
| 201 | caddy | (TBD) | Caddy TLS reverse proxy | (TBD) | (TBD) | Handles vault-sync.mrbloodrune.dev, Cloudflare DNS TLS |
| 206 | vault | (TBD) | HashiCorp Vault | (TBD) | (TBD) | Secrets management, AppRole auth |
| 220 | ollama | 10.0.99.230 | Ollama LLM inference | OCI (Ubuntu-based) | 8 cores, 16GB RAM, 4GB swap, 32GB disk | GPU passthrough, OCI container |
| 222 | noted-couchdb | 10.0.99.29 | CouchDB for Obsidian Livesync | Debian 12 | 2 cores, 1GB RAM, 8GB disk | Port 5984, database: rmv0-vault |
| 223 | noted-agent | 10.0.99.27 | Headless Claude Code processing | (TBD) | (TBD) | CIDR-bound to Vault AppRole (10.0.99.27/32) |

## Network Layout

- **Subnet**: 10.0.99.0/24
- **Gateway**: 10.0.99.254
- **Bridge**: vmbr0

### Known IP Assignments

| IP | CTID | Hostname | Purpose |
|----|------|----------|---------|
| 10.0.99.27 | 223 | noted-agent | Headless Claude Code |
| 10.0.99.29 | 222 | noted-couchdb | CouchDB |
| 10.0.99.230 | 220 | ollama | Ollama LLM inference |
| 10.0.99.254 | - | Gateway | Network gateway |
| (TBD) | 201 | caddy | Caddy reverse proxy |
| (TBD) | 206 | vault | HashiCorp Vault |

For detailed network topology including port usage, DNS entries, and inter-CT communication paths, see `references/network-map.md`.

## GPU Allocation

### Hardware

| Host | GPU | Driver | CUDA |
|------|-----|--------|------|
| PV01 | NVIDIA RTX A5500 Laptop GPU | 550.163.01 | 12.4 |

### GPU-Enabled Containers

| CTID | Hostname | Use Case |
|------|----------|----------|
| 220 | ollama | LLM inference |

### Passthrough Configuration

- **Device nodes**: /dev/nvidia0, /dev/nvidiactl, /dev/nvidia-uvm, /dev/nvidia-uvm-tools, /dev/nvidia-modeset
- **cgroup2 majors**: 195 (GPU), 506 (UVM)
- **Library bind mounts**: /usr/lib/x86_64-linux-gnu, /usr/lib/x86_64-linux-gnu/nvidia, /etc/alternatives (required for Debian alternatives symlink chain)
- **Driver source**: trixie-backports (required for kernel 6.17+ compatibility)

## Service Map

| Service | CTID | Port | URL | Dependencies |
|---------|------|------|-----|--------------|
| Ollama | 220 | 11434 | - | GPU |
| CouchDB | 222 | 5984 | - | - |
| Caddy | 201 | 443 | vault-sync.mrbloodrune.dev | CouchDB (proxied) |
| Vault | 206 | 8200 | vault.mrbloodrune.dev | - |
| Livesync | via 222 | via 201 | vault-sync.mrbloodrune.dev | CouchDB, Caddy, Vault (secrets) |
| noted-agent | 223 | - | - | Vault, CouchDB |

## Dependency Graph

```
noted-agent (CT 223)
├── HashiCorp Vault (CT 206) ─── AppRole auth, secret fetch
│   └── (standalone, no upstream CT deps)
└── CouchDB (CT 222) ─── Obsidian data (rmv0-vault DB)
    └── Caddy (CT 201) ─── TLS proxy for external access
        └── Cloudflare DNS ─── certificate issuance

Ollama (CT 220)
└── GPU (PV01 host) ─── NVIDIA RTX A5500, passthrough
    └── (standalone, no CT deps)
```

### Impact Analysis

| If this goes down... | What breaks |
|---------------------|-------------|
| Caddy (CT 201) | External Livesync access (mobile sync), TLS termination |
| Vault (CT 206) | Secret rotation, noted-agent startup (if secret-id expired) |
| Ollama (CT 220) | LLM inference (no downstream deps) |
| CouchDB (CT 222) | Obsidian Livesync (all clients), noted-agent data access |
| noted-agent (CT 223) | Headless Claude Code processing (no downstream deps) |
| PV01 host | Everything |

## Cross-References

For detailed setup procedures and configuration, see:

| Topic | Plugin | Key Content |
|-------|--------|-------------|
| OCI container creation | **proxmox-oci** | Pull OCI images, create LXC from templates, entrypoint handling |
| GPU passthrough setup | **nvidia-gpu-passthrough** | Driver install, LXC config, device nodes, library mounts |
| CouchDB + Livesync | **livesync-setup** | CouchDB install, Caddy config, Obsidian plugin settings |
| Vault + AppRole | **secrets-management** | vault-env script, AppRole rotation, secret paths |
