---
name: Podman OCI Containers
description: >-
  This skill should be used when working with containers, writing Containerfiles,
  creating pods, setting up Quadlet systemd units, managing rootless containers,
  or configuring container registries. Triggers on "podman", "container",
  "containerfile", "quadlet", "pod", "systemd container", "rootless",
  "podman-compose", "buildah". IMPORTANT: Never suggest Docker — always use
  Podman equivalents.
---

# Podman OCI Containers

Podman-native container workflows: rootless by default, Quadlet for systemd integration, pods for multi-container composition, and Containerfile best practices.

**Ground rules**: Never use `docker`, `docker-compose`, or Docker Desktop. Always use `podman`, `podman compose` (built-in Go plugin), `buildah`, and `skopeo`. Never run `sudo podman` unless absolutely unavoidable (and explain why). Always name container definition files `Containerfile`, never `Dockerfile`.

## Rootless Podman

Rootless is the default. Every container runs under your user account with no elevated privileges.

### subuid/subgid Setup

Your user needs subordinate UID/GID ranges for user namespace mapping:

```bash
# Check current allocation
grep $USER /etc/subuid /etc/subgid

# If missing, add ranges (requires root once)
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER

# Apply changes immediately
podman system migrate
```

Format of `/etc/subuid` and `/etc/subgid`:

```
username:100000:65536
```

This means user `username` can map 65536 UIDs starting at 100000.

### User Socket and API

The rootless Podman socket lives at:

```
$XDG_RUNTIME_DIR/podman/podman.sock
```

Enable the socket for API access (e.g., for tools that need a container socket):

```bash
systemctl --user enable --now podman.socket

# Verify
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock http://localhost/_ping
```

### Persistent User Services

By default, user services stop when you log out. Enable lingering for always-on containers:

```bash
loginctl enable-linger $USER

# Verify
loginctl show-user $USER | grep Linger
# Linger=yes
```

### Development Containers with keep-id

Use `--userns=keep-id` so files created inside the container are owned by your host UID:

```bash
podman run --rm -it \
  --userns=keep-id \
  -v "$PWD:/workspace:Z" \
  -w /workspace \
  rust:latest \
  cargo build
```

Without `--userns=keep-id`, files created inside the container are owned by root on the host.

## Containerfile Best Practices

### Multi-Stage Builds (Rust Example)

Use `cargo-chef` for build layer caching. See `references/containerfile-patterns.md` for complete examples.

```containerfile
# Stage 1: Generate recipe
FROM docker.io/lukemathwalker/cargo-chef:latest-rust-1 AS chef
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# Stage 2: Build dependencies (cached unless Cargo.toml changes)
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN cargo build --release

# Stage 3: Runtime
FROM gcr.io/distroless/cc-debian12 AS runtime
COPY --from=builder /app/target/release/myapp /usr/local/bin/myapp
USER nonroot:nonroot
ENTRYPOINT ["/usr/local/bin/myapp"]
```

Build it:

```bash
podman build -t myapp:latest -f Containerfile .
```

### Layer Caching with Cache Mounts

Cache package manager directories across builds:

```containerfile
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release
```

### Non-Root USER

Always run as non-root inside the container:

```containerfile
RUN useradd --uid 1000 --create-home appuser
USER appuser
WORKDIR /home/appuser
```

### LABEL Conventions

Use OCI standard labels:

```containerfile
LABEL org.opencontainers.image.source="https://github.com/user/repo"
LABEL org.opencontainers.image.description="My application"
LABEL org.opencontainers.image.licenses="Apache-2.0"
LABEL org.opencontainers.image.version="1.0.0"
```

### .containerignore

Create `.containerignore` (not `.dockerignore`) at the project root:

```
target/
.git/
.github/
*.md
!README.md
node_modules/
.env
.env.*
```

## Pod Composition

Pods group containers that share a network namespace (localhost communication, shared ports).

### Create a Pod

```bash
podman pod create \
  --name webapp \
  -p 8080:80 \
  -p 5432:5432
```

Ports are declared on the **pod**, not individual containers. All containers in the pod share the same network namespace.

### Add Containers to a Pod

