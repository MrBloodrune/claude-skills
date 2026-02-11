# Network Map

Detailed network topology for the homelab.

## Subnet Overview

| Property | Value |
|----------|-------|
| Subnet | 10.0.99.0/24 |
| Gateway | 10.0.99.254 |
| Bridge | vmbr0 |
| Usable range | 10.0.99.1 - 10.0.99.253 |
| VLAN | (TBD) |

## IP Assignment Table

### Assigned

| IP | CTID | Hostname | Purpose | Verified |
|----|------|----------|---------|----------|
| 10.0.99.27 | 223 | noted-agent | Headless Claude Code | Yes |
| 10.0.99.29 | 222 | noted-couchdb | CouchDB (Obsidian Livesync) | Yes |
| 10.0.99.230 | 220 | ollama | Ollama LLM inference | Yes |
| (TBD) | 201 | caddy | Caddy TLS reverse proxy | - |
| (TBD) | 206 | vault | HashiCorp Vault | - |
| 10.0.99.254 | - | - | Gateway | Yes |

### Reserved Ranges

| Range | Purpose |
|-------|---------|
| 10.0.99.254 | Gateway |
| 10.0.99.1 - 10.0.99.19 | (TBD) - Infrastructure / reserved |
| 10.0.99.20 - 10.0.99.99 | (TBD) - Service containers |
| 10.0.99.200 - 10.0.99.249 | (TBD) - GPU / compute containers |

## Port Usage

| CTID | Hostname | Port | Protocol | Service | External Access |
|------|----------|------|----------|---------|-----------------|
| 201 | caddy | 443 | HTTPS | Caddy reverse proxy | Yes (vault-sync.mrbloodrune.dev) |
| 206 | vault | 8200 | HTTPS | HashiCorp Vault API | Yes (vault.mrbloodrune.dev) |
| 220 | ollama | 11434 | HTTP | Ollama API | Internal only |
| 222 | noted-couchdb | 5984 | HTTP | CouchDB HTTP API | Via Caddy (TLS) |
| 223 | noted-agent | - | - | No listening service | - |

## DNS Entries

| Domain | Target | Service | TLS |
|--------|--------|---------|-----|
| vault-sync.mrbloodrune.dev | Caddy (CT 201) | CouchDB proxy for Obsidian Livesync | Cloudflare DNS challenge |
| vault.mrbloodrune.dev | Vault (CT 206) | HashiCorp Vault UI/API | (TBD) |

## Inter-CT Communication Paths

```
noted-agent (10.0.99.27)
    ──[HTTP 5984]──> noted-couchdb (10.0.99.29)     # Direct CouchDB access
    ──[HTTPS 8200]──> vault (TBD)                    # AppRole auth + secret fetch

Caddy (TBD)
    ──[HTTP 5984]──> noted-couchdb (10.0.99.29)     # Reverse proxy to CouchDB

External clients (phone, desktop)
    ──[HTTPS 443]──> Caddy (TBD)                     # vault-sync.mrbloodrune.dev
    ──[HTTPS 8200]──> Vault (TBD)                    # vault.mrbloodrune.dev
```

## Port Forwards / NAT

(TBD) - Document any host-level port forwards or NAT rules if applicable.

## Firewall Rules

(TBD) - Document any pve-firewall or iptables rules applied at host or CT level.

## Network Diagram

```
                    ┌──────────────────────────────────────────┐
                    │              Internet                     │
                    └───────────────┬──────────────────────────┘
                                    │
                          Cloudflare DNS
                     (vault-sync.mrbloodrune.dev)
                      (vault.mrbloodrune.dev)
                                    │
                    ┌───────────────┴──────────────────────────┐
                    │           PV01 (Proxmox Host)            │
                    │           vmbr0 - 10.0.99.0/24           │
                    │                                          │
                    │  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
                    │  │ CT 201  │  │ CT 206  │  │ CT 220  │  │
                    │  │ caddy   │  │ vault   │  │ ollama  │  │
                    │  │ :443    │  │ :8200   │  │ :11434  │  │
                    │  │ (TBD)   │  │ (TBD)   │  │ .230    │  │
                    │  └────┬────┘  └─────────┘  └─────────┘  │
                    │       │                        [GPU]     │
                    │       │                                  │
                    │  ┌────┴────┐  ┌─────────┐               │
                    │  │ CT 222  │  │ CT 223  │               │
                    │  │couchdb  │  │  agent  │               │
                    │  │ :5984   │  │  .27    │               │
                    │  │ .29     │  └─────────┘               │
                    │  └─────────┘                             │
                    └──────────────────────────────────────────┘
```
