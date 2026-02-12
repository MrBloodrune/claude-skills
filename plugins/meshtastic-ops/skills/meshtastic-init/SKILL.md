---
name: meshtastic-init
description: >-
  Use when the user asks to "flash meshtastic", "set up t-beam", "init tracker",
  "provision node", "configure meshtastic device", "test mesh connection",
  "check mesh nodes", "verify lora link", "rebuild firmware", or mentions setting
  up a new LILYGO T-Beam Supreme for Meshtastic. Covers custom firmware building,
  flashing, node configuration, mesh connectivity testing, and troubleshooting.
---

# Meshtastic T-Beam Supreme — Provisioning & Configuration

Complete workflow for LILYGO T-Beam Supreme (ESP32-S3, SX1262) running custom DogTrackerModule firmware.

## Prerequisites

### Tools (install via pipx)

```bash
pipx install meshtastic    # CLI for config and monitoring (v2.7.7)
pipx install esptool       # Firmware flashing
pipx install platformio    # Building custom firmware
```

### Serial Permissions (Arch/CachyOS)

Udev rule at `/etc/udev/rules.d/99-meshtastic.rules` sets `MODE=0660 GROUP=uucp`. User must be in the `uucp` group:

```bash
sudo usermod -a -G uucp $USER  # Requires logout/login to take effect
```

No `chmod` needed after reboots — udev handles permissions automatically.

### Udev Symlinks

Stable device paths via `/etc/udev/rules.d/99-meshtastic.rules`:

- Dog1: `/dev/meshtastic-dog1` (USB serial 48CA435AE484)
- Base: `/dev/meshtastic-base` (USB serial 48CA435AC98C)

**Always use symlinks, not raw `/dev/ttyACMx`** — ACM numbers can swap on reboot.

## Phase 1: Build Custom Firmware

The project uses a Meshtastic v2.7.15 fork with DogTrackerModule at `meshtastic-firmware/` (branch `dog-tracker`).

```bash
cd /data/dev/projects/esp32/dog/meshtastic-firmware
pio run -e tbeam-s3-core
# Output: .pio/build/tbeam-s3-core/firmware.factory.bin
```

## Phase 2: Flash Firmware

### T-Beam Supreme Bootloader Entry (MANUAL — no auto-reset exists)

The ESP32-S3 USB-CDC does NOT support RTS/DTR signaling. PlatformIO upload, `esptool --before default-reset`, and 1200bps touch ALL fail.

**Physical buttons on the T-Beam Supreme**: PWR, RST, BOOT (GPIO0).

1. **Hold BOOT** button
2. **Press RST** while holding BOOT
3. **Release RST**, then **release BOOT**
4. Verify: `lsusb` shows `"Espressif USB JTAG/serial debug unit"` (not `"LilyGo TBeam-S3-Core"`)

### Flash

Udev symlinks disappear in bootloader mode (USB identity changes). Use raw `/dev/ttyACMx`:

```bash
esptool --port /dev/ttyACMx --baud 921600 --chip esp32s3 --before no-reset \
  write-flash 0x0 /data/dev/projects/esp32/dog/meshtastic-firmware/.pio/build/tbeam-s3-core/firmware.factory.bin
```

**CRITICAL**:

- Use `firmware.factory.bin` (NOT `firmware.bin`) — factory image includes bootloader + partition table
- Use `--before no-reset` — ESP32-S3 USB-CDC cannot do auto-reset
- **NEVER** use `erase-flash` unless you want to wipe all config (channels, WiFi, MQTT, role are stored in NVS and survive normal flashing)

### Boot

Press **RST** manually after flash. Esptool prints "Hard resetting via RTS pin..." but this does NOT actually reset the ESP32-S3 over USB-CDC.

### Verify

```bash
# Wait ~10s for boot
meshtastic --port /dev/meshtastic-dog1 --info
# Check firmwareVersion field
```

NVS config survives flashing — no reconfiguration needed after firmware update.

## Phase 3: Configure Node

### CRITICAL: Config Module Separation

**Each config module MUST be a separate `meshtastic` command.** Mixing modules in one command causes earlier modules to be clobbered when the device reboots mid-write.

Within a single module, chaining multiple `--set` flags IS safe.

