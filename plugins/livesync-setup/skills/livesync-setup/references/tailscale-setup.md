# Tailscale Setup for CouchDB

## Overview

Tailscale provides secure VPN access to CouchDB without exposing it to the public internet. Useful for internal-only access or as an alternative to public DNS.

## Container Configuration

Unprivileged LXC containers need TUN device access for Tailscale.

### Add to Container Config

```bash
# /etc/pve/lxc/222.conf
lxc.cgroup2.devices.allow: c 10:200 rwm
lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file
```

Restart container after adding.

## Installation

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start and authenticate
tailscale up

# Follow the auth URL printed to authenticate
```

## Generate Certificates

For HTTPS via Tailscale:

```bash
# Generate certificates for Tailscale domain
tailscale cert noted-couchdb.tail1c7c0c.ts.net

# Certificates created at:
# - noted-couchdb.tail1c7c0c.ts.net.crt
# - noted-couchdb.tail1c7c0c.ts.net.key
```

## Caddy Configuration (Internal)

If running Caddy locally on the CouchDB container:

```caddyfile
noted-couchdb.tail1c7c0c.ts.net {
    tls /etc/caddy/noted-couchdb.tail1c7c0c.ts.net.crt /etc/caddy/noted-couchdb.tail1c7c0c.ts.net.key
    reverse_proxy localhost:5984 {
        header_up Host {upstream_hostport}
    }
}
```

## Access URLs

After setup, CouchDB is accessible at:

| Type | URL |
|------|-----|
| Tailscale | `https://noted-couchdb.tail1c7c0c.ts.net` |
| Local | `http://10.0.99.29:5984` |
| Public (via Caddy) | `https://vault-sync.mrbloodrune.dev` |

## Troubleshooting

### /dev/net/tun does not exist

Container config missing TUN device. Add the lxc.cgroup2 and lxc.mount.entry lines above.

### Authentication URL not shown

```bash
# Check Tailscale status
tailscale status

# Re-authenticate
tailscale up --force-reauth
```

### Certificate renewal

Tailscale certificates auto-renew. If issues occur:

```bash
# Regenerate certificates
tailscale cert --cert-file /etc/caddy/cert.crt --key-file /etc/caddy/cert.key \
  noted-couchdb.tail1c7c0c.ts.net
```
