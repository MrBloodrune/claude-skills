# Quadlet Unit File Templates

Production-ready Quadlet unit files for `~/.config/containers/systemd/`. After creating or editing any file, run:

```bash
systemctl --user daemon-reload
```

## Web Server: Caddy (.container)

```ini
# ~/.config/containers/systemd/caddy.container
[Unit]
Description=Caddy reverse proxy and web server
After=network-online.target
Wants=network-online.target

[Container]
Image=docker.io/library/caddy:2-alpine
ContainerName=caddy
PublishPort=80:80
PublishPort=443:443
PublishPort=443:443/udp
Volume=caddy-data.volume:/data:Z
Volume=caddy-config.volume:/config:Z
Volume=%h/Caddyfile:/etc/caddy/Caddyfile:Z,ro
Environment=CADDY_ADMIN=0.0.0.0:2019
AutoUpdate=registry
Label=io.containers.autoupdate=registry

[Service]
Restart=on-failure
RestartSec=10
TimeoutStartSec=300

[Install]
WantedBy=default.target
```

Caddy data volume:

```ini
# ~/.config/containers/systemd/caddy-data.volume
[Unit]
Description=Caddy TLS certificates and persistent data

[Volume]
VolumeName=caddy-data
```

Caddy config volume:

```ini
# ~/.config/containers/systemd/caddy-config.volume
[Unit]
Description=Caddy configuration cache

[Volume]
VolumeName=caddy-config
```

## Database: PostgreSQL (.container)

```ini
# ~/.config/containers/systemd/postgres.container
[Unit]
Description=PostgreSQL 16 database
After=network-online.target
Wants=network-online.target

[Container]
Image=docker.io/library/postgres:16-alpine
ContainerName=postgres
PublishPort=5432:5432
Volume=postgres-data.volume:/var/lib/postgresql/data:Z
Environment=POSTGRES_USER=app
Environment=POSTGRES_PASSWORD=changeme
Environment=POSTGRES_DB=appdb
Environment=PGDATA=/var/lib/postgresql/data/pgdata
HealthCmd=pg_isready -U app -d appdb
HealthInterval=30s
HealthTimeout=5s
HealthRetries=3
AutoUpdate=registry

[Service]
Restart=on-failure
RestartSec=10
TimeoutStartSec=120

[Install]
WantedBy=default.target
```

PostgreSQL data volume:

```ini
# ~/.config/containers/systemd/postgres-data.volume
[Unit]
Description=PostgreSQL persistent data

[Volume]
VolumeName=postgres-data
```

## Pod: Web Application + Database (.pod)

A pod groups containers with shared networking. Containers in the pod reach each other on `localhost`.

### Pod Definition

```ini
# ~/.config/containers/systemd/webapp.pod
[Unit]
Description=Web application pod (app + database)

[Pod]
PodName=webapp
PublishPort=8080:80
PublishPort=5432:5432

[Install]
WantedBy=default.target
```

### Database Container (in pod)

```ini
# ~/.config/containers/systemd/webapp-db.container
[Unit]
Description=Web app database (in webapp pod)
After=network-online.target

[Container]
Image=docker.io/library/postgres:16-alpine
ContainerName=webapp-db
Pod=webapp.pod
Volume=webapp-dbdata.volume:/var/lib/postgresql/data:Z
Environment=POSTGRES_USER=app
Environment=POSTGRES_PASSWORD=changeme
Environment=POSTGRES_DB=appdb
Environment=PGDATA=/var/lib/postgresql/data/pgdata
HealthCmd=pg_isready -U app -d appdb
HealthInterval=30s
HealthTimeout=5s
HealthRetries=3

[Service]
Restart=on-failure
RestartSec=10
TimeoutStartSec=120

[Install]
WantedBy=default.target
```

### Application Container (in pod)

```ini
# ~/.config/containers/systemd/webapp-app.container
[Unit]
Description=Web application (in webapp pod)
After=webapp-db.service

[Container]
Image=ghcr.io/user/myapp:latest
ContainerName=webapp-app
Pod=webapp.pod
Environment=DATABASE_URL=postgresql://app:changeme@localhost:5432/appdb
Environment=LISTEN_ADDR=0.0.0.0:80
AutoUpdate=registry

[Service]
Restart=on-failure
RestartSec=10
TimeoutStartSec=60

[Install]
WantedBy=default.target
```

### Shared Volume

```ini
# ~/.config/containers/systemd/webapp-dbdata.volume
[Unit]
Description=Web app database persistent data

[Volume]
VolumeName=webapp-dbdata
```

## Custom Network (.network)

```ini
# ~/.config/containers/systemd/appnet.network
[Unit]
Description=Application network with custom subnet

[Network]
NetworkName=appnet
Subnet=10.89.1.0/24
Gateway=10.89.1.1
Driver=bridge
Internal=false
IPv6=false
```

Containers join this network with `Network=appnet.network` in their `[Container]` section:

```ini
[Container]
Image=myimage:latest
Network=appnet.network
```

## Redis Cache (.container)

```ini
# ~/.config/containers/systemd/redis.container
[Unit]
Description=Redis in-memory cache
After=network-online.target

[Container]
Image=docker.io/library/redis:7-alpine
ContainerName=redis
PublishPort=6379:6379
Volume=redis-data.volume:/data:Z
PodmanArgs=--tmpfs /tmp:rw,size=64m
HealthCmd=redis-cli ping
HealthInterval=30s
HealthTimeout=5s
HealthRetries=3
AutoUpdate=registry

[Service]
Restart=on-failure
RestartSec=10
TimeoutStartSec=60

[Install]
WantedBy=default.target
```

```ini
# ~/.config/containers/systemd/redis-data.volume
[Unit]
Description=Redis persistent data (AOF/RDB)

[Volume]
VolumeName=redis-data
```

## Ollama LLM Server (.container)

```ini
# ~/.config/containers/systemd/ollama.container
[Unit]
Description=Ollama LLM inference server
After=network-online.target

[Container]
Image=docker.io/ollama/ollama:latest
ContainerName=ollama
PublishPort=11434:11434
Volume=ollama-models.volume:/root/.ollama:Z
AutoUpdate=registry

[Service]
Restart=on-failure
RestartSec=10
TimeoutStartSec=300

[Install]
WantedBy=default.target
```

```ini
# ~/.config/containers/systemd/ollama-models.volume
[Unit]
Description=Ollama model storage

[Volume]
VolumeName=ollama-models
```

## Usage

After placing unit files in `~/.config/containers/systemd/`:

```bash
# Reload systemd to detect new files
systemctl --user daemon-reload

# Start a container service
systemctl --user start caddy

# Enable at boot (requires loginctl enable-linger)
systemctl --user enable caddy

# View logs
journalctl --user -u caddy -f

# Check the generated systemd unit
systemctl --user cat caddy

# Validate all Quadlet files without starting
/usr/lib/podman/quadlet --dryrun --user

# Stop and disable
systemctl --user stop caddy
systemctl --user disable caddy
```

## Auto-Updates

Containers with `AutoUpdate=registry` can be automatically updated:

```bash
# Check for updates
podman auto-update --dry-run

# Apply updates
podman auto-update

# Enable the timer for automatic checks
systemctl --user enable --now podman-auto-update.timer
```