After EVERY config command: `sleep 15`

### Dog1 (Tracker) Configuration

```bash
PORT=/dev/meshtastic-dog1

# 1. Channel config
meshtastic --port $PORT --ch-set module_settings.position_precision 32 --ch-index 0
sleep 15

# 2. Device config
meshtastic --port $PORT --set device.role TRACKER
sleep 15

# 3. Position config (all position.* flags safe together)
meshtastic --port $PORT \
  --set position.gps_update_interval 30 \
  --set position.position_broadcast_secs 60 \
  --set position.position_broadcast_smart_enabled true \
  --set position.broadcast_smart_minimum_distance 10 \
  --set position.broadcast_smart_minimum_interval_secs 15
sleep 15

# 4. Display config
meshtastic --port $PORT --set display.screen_on_secs 600
sleep 15

# 5. Network config
meshtastic --port $PORT --set network.wifi_enabled false
sleep 15

# 6. Telemetry config (device_telemetry_enabled MUST be explicitly set — defaults to false!)
meshtastic --port $PORT --set telemetry.device_telemetry_enabled true --set telemetry.device_update_interval 900
sleep 15

# 7. Verify
meshtastic --port $PORT --get device.role --get position --get telemetry
meshtastic --port $PORT --info 2>&1 | grep -E 'deviceTelemetryEnabled|positionPrecision'
```

### Base Station Configuration

```bash
PORT=/dev/meshtastic-base

# 1. Channel config (two separate --ch-set commands, each triggers reboot)
meshtastic --port $PORT --ch-set uplink_enabled true --ch-index 0
sleep 15

meshtastic --port $PORT --ch-set module_settings.position_precision 32 --ch-index 0
sleep 15

# 2. Device config
meshtastic --port $PORT --set device.role CLIENT_MUTE
sleep 15

# 3. Display config
meshtastic --port $PORT --set display.screen_on_secs 600
sleep 15

# 4. Network config (wifi_enabled LAST in flag order per GitHub #8729)
meshtastic --port $PORT \
  --set network.wifi_ssid "LAN Before Time" \
  --set network.wifi_psk "ACTUAL_PASSWORD" \
  --set network.wifi_enabled true
sleep 15

# 5. Telemetry config
meshtastic --port $PORT \
  --set telemetry.device_telemetry_enabled true \
  --set telemetry.device_update_interval 60 \
  --set telemetry.environment_update_interval 60 \
  --set telemetry.power_measurement_enabled true \
  --set telemetry.power_update_interval 60
sleep 15

# 6. MQTT config (LAST — least likely to be clobbered)
meshtastic --port $PORT \
  --set mqtt.enabled true \
  --set mqtt.address 10.0.99.34 \
  --set mqtt.username doio \
  --set mqtt.password doio2025 \
  --set mqtt.json_enabled true \
  --set mqtt.root msh \
  --set mqtt.encryption_enabled false
sleep 15

# 7. Verify all modules persisted
meshtastic --port $PORT --get network --get mqtt --get device.role --get telemetry
meshtastic --port $PORT --info 2>&1 | grep -E 'wifiEnabled|mqttEnabled|deviceTelemetryEnabled|positionPrecision'
```

### Setting Channel Encryption (both nodes)

To set up shared AES256 encrypted channel:

```bash
# On one node: generate random PSK
meshtastic --port /dev/meshtastic-base --ch-set psk random --ch-index 0
sleep 15

# Export the channel URL
meshtastic --port /dev/meshtastic-base --export-config | grep channel_url

# Apply to other node via --seturl
# WARNING: --seturl overwrites ALL channel config AND device role!
meshtastic --port /dev/meshtastic-dog1 --seturl "https://meshtastic.org/e/#..."
sleep 15

# Re-apply device role (--seturl clobbered it!)
meshtastic --port /dev/meshtastic-dog1 --set device.role TRACKER
sleep 15
```

## Phase 4: Verify

### Mesh Connectivity

```bash
# Both nodes should see each other
meshtastic --port /dev/meshtastic-dog1 --nodes
meshtastic --port /dev/meshtastic-base --nodes

# Send test message
meshtastic --port /dev/meshtastic-dog1 --sendtext "ping from dog1"
```

### Telemetry Pipeline

