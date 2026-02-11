---
name: Svelte Playwright Testing
description: >-
  This skill should be used when writing Playwright tests for Svelte 5 components,
  setting up E2E testing for SvelteKit, testing accessibility, doing visual regression
  testing, or automating browser interactions for Svelte apps. Triggers on "playwright",
  "e2e test", "browser test", "component test", "visual regression", "accessibility test",
  "svelte test", "test svelte component".
---

# Svelte Playwright Testing

Write E2E tests for Svelte 5 + SvelteKit applications using Playwright. All tests run against the real SvelteKit dev server -- never use Playwright's experimental component testing.

## Project Setup

### Install Dependencies

```bash
pnpm add -D @playwright/test @axe-core/playwright
pnpm exec playwright install chromium
```

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [['html'], ['list']],

	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},

	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } }
	],

	webServer: {
		command: 'pnpm dev',
		port: 5173,
		reuseExistingServer: !process.env.CI
	}
});
```

### Directory Structure

```
tests/
├── e2e/
│   ├── home.spec.ts              # Per-page test files
│   ├── auth.spec.ts
│   ├── settings.spec.ts
│   └── components/
│       ├── dialog.spec.ts        # Per-component test files
│       └── accordion.spec.ts
├── fixtures/
│   ├── test.ts                   # Custom test.extend() fixtures
│   └── auth.ts                   # Auth fixture and helpers
└── snapshots/                    # Visual regression baselines (auto-generated)
```

### .gitignore Additions

```gitignore
# Playwright
test-results/
playwright-report/
blob-report/
tests/e2e/.cache/
```

---

## Selector Strategy

Always prefer accessibility-first selectors. The order of preference:

| Priority | Selector | When to Use |
|----------|----------|-------------|
| 1st | `getByRole()` | Always try first -- matches ARIA roles |
| 2nd | `getByLabel()` | Form inputs with associated labels |
| 3rd | `getByText()` | Visible text content (buttons, links, headings) |
| 4th | `getByPlaceholder()` | Inputs when no label exists |
| Last | `getByTestId()` | Only when no semantic selector works |

`data-testid` is a last resort. If you reach for it, first ask whether the component is missing proper ARIA attributes.

### bits-ui Component ARIA Roles

Map bits-ui primitives to the ARIA roles Playwright can query:

| bits-ui Component | ARIA Role | Playwright Selector |
|-------------------|-----------|---------------------|
| `Dialog.Content` | `dialog` | `getByRole('dialog')` |
| `Dialog.Title` | (heading) | `getByRole('heading')` inside dialog |
| `Accordion.Trigger` | `button` | `getByRole('button', { name: '...' })` |
| `Accordion.Content` | `region` | `getByRole('region')` |
| `Select.Trigger` | `combobox` | `getByRole('combobox')` |
| `Select.Item` | `option` | `getByRole('option', { name: '...' })` |
| `Tabs.Trigger` | `tab` | `getByRole('tab', { name: '...' })` |
| `Tabs.Content` | `tabpanel` | `getByRole('tabpanel')` |
| `Switch.Root` | `switch` | `getByRole('switch')` |
| `Checkbox.Root` | `checkbox` | `getByRole('checkbox')` |
| `Popover.Content` | (generic) | `getByRole('dialog')` or `locator('[data-popover-content]')` |
| `AlertDialog.Content` | `alertdialog` | `getByRole('alertdialog')` |

### Selector Examples

```typescript
// GOOD: Accessibility-first
await page.getByRole('button', { name: 'Save changes' }).click();
await page.getByRole('dialog').getByRole('heading', { name: 'Confirm' });
await page.getByLabel('Email address').fill('user@example.com');
await page.getByRole('combobox').click(); // bits-ui Select trigger
await page.getByRole('option', { name: 'Dark mode' }).click();

// AVOID: Test IDs when semantic selectors exist
await page.getByTestId('save-btn').click(); // Use getByRole instead
```

---

## Testing Svelte 5 Reactivity

### Test $state Changes

Click a button that increments `$state`, then assert the DOM updated:

```typescript
import { test, expect } from '@playwright/test';

