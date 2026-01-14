# Note Templates

Templates for creating notes in different categories.

## General Note Template

Use for most new notes in Technology, Plans, Content, etc.

```markdown
---
tags:
  - 📝
  - 🌱
---
Links: [[Daily/YYYY-MM-DD]]

# Introduction

Brief overview of the topic.

# Body

Main content goes here.

# Reference

- Source links
- Related notes
```

## Technology/Dev Note

For software development, coding, infrastructure topics.

```markdown
---
tags:
  - 📝
  - 🔧
  - dev
---
Links: [[Daily/YYYY-MM-DD]]

# Overview

What this is and why it matters.

# Details

Technical details, code snippets, configuration.

# Usage

How to use or implement.

# References

- Documentation links
- Related projects
```

## Research Note

For topics being actively researched or compared.

```markdown
---
tags:
  - 📝
  - 🔬
  - research
---
Links: [[Daily/YYYY-MM-DD]]

# Question

What are we trying to understand?

# Findings

Key discoveries and insights.

# Comparison

| Option A | Option B |
|----------|----------|
| Pros     | Pros     |
| Cons     | Cons     |

# Conclusion

Summary and decision if applicable.

# Sources

- Links to sources
```

## Social/Person Note

For tracking relationships and people.

```markdown
---
tags:
  - 📝
  - 👤
---
Links: [[Daily/YYYY-MM-DD]]

# About

How I know this person, relationship context.

# Interactions

## YYYY-MM-DD
- What we discussed
- Action items

# Notes

Preferences, interests, things to remember.
```

## Finance Note

For financial topics, purchases, planning.

```markdown
---
tags:
  - 📝
  - 💰
---
Links: [[Daily/YYYY-MM-DD]]

# Summary

What this is about financially.

# Details

- Amount: $X
- Date: YYYY-MM-DD
- Category: [Purchase/Bill/Investment/etc.]

# Notes

Additional context or considerations.
```

## Plans/Project Note

For goals, project planning, future ideas.

```markdown
---
tags:
  - 📝
  - 🎯
  - project
---
Links: [[Daily/YYYY-MM-DD]]

# Vision

What success looks like.

# Requirements

- [ ] Requirement 1
- [ ] Requirement 2

# Approach

How to achieve this.

# Status

Current state and next steps.
```

## Link/Article Note

For saved articles and web content.

```markdown
---
tags:
  - 📝
  - 🔗
  - article
---
Links: [[Daily/YYYY-MM-DD]]
Source: [Article Title](https://url.com)

# Summary

Key points from the article.

# Highlights

> Notable quotes or sections

# My Thoughts

Personal takeaways and how it applies.

# Related

- [[Related Note 1]]
- [[Related Note 2]]
```

## Quick Placeholder Note

For rapid capture when full note isn't needed yet.

```markdown
---
tags:
  - 📝
  - 🌱
---
Links: [[Daily/YYYY-MM-DD]]

# Note

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
| Uncertain | Quick Placeholder | Inbox/ |

## Tag Guidelines

Apply tags based on content type:

| Tag | Use When |
|-----|----------|
| 📝 | All notes (default) |
| 🌱 | New/seedling ideas |
| 🔧 | Technical/dev content |
| 🔬 | Research/investigation |
| 👤 | People/social |
| 💰 | Financial |
| 🎯 | Goals/projects |
| 🔗 | Links/articles |
| 🚨 | Urgent/important |

## Frontmatter Requirements

Every note MUST have:
1. `tags:` array (minimum one tag)
2. `Links:` field with backlink to source Daily note

Optional but recommended:
- `Source:` for web content
- `Created:` date if not using Daily link
- `Status:` for project/task notes