```bash
# Database
podman run -d --pod webapp \
  --name webapp-db \
  -e POSTGRES_USER=app \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=appdb \
  -v webapp-dbdata:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16-alpine

# Web application (connects to db on localhost:5432)
podman run -d --pod webapp \
  --name webapp-web \
  -e DATABASE_URL=postgresql://app:secret@localhost:5432/appdb \
  myapp:latest
```

The web container reaches PostgreSQL at `localhost:5432` because they share the pod's network namespace.

### Pod Management

```bash
podman pod ls                    # List pods
podman pod inspect webapp        # Detailed pod info
podman pod stop webapp           # Stop all containers in pod
podman pod start webapp          # Start all containers in pod
podman pod restart webapp        # Restart all containers
podman pod rm -f webapp          # Force remove pod and its containers
```

### Export Pod to Kubernetes YAML

```bash
podman generate kube webapp > webapp.yaml

# Re-create from YAML
podman play kube webapp.yaml
```

## Quadlet/Systemd Integration

Quadlet is the preferred way to manage long-running containers on this system. It converts declarative unit files into full systemd services.

Unit files go in `~/.config/containers/systemd/` for rootless operation. After adding or modifying files:

```bash
systemctl --user daemon-reload
systemctl --user start myapp
```

Enable lingering for boot persistence:

```bash
loginctl enable-linger $USER
```

### Container Unit (.container)

```ini
# ~/.config/containers/systemd/caddy.container
[Unit]
Description=Caddy web server
After=network-online.target

[Container]
Image=docker.io/library/caddy:2-alpine
PublishPort=8080:80
PublishPort=8443:443
Volume=caddy-data.volume:/data:Z
Volume=caddy-config.volume:/config:Z
Volume=%h/Caddyfile:/etc/caddy/Caddyfile:Z,ro
Environment=CADDY_ADMIN=0.0.0.0:2019
AutoUpdate=registry

[Service]
Restart=on-failure
TimeoutStartSec=300

[Install]
WantedBy=default.target
```

### Pod Unit (.pod)

```ini
# ~/.config/containers/systemd/webapp.pod
[Unit]
Description=Web application pod

[Pod]
PodName=webapp
PublishPort=8080:80
PublishPort=5432:5432

[Install]
WantedBy=default.target
```

Containers join the pod by adding `Pod=webapp.pod` in their `[Container]` section.

### Volume Unit (.volume)

```ini
# ~/.config/containers/systemd/caddy-data.volume
[Unit]
Description=Caddy persistent data

[Volume]
VolumeName=caddy-data
```

### Network Unit (.network)

```ini
# ~/.config/containers/systemd/app.network
[Unit]
Description=Application network

[Network]
NetworkName=appnet
Subnet=10.89.1.0/24
Gateway=10.89.1.1
```

Containers use it with `Network=app.network` in their `[Container]` section.

### Quadlet Commands

```bash
# Reload after editing unit files
systemctl --user daemon-reload

# Start/stop/restart
systemctl --user start caddy
systemctl --user stop caddy
systemctl --user restart caddy

# Enable at boot (requires linger)
systemctl --user enable caddy

# View logs
journalctl --user -u caddy -f

# Check generated service file
systemctl --user cat caddy

# Validate Quadlet files (dry-run)
/usr/lib/podman/quadlet --dryrun --user
```

See `references/quadlet-templates.md` for complete production-ready templates.

## Volume Management

### Named Volumes

```bash
podman volume create mydata
podman volume ls
podman volume inspect mydata
podman volume rm mydata
podman volume prune            # Remove unused volumes
```

### Bind Mounts with SELinux Labels

Always use `:Z` or `:z` on bind mounts. This system runs SELinux-aware configurations.

- `:Z` — Private unshared label. Only this container can access the mount. Use for exclusive access.
- `:z` — Shared label. Multiple containers can access the mount. Use when sharing data.

```bash
# Exclusive access (most common)
podman run -v /host/path:/container/path:Z myimage

# Shared across containers
podman run -v /host/path:/container/path:z myimage

# Read-only bind mount
podman run -v /host/path:/container/path:Z,ro myimage
```

### tmpfs Mounts

For temporary data that should not persist:

