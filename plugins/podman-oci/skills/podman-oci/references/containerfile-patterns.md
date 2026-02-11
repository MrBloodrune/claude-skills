# Containerfile Patterns

Complete multi-stage Containerfile examples. Always name the file `Containerfile`, never `Dockerfile`. Build with:

```bash
podman build -t name:tag -f Containerfile .
```

## Rust Binary (cargo-chef)

Uses `cargo-chef` for optimal layer caching. Dependencies are cached in a separate layer and only rebuilt when `Cargo.toml` or `Cargo.lock` change.

```containerfile
# Containerfile

# --- Stage 1: Chef setup ---
FROM docker.io/lukemathwalker/cargo-chef:latest-rust-1 AS chef
WORKDIR /app

# --- Stage 2: Prepare dependency recipe ---
FROM chef AS planner
COPY Cargo.toml Cargo.lock ./
COPY src/ src/
RUN cargo chef prepare --recipe-path recipe.json

# --- Stage 3: Build dependencies (cached) ---
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json

# Build dependencies only — this layer is cached until Cargo.toml changes
RUN cargo chef cook --release --recipe-path recipe.json

# Build the application
COPY . .
RUN cargo build --release --bin myapp

# --- Stage 4: Runtime ---
FROM gcr.io/distroless/cc-debian12 AS runtime
COPY --from=builder /app/target/release/myapp /usr/local/bin/myapp

LABEL org.opencontainers.image.source="https://github.com/user/myapp"
LABEL org.opencontainers.image.description="My Rust application"
LABEL org.opencontainers.image.licenses="Apache-2.0"

USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/myapp"]
```

`.containerignore`:

```
target/
.git/
.github/
*.md
!README.md
.env
.env.*
```

Build and run:

```bash
podman build -t myapp:latest -f Containerfile .
podman run --rm -p 8080:8080 myapp:latest
```

### Rust Workspace Variant

For cargo workspaces with multiple crates:

```containerfile
# Containerfile

FROM docker.io/lukemathwalker/cargo-chef:latest-rust-1 AS chef
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN cargo build --release --bin api-server

FROM gcr.io/distroless/cc-debian12 AS runtime
COPY --from=builder /app/target/release/api-server /usr/local/bin/api-server
USER nonroot:nonroot
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/api-server"]
```

## SvelteKit Application

Multi-stage build using `adapter-node` for the SvelteKit production server.

```containerfile
# Containerfile

# --- Stage 1: Install dependencies ---
FROM docker.io/library/node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# --- Stage 2: Build ---
FROM deps AS builder
COPY . .
RUN npm run build

# --- Stage 3: Runtime ---
FROM docker.io/library/node:22-alpine AS runtime
WORKDIR /app

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser

COPY --from=builder --chown=appuser:appgroup /app/build ./build
COPY --from=builder --chown=appuser:appgroup /app/package.json ./
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

LABEL org.opencontainers.image.source="https://github.com/user/mysite"
LABEL org.opencontainers.image.description="SvelteKit application"

USER appuser
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
CMD ["node", "build"]
```

`.containerignore`:

```
node_modules/
.svelte-kit/
build/
.git/
.github/
*.md
!README.md
.env
.env.*
```

Build and run:

```bash
podman build -t mysite:latest -f Containerfile .
podman run --rm -p 3000:3000 mysite:latest
```

### SvelteKit with pnpm

```containerfile
# Containerfile

FROM docker.io/library/node:22-alpine AS deps
WORKDIR /app
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm run build

FROM docker.io/library/node:22-alpine AS runtime
WORKDIR /app
RUN corepack enable pnpm && \
    addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser

COPY --from=builder --chown=appuser:appgroup /app/build ./build
COPY --from=builder --chown=appuser:appgroup /app/package.json ./
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

USER appuser
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
CMD ["node", "build"]
```

## Python Application

Multi-stage build. No virtualenv needed inside the container since the container itself provides isolation.

```containerfile
# Containerfile

# --- Stage 1: Install dependencies ---
FROM docker.io/library/python:3.12-slim AS builder
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --- Stage 2: Runtime ---
FROM docker.io/library/python:3.12-slim AS runtime
WORKDIR /app

RUN useradd --uid 1000 --create-home appuser

COPY --from=builder /install /usr/local
COPY --chown=appuser:appuser . .

LABEL org.opencontainers.image.source="https://github.com/user/myapi"
LABEL org.opencontainers.image.description="Python API service"

USER appuser
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

`.containerignore`:

```
__pycache__/
*.pyc
.venv/
.git/
.github/
*.md
!README.md
.env
.env.*
.mypy_cache/
.pytest_cache/
.ruff_cache/
```

Build and run:

```bash
podman build -t myapi:latest -f Containerfile .
podman run --rm -p 8000:8000 myapi:latest
```

### Python with Poetry

```containerfile
# Containerfile

FROM docker.io/library/python:3.12-slim AS builder
WORKDIR /app

RUN pip install --no-cache-dir poetry
COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi --only main --no-root

FROM docker.io/library/python:3.12-slim AS runtime
WORKDIR /app

RUN useradd --uid 1000 --create-home appuser
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --chown=appuser:appuser . .

USER appuser
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Custom Base Image

Build a common base image with shared tools, then use it as the parent for project-specific images.

```containerfile
# Containerfile.base

FROM docker.io/library/debian:bookworm-slim AS base

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      jq \
      tini \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --uid 1000 --create-home appuser

LABEL org.opencontainers.image.source="https://github.com/user/base-images"
LABEL org.opencontainers.image.description="Common base image with standard tools"

ENTRYPOINT ["/usr/bin/tini", "--"]
```

Build and tag:

```bash
podman build -t mybase:latest -f Containerfile.base .
```

Use in downstream images:

```containerfile
# Containerfile

FROM localhost/mybase:latest

COPY --chown=appuser:appuser myapp /usr/local/bin/myapp
USER appuser
EXPOSE 8080
CMD ["/usr/local/bin/myapp"]
```

## Go Application

Produces a static binary with no runtime dependencies.

```containerfile
# Containerfile

FROM docker.io/library/golang:1.23-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

FROM gcr.io/distroless/static-debian12 AS runtime
COPY --from=builder /app/server /usr/local/bin/server

USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/server"]
```

## Tips

### Build with Podman

```bash
# Standard build
podman build -t name:tag -f Containerfile .

# Build with build args
podman build --build-arg VERSION=1.2.3 -t name:tag -f Containerfile .

# Build for multiple platforms
podman build --platform linux/amd64,linux/arm64 -t name:tag -f Containerfile .

# Build with no cache
podman build --no-cache -t name:tag -f Containerfile .
```

### Build with Buildah (more control)

```bash
# Equivalent build
buildah bud -t name:tag -f Containerfile .

# Build with layers for debugging
buildah bud --layers -t name:tag -f Containerfile .
```

### Image Size Comparison

Choose runtime images based on size needs:

| Base Image | Size | Use Case |
|-----------|------|----------|
| `gcr.io/distroless/static` | ~2 MB | Go, Rust (static binaries) |
| `gcr.io/distroless/cc` | ~20 MB | Rust (dynamic, needs libc) |
| `alpine:3` | ~7 MB | When you need a shell + package manager |
| `debian:bookworm-slim` | ~75 MB | When you need apt and glibc |
| `node:22-alpine` | ~130 MB | Node.js applications |
| `python:3.12-slim` | ~150 MB | Python applications |
