# Proxmox VE 9.1 OCI Known Issues

This document tracks known issues with OCI container support in Proxmox VE 9.1 and their workarounds.

## Critical Issues

### 1. Privileged OCI Containers Fail

**Status**: Confirmed bug in PVE 9.1.x

**Symptom**:
```
Detected OCI archive
unable to create CT <CTID> - Invalid argument
```

**Cause**: The `--unprivileged 0` flag causes container creation to fail with OCI templates.

**Workaround**: Always use unprivileged mode:
```bash
pct create <CTID> local:vztmpl/image.tar --unprivileged 1
```

**Impact**: GPU passthrough requires additional configuration for unprivileged containers.

**Reference**: https://forum.proxmox.com/threads/proxmox-virtual-environment-9-1-available.176255/page-2

---

### 2. pvesh Hostname Case Sensitivity

**Status**: By design (not a bug)

**Symptom**:
```
proxy handler failed: proxy loop detected - aborting
```

**Cause**: The API path `/nodes/<hostname>/` must match the exact case of the system hostname.

**Diagnosis**:
```bash
hostname  # Check exact case
# If output is "PV01", use /nodes/PV01/ not /nodes/pv01/
```

**Workaround**: Always verify hostname case before API calls:
```bash
HOSTNAME=$(hostname)
pvesh create /nodes/$HOSTNAME/storage/local/oci-registry-pull --reference docker.io/image:tag
```

---

### 3. pvesh SSH Host Key Verification

**Status**: Configuration issue after reboot

**Symptom**:
```
proxy handler failed: Host key verification failed.
```

**Cause**: After host reboot, internal SSH keys may need regeneration.

**Workaround**:
```bash
# Regenerate cluster certificates
pvecm updatecerts --force

# Add localhost to known_hosts
ssh-keyscan -t ed25519,rsa,ecdsa localhost >> /root/.ssh/known_hosts
ssh-keyscan -t ed25519,rsa,ecdsa $(hostname) >> /root/.ssh/known_hosts
```

---

## Moderate Issues

### 4. Application Container Entrypoint Exits

**Status**: Expected behavior (not a bug)

**Symptom**: Container starts then immediately stops.

**Cause**: OCI application containers run a single process. When it exits, the container stops.

**Diagnosis**:
```bash
pct start <CTID> --debug 2>&1 | tail -20
# Look for: "Exec'ing" and "signal_handler" lines
```

**Workaround**: Create wrapper script for services that need initialization:
```bash
# Create /start.sh in container
#!/bin/sh
export LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu
exec /bin/service-binary serve

# Update entrypoint in config
# entrypoint: /start.sh
```

---

### 5. Missing NVIDIA Libraries in OCI Containers

**Status**: Expected (OCI expects nvidia-container-runtime)

**Symptom**: nvidia-smi works but applications can't find CUDA libraries.

**Cause**: OCI images expect nvidia-container-toolkit to inject libraries at runtime. LXC doesn't have this.

**Workaround**: Bind mount host libraries:
```
# In /etc/pve/lxc/<CTID>.conf
lxc.mount.entry: /usr/lib/x86_64-linux-gnu usr/lib/x86_64-linux-gnu none bind,optional,create=dir,ro
lxc.mount.entry: /etc/alternatives etc/alternatives none bind,optional,create=dir,ro
```

See **nvidia-gpu-passthrough** skill for complete GPU configuration.

---

## Minor Issues

### 6. OCI Environment Variables Post-Creation Only

**Status**: PVE 9.1 limitation

**Symptom**: Cannot set environment variables during `pct create`.

**Cause**: Environment variables from OCI images are added automatically, but custom variables must be added after creation.

**Workaround**: Use `pct set` after creation:
```bash
pct set <CTID> --lxc.environment.MY_VAR value
```

Or edit config directly in `/etc/pve/lxc/<CTID>.conf`.

---

### 7. No OCI Image Updates

**Status**: Technology preview limitation

**Symptom**: Cannot update container by pulling new image version.

**Cause**: OCI layers are squashed into rootfs on creation.

**Workaround**:
1. Pull new image version
2. Create new container with persistent data on bind mounts
3. Migrate data and destroy old container

---

### 8. Console Limited in Application Containers

**Status**: Expected behavior

**Symptom**: Console shows only application output, no shell.

**Cause**: Application containers run single process, no init system.

**Workaround**: Use `pct exec` for shell access:
```bash
pct exec <CTID> -- /bin/sh
# or
pct exec <CTID> -- /bin/bash
```

---

## Version-Specific Notes

### PVE 9.1.0 - 9.1.4

All issues above apply.

### Future Versions

Monitor Proxmox release notes for fixes:
- https://pve.proxmox.com/wiki/Roadmap
- https://forum.proxmox.com/forums/proxmox-virtual-environment.1/

---

## Reporting New Issues

When reporting OCI-related issues to Proxmox:

1. Include PVE version: `pveversion -v`
2. Include kernel version: `uname -r`
3. Include exact command that failed
4. Include full error output
5. Check forum for existing reports first
