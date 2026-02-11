# Common Rust Patterns

Extended patterns beyond the basics covered in SKILL.md.

---

## From / Into Implementations

### When to implement `From`

Implement `From<A> for B` when the conversion is infallible and logically "widening."

```rust
pub struct UserId(u64);

impl From<u64> for UserId {
    fn from(id: u64) -> Self {
        Self(id)
    }
}

// This automatically gives you Into<UserId> for u64
fn lookup_user(id: impl Into<UserId>) {
    let user_id: UserId = id.into();
    // ...
}
```

### When to use `TryFrom`

Use `TryFrom` when conversion can fail. Do not implement `From` and panic on invalid input.

```rust
use std::convert::TryFrom;

pub struct Percentage(u8);

impl TryFrom<u8> for Percentage {
    type Error = &'static str;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        if value > 100 {
            return Err("percentage must be 0-100");
        }
        Ok(Self(value))
    }
}

// Usage:
// let p = Percentage::try_from(50).unwrap();  // Ok
// let p = Percentage::try_from(150);           // Err
```

### Decision Guide

| Scenario | Implement |
|----------|-----------|
| Infallible widening conversion | `From<A> for B` |
| Fallible or lossy conversion | `TryFrom<A> for B` |
| Accept flexible input in function args | `impl Into<T>` parameter |
| Your type wraps another type | `From<Inner> for Wrapper` |
| Converting between error types | `From<SourceError> for MyError` (or `#[from]` with thiserror) |

Never implement both `From` in both directions between two types; that creates confusing bidirectional implicit conversions.

---

## Iterator Adapter Chains

Real-world example: parse a config file, filter comments and empty lines, extract key-value pairs, collect into a map.

```rust
use std::collections::HashMap;

pub fn parse_env_file(content: &str) -> HashMap<String, String> {
    content
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .filter_map(|line| {
            let (key, value) = line.split_once('=')?;
            Some((key.trim().to_owned(), value.trim().to_owned()))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_env_file() {
        let input = r#"
            # Database config
            DB_HOST=localhost
            DB_PORT=5432

            # Empty lines are skipped
            APP_NAME=my-app
            INVALID_LINE_NO_EQUALS
        "#;

        let env = parse_env_file(input);
        assert_eq!(env.get("DB_HOST").unwrap(), "localhost");
        assert_eq!(env.get("DB_PORT").unwrap(), "5432");
        assert_eq!(env.get("APP_NAME").unwrap(), "my-app");
        assert!(!env.contains_key("INVALID_LINE_NO_EQUALS"));
        assert_eq!(env.len(), 3);
    }
}
```

### Common Iterator Patterns

```rust
// Enumerate with index
let indexed: Vec<(usize, &str)> = items.iter()
    .enumerate()
    .collect();

// Chain two iterators
let combined: Vec<i32> = first.iter()
    .chain(second.iter())
    .copied()
    .collect();

// Partition into two collections
let (evens, odds): (Vec<i32>, Vec<i32>) = numbers.iter()
    .partition(|&&n| n % 2 == 0);

// Fold into a single value
let total: i32 = prices.iter()
    .filter(|&&p| p > 0)
    .fold(0, |acc, &p| acc + p);

// Find first match
let found = items.iter()
    .find(|item| item.name == "target");

// Check conditions
let all_valid = items.iter().all(|item| item.is_valid());
let any_expired = items.iter().any(|item| item.is_expired());

// Flat map nested structures
let all_tags: Vec<&str> = articles.iter()
    .flat_map(|article| article.tags.iter())
    .map(|tag| tag.as_str())
    .collect();

// Dedup consecutive duplicates (sort first for global dedup)
let mut values = vec![1, 1, 2, 3, 3, 2, 1];
values.sort();
values.dedup();
// values = [1, 2, 3]

// Windows and chunks
let moving_avg: Vec<f64> = prices
    .windows(3)
    .map(|w| w.iter().sum::<f64>() / w.len() as f64)
    .collect();
```

---

## Arc<Mutex<T>> vs Arc<RwLock<T>>