test('counter increments on click', async ({ page }) => {
	await page.goto('/counter');

	const count = page.getByTestId('count');
	await expect(count).toHaveText('0');

	await page.getByRole('button', { name: 'Increment' }).click();
	await expect(count).toHaveText('1');

	await page.getByRole('button', { name: 'Increment' }).click();
	await page.getByRole('button', { name: 'Increment' }).click();
	await expect(count).toHaveText('3');
});
```

### Test $derived Computed Values

Verify that derived values update when their dependencies change:

```typescript
test('derived total updates when items change', async ({ page }) => {
	await page.goto('/cart');

	await expect(page.getByText('Total: $0.00')).toBeVisible();

	await page.getByRole('button', { name: 'Add Widget' }).click();
	await expect(page.getByText('Total: $9.99')).toBeVisible();

	await page.getByRole('button', { name: 'Add Widget' }).click();
	await expect(page.getByText('Total: $19.98')).toBeVisible();

	// Derived item count also updates
	await expect(page.getByText('2 items')).toBeVisible();
});
```

### Test $effect Side Effects

When `$effect` triggers async operations (API calls, DOM mutations), wait for the result:

```typescript
test('effect fetches data when filter changes', async ({ page }) => {
	await page.goto('/products');

	// Wait for initial load
	await expect(page.getByRole('list')).not.toBeEmpty();

	// Change filter -- triggers $effect that re-fetches
	await page.getByRole('combobox').click();
	await page.getByRole('option', { name: 'Electronics' }).click();

	// Wait for DOM to settle after reactive update
	await page.waitForFunction(() => {
		const items = document.querySelectorAll('[data-product-item]');
		return items.length > 0 && items[0].textContent?.includes('Electronics');
	});

	await expect(page.getByRole('listitem')).not.toHaveCount(0);
});
```

### Test $bindable Two-Way Bindings

Verify parent and child stay in sync through `$bindable`:

```typescript
test('bound value syncs between parent and child', async ({ page }) => {
	await page.goto('/form');

	const input = page.getByLabel('Username');
	const preview = page.getByTestId('username-preview');

	await input.fill('testuser');
	await expect(preview).toHaveText('testuser');

	// Clicking reset (parent sets value) also clears child input
	await page.getByRole('button', { name: 'Reset' }).click();
	await expect(input).toHaveValue('');
	await expect(preview).toHaveText('');
});
```

### Waiting for Reactive State to Settle

When complex reactivity chains take time, use `waitForFunction`:

```typescript
// Wait for a specific reactive state to resolve in the DOM
await page.waitForFunction(() => {
	return document.querySelector('[data-loading]') === null;
});

