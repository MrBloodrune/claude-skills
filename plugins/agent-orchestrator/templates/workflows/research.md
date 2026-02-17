# Workflow: Research

**Use when:** Gathering and distilling information. No artifacts produced.

## Stages

1. **explore** — Dispatch research workers to scan the target scope. Each worker gets a specific question or area.
2. **summarize** — Dispatch a research worker to consolidate findings from explore stage into a structured summary.
3. **validate** — Dispatch a validation worker to cross-check the summary against source material for accuracy.

## Stage Details

### 1. explore
- Worker template: `research-worker.md`
- Parallelism: Yes — dispatch multiple workers for independent questions
- Output: Each worker returns text findings to Manager context

### 2. summarize
- Worker template: `research-worker.md`
- Input: Concatenated findings from explore stage
- Output: Structured summary (key concepts, relationships, gaps)

### 3. validate
- Worker template: `validation-worker.md`
- Input: Summary + original source file paths
- Criteria: "Does the summary accurately reflect the source material?"
- On FAIL: Return to summarize with corrections

## Completion

Report findings summary. No files written.
