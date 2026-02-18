---
name: compile-skill
description: Compile a marketplace skill into embedded-friendly format (.memory + .md)
argument-hint: "<skill-path> [output-dir]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
  - AskUserQuestion
---

# Compile Skill Command

Compile a marketplace-format Claude Code skill into minified embedded format.

## Process

1. **Validate the source skill path**
   - If `$ARGUMENTS` contains a skill path, use it
   - If no path given, ask the user which skill to compile
   - Verify the path contains a `SKILL.md` with YAML frontmatter

2. **Determine output directory**
   - If provided in arguments, use it
   - Default: `./compiled-skills/`

3. **Load the skill-compiler skill** for full guidance on budget and optimization

4. **Run the compiler script**
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/scripts/compile-skill.sh \
     <skill-dir> <output-dir> --budget 11776
   ```

5. **Review output**
   - Read the generated `.memory` file — verify it's concise and well-triggered
   - Read the generated `.md` file — check size and completeness
   - Check `.manifest.json` for budget utilization

6. **If budget exceeded or files too large**, guide the user through optimization:
   - Suggest description rewrites for oversized `.memory` files
   - Offer to minify the `.md` body (remove examples, collapse prose)
   - Present budget utilization breakdown

7. **Report results**
   - Files generated and their sizes
   - Budget utilization percentage
   - Any warnings or recommendations