// Or wait for text content to match
await page.waitForFunction(
	(expected) => document.body.innerText.includes(expected),
	'Operation complete'
);
```

---

## Component Interaction Patterns

### Form Submission

```typescript
test('submits contact form and shows success', async ({ page }) => {
	await page.goto('/contact');

	await page.getByLabel('Name').fill('Jane Doe');
	await page.getByLabel('Email').fill('jane@example.com');
	await page.getByLabel('Message').fill('Hello from Playwright');

	// Intercept the form action to avoid hitting real API
	await page.route('**/api/contact', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ success: true })
		})
	);

	await page.getByRole('button', { name: 'Send message' }).click();

	await expect(page.getByText('Message sent successfully')).toBeVisible();
	// Form should reset after success
	await expect(page.getByLabel('Name')).toHaveValue('');
});
```

### Dropdown / Combobox Selection (bits-ui Select)

```typescript
test('selects theme from dropdown', async ({ page }) => {
	await page.goto('/settings');

	const trigger = page.getByRole('combobox');
	await expect(trigger).toHaveText('Select theme');

	await trigger.click();

	// bits-ui Select renders options with role="option"
	await expect(page.getByRole('option')).toHaveCount(3);
	await page.getByRole('option', { name: 'Dark' }).click();

	// Dropdown closes, trigger shows selected value
	await expect(trigger).toHaveText('Dark');
	await expect(page.getByRole('option')).not.toBeVisible();
});
```

### Dialog Open / Close

```typescript
test('opens and closes dialog with keyboard', async ({ page }) => {
	await page.goto('/settings');

	// Open dialog
	await page.getByRole('button', { name: 'Delete account' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	// Verify focus moved into dialog
	await expect(dialog.getByRole('heading', { name: 'Are you sure?' })).toBeVisible();

	// Close with Escape
	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();

	// Focus returns to trigger button
	await expect(page.getByRole('button', { name: 'Delete account' })).toBeFocused();
});
```

### Accordion Expand / Collapse

```typescript
test('expands and collapses accordion items', async ({ page }) => {
	await page.goto('/faq');

	const firstQuestion = page.getByRole('button', { name: 'What is your return policy?' });
	const firstAnswer = page.getByRole('region').filter({ hasText: 'You can return' });

	// Initially collapsed
	await expect(firstAnswer).not.toBeVisible();

	// Expand
	await firstQuestion.click();
	await expect(firstAnswer).toBeVisible();

	// Collapse
	await firstQuestion.click();
	await expect(firstAnswer).not.toBeVisible();
});
```

### Toast Notifications

```typescript
test('shows toast on save and auto-dismisses', async ({ page }) => {
	await page.goto('/settings');

	await page.getByRole('button', { name: 'Save' }).click();

	// Wait for toast to appear (animation)
	const toast = page.getByRole('status');
	await expect(toast).toBeVisible();
	await expect(toast).toHaveText('Settings saved');

	// Wait for toast to auto-dismiss (typically 3-5 seconds)
	await expect(toast).not.toBeVisible({ timeout: 6000 });
});
```

### Tab Navigation

```typescript
test('switches between tabs with keyboard', async ({ page }) => {
	await page.goto('/dashboard');

	const tablist = page.getByRole('tablist');
	const overviewTab = page.getByRole('tab', { name: 'Overview' });
	const analyticsTab = page.getByRole('tab', { name: 'Analytics' });

	// First tab is active by default
	await expect(overviewTab).toHaveAttribute('aria-selected', 'true');
	await expect(page.getByRole('tabpanel')).toContainText('Welcome');

	// Navigate with arrow keys
	await overviewTab.focus();
	await page.keyboard.press('ArrowRight');
	await expect(analyticsTab).toBeFocused();
	await page.keyboard.press('Enter');

	await expect(analyticsTab).toHaveAttribute('aria-selected', 'true');
	await expect(page.getByRole('tabpanel')).toContainText('Charts');
});
```

---

## Accessibility Testing

### axe-core Setup

Every test suite must include at least one accessibility scan.

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('accessibility', () => {
	test('home page has no accessibility violations', async ({ page }) => {
		await page.goto('/');

		const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});

	test('settings page has no violations', async ({ page }) => {
		await page.goto('/settings');

		const accessibilityScanResults = await new AxeBuilder({ page })
			.exclude('.third-party-widget') // Exclude elements you don't control
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
```

### Filter Known Issues

When third-party components have known violations you cannot fix:

```typescript
test('page passes axe excluding known issues', async ({ page }) => {
	await page.goto('/dashboard');

	const accessibilityScanResults = await new AxeBuilder({ page })
		.disableRules(['color-contrast']) // Only if documented why
		.analyze();

	expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Test Keyboard Navigation

```typescript
test('full keyboard navigation through form', async ({ page }) => {
	await page.goto('/signup');

	// Tab to first field
	await page.keyboard.press('Tab');
	await expect(page.getByLabel('Email')).toBeFocused();

	// Tab to password
	await page.keyboard.press('Tab');
	await expect(page.getByLabel('Password')).toBeFocused();

	// Tab to terms checkbox
	await page.keyboard.press('Tab');
	const checkbox = page.getByRole('checkbox', { name: 'I agree to terms' });
	await expect(checkbox).toBeFocused();

	// Toggle checkbox with Space
	await page.keyboard.press('Space');
	await expect(checkbox).toBeChecked();

	// Tab to submit button
	await page.keyboard.press('Tab');
	await expect(page.getByRole('button', { name: 'Sign up' })).toBeFocused();
});
```

### Test Focus Trap in Dialog

```typescript
test('dialog traps focus correctly', async ({ page }) => {
	await page.goto('/settings');

	// Open dialog
	await page.getByRole('button', { name: 'Confirm action' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	// Collect focusable elements in dialog
	const cancelButton = dialog.getByRole('button', { name: 'Cancel' });
	const confirmButton = dialog.getByRole('button', { name: 'Confirm' });

	// Tab through dialog -- focus should cycle within
	await cancelButton.focus();
	await expect(cancelButton).toBeFocused();

	await page.keyboard.press('Tab');
	await expect(confirmButton).toBeFocused();

	// Tab wraps back to first focusable element (focus trap)
	await page.keyboard.press('Tab');
	// Focus should remain inside the dialog, not escape to page behind
	const activeElement = await page.evaluate(() => {
		const el = document.activeElement;
		return el?.closest('[role="dialog"]') !== null;
	});
	expect(activeElement).toBe(true);
});
```

### Test ARIA Attributes

```typescript
test('accordion has correct ARIA attributes', async ({ page }) => {
	await page.goto('/faq');

	const trigger = page.getByRole('button', { name: 'Shipping info' });
	const contentId = await trigger.getAttribute('aria-controls');

	// Collapsed state
	await expect(trigger).toHaveAttribute('aria-expanded', 'false');

	// Expand
	await trigger.click();
	await expect(trigger).toHaveAttribute('aria-expanded', 'true');

	// Content region references trigger
	const content = page.locator(`#${contentId}`);
	await expect(content).toBeVisible();
	await expect(content).toHaveAttribute('role', 'region');
});
```

---

## Visual Regression

### Basic Screenshot Comparison

```typescript
test('hero section matches baseline', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveScreenshot('home-hero.png');
});
```

### Per-Component Screenshots

```typescript
test('button variants match baseline', async ({ page }) => {
	await page.goto('/examples/button');

	const buttonGroup = page.locator('[data-button-showcase]');
	await expect(buttonGroup).toHaveScreenshot('button-variants.png');
});
```

### Tolerance for Rendering Differences

```typescript
test('chart renders correctly', async ({ page }) => {
	await page.goto('/analytics');

	await expect(page.locator('.chart-container')).toHaveScreenshot('analytics-chart.png', {
		maxDiffPixelRatio: 0.01 // Allow 1% pixel difference
	});
});
```

### Dark Mode Snapshots

Test both light and dark themes. Use `class="dark"` on the html element (Tailwind CSS v4 convention):

```typescript
test.describe('visual regression', () => {
	test('card component - light mode', async ({ page }) => {
		await page.goto('/examples/card');
		await expect(page.locator('.card')).toHaveScreenshot('card-light.png');
	});

	test('card component - dark mode', async ({ page }) => {
		await page.goto('/examples/card');

		// Toggle dark mode by adding class to html element
		await page.evaluate(() => {
			document.documentElement.classList.add('dark');
		});

		// Wait for Tailwind CSS to apply dark styles
		await page.waitForTimeout(100);

		await expect(page.locator('.card')).toHaveScreenshot('card-dark.png');
	});
});
```

### Update Snapshots

When visual changes are intentional, update baselines:

```bash
pnpm exec playwright test --update-snapshots
```

To update a specific test file:

```bash
pnpm exec playwright test tests/e2e/components/button.spec.ts --update-snapshots
```

---

## SvelteKit-Specific

### Test +page.svelte with Load Functions

Mock API responses that `+page.server.ts` or `+page.ts` load functions depend on:

```typescript
test('product page loads and renders data', async ({ page }) => {
	// Intercept the API call the load function makes
	await page.route('**/api/products/123', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				id: 123,
				name: 'Test Product',
				price: 29.99,
				description: 'A great product'
			})
		})
	);

	await page.goto('/products/123');

	await expect(page.getByRole('heading', { name: 'Test Product' })).toBeVisible();
	await expect(page.getByText('$29.99')).toBeVisible();
	await expect(page.getByText('A great product')).toBeVisible();
});
```

### Test Form Actions

Intercept SvelteKit form actions to control responses:

```typescript
test('form action handles validation error', async ({ page }) => {
	await page.goto('/login');

	// Submit with invalid data
	await page.getByLabel('Email').fill('not-an-email');
	await page.getByLabel('Password').fill('short');

	// Intercept the form action POST
	await page.route('**/login?/default', (route) =>
		route.fulfill({
			status: 400,
			contentType: 'application/json',
			body: JSON.stringify({
				type: 'failure',
				status: 400,
				data: { email: 'Invalid email address', password: 'Minimum 8 characters' }
			})
		})
	);

	await page.getByRole('button', { name: 'Sign in' }).click();

	await expect(page.getByText('Invalid email address')).toBeVisible();
	await expect(page.getByText('Minimum 8 characters')).toBeVisible();
});
```

### Test Error Boundaries (+error.svelte)

```typescript
test('shows error page for missing product', async ({ page }) => {
	await page.route('**/api/products/999', (route) =>
		route.fulfill({ status: 404, body: 'Not found' })
	);

	await page.goto('/products/999');

	await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Go home' })).toBeVisible();
});
```

### Test Layout Nesting

```typescript
test('nested layout renders sidebar and content', async ({ page }) => {
	await page.goto('/dashboard/settings');

	// Layout provides the sidebar
	const sidebar = page.getByRole('navigation', { name: 'Dashboard' });
	await expect(sidebar).toBeVisible();
	await expect(sidebar.getByRole('link', { name: 'Settings' })).toHaveAttribute(
		'aria-current',
		'page'
	);

	// Page content renders inside the layout
	await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});
