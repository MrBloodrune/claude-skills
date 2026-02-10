#!/usr/bin/env node

/**
 * Link Scraper - Extract article content from URLs
 *
 * Usage: node link-scraper.js <url>
 *
 * Output: JSON with extracted content
 * {
 *   "title": "Article Title",
 *   "author": "Author Name",
 *   "date": "2026-01-13",
 *   "content": "Article content...",
 *   "summary": "Brief summary...",
 *   "url": "https://...",
 *   "domain": "example.com",
 *   "category": "technology"
 * }
 *
 * Dependencies: playwright (or puppeteer), node-fetch
 * Install: npm install playwright
 */

const { chromium } = require('playwright');

const TIMEOUT = 30000;

// Domain-specific extraction rules
const EXTRACTORS = {
  'medium.com': {
    title: 'article h1',
    author: 'a[data-testid="authorName"]',
    content: 'article section',
    date: 'span[data-testid="storyPublishDate"]'
  },
  'dev.to': {
    title: 'h1.crayons-article__title',
    author: '.crayons-article__subheader a',
    content: '#article-body',
    date: 'time'
  },
  'github.com': {
    title: 'article h1, .markdown-body h1',
    author: '.author',
    content: '.markdown-body',
    date: 'relative-time'
  },
  'default': {
    title: 'h1, title, meta[property="og:title"]',
    author: 'meta[name="author"], .author, .byline',
    content: 'article, main, .post-content, .entry-content, .content',
    date: 'time, meta[property="article:published_time"]'
  }
};

async function extractContent(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT
    });

    // Wait for content to load
    await page.waitForTimeout(2000);

    const domain = new URL(url).hostname.replace('www.', '');
    const extractor = EXTRACTORS[domain] || EXTRACTORS['default'];

    const result = await page.evaluate((ext) => {
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };

      const getContent = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;

        // Remove scripts, styles, nav, ads
        const clone = el.cloneNode(true);
        clone.querySelectorAll('script, style, nav, aside, .ad, .advertisement, .sidebar').forEach(e => e.remove());

        return clone.textContent.trim().replace(/\s+/g, ' ');
      };

      const getMeta = (name) => {
        const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
        return el ? el.getAttribute('content') : null;
      };

      // Try multiple selectors
      const trySelectors = (selectorString) => {
        const selectors = selectorString.split(', ');
        for (const sel of selectors) {
          const result = getText(sel);
          if (result) return result;
        }
        return null;
      };

      return {
        title: trySelectors(ext.title) || getMeta('og:title') || document.title,
        author: trySelectors(ext.author) || getMeta('author'),
        date: trySelectors(ext.date) || getMeta('article:published_time'),
        content: getContent(ext.content.split(', ')[0]) || getContent('body'),
        description: getMeta('og:description') || getMeta('description'),
        image: getMeta('og:image')
      };
    }, extractor);

    // Clean and structure result
    const output = {
      url,
      domain,
      title: result.title || 'Untitled',
      author: result.author || 'Unknown',
      date: result.date || new Date().toISOString().split('T')[0],
      content: result.content ? result.content.substring(0, 50000) : '',
      summary: result.description || (result.content ? result.content.substring(0, 300) + '...' : ''),
      image: result.image,
      category: categorizeContent(result.title, result.content, domain)
    };

    await browser.close();
    return output;

  } catch (error) {
    await browser.close();
    return {
      url,
      domain: new URL(url).hostname,
      error: error.message,
      title: 'Failed to extract',
      content: '',
      category: 'inbox'
    };
  }
}

function categorizeContent(title, content, domain) {
  const text = `${title} ${content}`.toLowerCase();

  // Technology/Dev signals
  const devSignals = [
    'kubernetes', 'docker', 'api', 'code', 'programming', 'javascript',
    'python', 'rust', 'git', 'ci/cd', 'devops', 'linux', 'server',
    'database', 'backend', 'frontend', 'framework', 'library'
  ];

  // Technology signals
  const techSignals = [
    'software', 'app', 'tool', 'hardware', 'gadget', 'device',
    'cloud', 'saas', 'platform'
  ];

  // Finance signals
  const financeSignals = [
    'money', 'price', 'cost', 'investment', 'stock', 'crypto',
    'budget', 'savings', 'financial'
  ];

  // Dev-focused domains
  const devDomains = ['github.com', 'dev.to', 'stackoverflow.com', 'medium.com'];

  if (devDomains.includes(domain) || devSignals.some(s => text.includes(s))) {
    return 'technology-dev';
  }

  if (techSignals.some(s => text.includes(s))) {
    return 'technology';
  }

  if (financeSignals.some(s => text.includes(s))) {
    return 'finance';
  }

  return 'content';
}

// Main execution
async function main() {
  const url = process.argv[2];

  if (!url) {
    console.error(JSON.stringify({ error: 'Usage: node link-scraper.js <url>' }));
    process.exit(1);
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.error(JSON.stringify({ error: 'URL must start with http:// or https://' }));
    process.exit(1);
  }

  try {
    const result = await extractContent(url);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

main();
