---
name: Rust Development
description: >-
  This skill should be used when writing Rust code, creating cargo projects,
  working with cargo workspaces, implementing error handling, writing async code,
  or structuring Rust tests. Triggers on "rust", "cargo", "tokio", "thiserror",
  "anyhow", "async rust", "rust tests", "cargo workspace".
---

# Rust Development — Edition 2024

Opinionated Rust development guidance targeting edition 2024 (Rust 1.85+). Every recommendation here is prescriptive: do this, not that.

---

## Edition & Toolchain

**Always edition 2024.** No backwards compatibility with 2021.

```toml
[package]
name = "my-crate"
version = "0.1.0"
edition = "2024"
rust-version = "1.85"
```

- Minimum supported Rust version (MSRV): 1.85
- Resolver: 3 (implicit in edition 2024 for single crates, explicit for workspaces)
- Use `rust-version` field to enforce MSRV in Cargo.toml

**Toolchain file** (`rust-toolchain.toml`):

```toml
[toolchain]
channel = "stable"
components = ["rustfmt", "clippy"]
```

---

## Project Structure

### Single Crate Layout

```
my-project/
├── Cargo.toml
├── rust-toolchain.toml
├── src/
│   ├── main.rs          # or lib.rs
│   ├── config.rs        # flat module file
│   ├── db.rs            # flat module file
│   └── error.rs         # flat module file
└── tests/
    └── integration.rs   # integration tests only
```

### Workspace Layout

```
my-workspace/
├── Cargo.toml           # workspace root
├── rust-toolchain.toml
├── crates/
│   ├── my-core/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       └── types.rs
│   ├── my-api/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── main.rs
│   │       ├── routes.rs
│   │       └── middleware.rs
│   └── my-cli/
│       ├── Cargo.toml
│       └── src/
│           └── main.rs
└── tests/
    └── e2e.rs
```

### Module Rules

**Use flat module files.** `src/config.rs`, not `src/config/mod.rs`. This is edition 2024 default behavior.

```rust
// src/main.rs or src/lib.rs
mod config;
mod db;
mod error;

use config::AppConfig;
use db::Database;
use error::AppError;
```

Only use nested directories (`src/routes/mod.rs`) when a module has sub-modules that genuinely need their own files. Prefer flat until complexity demands otherwise.

---

## Testing Convention — Inline `#[cfg(test)]`

**ALWAYS put unit tests inline at the bottom of the source file.** Never create separate files for unit tests. Integration tests go in `tests/` only for cross-crate testing.

```rust
// src/calculator.rs

pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

pub fn divide(a: f64, b: f64) -> Result<f64, &'static str> {
    if b == 0.0 {
        return Err("division by zero");
    }
    Ok(a / b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_positive_numbers() {
        assert_eq!(add(2, 3), 5);
    }

    #[test]
    fn add_negative_numbers() {
        assert_eq!(add(-1, -1), -2);
    }

    #[test]
    fn divide_normal() {
        let result = divide(10.0, 3.0).unwrap();
        assert!((result - 3.333_333_333).abs() < f64::EPSILON * 100.0);
    }

    #[test]
    fn divide_by_zero_returns_error() {
        assert_eq!(divide(1.0, 0.0), Err("division by zero"));
    }
}
```

### Async Test Example

```rust
// src/client.rs

use reqwest::Client;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct User {
    pub id: u64,
    pub name: String,
}

pub async fn fetch_user(client: &Client, id: u64) -> anyhow::Result<User> {
    let url = format!("https://api.example.com/users/{id}");
    let user = client.get(&url).send().await?.json::<User>().await?;
    Ok(user)
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[tokio::test]
    async fn fetch_user_returns_parsed_user() {
        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/users/42"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(serde_json::json!({"id": 42, "name": "Alice"})),
            )
            .mount(&mock_server)
            .await;

        let client = Client::new();
        // Override base URL in real code; simplified here
        let user = fetch_user(&client, 42).await.unwrap();
        assert_eq!(user.name, "Alice");
    }
}
```

### Snapshot Testing with insta

