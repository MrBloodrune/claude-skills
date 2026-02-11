# Cargo.toml Templates

Complete, copy-paste-ready Cargo.toml templates for edition 2024.

---

## 1. Single Binary with Common Dependencies

A typical async CLI application or server binary.

```toml
[package]
name = "my-app"
version = "0.1.0"
edition = "2024"
rust-version = "1.85"
description = "My application"
license = "MIT"

[lints.clippy]
pedantic = { level = "warn", priority = -1 }
nursery = { level = "warn", priority = -1 }
unwrap_used = "deny"

[dependencies]
anyhow = "1"
clap = { version = "4", features = ["derive"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
reqwest = { version = "0.12", features = ["json", "rustls-tls"], default-features = false }
sqlx = { version = "0.8", features = ["runtime-tokio", "tls-rustls", "postgres", "migrate"] }

[dev-dependencies]
insta = { version = "1", features = ["yaml"] }
wiremock = "0.6"
tokio = { version = "1", features = ["test-util"] }

[profile.release]
lto = true
codegen-units = 1
strip = true
```

Corresponding `src/main.rs`:

```rust
use anyhow::{Context, Result};
use clap::Parser;

#[derive(Parser)]
#[command(version, about)]
struct Cli {
    /// Configuration file path
    #[arg(short, long, default_value = "config.toml")]
    config: String,

    /// Enable verbose logging
    #[arg(short, long)]
    verbose: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    tracing_subscriber::fmt()
        .with_env_filter(if cli.verbose { "debug" } else { "info" })
        .init();

    tracing::info!(config = %cli.config, "starting application");

    Ok(())
}
```

---

## 2. Library Crate with Features

A library crate with optional dependencies gated behind feature flags.

```toml
[package]
name = "my-lib"
version = "0.1.0"
edition = "2024"
rust-version = "1.85"
description = "A reusable library crate"
license = "MIT OR Apache-2.0"
repository = "https://github.com/user/my-lib"
documentation = "https://docs.rs/my-lib"
readme = "README.md"
keywords = ["example", "library"]
categories = ["development-tools"]

[lints.clippy]
pedantic = { level = "warn", priority = -1 }
nursery = { level = "warn", priority = -1 }
unwrap_used = "deny"

[features]
default = ["json"]
json = ["dep:serde", "dep:serde_json"]
async = ["dep:tokio", "dep:reqwest"]
full = ["json", "async"]

[dependencies]
thiserror = "2"

# Optional dependencies gated behind features
serde = { version = "1", features = ["derive"], optional = true }
serde_json = { version = "1", optional = true }
tokio = { version = "1", features = ["rt-multi-thread", "macros"], optional = true }
reqwest = { version = "0.12", features = ["json", "rustls-tls"], default-features = false, optional = true }

[dev-dependencies]
insta = { version = "1", features = ["yaml"] }
tokio = { version = "1", features = ["full", "test-util"] }
serde_json = "1"
```

Corresponding `src/lib.rs`:

```rust
#![warn(clippy::pedantic, clippy::nursery)]
#![deny(clippy::unwrap_used)]

pub mod error;
pub mod types;

#[cfg(feature = "json")]
pub mod json;

#[cfg(feature = "async")]
pub mod client;

pub use error::Error;
pub use types::Config;
```

---

## 3. Workspace Root with Member Inheritance

Workspace root Cargo.toml plus a member crate that inherits shared settings.

### Workspace Root: `Cargo.toml`

```toml
[workspace]
resolver = "3"
members = [
    "crates/core",
    "crates/api",
    "crates/cli",
]

[workspace.package]
version = "0.1.0"
edition = "2024"
rust-version = "1.85"
license = "MIT"
repository = "https://github.com/user/my-workspace"

[workspace.lints.clippy]
pedantic = { level = "warn", priority = -1 }
nursery = { level = "warn", priority = -1 }
unwrap_used = "deny"

[workspace.dependencies]
# Shared dependency versions — members reference these with `.workspace = true`
anyhow = "1"
clap = { version = "4", features = ["derive"] }
reqwest = { version = "0.12", features = ["json", "rustls-tls"], default-features = false }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sqlx = { version = "0.8", features = ["runtime-tokio", "tls-rustls", "postgres", "migrate"] }
thiserror = "2"
tokio = { version = "1", features = ["full"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# Internal crates
my-core = { path = "crates/core" }

# Dev dependencies
insta = { version = "1", features = ["yaml"] }
wiremock = "0.6"

[profile.release]
lto = true
codegen-units = 1
strip = true
```

### Member Crate: `crates/core/Cargo.toml`

```toml
[package]
name = "my-core"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
repository.workspace = true
description = "Core types and logic for my-workspace"

[lints]
workspace = true

[dependencies]
serde.workspace = true
serde_json.workspace = true
thiserror.workspace = true
tracing.workspace = true

[dev-dependencies]
insta.workspace = true
```

### Member Crate: `crates/api/Cargo.toml`

```toml
[package]
name = "my-api"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
repository.workspace = true
description = "HTTP API server for my-workspace"

[lints]
workspace = true

[dependencies]
my-core.workspace = true
anyhow.workspace = true
axum = "0.8"
reqwest.workspace = true
serde.workspace = true
serde_json.workspace = true
sqlx.workspace = true
tokio.workspace = true
tracing.workspace = true
tracing-subscriber.workspace = true
tower = "0.5"
tower-http = { version = "0.6", features = ["cors", "trace"] }

[dev-dependencies]
insta.workspace = true
wiremock.workspace = true
```

### Member Crate: `crates/cli/Cargo.toml`

```toml
[package]
name = "my-cli"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
repository.workspace = true
description = "CLI tool for my-workspace"

[lints]
workspace = true

[dependencies]
my-core.workspace = true
anyhow.workspace = true
clap.workspace = true
serde.workspace = true
serde_json.workspace = true
tokio.workspace = true
tracing.workspace = true
tracing-subscriber.workspace = true

[dev-dependencies]
insta.workspace = true
```

---

## Key Conventions

- **`resolver = "3"`** is required in workspace root for edition 2024. Single crates get it implicitly.
- **`workspace.dependencies`** centralizes versions. Members use `dep.workspace = true` to inherit.
- **`workspace.package`** shares edition, version, license across all members.
- **`workspace.lints`** shares clippy configuration. Members opt in with `[lints] workspace = true`.
- **`default-features = false`** on `reqwest` to avoid pulling in OpenSSL; use `rustls-tls` instead.
- **`profile.release`** with `lto = true`, `codegen-units = 1`, `strip = true` for optimized production builds.
- **Feature flags** use `dep:` syntax (edition 2021+) to avoid implicit feature names from optional deps.
