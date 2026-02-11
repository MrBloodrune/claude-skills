# Default Rules

When the user doesn't specify constraints, apply these defaults in the Rules section of the Ralph prompt. Remove any that conflict with the project's actual stack.

## Always Include

```
- Do NOT add features not described in the phases above. No extras, no "nice to haves."
- Do NOT add comments explaining obvious code. Code should be self-documenting.
- After each phase, update `progress.md` at the project root marking completed items.
- After each phase, commit with a conventional commit message: `feat(<name>): phase N — <description>`
- Run verification steps. If verification fails, fix the issue before moving to the next phase. Do not skip verification.
```

## Stack-Specific Defaults

### Node.js / JavaScript
```
- Do NOT install npm packages unless explicitly listed in the stack. Prefer Node.js built-ins.
- Do NOT add TypeScript unless the project requires it. Plain JavaScript with ESM imports.
- Do NOT create a package.json unless test dependencies require it.
```

### Python
```
- Do NOT install pip packages unless explicitly listed. Prefer stdlib.
- Do NOT use type hints on unchanged code.
- Do NOT create virtual environments — assume the user manages their own.
```

### Rust
```
- Do NOT add crate dependencies unless explicitly listed.
- Do NOT add clippy allows without justification.
- Use edition 2024.
```

### Frontend / UI
```
- Do NOT split the UI into multiple files unless the design doc specifies it.
- Do NOT add CSS frameworks unless explicitly listed in the stack.
```

## Scope-Based Defaults

### Small projects (3-5 phases)
```
- Keep each source file under 300 lines.
```

### Medium projects (6-9 phases)
```
- Keep each source file under 500 lines.
- No file should have more than 3 responsibilities.
```

### Large projects (10+ phases)
```
- Keep each source file under 500 lines.
- Extract shared utilities only when used by 3+ files.
- No circular dependencies between modules.
```
