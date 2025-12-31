---
name: NVIDIA GPU Passthrough for LXC
description: This skill should be used when the user asks to "pass GPU to container", "NVIDIA in LXC", "nvidia-smi in container", "GPU passthrough Proxmox", "CUDA in LXC", "run Ollama with GPU", "TensorFlow GPU container", or mentions configuring NVIDIA GPU access for Proxmox LXC containers. Provides complete GPU passthrough configuration for unprivileged containers.
---

# NVIDIA GPU Passthrough for LXC Containers

Configure NVIDIA GPU access in Proxmox LXC containers for AI/ML workloads, transcoding, and CUDA applications.

## Overview

GPU passthrough in LXC shares the host's GPU with containers, unlike VM passthrough which dedicates the entire device. This enables multiple containers to use the same GPU while maintaining near-native performance.

## Prerequisites

- Proxmox VE with NVIDIA GPU
- NVIDIA driver installed on host
- Container created as unprivileged (`--unprivileged 1`)

## Host Setup

### 1. Install NVIDIA Driver

For PVE 9.1 with kernel 6.17+, use trixie-backports for compatible drivers:

```bash
# Add non-free and backports
sed -i 's/main contrib/main contrib non-free non-free-firmware/g' /etc/apt/sources.list.d/debian.sources

# Add backports
cat >> /etc/apt/sources.list.d/debian.sources << EOF

Types: deb
URIs: http://deb.debian.org/debian/
Suites: trixie-backports
Components: main contrib non-free non-free-firmware
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg
EOF

# Install kernel headers and driver
apt update
apt install proxmox-headers-$(uname -r)
apt install -t trixie-backports nvidia-driver
```

### 2. Blacklist Nouveau

```bash
echo "blacklist nouveau" > /etc/modprobe.d/blacklist-nouveau.conf
echo "options nouveau modeset=0" >> /etc/modprobe.d/blacklist-nouveau.conf
update-initramfs -u
reboot
```

### 3. Verify Driver

```bash
nvidia-smi
# Should show GPU info with driver version
```

## Container Configuration

### Required Device Nodes

Add these to `/etc/pve/lxc/<CTID>.conf`:

```
# NVIDIA GPU Passthrough
lxc.cgroup2.devices.allow: c 195:* rwm
lxc.cgroup2.devices.allow: c 506:* rwm
lxc.mount.entry: /dev/nvidia0 dev/nvidia0 none bind,optional,create=file
lxc.mount.entry: /dev/nvidiactl dev/nvidiactl none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-uvm dev/nvidia-uvm none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-uvm-tools dev/nvidia-uvm-tools none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-modeset dev/nvidia-modeset none bind,optional,create=file
```

### Device Node Reference

| Device | Major:Minor | Purpose |
|--------|-------------|---------|
| `/dev/nvidia0` | 195:0 | GPU device |
| `/dev/nvidiactl` | 195:255 | Control device |
| `/dev/nvidia-modeset` | 195:254 | Modesetting |
| `/dev/nvidia-uvm` | 506:0 | Unified memory |
| `/dev/nvidia-uvm-tools` | 506:1 | UVM tools |

### Multiple GPUs

For systems with multiple GPUs, add each device:

```
lxc.mount.entry: /dev/nvidia0 dev/nvidia0 none bind,optional,create=file
lxc.mount.entry: /dev/nvidia1 dev/nvidia1 none bind,optional,create=file
```

## Library Bind Mounts

OCI containers need host NVIDIA libraries. The Debian alternatives system requires mounting both lib and alternatives directories:

```
lxc.mount.entry: /usr/lib/x86_64-linux-gnu usr/lib/x86_64-linux-gnu none bind,optional,create=dir,ro
lxc.mount.entry: /etc/alternatives etc/alternatives none bind,optional,create=dir,ro
```

**Why both?** Debian NVIDIA packages use symlinks through `/etc/alternatives`. Without it, library symlinks break inside the container.

### Optional: nvidia-smi Access