### Arc<Mutex<T>> — Exclusive Access

Use when most accesses mutate the data, or when critical sections are short.

```rust
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct Counter {
    count: Arc<Mutex<u64>>,
}

impl Counter {
    pub fn new() -> Self {
        Self {
            count: Arc::new(Mutex::new(0)),
        }
    }

    pub fn increment(&self) -> u64 {
        let mut count = self.count.lock().expect("mutex poisoned");
        *count += 1;
        *count
    }

    pub fn get(&self) -> u64 {
        *self.count.lock().expect("mutex poisoned")
    }
}
```

### Arc<RwLock<T>> — Read-Heavy Workloads

Use when reads vastly outnumber writes. Multiple readers can hold the lock simultaneously.

```rust
use std::sync::{Arc, RwLock};
use std::collections::HashMap;

#[derive(Clone)]
pub struct ConfigStore {
    data: Arc<RwLock<HashMap<String, String>>>,
}

impl ConfigStore {
    pub fn new() -> Self {
        Self {
            data: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn get(&self, key: &str) -> Option<String> {
        let data = self.data.read().expect("rwlock poisoned");
        data.get(key).cloned()
    }

    pub fn set(&self, key: String, value: String) {
        let mut data = self.data.write().expect("rwlock poisoned");
        data.insert(key, value);
    }
}
```

### Async Equivalent: tokio::sync

In async code, use `tokio::sync::Mutex` and `tokio::sync::RwLock` instead of `std::sync` variants.

```rust
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;

#[derive(Clone)]
pub struct AsyncCache {
    store: Arc<RwLock<HashMap<String, String>>>,
}

impl AsyncCache {
    pub fn new() -> Self {
        Self {
            store: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn get(&self, key: &str) -> Option<String> {
        let store = self.store.read().await;
        store.get(key).cloned()
    }

    pub async fn set(&self, key: String, value: String) {
        let mut store = self.store.write().await;
        store.insert(key, value);
    }
}
```

### Decision Guide

| Situation | Use |
|-----------|-----|
| Most accesses are writes | `Mutex<T>` |
| Reads vastly outnumber writes | `RwLock<T>` |
| Short critical sections | `Mutex<T>` (less overhead than RwLock) |
| Async context | `tokio::sync::Mutex` / `tokio::sync::RwLock` |
| Single-threaded async | `RefCell<T>` (no Arc needed) |
| Lock-free atomic updates | `AtomicU64`, `AtomicBool`, etc. |

---

## Cow<'_, str> for Flexible String APIs

Use `Cow<'_, str>` when a function might return borrowed or owned data, avoiding unnecessary allocations.

```rust
use std::borrow::Cow;

/// Normalize a username: lowercase, trim whitespace.
/// Returns borrowed data if no changes needed, owned if modified.
pub fn normalize_username(input: &str) -> Cow<'_, str> {
    let trimmed = input.trim();
    if trimmed == input && trimmed.chars().all(|c| c.is_lowercase()) {
        // No modification needed — return borrowed reference
        Cow::Borrowed(input)
    } else {
        // Modification needed — allocate new String
        Cow::Owned(trimmed.to_lowercase())
    }
}

/// Accept any string-like input without forcing callers to allocate
pub fn greet(name: impl Into<Cow<'static, str>>) -> String {
    let name = name.into();
    format!("Hello, {name}!")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_already_clean() {
        let result = normalize_username("alice");
        assert!(matches!(result, Cow::Borrowed(_)));
        assert_eq!(result, "alice");
    }

    #[test]
    fn normalize_needs_work() {
        let result = normalize_username("  ALICE  ");
        assert!(matches!(result, Cow::Owned(_)));
        assert_eq!(result, "alice");
    }

    #[test]
    fn greet_with_static_str() {
        assert_eq!(greet("world"), "Hello, world!");
    }

    #[test]
    fn greet_with_owned_string() {
        assert_eq!(greet(String::from("world")), "Hello, world!");
    }
}
```

### When to Use Cow

