# Ralph Prompt Template

This is the exact structure for generated Ralph prompts. Every section is required unless marked optional.

```markdown
# <Project Name> — Ralph Wiggum Loop Prompt

## Usage

\`\`\`bash
cd <project-dir>
/ralph-loop
\`\`\`

When prompted, paste the Prompt section below. Set completion promise to `<PROMISE>` and max iterations to `<N>`.

---

## Prompt

You are building `<name>`, <one-line description>. The full design document is at `<path-to-design-doc>` — read it before starting any work.

Always use Opus 4.6 for all sub-agents.

### Project structure

<description of project layout — standalone, plugin, monorepo, etc.>

\`\`\`
<full file tree showing every file that will exist when complete>
\`\`\`

### Implementation phases

Work through these phases IN ORDER. Do not skip ahead. After completing each phase, mark it done by updating `progress.md` at the project root with checkboxes. Run verification after each phase before moving on.

#### Phase 1: <title>
- [ ] Create `<path>`
  - <specific requirements as bullet points>
- [ ] **Verify:** <exact pass/fail command>

#### Phase 2: <title>
...

#### Phase N: <title> (final — integration test)
- [ ] <run full test suite or smoke test>
- [ ] **Verify:** <command> — all tests pass, zero failures

### Rules

- Do NOT <constraint 1>
- Do NOT <constraint 2>
- Do NOT <constraint 3>
- Do NOT <constraint 4>
- Do NOT <constraint 5>
- <additional constraints as needed>
- After each phase, update `progress.md` at the project root marking completed items.
- After each phase, commit with a conventional commit message: `feat(<name>): phase N — <description>`
- Run verification steps. If verification fails, fix the issue before moving to the next phase. Do not skip verification.

### Completion

When ALL <N> phases are complete, <verification command> passes with zero failures, and progress.md shows every checkbox marked:

<PROMISE>
\`\`\`
```

## Template Rules

- The `## Usage` section goes ABOVE the `---` separator
- The `## Prompt` section goes BELOW the `---` separator (this is what gets fed to the loop)
- The completion promise MUST appear on its own line at the very end, no backticks, no formatting
- Promise format: `<PROJECT_NAME_UPPER>_COMPLETE` (e.g., `AGENT_SCRY_COMPLETE`)
- Every `#### Phase` must have at least one `- [ ] **Verify:**` line
- The Rules section must have at least 5 "Do NOT" constraints
- `progress.md` tracking and conventional commits are always included in Rules
- "Always use Opus 4.6 for all sub-agents" is always included in the Prompt preamble