```bash
# 1. MQTT messages flowing?
mosquitto_sub -h 10.0.99.34 -u doio -P doio2025 -t 'msh/#' -v -C 5 -W 30

# 2. Exporter healthy?
systemctl --user status meshtastic-exporter
curl -s http://localhost:9641/metrics | grep -E '^meshtastic_'

# 3. Mimir receiving?
curl -s -H 'X-Scope-OrgID: anonymous' \
  'http://10.0.99.203:9009/prometheus/api/v1/query?query=meshtastic_position_latitude'

# 4. Grafana dashboard
# http://10.0.99.205:3000/d/meshtastic-dog-tracker
```

## Known Issues & Pitfalls

| Issue | Cause | Fix |
|-------|-------|-----|
| Config lost after setting | Mixed config modules in one command | Each module in SEPARATE command with `sleep 15` between |
| Serial timeout on connect | Board rebooting or port locked | Wait 15s, retry. Ensure nothing else holds the port. |
| WiFi won't connect (reason 201) | SSID case mismatch or 5GHz network | SSIDs are CASE SENSITIVE: "LAN Before Time" not "Lan Before Time". Must be 2.4GHz. |
| Telemetry not sending despite interval set | `device_telemetry_enabled` defaults to false | Must explicitly `--set telemetry.device_telemetry_enabled true` |
| `--get telemetry` looks empty | Defaults hidden in `--get` output | Use `--info 2>&1 \| grep deviceTelemetry` to see actual state |
| Position shows ~2.4km grid cells | `position_precision` at default 13 | `--ch-set module_settings.position_precision 32 --ch-index 0` (needs `module_settings.` prefix!) |
| `--seturl` broke device role | `--seturl` overwrites channel config AND device role | Re-apply `--set device.role` after every `--seturl` |
| esptool can't connect | Device running firmware, not in bootloader | Hold BOOT, press RST, release RST, release BOOT |
| esptool "Hard resetting" but device doesn't boot | ESP32-S3 USB-CDC doesn't support RTS reset | Press RST button manually |
| Flashed firmware.bin, stuck in bootloader | firmware.bin lacks bootloader + partition table | Use `firmware.factory.bin`, re-flash at offset 0x0 |
| Udev symlinks missing during flash | Bootloader has different USB identity | Use raw `/dev/ttyACMx` for flashing; symlinks return after RST + boot |
| `--ch-set position_precision 32` fails silently | Missing `module_settings.` prefix | Use `--ch-set module_settings.position_precision 32 --ch-index 0` |

## Quick Reference

```bash
# Device info & running state
meshtastic --port $PORT --info

# Node list (mesh peers)
meshtastic --port $PORT --nodes

# Export full config
meshtastic --port $PORT --export-config

# Read NVS-saved config (hides defaults!)
meshtastic --port $PORT --get network --get mqtt --get telemetry

# Diagnostic grep (shows running state including defaults)
meshtastic --port $PORT --info 2>&1 | grep -E 'pattern'

# Send message / request telemetry
meshtastic --port $PORT --sendtext "message"
meshtastic --port $PORT --request-telemetry --dest '!435ae484'

# Toggle base GPS
meshtastic --port /dev/meshtastic-base --set position.gps_mode DISABLED
meshtastic --port /dev/meshtastic-base --set position.gps_mode ENABLED

# Rebuild & restart exporter
podman build -t meshtastic-exporter:latest /data/dev/projects/esp32/dog/meshtastic-exporter/
systemctl --user restart meshtastic-exporter

# Check MQTT
mosquitto_sub -h 10.0.99.34 -u doio -P doio2025 -t 'msh/#' -v -C 5 -W 30

# Reboot node
meshtastic --port $PORT --reboot
```

## DogTrackerModule Commands

Send as directed text messages to the tracker node from the base:

```bash
meshtastic --port /dev/meshtastic-base --sendtext "PROFILE Track" --dest '!435ae484'
meshtastic --port /dev/meshtastic-base --sendtext "STATUS" --dest '!435ae484'
meshtastic --port /dev/meshtastic-base --sendtext "FENCE HERE" --dest '!435ae484'
meshtastic --port /dev/meshtastic-base --sendtext "LOG FLUSH" --dest '!435ae484'
```
