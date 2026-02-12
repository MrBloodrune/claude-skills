---
name: meshtastic-init
description: >-
  Use when the user asks to "flash meshtastic", "set up t-beam", "init tracker",
  "provision node", "configure meshtastic device", "test mesh connection",
  "check mesh nodes", "verify lora link", or mentions setting up a new LILYGO
  T-Beam Supreme for Meshtastic. Covers firmware flashing, node configuration,
  mesh connectivity testing, and common troubleshooting.
---

# Meshtastic T-Beam Supreme Init & Test

Provisioning workflow for LILYGO T-Beam Supreme (ESP32-S3, SX1262) running Meshtastic firmware. Covers flash, configure, and verify mesh connectivity.

## Prerequisites

### Tools (install via pipx)

```bash
pipx install meshtastic    # CLI for config and monitoring
pipx install esptool       # Firmware flashing
```

### Serial Permissions (Arch/CachyOS)

Serial devices are owned by `uucp` group (not `dialout` like Debian):

```bash
sudo usermod -a -G uucp $USER
# Requires logout/login to take effect
# Temporary fix: sudo chmod 666 /dev/ttyACMx
```

### Identifying Devices

```bash
# List connected T-Beams with MAC-to-port mapping
ls -la /dev/serial/by-id/
# Format: usb-Espressif_Systems_LilyGo_TBeam-S3-Core_<MAC>-if00 -> ../../ttyACMx
```

## Phase 1: Flash Firmware

### Download Latest Firmware

```bash
# Get latest release version
VERSION=$(curl -s https://api.github.com/repos/meshtastic/firmware/releases/latest | grep -oP '"tag_name":\s*"\K[^"]+')

# Download ESP32-S3 firmware bundle
mkdir -p /tmp/meshtastic-fw && cd /tmp/meshtastic-fw
curl -sL -o firmware-esp32s3.zip \
  "https://github.com/meshtastic/firmware/releases/download/${VERSION}/firmware-esp32s3-${VERSION#v}.zip"
unzip -o firmware-esp32s3.zip -d fw
```

### Flash

**IMPORTANT**: Antenna must NOT be connected during flash (no TX occurs). Connect antenna BEFORE enabling region/TX.

```bash
PORT=/dev/ttyACM0  # Adjust per device

# Erase and flash firmware
esptool --port $PORT --baud 921600 --chip esp32s3 erase-flash
esptool --port $PORT --baud 921600 --chip esp32s3 write-flash 0x0 \
  /tmp/meshtastic-fw/fw/firmware-tbeam-s3-core-*.bin
```

The device reboots into Meshtastic automatically. LittleFS partition is created on first boot — no need to flash it separately.

### Verify Flash

```bash
# Wait ~10 seconds for boot, then:
meshtastic --port $PORT --info
# Should show firmwareVersion, hwModel: LILYGO_TBEAM_S3_CORE
```

If `--info` times out, the board may still be booting. Wait 10-15 seconds and retry. The OLED showing a menu confirms Meshtastic is running.

## Phase 2: Configure Node

### Critical: Set Region FIRST and ALONE

Region changes trigger a device reboot. Any other settings in the same command batch will be lost.

```bash
# ALWAYS set region as a standalone command
meshtastic --port $PORT --set lora.region US
# Wait for reboot (~10 seconds)
```

**Verification**: `--get lora.region` may return `0` due to a CLI display bug. Use `--export-config | grep region` to verify the actual stored value.

### Set Identity

```bash
meshtastic --port $PORT --set-owner "NodeName" --set-owner-short "NN"
```

### Configure by Role

#### Tracker Node (GPS dog tracker)

```bash
meshtastic --port $PORT \
  --set device.role TRACKER \
  --set position.gps_update_interval 30 \
  --set position.position_broadcast_secs 60 \
  --set position.position_broadcast_smart_enabled true \
  --set position.broadcast_smart_minimum_distance 10 \
  --set display.screen_on_secs 30 \
  --set network.wifi_enabled false \
  --set power.ls_secs 300
```

