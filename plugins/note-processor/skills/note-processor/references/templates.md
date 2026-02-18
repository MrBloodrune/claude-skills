# Note Templates

Templates for creating notes. Select based on the Template Selection Guide at the bottom.

## General Note

```markdown
---
tags:
  - 📝
  - 🌱
---
Links: [[Daily/YYYY-MM-DD]]

# [Title]

[Content goes here]

## Reference

- Related: [[related notes]]
```

## Technology/Dev Note

```markdown
---
tags:
  - 📝
  - 🔧
  - dev
---
Links: [[Daily/YYYY-MM-DD]]

# [Title]

## Overview

What this is and why it matters.

## Details

Technical details, code snippets, configuration.

## References

- Documentation links
- Related projects
```

## Research Note

```markdown
---
tags:
  - 📝
  - 🔬
  - research
---
Links: [[Daily/YYYY-MM-DD]]

# [Question or Topic]

## Findings

Key discoveries and insights.

## Comparison

| Option A | Option B |
|----------|----------|
| Pros     | Pros     |
| Cons     | Cons     |

## Conclusion

Summary and decision if applicable.

## Sources

- Links to sources
```

## Social/Person Note

```markdown
---
tags:
  - 📝
  - 👤
---
Links: [[Daily/YYYY-MM-DD]]

# [Person Name]

## About

How I know this person, relationship context.

## Interactions

### YYYY-MM-DD
- What we discussed
- Action items

## Notes

Preferences, interests, things to remember.
```

## Finance Note

```markdown
---
tags:
  - 📝
  - 💰
---
Links: [[Daily/YYYY-MM-DD]]

# [Title]

## Summary

What this is about financially.

## Details

- Amount: $X
- Date: YYYY-MM-DD
- Category: [Purchase/Bill/Investment/etc.]

## Notes

Additional context or considerations.
```

## Plans/Project Note

```markdown
---
tags:
  - 📝
  - 🎯
  - project
---
Links: [[Daily/YYYY-MM-DD]]

# [Project/Goal Name]

## Vision

What success looks like.

## Requirements

- [ ] Requirement 1
- [ ] Requirement 2

## Approach

How to achieve this.

## Status

Current state and next steps.
```

## Link/Article Note

```markdown
---
tags:
  - 📝
  - 🔗
  - article
---
Links: [[Daily/YYYY-MM-DD]]
Source: [Article Title](https://url.com)

# [Article Title]

## Summary

Key points from the article.

## Highlights

> Notable quotes or sections

## My Thoughts

Personal takeaways and how it applies.

## Related

- [[Related Note 1]]
```

## Quick Placeholder Note

For rapid capture when a full note isn't justified:

```markdown
---
tags:
  - 📝
  - 🌱
---
Links: [[Daily/YYYY-MM-DD]]

# [Title]

[Raw capture content here]

---
*To be expanded*
```

## Template Selection Guide

| Content Type | Template | Target Folder |
|--------------|----------|---------------|
| Code/infrastructure | Technology/Dev | Technology/Dev/ |
| Tool/software | General Note | Technology/ |
| Person/relationship | Social/Person | Social/ |
| Money/purchase | Finance Note | Finance/ |
| Goal/project | Plans/Project | Plans/ |
| Article/link | Link/Article | [Category]/ |
| Research/comparison | Research Note | [Category]/ |
| DnD/gaming | General Note | Social/DnD/ |
| Uncertain | Quick Placeholder | Inbox/ |