```

### Test goto() Navigation

```typescript
test('programmatic navigation works after action', async ({ page }) => {
	await page.goto('/onboarding');

	await page.getByLabel('Display name').fill('Jane');

	await page.route('**/api/onboarding', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ success: true })
		})
	);

	await page.getByRole('button', { name: 'Complete setup' }).click();

	// After successful submit, page redirects via goto('/dashboard')
	await page.waitForURL('**/dashboard');
	await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

---

## Authentication

### Global Setup for Login

Create a `globalSetup` that authenticates once and saves browser state:

```typescript
// tests/fixtures/auth.ts
import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
	const browser = await chromium.launch();
	const page = await browser.newPage();

	await page.goto('http://localhost:5173/login');
	await page.getByLabel('Email').fill('test@example.com');
	await page.getByLabel('Password').fill('securepassword');
	await page.getByRole('button', { name: 'Sign in' }).click();

	await page.waitForURL('**/dashboard');

	// Save signed-in state
	await page.context().storageState({ path: 'tests/.auth/user.json' });
	await browser.close();
}

export default globalSetup;
```

### Configure storageState

In `playwright.config.ts`:

```typescript
export default defineConfig({
	// ... other config

	projects: [
		// Setup project runs first
		{ name: 'setup', testMatch: /.*\.setup\.ts/ },

		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'tests/.auth/user.json'
			},
			dependencies: ['setup']
		}
	]
});
```