#### Base Station (receive-only)

```bash
meshtastic --port $PORT \
  --set device.role CLIENT_MUTE \
  --set network.wifi_enabled false
```

### Export & Verify Full Config

```bash
meshtastic --port $PORT --export-config
```

Check that `region: US` appears in the `lora:` section. If missing, re-apply region and reboot.

## Phase 3: Test Mesh Connectivity

### Verify Both Nodes See Each Other

```bash
# Check node list from either device
meshtastic --port $PORT --nodes
```

Both nodes should appear in each other's node tables. If not:

### Troubleshooting: Nodes Not Discovering

1. **Region mismatch** (most common) — Both nodes MUST have the same `lora.region`. Export config from both and compare. A node with `UNSET` region won't transmit.
2. **Antenna not connected** — LoRa won't receive without an antenna on the SMA port. Don't confuse with GPS IPEX port.
3. **Channel key mismatch** — Compare `channel_url` from `--export-config` on both nodes. Must be identical.
4. **Just flashed** — Nodes may take 1-2 minutes to exchange node info. Send a broadcast to force it:
   ```bash
   meshtastic --port $PORT --sendtext "ping"
   ```
5. **Reboot both** — After config changes, explicit reboot can help:
   ```bash
   meshtastic --port $PORT --reboot
   ```

### Send Test Message

```bash
# Broadcast from node A
meshtastic --port /dev/ttyACM0 --sendtext "hello from tracker"

# Check node B received it (should appear in node list with LastHeard timestamp)
meshtastic --port /dev/ttyACM1 --nodes
```

### Verify GPS Lock

```bash
meshtastic --port $PORT --nodes
# Position columns (Latitude, Longitude) should populate once GPS has a fix
# First fix may take 1-5 minutes outdoors, longer indoors
```

## Known Issues & Gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| `--set lora.region US` succeeds but reads back as `0` | CLI display bug (v2.7.x) | Use `--export-config \| grep region` to verify |
| Settings lost after region change | Region change triggers reboot, dropping batched writes | Always set region alone, then other settings after reboot |
| `Permission denied: /dev/ttyACMx` | User not in `uucp` group | `sudo usermod -a -G uucp $USER` + re-login, or `sudo chmod 666 /dev/ttyACMx` |
| Serial timeout on connect | Board rebooting or port re-enumerated | Wait 10-15s, `sudo chmod 666`, retry |
| Owner name reverts to "Meshtastic xxxx" | Name set in same batch as region (lost on reboot) | Set name after region reboot completes |
| `esptool` can't connect after flash | Board running firmware, not in bootloader | Hold BOOT + press RESET to enter download mode |
| Nodes on same desk can't see each other | Different `lora.region` values | Export config from both, compare region field |
| `Tx air util: 0%` on both nodes | Region UNSET, radio not transmitting | Set region to US (or appropriate) |

## Device Role Reference

| Role | TX | Rebroadcast | GPS | Best For |
|------|-----|------------|-----|----------|
| CLIENT | Yes | Yes | Optional | General use |
| CLIENT_MUTE | Yes | No | Optional | Base station / receive-focused |
| TRACKER | Yes | When awake | Yes | GPS tracking devices |
| ROUTER | Yes | Yes (priority) | No | Infrastructure relay |
| LOST_AND_FOUND | Yes | Yes | Yes | Pet/asset recovery |

## Quick Reference Commands

```bash
# Device info
meshtastic --port $PORT --info

# Node list
meshtastic --port $PORT --nodes

# Export full config
meshtastic --port $PORT --export-config

# Send broadcast
meshtastic --port $PORT --sendtext "message"

# Reboot
meshtastic --port $PORT --reboot

# Factory reset (WARNING: erases all config)
meshtastic --port $PORT --factory-reset
```