```rust
// src/renderer.rs

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct Report {
    pub title: String,
    pub items: Vec<String>,
    pub total: f64,
}

pub fn generate_report(items: &[(String, f64)]) -> Report {
    let total = items.iter().map(|(_, price)| price).sum();
    Report {
        title: "Monthly Summary".into(),
        items: items.iter().map(|(name, _)| name.clone()).collect(),
        total,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use insta::assert_yaml_snapshot;

    #[test]
    fn report_snapshot() {
        let items = vec![
            ("Widget A".into(), 29.99),
            ("Widget B".into(), 49.99),
        ];
        let report = generate_report(&items);
        assert_yaml_snapshot!(report);
    }
}
```

Run `cargo insta review` to accept/reject snapshot changes.

---

## Error Handling

### Library Crates: thiserror 2.x

Use `thiserror` to define structured error enums. Every library crate gets its own error type.

```rust
// src/error.rs

use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("database query failed: {0}")]
    Database(#[from] sqlx::Error),

    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),

    #[error("configuration error: {message}")]
    Config { message: String },

    #[error("entity not found: {entity} with id {id}")]
    NotFound { entity: &'static str, id: String },

    #[error("validation failed: {field} — {reason}")]
    Validation { field: String, reason: String },

    #[error("permission denied for user {user_id} on resource {resource}")]
    Forbidden { user_id: String, resource: String },

    #[error("internal error")]
    Internal(#[source] Box<dyn std::error::Error + Send + Sync>),
}
```

Key rules:
- `#[from]` for automatic conversion from upstream errors
- `#[source]` for wrapping without auto-conversion
- Context fields (`entity`, `id`, `field`) instead of stringly-typed messages
- `thiserror = "2"` in Cargo.toml, not 1.x

### Binary Crates: anyhow

Use `anyhow` in binaries and CLI tools. Chain `.context()` for debuggable error trails.

```rust
// src/main.rs

use anyhow::{Context, Result};

#[tokio::main]
async fn main() -> Result<()> {
    let config = load_config()
        .context("failed to load application config")?;

    let db = connect_database(&config.database_url)
        .await
        .context("failed to connect to database")?;

    let server = start_server(db, &config)
        .await
        .context("failed to start HTTP server")?;

    server.await.context("server exited with error")?;

    Ok(())
}
```

### Rules

| Situation | Use | Reason |
|-----------|-----|--------|
| Library crate public API | `thiserror` enum | Callers need to match on error variants |
| Binary / CLI | `anyhow::Result` | Just need readable error chain for humans |
| Prototype / script | `anyhow::Result` | Speed of development |
| `unwrap()` | **Never in library code** | Panics are unrecoverable |
| `expect()` | Only for true invariants | Document WHY the invariant holds |

```rust
// expect() — acceptable: the invariant is documented
let home = std::env::var("HOME")
    .expect("HOME environment variable must be set on Unix systems");

// unwrap() — NEVER this in library code
let value = map.get("key").unwrap(); // BAD: crashes on missing key
```

---

## Async Patterns — Tokio

### Entry Point

```rust
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::init();
    // application logic
    Ok(())
}
```

For libraries, never use `#[tokio::main]`. Accept a runtime or use `spawn` within an existing runtime.

### CPU-Bound Work: spawn_blocking

Never block the async runtime with CPU-intensive work.

```rust
use tokio::task;

pub async fn hash_password(password: String) -> anyhow::Result<String> {
    task::spawn_blocking(move || {
        // argon2 hashing is CPU-intensive
        let salt = argon2::password_hash::SaltString::generate(&mut rand::rngs::OsRng);
        let hash = argon2::Argon2::default()
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| anyhow::anyhow!("hashing failed: {e}"))?;
        Ok(hash.to_string())
    })
    .await?
}
```

### Concurrent IO: JoinSet

Use `JoinSet` for managing a collection of spawned tasks.