### Per-Worker Auth State for Parallel Isolation

When tests modify user state, isolate per worker:

```typescript
// tests/fixtures/test.ts
import { test as base } from '@playwright/test';

export const test = base.extend<{}, { workerStorageState: string }>({
	workerStorageState: [
		async ({ browser }, use) => {
			const id = base.info().parallelIndex;
			const fileName = `tests/.auth/user-${id}.json`;

			// Each worker logs in with a different user
			const page = await browser.newPage({ storageState: undefined });
			await page.goto('http://localhost:5173/login');
			await page.getByLabel('Email').fill(`user${id}@example.com`);
			await page.getByLabel('Password').fill('securepassword');
			await page.getByRole('button', { name: 'Sign in' }).click();
			await page.waitForURL('**/dashboard');
			await page.context().storageState({ path: fileName });
			await page.close();

			await use(fileName);
		},
		{ scope: 'worker' }
	],

	storageState: ({ workerStorageState }, use) => use(workerStorageState)
});

export { expect } from '@playwright/test';
```

### Test Authenticated Routes

```typescript
import { test, expect } from '../fixtures/test';

test('displays user profile', async ({ page }) => {
	await page.goto('/profile');

	// Already authenticated via storageState
	await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
	await expect(page.getByText('test@example.com')).toBeVisible();
});

test('unauthenticated user is redirected to login', async ({ browser }) => {
	// Create context WITHOUT storageState
	const context = await browser.newContext();
	const page = await context.newPage();

	await page.goto('http://localhost:5173/profile');

	// SvelteKit should redirect to /login
	await expect(page).toHaveURL(/.*login/);

	await context.close();
});
```

