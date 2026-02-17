# Workflow: Refactor

**Use when:** Improving or updating existing artifacts.

## Stages

1. **analyze** — Understand current artifact state and what needs to change
2. **modify** — Apply changes via domain skill
3. **test** — Verify modifications didn't break anything

## Stage Details

### 1. analyze
- Worker template: `research-worker.md`
- Scope: Existing artifact + requirements for changes
- Output: Change plan — what to modify, what to preserve

### 2. modify
- Worker template: `domain-worker.md`
- Skill: Same skill that produced the original artifact
- Input: Existing artifact path + change plan
- **Track agent ID** for potential debug-cycle resume

### 3. test
- Worker template: `validation-worker.md`
- Criteria: Changes applied correctly, existing functionality preserved
- On FAIL: Resume modify worker with failure details (max 2 attempts, then escalate)

## Completion

Report: artifact path, changes applied, pass/fail status.