Create a helper directory on the host:

```bash
mkdir -p /opt/nvidia-container
cp /usr/bin/nvidia-smi /opt/nvidia-container/
```

Add to container config:
```
lxc.mount.entry: /opt/nvidia-container opt/nvidia-container none bind,optional,create=dir
```

Access in container:
```bash
/opt/nvidia-container/nvidia-smi
```

## Complete LXC Config Example

For an Ollama container with GPU:

```
arch: amd64
cores: 8
memory: 16384
hostname: ollama
net0: name=eth0,bridge=vmbr0,ip=10.0.99.230/24,gw=10.0.99.254,type=veth
ostype: ubuntu
rootfs: local-lvm:vm-220-disk-0,size=32G
swap: 4096
unprivileged: 1
features: nesting=1
entrypoint: /start.sh

# NVIDIA GPU Passthrough
lxc.cgroup2.devices.allow: c 195:* rwm
lxc.cgroup2.devices.allow: c 506:* rwm
lxc.mount.entry: /dev/nvidia0 dev/nvidia0 none bind,optional,create=file
lxc.mount.entry: /dev/nvidiactl dev/nvidiactl none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-uvm dev/nvidia-uvm none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-uvm-tools dev/nvidia-uvm-tools none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-modeset dev/nvidia-modeset none bind,optional,create=file
lxc.mount.entry: /usr/lib/x86_64-linux-gnu usr/lib/x86_64-linux-gnu none bind,optional,create=dir,ro
lxc.mount.entry: /etc/alternatives etc/alternatives none bind,optional,create=dir,ro
lxc.mount.entry: /opt/nvidia-container opt/nvidia-container none bind,optional,create=dir
```

## Verification

### Test nvidia-smi

```bash
pct exec <CTID> -- /opt/nvidia-container/nvidia-smi
```

Expected output:
```
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 550.163.01             Driver Version: 550.163.01     CUDA Version: 12.4     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
|   0  NVIDIA RTX A5500 Laptop GPU    On  |   00000000:01:00.0 Off |                  Off |
+-----------------------------------------+------------------------+----------------------+
```

### Test CUDA (Ollama)

```bash
pct exec <CTID> -- ollama list
# Check logs for GPU detection:
# "inference compute" id=GPU-xxx library=CUDA
```

### Test CUDA (TensorFlow)

```bash
pct exec <CTID> -- python3 -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"
```

## Troubleshooting

### "No such file or directory" for /dev/nvidia*

**Cause**: NVIDIA driver not loaded on host.

**Fix**: Verify driver on host:
```bash
nvidia-smi  # On host
lsmod | grep nvidia
```

### nvidia-smi Works but Application Can't Find GPU

**Cause**: Missing library bind mounts.

**Fix**: Ensure both library directories are mounted:
```
lxc.mount.entry: /usr/lib/x86_64-linux-gnu usr/lib/x86_64-linux-gnu none bind,optional,create=dir,ro
lxc.mount.entry: /etc/alternatives etc/alternatives none bind,optional,create=dir,ro
```

### "Permission denied" on Device Access

**Cause**: cgroup device allow rules missing.

**Fix**: Verify cgroup rules in config:
```
lxc.cgroup2.devices.allow: c 195:* rwm
lxc.cgroup2.devices.allow: c 506:* rwm
```

### DKMS Build Fails on Kernel 6.17

**Cause**: NVIDIA 550 driver incompatible with kernel 6.17 DRM API.

**Fix**: Use trixie-backports which has patched driver:
```bash
apt install -t trixie-backports nvidia-kernel-dkms
```

Or downgrade to kernel 6.14:
```bash
apt install proxmox-kernel-6.14
proxmox-boot-tool kernel pin 6.14
```

## Additional Resources

For complete LXC configuration examples:
- **`references/lxc-config.md`** - Full config templates for various GPU workloads
- **`references/driver-install.md`** - Detailed driver installation steps

For OCI container creation, see the **proxmox-oci** skill.