### .gitignore for Auth

```gitignore
tests/.auth/
```

---

## Test Organization

### File Naming

- One file per page or feature: `home.spec.ts`, `auth.spec.ts`, `settings.spec.ts`
- Component-specific tests in `components/`: `components/dialog.spec.ts`
- All test files use `.spec.ts` extension

### Shared Fixtures

```typescript
// tests/fixtures/test.ts
import { test as base, expect } from '@playwright/test';

type Fixtures = {
	settingsPage: void;
};

export const test = base.extend<Fixtures>({
	settingsPage: async ({ page }, use) => {
		await page.goto('/settings');
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
		await use();
	}
});

export { expect };
```

Use in tests:

```typescript
import { test, expect } from '../fixtures/test';

test('changes display name', async ({ page, settingsPage }) => {
	// page is already on /settings
	await page.getByLabel('Display name').fill('New Name');
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByText('Settings saved')).toBeVisible();
});
```

### Custom test.extend() for Common Setup

```typescript
// tests/fixtures/test.ts
import { test as base } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Fixtures = {
	makeAxeBuilder: () => AxeBuilder;
};

export const test = base.extend<Fixtures>({
	makeAxeBuilder: async ({ page }, use) => {
		const makeAxeBuilder = () => new AxeBuilder({ page });
		await use(makeAxeBuilder);
	}
});

export { expect } from '@playwright/test';
```

Use the fixture:

```typescript
import { test, expect } from '../fixtures/test';

test('settings page is accessible', async ({ page, makeAxeBuilder }) => {
	await page.goto('/settings');

	const results = await makeAxeBuilder().analyze();
	expect(results.violations).toEqual([]);
});
```

---

## Critical Rules

1. **Never use Playwright component testing** -- always test through the real SvelteKit app via the dev server
2. **Always prefer `getByRole()`** -- `data-testid` is a last resort
3. **Always include at least one axe-core scan** per test suite
4. **Always use `pnpm`** for all commands
5. **Never use Svelte 4 patterns** in test examples -- no `export let`, no `$:`, no `createEventDispatcher`
6. **Always wait for reactive state** -- use `waitForFunction` or `expect().toBeVisible()` instead of arbitrary timeouts
7. **Always test keyboard navigation** for interactive components
8. **Never hardcode selectors** -- extract them into constants or page objects if reused

## Additional Resources

### Reference Files

See the `references/` directory for copy-pasteable templates:

- **`playwright-config.md`** -- Complete `playwright.config.ts` with SvelteKit webServer, multi-browser projects, CI settings
- **`test-examples.md`** -- Six standalone test examples covering pages, forms, components, accessibility, visual regression, and authentication