```bash
podman run --tmpfs /tmp:rw,size=100m myimage
```

## Networking

### Default Rootless Backend: pasta

pasta is the default rootless network backend (replaced slirp4netns). It is faster and supports more features including IPv6.

```bash
# Verify backend
podman info --format '{{.Host.NetworkBackend}}'
# Expected: netavark

# Verify rootless pasta
podman info --format '{{.Host.Pasta.Executable}}'
```

### Create Custom Networks

```bash
podman network create mynet
podman network create --subnet 10.89.2.0/24 --gateway 10.89.2.1 mynet

podman network ls
podman network inspect mynet
podman network rm mynet
podman network prune
```

### Port Mapping

```bash
# Map host:container
podman run -p 8080:80 myimage

# Bind to specific host interface
podman run -p 127.0.0.1:8080:80 myimage

# Map range
podman run -p 8080-8090:80-90 myimage

# Publish all exposed ports
podman run -P myimage
```

### DNS Within Pods

Containers in the same pod communicate over `localhost`. Containers on the same custom network resolve each other by container name:

```bash
podman network create appnet
podman run -d --network appnet --name db postgres:16-alpine
podman run -d --network appnet --name app -e DB_HOST=db myapp
# "app" container can reach "db" by hostname
```

## Registry Auth

### Login

```bash
podman login docker.io
podman login ghcr.io
podman login quay.io

# Verify
podman login --get-login docker.io
```

### auth.json Location

Credentials are stored at:

```
$XDG_RUNTIME_DIR/containers/auth.json
```

This file is per-session. For persistent credentials, use:

```
$HOME/.config/containers/auth.json
```

### Registry Configuration

System config: `/etc/containers/registries.conf`
User overrides: `$HOME/.config/containers/registries.conf`
Drop-in directory: `/etc/containers/registries.conf.d/`

Configure unqualified search registries:

```toml
# ~/.config/containers/registries.conf
unqualified-search-registries = ["docker.io", "ghcr.io", "quay.io"]
```

Configure registry mirrors:

```toml
[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "mirror.gcr.io"
```

Block a registry:

```toml
[[registry]]
prefix = "docker.io"
blocked = true
```

### Inspect Remote Images

Use `skopeo` to inspect images without pulling:

```bash
skopeo inspect docker://docker.io/library/nginx:latest
skopeo inspect --format '{{.Digest}}' docker://ghcr.io/user/image:tag
skopeo list-tags docker://docker.io/library/rust
```

### Copy Between Registries

```bash
skopeo copy docker://source.io/image:tag docker://dest.io/image:tag
```

## Command Quick Reference

| Command | Description |
|---------|-------------|
| `podman run --rm -it image cmd` | Run interactive container, remove on exit |
| `podman run -d --name web -p 8080:80 image` | Run detached container with port mapping |
| `podman run --userns=keep-id -v .:/app:Z image` | Dev container with host UID matching |
| `podman ps -a` | List all containers (running and stopped) |
| `podman logs -f container` | Follow container logs |
| `podman exec -it container /bin/sh` | Shell into running container |
| `podman stop container` | Gracefully stop container |
| `podman rm -f container` | Force remove container |
| `podman build -t name:tag -f Containerfile .` | Build image from Containerfile |
| `podman images` | List local images |
| `podman rmi image` | Remove image |
| `podman image prune -a` | Remove all unused images |
| `podman pod create --name pod -p 8080:80` | Create pod with port |
| `podman pod ls` | List pods |
| `podman compose up -d` | Start compose project (dev/testing) |
| `podman compose down` | Stop and remove compose project |
| `podman volume create vol` | Create named volume |
| `podman network create net` | Create custom network |
| `podman system prune -a` | Remove all unused data |
| `podman inspect container` | Detailed container metadata |
| `buildah bud -t name:tag -f Containerfile .` | Build with Buildah (more control) |
| `skopeo inspect docker://registry/image:tag` | Inspect remote image without pulling |

## Additional Resources

- **`references/quadlet-templates.md`** — Production-ready Quadlet unit files for common services
- **`references/containerfile-patterns.md`** — Complete multi-stage Containerfile examples for Rust, SvelteKit, Python
