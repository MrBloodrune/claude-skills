# Workflow: Build

**Use when:** Producing artifacts (HTML pages, components, documentation).

## Stages

1. **research** — Understand the subject matter before building
2. **validate** — Confirm research is sufficient and accurate
3. **create** — Execute domain skill to produce the artifact
4. **test** — Verify artifact correctness
5. **debug** — Fix issues found in test (max 2 attempts, then escalate)

## Stage Details

### 1. research
- Worker template: `research-worker.md`
- Scope: Source files relevant to this build unit
- Output: Concept summary, key details, structure recommendations

### 2. validate
- Worker template: `validation-worker.md`
- Input: Research summary + source files
- Criteria: "Is the research complete enough to build the artifact?"
- On FAIL: Return to research with specific gaps identified

### 3. create
- Worker template: `domain-worker.md`
- Skill: From registry, matched to task type
- Input: Research summary + source files + output path
- Output: Artifact at specified path
- **Track agent ID** for potential debug-cycle resume

### 4. test
- Worker template: `validation-worker.md`
- Input: Created artifact path
- Criteria: File exists, content is well-formed, skill-specific checks (e.g., HTML renders, links resolve)
- On PASS: Proceed to completion
- On FAIL: Proceed to debug

### 5. debug
- **Resume original create worker** by agent ID if available
- Input: Test failure details + artifact path
- On success: Return to test stage
- On second failure: Escalate — `[ESCALATE] {task} failed: {failure details}`

## Completion

Report: artifact path, skill used, pass/fail status.
