---
name: Proxmox OCI Containers
description: This skill should be used when the user asks to "pull OCI image", "create OCI container", "docker to LXC", "pct create from OCI", "pvesh oci-registry-pull", "Proxmox 9.1 containers", "application container", "run docker image in Proxmox", or mentions converting Docker/OCI images to LXC containers in Proxmox VE 9.1+. Provides workflow for pulling OCI images and creating LXC containers.
---

# Proxmox OCI Container Skill

Create LXC containers from Docker/OCI images in Proxmox VE 9.1+ using the native OCI-to-LXC feature.

## Overview

Proxmox VE 9.1 introduced native OCI image support, allowing Docker images to run as LXC containers. This eliminates the need for a full Docker runtime while maintaining compatibility with the OCI ecosystem.

## Prerequisites

- Proxmox VE 9.1 or later
- Storage with `vztmpl` content type enabled
- Network access to container registries (docker.io, ghcr.io, etc.)

## Pull OCI Images

### API Method (pvesh)

Pull images using the Proxmox API. **Critical: Use exact hostname case** (check with `hostname` command).

```bash
# Check exact hostname (case-sensitive!)
ssh pv01 'hostname'
# Example output: PV01

# Pull using EXACT hostname case
pvesh create /nodes/PV01/storage/local/oci-registry-pull \
  --reference docker.io/ollama/ollama:latest
```

**Common Error: "proxy loop detected"**
This occurs when hostname case doesn't match. If hostname is `PV01`, use `/nodes/PV01/...` not `/nodes/pv01/...`.

### Available Registries

| Registry | Format |
|----------|--------|
| Docker Hub | `docker.io/library/nginx:latest` |
| Docker Hub (user) | `docker.io/ollama/ollama:latest` |
| GitHub Container | `ghcr.io/owner/image:tag` |
| Quay.io | `quay.io/organization/image:tag` |

### Verify Template

After pulling, verify the template appears:

```bash
pveam list local | grep <image-name>
```

Templates are stored as `local:vztmpl/<image>_<tag>.tar`.

## Create Container from OCI Template

### Basic Creation

```bash
pct create <CTID> local:vztmpl/<template>.tar \
  --hostname <name> \
  --cores 4 \
  --memory 4096 \
  --net0 name=eth0,bridge=vmbr0,ip=<IP>/24,gw=<GATEWAY> \
  --storage local-lvm \
  --rootfs local-lvm:16 \
  --unprivileged 1 \
  --features nesting=1
```

### Critical: Unprivileged Requirement

**PVE 9.1 Bug**: Privileged OCI containers fail with "Invalid argument" error.

```bash
# FAILS in PVE 9.1
pct create 100 local:vztmpl/image.tar --unprivileged 0

# WORKS in PVE 9.1
pct create 100 local:vztmpl/image.tar --unprivileged 1
```

Always use `--unprivileged 1` when creating containers from OCI images.

## Application Container Behavior

OCI containers behave differently from traditional LXC system containers:

### Entrypoint Handling

The OCI entrypoint becomes the container's init process. Check the config:

```bash
cat /etc/pve/lxc/<CTID>.conf | grep entrypoint
```

**Issue**: If the entrypoint process exits, the container stops.

**Solution for persistent services**: Create a wrapper script:

```bash
# Inside container, create /start.sh
#!/bin/sh
export LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu
exec /bin/your-service

# Update config
# entrypoint: /start.sh
```

### Environment Variables

OCI environment variables appear in the config as `lxc.environment.runtime`:

```
lxc.environment.runtime: PATH=/usr/local/bin:/usr/bin
lxc.environment.runtime: NVIDIA_VISIBLE_DEVICES=all
```

### Console Mode

OCI containers use `cmode: console` by default. Access via:

```bash
pct enter <CTID>
# or
pct exec <CTID> -- /bin/sh
```

## Network Configuration

### Host-Managed Network

OCI containers auto-enable host-managed networking:

```
net0: name=eth0,bridge=vmbr0,host-managed=1,ip=10.0.99.100/24,gw=10.0.99.254
```

### Static IP Assignment

Always assign static IPs for predictable access:

```bash
--net0 name=eth0,bridge=vmbr0,ip=10.0.99.100/24,gw=10.0.99.254
```

### VLAN Tagging

For VLAN networks:

```bash
--net0 name=eth0,bridge=vmbr0,ip=10.0.101.100/24,gw=10.0.101.254,tag=101
```

## Common OCI Images

| Image | Use Case | Notes |
|-------|----------|-------|
| `ollama/ollama` | LLM inference | Needs GPU passthrough for full performance |
| `tensorflow/tensorflow:*-gpu` | ML/AI workloads | Requires CUDA libs |
| `nginx` | Web server | Works out of box |
| `redis` | Cache/queue | Works out of box |
| `postgres` | Database | May need volume mounts |

## Storage and Volumes

### Bind Mounts

Add persistent storage via bind mounts in `/etc/pve/lxc/<CTID>.conf`:

```
mp0: /host/path,mp=/container/path,backup=0
```

Or via pct:

```bash
pct set <CTID> -mp0 /host/data,mp=/data
```

### Rootfs Sizing

OCI images vary in size. TensorFlow GPU is ~3.7GB, Ollama is ~2GB. Size rootfs accordingly:

```bash
--rootfs local-lvm:32  # 32GB
```

## Autostart Configuration

Enable container autostart:

```bash
pct set <CTID> --onboot 1
```

## Troubleshooting

### "proxy loop detected" Error

**Cause**: Hostname case mismatch in API path.

**Fix**: Use exact hostname case from `hostname` command.

### "Invalid argument" on Create

**Cause**: PVE 9.1 bug with privileged OCI containers.

**Fix**: Use `--unprivileged 1`.

### Container Exits Immediately

**Cause**: OCI entrypoint process exits.

**Diagnosis**:
```bash
pct start <CTID> --debug 2>&1 | tail -20
```

**Fix**: Wrap entrypoint in script that keeps process running.

### Missing Tools in Container

OCI application containers are minimal. Tools like `curl`, `vim`, etc. may not exist.

**Workaround**: Execute from host:
```bash
pct exec <CTID> -- <command>
```

## Additional Resources

For known issues and workarounds specific to PVE 9.1:
- **`references/known-issues.md`** - PVE 9.1 OCI bugs and solutions

For GPU-enabled OCI containers, see the **nvidia-gpu-passthrough** skill.
