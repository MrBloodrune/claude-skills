# Workflow: Validate

**Use when:** Verifying existing artifacts against requirements. No artifacts produced or modified.

## Stages

1. **check** — Read and analyze each artifact
2. **compare** — Cross-reference against requirements or source material
3. **report** — Produce structured validation report

## Stage Details

### 1. check
- Worker template: `validation-worker.md`
- Parallelism: Yes — one worker per artifact or artifact group
- Criteria: Structural integrity, format correctness, content present

### 2. compare
- Worker template: `validation-worker.md`
- Input: Check results + original requirements/decomposition
- Criteria: "Does the artifact set cover all required deliverables?"

### 3. report
- Worker template: `research-worker.md`
- Input: All check and compare results
- Output: Consolidated report with pass/fail per artifact, gaps, warnings

## Completion

Report validation results. No files modified.
