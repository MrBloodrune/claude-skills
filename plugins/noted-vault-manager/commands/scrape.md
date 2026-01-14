---
name: scrape
description: Fetch article content from a URL, extract meaningful content, and create a structured note in the appropriate vault location.
argument-hint: "<url>"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - WebFetch
---

# Scrape Link Command

Fetch article content from a URL and create a structured note in the vault.

## Arguments

- **url** (required): Full URL to fetch and process

## Execution Steps

1. **Validate URL**
   - Verify URL format (must start with http:// or https://)
   - Check for blocked domains if configured

2. **Fetch content**
   - Use WebFetch tool to retrieve page content
   - Extract: title, author, publish date, main content
   - Handle common article formats (Medium, Dev.to, GitHub, blogs)

3. **Determine category**
   - Analyze content to determine appropriate folder
   - Technical content → `Technology/` or `Technology/Dev/`
   - General articles → `Content/`
   - If uncertain → `Inbox/`

4. **Create note**
   - Use Link/Article template
   - Populate with extracted content
   - Add source URL
   - Add backlink to current Daily note

5. **Report result**
   - Path to created note
   - Summary of extracted content

## Example Usage

```
/noted:scrape https://blog.example.com/kubernetes-best-practices
# Creates: Technology/Dev/Kubernetes Best Practices.md

/noted:scrape https://medium.com/@author/interesting-article
# Creates: Content/Interesting Article.md
```

## Content Extraction

The scraper extracts:

| Field | Source |
|-------|--------|
| Title | `<title>`, `<h1>`, `og:title` |
| Author | `<meta name="author">`, byline |
| Date | `<meta name="date">`, `<time>` |
| Content | Main article body, `<article>`, `.post-content` |
| Images | Featured image, inline images (optional) |

## Note Template

Created notes follow this structure:

```markdown
---
tags:
  - 📝
  - 🔗
  - article
---
Links: [[Daily/YYYY-MM-DD]]
Source: [Article Title](https://url.com)
Author: Author Name
Date: YYYY-MM-DD

# Summary

[AI-generated summary of key points]

# Content

[Extracted article content]

# My Notes

[Empty section for user annotations]
```

## Error Handling

- **URL unreachable**: Report error, suggest manual creation
- **Paywall detected**: Create placeholder note with URL only
- **Content extraction failed**: Create minimal note with URL and title
- **Rate limited**: Wait and retry, or report to user

## Domain-Specific Handling

Some domains need special extraction:

| Domain | Handler |
|--------|---------|
| medium.com | Remove clutter, extract story |
| dev.to | Extract markdown content |
| github.com | Extract README or file content |
| youtube.com | Extract video title, description |
| twitter.com/x.com | Extract thread content |

## Output Format

```
Scraping: https://blog.example.com/article...

Title: "Kubernetes Best Practices for 2026"
Author: Jane Developer
Date: 2026-01-10

Category: Technology/Dev
Creating note...

✓ Created: Technology/Dev/Kubernetes Best Practices for 2026.md

Summary:
- 2,500 words extracted
- 3 code snippets preserved
- 2 images referenced
```