| Situation | Use |
|-----------|-----|
| Function sometimes returns input unchanged | `Cow<'_, str>` |
| Deserialized data that's usually a default | `Cow<'static, str>` |
| Config values that may come from static or runtime | `Cow<'static, str>` |
| Simple owned return | Just use `String` |
| Simple borrowed return | Just use `&str` |

---

## Trait Objects vs Generics

### Generics (`impl Trait`) — Monomorphization

The compiler generates specialized code for each concrete type. Zero-cost abstraction at runtime.

```rust
pub fn process<W: std::io::Write>(writer: &mut W, data: &[u8]) -> std::io::Result<()> {
    writer.write_all(data)?;
    writer.flush()
}

// Equivalent shorthand:
pub fn process_short(writer: &mut impl std::io::Write, data: &[u8]) -> std::io::Result<()> {
    writer.write_all(data)?;
    writer.flush()
}
```

### Trait Objects (`dyn Trait`) — Dynamic Dispatch

Use when you need heterogeneous collections or to reduce binary size.

```rust
pub trait Plugin: Send + Sync {
    fn name(&self) -> &str;
    fn execute(&self, input: &str) -> String;
}

pub struct PluginRegistry {
    plugins: Vec<Box<dyn Plugin>>,
}

impl PluginRegistry {
    pub fn new() -> Self {
        Self { plugins: Vec::new() }
    }

    pub fn register(&mut self, plugin: Box<dyn Plugin>) {
        self.plugins.push(plugin);
    }

    pub fn run_all(&self, input: &str) -> Vec<String> {
        self.plugins.iter().map(|p| p.execute(input)).collect()
    }
}
```

### Decision Guide

| Situation | Use | Reason |
|-----------|-----|--------|
| Performance-critical hot path | Generics | Monomorphized, inlined |
| Heterogeneous collection of types | `dyn Trait` | Can't monomorphize a `Vec<impl T>` |
| Public API with few callers | Generics | Ergonomic, zero-cost |
| Plugin/extension system | `dyn Trait` | Unknown types at compile time |
| Reduce binary size | `dyn Trait` | One copy of code, not N copies |
| Return different types from branches | `Box<dyn Trait>` | Return type must be sized |
| Async trait methods | Generics + `impl Future` | `dyn Trait` with async requires boxing |

### Return Position impl Trait

```rust
// Returns an iterator without exposing the concrete type
pub fn even_numbers(limit: usize) -> impl Iterator<Item = usize> {
    (0..limit).filter(|n| n % 2 == 0)
}
```

---

## Derive Macro Stacking Convention

Standard order for derive macros. Apply only what you need, but keep them in this order.

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct UserId(u64);
```

### Ordering Convention

1. **`Debug`** — almost always. Required for `expect()`/`unwrap()` error messages and `assert_eq!`.
2. **`Clone`** — when value semantics are needed.
3. **`Copy`** — only for small, trivially copyable types (integers, newtypes over Copy types).
4. **`PartialEq`, `Eq`** — for equality comparison and `assert_eq!`.
5. **`PartialOrd`, `Ord`** — only when ordering is meaningful.
6. **`Hash`** — when used as `HashMap`/`HashSet` keys.
7. **`Default`** — when a zero/empty value makes sense.
8. **`Serialize`, `Deserialize`** — when crossing serialization boundaries.

### What NOT to derive blindly

```rust
// DON'T derive Clone on types holding OS resources
// DON'T derive Copy on types that will grow (breaks ABI)
// DON'T derive Default on types where "empty" is invalid
// DON'T derive PartialEq on types with floating-point fields (use approx comparison)

// DO derive Debug on everything
// DO derive Clone on data-only structs
// DO gate Serialize/Deserialize behind a feature flag in libraries:

#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct Config {
    pub name: String,
    pub port: u16,
}
```

### Feature-Gated Serde

In library crates, gate serde behind a feature to avoid forcing it on all consumers:

```toml
[features]
default = []
serde = ["dep:serde"]

[dependencies]
serde = { version = "1", features = ["derive"], optional = true }
```

```rust
#[derive(Debug, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct MyType {
    pub field: String,
}
```
