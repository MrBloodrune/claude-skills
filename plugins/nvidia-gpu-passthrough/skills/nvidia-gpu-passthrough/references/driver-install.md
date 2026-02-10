# NVIDIA Driver Installation for Proxmox VE

Detailed guide for installing NVIDIA drivers on Proxmox VE hosts, with special focus on kernel compatibility issues.

## Quick Reference

| PVE Version | Kernel | Recommended Driver Source |
|-------------|--------|---------------------------|
| PVE 8.x | 6.5-6.8 | Debian bookworm non-free |
| PVE 9.0 | 6.11 | Debian trixie non-free |
| PVE 9.1 | 6.17 | Debian trixie-backports |

## PVE 9.1 with Kernel 6.17

Kernel 6.17 introduced breaking changes to the DRM API. The standard NVIDIA 550 driver from trixie repos fails to build due to `drm_helper_mode_fill_fb_struct` signature changes.

### Step 1: Enable Required Repositories

```bash
# Edit sources to add non-free
sed -i 's/main contrib/main contrib non-free non-free-firmware/g' /etc/apt/sources.list.d/debian.sources

# Add trixie-backports
cat >> /etc/apt/sources.list.d/debian.sources << 'EOF'

Types: deb
URIs: http://deb.debian.org/debian/
Suites: trixie-backports
Components: main contrib non-free non-free-firmware
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg
EOF
```

### Step 2: Install Kernel Headers

```bash
apt update
apt install proxmox-headers-$(uname -r)
```

### Step 3: Blacklist Nouveau

```bash
echo "blacklist nouveau" > /etc/modprobe.d/blacklist-nouveau.conf
echo "options nouveau modeset=0" >> /etc/modprobe.d/blacklist-nouveau.conf
update-initramfs -u
```

### Step 4: Install NVIDIA Driver from Backports

```bash
apt install -t trixie-backports nvidia-driver
```

This installs the patched driver (550.163.01-4~bpo13+1 or later) that works with kernel 6.17.

### Step 5: Reboot and Verify

```bash
reboot

# After reboot
nvidia-smi
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

## Alternative: Downgrade to Kernel 6.14

If backports don't have a compatible driver, downgrade the kernel:

```bash
# Install older kernel
apt install proxmox-kernel-6.14

# Pin to older kernel
proxmox-boot-tool kernel pin 6.14

# Reboot
reboot
```

Then install standard driver:

```bash
apt install nvidia-driver
```

## PVE 9.0 (Kernel 6.11)

Standard installation works:

```bash
# Enable non-free
sed -i 's/main contrib/main contrib non-free non-free-firmware/g' /etc/apt/sources.list.d/debian.sources

apt update
apt install proxmox-headers-$(uname -r)
apt install nvidia-driver
reboot
```

## PVE 8.x (Kernel 6.5-6.8)

Use bookworm repositories:

```bash
# Add non-free to sources.list
echo "deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware" >> /etc/apt/sources.list

apt update
apt install proxmox-headers-$(uname -r)
apt install nvidia-driver
reboot
```

## Troubleshooting

### DKMS Build Fails

**Error**: `drm_helper_mode_fill_fb_struct` or similar DRM API errors

**Cause**: Driver version incompatible with kernel

**Solutions**:
1. Use trixie-backports: `apt install -t trixie-backports nvidia-kernel-dkms`
2. Downgrade kernel: `apt install proxmox-kernel-6.14`

### nvidia-smi: command not found

**Cause**: Driver not installed or PATH issue

**Fix**:
```bash
# Check if driver is installed
dpkg -l | grep nvidia-driver

# Reinstall if needed
apt install --reinstall nvidia-driver
```

### Module Not Loading

**Cause**: Secure boot or module blacklist

**Fix**:
```bash
# Check if nouveau is still loaded
lsmod | grep nouveau

# Force reload
modprobe nvidia
```

### nvidia-smi Shows No Devices

**Cause**: GPU not detected or power management issue

**Fix**:
```bash
# Check PCI device
lspci | grep -i nvidia

# Check dmesg for errors
dmesg | grep -i nvidia
```

## Post-Installation: Container Support

After driver installation, create the nvidia-container helper directory:

```bash
mkdir -p /opt/nvidia-container
cp /usr/bin/nvidia-smi /opt/nvidia-container/
```

This allows containers to access nvidia-smi via bind mount without needing the full binary in each container.

## Verifying Driver Modules

Check all NVIDIA modules are loaded:

```bash
lsmod | grep nvidia
```

Expected output:
```
nvidia_uvm           1511424  0
nvidia_drm             94208  0
nvidia_modeset       1363968  1 nvidia_drm
nvidia              54411264  2 nvidia_uvm,nvidia_modeset
```

## Checking CUDA Compatibility

The driver includes CUDA runtime. Check version:

```bash
nvidia-smi | grep "CUDA Version"
```

For applications requiring specific CUDA toolkit versions, the containerized application should bundle its own CUDA runtime.
