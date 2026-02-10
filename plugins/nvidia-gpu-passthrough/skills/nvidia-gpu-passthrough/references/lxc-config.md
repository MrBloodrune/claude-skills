# LXC Configuration Templates for GPU Passthrough

Complete configuration examples for various GPU workloads in Proxmox LXC containers.

## Base GPU Configuration Block

Add this block to any LXC container config at `/etc/pve/lxc/<CTID>.conf`:

```
# NVIDIA GPU Passthrough - Required
lxc.cgroup2.devices.allow: c 195:* rwm
lxc.cgroup2.devices.allow: c 506:* rwm
lxc.mount.entry: /dev/nvidia0 dev/nvidia0 none bind,optional,create=file
lxc.mount.entry: /dev/nvidiactl dev/nvidiactl none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-uvm dev/nvidia-uvm none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-uvm-tools dev/nvidia-uvm-tools none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-modeset dev/nvidia-modeset none bind,optional,create=file

# Library Bind Mounts - Required for CUDA
lxc.mount.entry: /usr/lib/x86_64-linux-gnu usr/lib/x86_64-linux-gnu none bind,optional,create=dir,ro
lxc.mount.entry: /usr/lib/x86_64-linux-gnu/nvidia usr/lib/x86_64-linux-gnu/nvidia none bind,optional,create=dir,ro
lxc.mount.entry: /etc/alternatives etc/alternatives none bind,optional,create=dir,ro

# Optional: nvidia-smi access
lxc.mount.entry: /opt/nvidia-container opt/nvidia-container none bind,optional,create=dir

# Environment (required for OCI containers)
lxc.environment.runtime: HOME=/root
lxc.environment.runtime: NVIDIA_VISIBLE_DEVICES=all
```

## Ollama Container (LLM Inference)

Full config for running Ollama with GPU acceleration:

```
arch: amd64
cmode: console
cores: 8
entrypoint: /start.sh
features: nesting=1
hostname: ollama
memory: 16384
net0: name=eth0,bridge=vmbr0,gw=10.0.99.254,ip=10.0.99.230/24,type=veth
ostype: ubuntu
rootfs: local-lvm:vm-220-disk-0,size=32G
swap: 512
unprivileged: 1

# Environment
lxc.environment.runtime: PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
lxc.environment.runtime: NVIDIA_VISIBLE_DEVICES=all
lxc.environment.runtime: OLLAMA_HOST=0.0.0.0:11434
lxc.signal.halt: SIGTERM

# NVIDIA GPU Passthrough
lxc.cgroup2.devices.allow: c 195:* rwm
lxc.cgroup2.devices.allow: c 506:* rwm
lxc.mount.entry: /dev/nvidia0 dev/nvidia0 none bind,optional,create=file
lxc.mount.entry: /dev/nvidiactl dev/nvidiactl none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-uvm dev/nvidia-uvm none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-uvm-tools dev/nvidia-uvm-tools none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-modeset dev/nvidia-modeset none bind,optional,create=file
lxc.mount.entry: /usr/lib/x86_64-linux-gnu usr/lib/x86_64-linux-gnu none bind,optional,create=dir,ro
lxc.mount.entry: /usr/lib/x86_64-linux-gnu/nvidia usr/lib/x86_64-linux-gnu/nvidia none bind,optional,create=dir,ro
lxc.mount.entry: /etc/alternatives etc/alternatives none bind,optional,create=dir,ro
lxc.mount.entry: /opt/nvidia-container opt/nvidia-container none bind,optional,create=dir

# Environment (required - HOME must be set for ollama)
lxc.environment.runtime: HOME=/root
```

### Wrapper Script for Ollama

Create `/start.sh` in the container:

```bash
#!/bin/bash
export HOME=/root
export LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu:/usr/lib/x86_64-linux-gnu/nvidia/current

# Wait for devices to be ready
sleep 2

# Run ollama in foreground with restart loop
while true; do
    /bin/ollama serve 2>&1 | tee -a /var/log/ollama.log
    echo "Ollama exited, restarting in 5 seconds..."
    sleep 5
done
```

## TensorFlow/PyTorch Container (ML Training)

Config optimized for machine learning workloads:

