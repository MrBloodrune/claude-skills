# Playwright Configuration for SvelteKit

Copy this `playwright.config.ts` into the project root. Adjust ports and commands as needed.

## playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	// ──────────────────────────────────────────────
	// Test discovery
	// ──────────────────────────────────────────────
	testDir: './tests/e2e',
	testMatch: '**/*.spec.ts',

	// ──────────────────────────────────────────────
	// Parallelism and retries
	// ──────────────────────────────────────────────
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,

	// ──────────────────────────────────────────────
	// Reporters
	// ──────────────────────────────────────────────
	reporter: [
		['list'],
		['html', { open: 'never' }]
	],

	// ──────────────────────────────────────────────
	// Shared settings for all projects
	// ──────────────────────────────────────────────
	use: {
		baseURL: 'http://localhost:5173',

		// Tracing: capture on first retry for debugging
		trace: 'on-first-retry',

		// Screenshots: capture on failure for CI debugging
		screenshot: 'only-on-failure',

		// Timeouts
		actionTimeout: 10_000,
		navigationTimeout: 15_000
	},

	// ──────────────────────────────────────────────
	// Global timeout per test
	// ──────────────────────────────────────────────
	timeout: 30_000,
	expect: {
		timeout: 5_000,
		toHaveScreenshot: {
			maxDiffPixelRatio: 0.01
		}
	},

	// ──────────────────────────────────────────────
	// Browser projects
	// ──────────────────────────────────────────────
	projects: [
		// Primary: Chromium
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},

		// Cross-browser: Firefox
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] }
		},

		// Cross-browser: WebKit (Safari)
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] }
		}
	],

	// ──────────────────────────────────────────────
	// SvelteKit dev server
	// ──────────────────────────────────────────────
	webServer: {
		command: 'pnpm dev',
		port: 5173,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
```

## With Authentication Setup Project

When tests need authentication, add a setup project that runs first:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	testMatch: '**/*.spec.ts',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,

	reporter: [
		['list'],
		['html', { open: 'never' }]
	],

	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},

	projects: [
		// Auth setup -- runs before browser projects
		{
			name: 'setup',
			testMatch: /.*\.setup\.ts/
		},

		// Primary: Chromium (authenticated)
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'tests/.auth/user.json'
			},
			dependencies: ['setup']
		},

		// Firefox (authenticated)
		{
			name: 'firefox',
			use: {
				...devices['Desktop Firefox'],
				storageState: 'tests/.auth/user.json'
			},
			dependencies: ['setup']
		},

		// WebKit (authenticated)
		{
			name: 'webkit',
			use: {
				...devices['Desktop Safari'],
				storageState: 'tests/.auth/user.json'
			},
			dependencies: ['setup']
		}
	],

	webServer: {
		command: 'pnpm dev',
		port: 5173,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
```

## CI-Only Config Overrides

For CI environments, use environment variables to control behavior:

```typescript
// In the use block:
use: {
	baseURL: process.env.BASE_URL || 'http://localhost:5173',
	trace: process.env.CI ? 'on-first-retry' : 'off',
	screenshot: process.env.CI ? 'only-on-failure' : 'off',
	video: process.env.CI ? 'retain-on-failure' : 'off'
}
```

## Common Scripts (package.json)

```json
{
	"scripts": {
		"test:e2e": "playwright test",
		"test:e2e:ui": "playwright test --ui",
		"test:e2e:chromium": "playwright test --project=chromium",
		"test:e2e:update-snapshots": "playwright test --update-snapshots",
		"test:e2e:report": "playwright show-report"
	}
}
```
