# Workflow: Finalize

**Use when:** Quality gate on completed output. Dispatched as a dedicated Manager by the Director after all build Managers complete.

## Stages

1. **inventory** — Verify all expected files exist at output paths
2. **validate** — Check index.html links, page rendering, cross-references
3. **consistency** — Compare output against Director's original decomposition
4. **report** — Produce structured completion report

## Stage Details

### 1. inventory
- Worker template: `validation-worker.md`
- Input: Expected file list from Director's decomposition
- Criteria: Every expected file exists at its path
- Output: Present/missing file list

### 2. validate
- Worker template: `validation-worker.md`
- Parallelism: Yes — one worker per project directory
- Criteria: index.html links resolve to existing pages, pages are well-formed HTML
- On individual page FAIL: Dispatch domain worker to fix (one attempt), then note in report

### 3. consistency
- Worker template: `validation-worker.md`
- Input: Director's original decomposition + inventory results
- Criteria: "Was everything in the decomposition delivered?"
- Output: Coverage report — delivered, missing, extra

### 4. report
- Worker template: `research-worker.md`
- Input: All stage results
- Output: Structured completion report written to dispatch record:
  ```json
  {
    "pages_built": 4,
    "pages_failed": 0,
    "pages_fixed": 1,
    "warnings": ["register-map.html has no deep-dive modals"],
    "output_paths": ["~/projects/tutorials/spi-protocol/"],
    "status": "PASS"
  }
  ```

## Completion

Write report to dispatch record. Signal `[COMPLETE]` with summary.