```
arch: amd64
cmode: console
cores: 16
features: nesting=1
hostname: ml-workstation
memory: 32768
net0: name=eth0,bridge=vmbr0,gw=10.0.99.254,ip=10.0.99.231/24,type=veth
ostype: ubuntu
rootfs: local-lvm:vm-221-disk-0,size=64G
swap: 8192
unprivileged: 1

# Environment
lxc.environment.runtime: PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
lxc.environment.runtime: NVIDIA_VISIBLE_DEVICES=all
lxc.environment.runtime: CUDA_VISIBLE_DEVICES=0
lxc.signal.halt: SIGTERM

# NVIDIA GPU Passthrough
lxc.cgroup2.devices.allow: c 195:* rwm
lxc.cgroup2.devices.allow: c 506:* rwm
lxc.mount.entry: /dev/nvidia0 dev/nvidia0 none bind,optional,create=file
lxc.mount.entry: /dev/nvidiactl dev/nvidiactl none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-uvm dev/nvidia-uvm none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-uvm-tools dev/nvidia-uvm-tools none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-modeset dev/nvidia-modeset none bind,optional,create=file
lxc.mount.entry: /usr/lib/x86_64-linux-gnu usr/lib/x86_64-linux-gnu none bind,optional,create=dir,ro
lxc.mount.entry: /usr/lib/x86_64-linux-gnu/nvidia usr/lib/x86_64-linux-gnu/nvidia none bind,optional,create=dir,ro
lxc.mount.entry: /etc/alternatives etc/alternatives none bind,optional,create=dir,ro
lxc.mount.entry: /opt/nvidia-container opt/nvidia-container none bind,optional,create=dir

# Environment
lxc.environment.runtime: HOME=/root

# Data mount for datasets/models
mp0: /mnt/datasets,mp=/data,backup=0
```

**Note**: TensorFlow OCI images require matching CUDA versions. TensorFlow 2.20+ requires CUDA 12.5+. Check `tf.sysconfig.get_build_info()` to verify CUDA compatibility.

## Jellyfin/Plex (Hardware Transcoding)

Config for media transcoding with NVENC/NVDEC:

```
arch: amd64
cores: 4
features: nesting=1
hostname: jellyfin
memory: 8192
net0: name=eth0,bridge=vmbr0,gw=10.0.99.254,ip=10.0.99.232/24,type=veth
ostype: debian
rootfs: local-lvm:vm-222-disk-0,size=16G
swap: 1024
unprivileged: 1

# NVIDIA GPU Passthrough
lxc.cgroup2.devices.allow: c 195:* rwm
lxc.cgroup2.devices.allow: c 506:* rwm
lxc.mount.entry: /dev/nvidia0 dev/nvidia0 none bind,optional,create=file
lxc.mount.entry: /dev/nvidiactl dev/nvidiactl none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-uvm dev/nvidia-uvm none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-uvm-tools dev/nvidia-uvm-tools none bind,optional,create=file
lxc.mount.entry: /dev/nvidia-modeset dev/nvidia-modeset none bind,optional,create=file
lxc.mount.entry: /usr/lib/x86_64-linux-gnu usr/lib/x86_64-linux-gnu none bind,optional,create=dir,ro
lxc.mount.entry: /usr/lib/x86_64-linux-gnu/nvidia usr/lib/x86_64-linux-gnu/nvidia none bind,optional,create=dir,ro
lxc.mount.entry: /etc/alternatives etc/alternatives none bind,optional,create=dir,ro

# Media library mount
mp0: /mnt/media,mp=/media,backup=0,ro=1
```

## Multi-GPU Configuration

For hosts with multiple GPUs, add each device:

```
# GPU 0
lxc.mount.entry: /dev/nvidia0 dev/nvidia0 none bind,optional,create=file

# GPU 1
lxc.mount.entry: /dev/nvidia1 dev/nvidia1 none bind,optional,create=file

# Limit to specific GPU via environment
lxc.environment.runtime: CUDA_VISIBLE_DEVICES=0
```

## cgroup Device Numbers Reference

| Device | Major | Minor | Purpose |
|--------|-------|-------|---------|
| `/dev/nvidia0` | 195 | 0 | First GPU |
| `/dev/nvidia1` | 195 | 1 | Second GPU |
| `/dev/nvidiactl` | 195 | 255 | Control device |
| `/dev/nvidia-modeset` | 195 | 254 | Modesetting |
| `/dev/nvidia-uvm` | 506 | 0 | Unified memory |
| `/dev/nvidia-uvm-tools` | 506 | 1 | UVM tools |

Verify device numbers on your system:

```bash
ls -la /dev/nvidia*
```