```rust
use tokio::task::JoinSet;
use anyhow::Result;

pub async fn fetch_all_pages(urls: Vec<String>) -> Result<Vec<String>> {
    let client = reqwest::Client::new();
    let mut set = JoinSet::new();

    for url in urls {
        let client = client.clone();
        set.spawn(async move {
            let resp = client.get(&url).send().await?;
            let body = resp.text().await?;
            Ok::<String, reqwest::Error>(body)
        });
    }

    let mut results = Vec::new();
    while let Some(res) = set.join_next().await {
        let body = res??; // first ? for JoinError, second for reqwest::Error
        results.push(body);
    }

    Ok(results)
}
```

### Select: Cancellation Safety

`tokio::select!` cancels the unfinished branches. Only use cancel-safe operations in select arms.

```rust
use tokio::sync::mpsc;
use tokio::signal;

pub async fn run_worker(mut rx: mpsc::Receiver<String>) {
    loop {
        tokio::select! {
            // mpsc::Receiver::recv is cancel-safe
            Some(msg) = rx.recv() => {
                process_message(msg).await;
            }
            // signal::ctrl_c is cancel-safe
            _ = signal::ctrl_c() => {
                tracing::info!("shutdown signal received");
                break;
            }
        }
    }
}

async fn process_message(msg: String) {
    tracing::info!(message = %msg, "processing");
}
```

**Cancel-safe operations:** `mpsc::Receiver::recv`, `oneshot::Receiver`, `TcpListener::accept`, `tokio::time::sleep`.

**NOT cancel-safe:** `AsyncReadExt::read` (partial reads lost), `BufReader::read_line`. Wrap these in `tokio::pin!` or restructure to avoid data loss.

---

## Common Patterns

### Builder Pattern

Use when a struct has many optional configuration fields.

```rust
pub struct HttpClient {
    base_url: String,
    timeout: std::time::Duration,
    max_retries: u32,
    headers: reqwest::header::HeaderMap,
}

pub struct HttpClientBuilder {
    base_url: String,
    timeout: std::time::Duration,
    max_retries: u32,
    headers: reqwest::header::HeaderMap,
}

impl HttpClientBuilder {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            timeout: std::time::Duration::from_secs(30),
            max_retries: 3,
            headers: reqwest::header::HeaderMap::new(),
        }
    }

    pub fn timeout(mut self, timeout: std::time::Duration) -> Self {
        self.timeout = timeout;
        self
    }

    pub fn max_retries(mut self, max_retries: u32) -> Self {
        self.max_retries = max_retries;
        self
    }

    pub fn header(mut self, key: &str, value: &str) -> Self {
        self.headers.insert(
            reqwest::header::HeaderName::from_bytes(key.as_bytes()).unwrap(),
            reqwest::header::HeaderValue::from_str(value).unwrap(),
        );
        self
    }

    pub fn build(self) -> HttpClient {
        HttpClient {
            base_url: self.base_url,
            timeout: self.timeout,
            max_retries: self.max_retries,
            headers: self.headers,
        }
    }
}

// Usage:
// let client = HttpClientBuilder::new("https://api.example.com")
//     .timeout(Duration::from_secs(10))
//     .max_retries(5)
//     .build();
```

### Type-State Pattern

Encode state transitions in the type system so invalid states are unrepresentable.

```rust
use std::marker::PhantomData;

pub struct Draft;
pub struct Published;
pub struct Archived;

pub struct Article<State> {
    title: String,
    body: String,
    _state: PhantomData<State>,
}

impl Article<Draft> {
    pub fn new(title: impl Into<String>) -> Self {
        Self {
            title: title.into(),
            body: String::new(),
            _state: PhantomData,
        }
    }

    pub fn set_body(&mut self, body: impl Into<String>) {
        self.body = body.into();
    }

    pub fn publish(self) -> Article<Published> {
        Article {
            title: self.title,
            body: self.body,
            _state: PhantomData,
        }
    }
}

impl Article<Published> {
    pub fn archive(self) -> Article<Archived> {
        Article {
            title: self.title,
            body: self.body,
            _state: PhantomData,
        }
    }

    pub fn title(&self) -> &str {
        &self.title
    }

    pub fn body(&self) -> &str {
        &self.body
    }
}

impl Article<Archived> {
    pub fn title(&self) -> &str {
        &self.title
    }
}

// Usage:
// let mut draft = Article::new("Hello World");
// draft.set_body("Content here");
// let published = draft.publish();    // consumes draft
// let archived = published.archive(); // consumes published
// draft.publish();                    // COMPILE ERROR: draft already moved
```

### Newtype Validation Pattern

Wrap primitives in newtypes to enforce invariants at construction time.

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct EmailAddress(String);

impl EmailAddress {
    pub fn new(email: impl Into<String>) -> Result<Self, &'static str> {
        let email = email.into();
        if !email.contains('@') || email.len() < 3 {
            return Err("invalid email address");
        }
        // Normalize to lowercase
        Ok(Self(email.to_lowercase()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn domain(&self) -> &str {
        self.0.split('@').nth(1).unwrap_or("")
    }
}

impl std::fmt::Display for EmailAddress {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Port(u16);

impl Port {
    pub fn new(port: u16) -> Result<Self, &'static str> {
        if port == 0 {
            return Err("port cannot be zero");
        }
        Ok(Self(port))
    }

    pub fn value(self) -> u16 {
        self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_email() {
        let email = EmailAddress::new("USER@Example.COM").unwrap();
        assert_eq!(email.as_str(), "user@example.com");
        assert_eq!(email.domain(), "example.com");
    }

    #[test]
    fn invalid_email_rejected() {
        assert!(EmailAddress::new("not-an-email").is_err());
    }

    #[test]
    fn zero_port_rejected() {
        assert!(Port::new(0).is_err());
    }
}
```

---

## Crate Recommendations

| Crate | Use For | Notes |
|-------|---------|-------|
| `thiserror` 2.x | Library error types | Derive `Error` enums with `#[from]`, `#[source]` |
| `anyhow` | Binary error handling | `.context()` chains, `bail!()`, `ensure!()` |
| `tokio` | Async runtime | Full features: `rt-multi-thread`, `macros`, `signal` |
| `serde` | Serialization | Always with `derive` feature |
| `reqwest` | HTTP client | Async, cookie support, TLS via rustls |
| `axum` | HTTP server | Tower ecosystem, extractors, async-native |
| `sqlx` | Database | Compile-time query checking, async, migrations |
| `clap` | CLI args | Derive API, not builder. Subcommands via enum |
| `tracing` | Logging/diagnostics | Structured, async-aware, span-based |
| `insta` | Snapshot testing | `assert_yaml_snapshot!`, `cargo insta review` |

**Do not use:**
- `actix-web` — use axum (tower ecosystem, simpler)
- `diesel` — use sqlx (compile-time checking, async)
- `log` — use tracing (structured, async-aware)
- `structopt` — merged into clap derive
- `failure` — dead crate, use thiserror/anyhow

---

## Clippy & Formatting

Always run these before committing:

```bash
cargo fmt --all
cargo clippy --all-targets --all-features -- -D warnings
```

Recommended clippy lints in `Cargo.toml`:

```toml
[lints.clippy]
pedantic = { level = "warn", priority = -1 }
nursery = { level = "warn", priority = -1 }
unwrap_used = "deny"
expect_used = "warn"
```

Or at crate level in `lib.rs` / `main.rs`:

```rust
#![warn(clippy::pedantic, clippy::nursery)]
#![deny(clippy::unwrap_used)]
```

---

## Additional Resources

See the `references/` directory for detailed templates and patterns:

- **`cargo-toml-templates.md`** — Complete Cargo.toml templates for single binary, library crate with features, and workspace root with inheritance.
- **`common-patterns.md`** — Extended patterns: `From`/`Into`, iterator chains, `Arc<Mutex<T>>` vs `Arc<RwLock<T>>`, `Cow<'_, str>`, trait objects vs generics, derive macro stacking.

### Context7 Documentation

For up-to-date API details, use Context7 to query:
- `/tokio-rs/tokio` — Tokio async runtime API
- `/serde-rs/serde` — Serialization/deserialization
