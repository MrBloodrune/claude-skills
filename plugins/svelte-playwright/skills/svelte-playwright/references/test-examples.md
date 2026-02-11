# Playwright Test Examples for SvelteKit

Six complete, copy-pasteable test examples. Each is self-contained.

---

## 1. Basic Page Test

Navigate to a page, assert title, check heading and key content.

```typescript
// tests/e2e/home.spec.ts
import { test, expect } from '@playwright/test';

test.describe('home page', () => {
	test('renders the hero section', async ({ page }) => {
		await page.goto('/');

		await expect(page).toHaveTitle(/My App/);

		const heading = page.getByRole('heading', { level: 1 });
		await expect(heading).toBeVisible();
		await expect(heading).toHaveText('Welcome to My App');

		await expect(page.getByText('Get started in seconds')).toBeVisible();
	});

	test('navigates to features page', async ({ page }) => {
		await page.goto('/');

		await page.getByRole('link', { name: 'Features' }).click();

		await expect(page).toHaveURL('/features');
		await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible();
	});

	test('renders navigation links', async ({ page }) => {
		await page.goto('/');

		const nav = page.getByRole('navigation');
		await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible();
		await expect(nav.getByRole('link', { name: 'Features' })).toBeVisible();
		await expect(nav.getByRole('link', { name: 'Pricing' })).toBeVisible();
		await expect(nav.getByRole('link', { name: 'Sign in' })).toBeVisible();
	});
});
```

---

## 2. Form Interaction

Fill inputs, submit a form, assert success state.

```typescript
// tests/e2e/contact.spec.ts
import { test, expect } from '@playwright/test';

test.describe('contact form', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/contact');
	});

	test('submits form and shows success message', async ({ page }) => {
		// Fill all form fields
		await page.getByLabel('Full name').fill('Jane Doe');
		await page.getByLabel('Email address').fill('jane@example.com');
		await page.getByLabel('Subject').fill('Partnership inquiry');
		await page.getByLabel('Message').fill('I would like to discuss a potential partnership.');

		// Mock the API endpoint
		await page.route('**/api/contact', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ success: true, message: 'Message received' })
			})
		);

		// Submit
		await page.getByRole('button', { name: 'Send message' }).click();

		// Assert success state
		await expect(page.getByText('Message received')).toBeVisible();

		// Form resets after success
		await expect(page.getByLabel('Full name')).toHaveValue('');
		await expect(page.getByLabel('Email address')).toHaveValue('');
	});

	test('shows validation errors for empty required fields', async ({ page }) => {
		// Submit without filling anything
		await page.getByRole('button', { name: 'Send message' }).click();

		// Validation messages appear
		await expect(page.getByText('Name is required')).toBeVisible();
		await expect(page.getByText('Email is required')).toBeVisible();
	});

	test('shows inline error for invalid email', async ({ page }) => {
		await page.getByLabel('Full name').fill('Jane');
		await page.getByLabel('Email address').fill('not-an-email');
		await page.getByLabel('Message').fill('Test');

		await page.getByRole('button', { name: 'Send message' }).click();

		await expect(page.getByText('Please enter a valid email')).toBeVisible();
	});

	test('disables submit button while sending', async ({ page }) => {
		await page.getByLabel('Full name').fill('Jane Doe');
		await page.getByLabel('Email address').fill('jane@example.com');
		await page.getByLabel('Message').fill('Test message');

		// Delay the API response to observe loading state
		await page.route('**/api/contact', async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ success: true })
			});
		});

		const submitButton = page.getByRole('button', { name: 'Send message' });
		await submitButton.click();

		// Button is disabled during submission
		await expect(submitButton).toBeDisabled();

		// After response, button is re-enabled
		await expect(submitButton).toBeEnabled({ timeout: 3000 });
	});
});
```

---

## 3. bits-ui Component Test (Dialog)

Open/close a dialog, test keyboard interactions, assert focus trap.

```typescript
// tests/e2e/components/dialog.spec.ts
import { test, expect } from '@playwright/test';

test.describe('dialog component', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/examples/dialog');
	});

	test('opens dialog on trigger click', async ({ page }) => {
		const trigger = page.getByRole('button', { name: 'Open dialog' });

		await trigger.click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('heading', { name: 'Edit profile' })).toBeVisible();
		await expect(dialog.getByLabel('Display name')).toBeVisible();
	});

	test('closes dialog with Escape key', async ({ page }) => {
		await page.getByRole('button', { name: 'Open dialog' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();

		await page.keyboard.press('Escape');

		await expect(dialog).not.toBeVisible();
	});

	test('closes dialog with close button', async ({ page }) => {
		await page.getByRole('button', { name: 'Open dialog' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();

		// bits-ui Dialog.Close renders a button
		await dialog.getByRole('button', { name: 'Close' }).click();

		await expect(dialog).not.toBeVisible();
	});

	test('returns focus to trigger after closing', async ({ page }) => {
		const trigger = page.getByRole('button', { name: 'Open dialog' });
		await trigger.click();

		await expect(page.getByRole('dialog')).toBeVisible();

		await page.keyboard.press('Escape');

		await expect(page.getByRole('dialog')).not.toBeVisible();
		await expect(trigger).toBeFocused();
	});

	test('traps focus within dialog', async ({ page }) => {
		await page.getByRole('button', { name: 'Open dialog' }).click();
		const dialog = page.getByRole('dialog');

		// Tab through all focusable elements
		// Focus should never leave the dialog
		for (let i = 0; i < 10; i++) {
			await page.keyboard.press('Tab');

			const focusInsideDialog = await page.evaluate(() => {
				const active = document.activeElement;
				return active?.closest('[role="dialog"]') !== null;
			});

			expect(focusInsideDialog).toBe(true);
		}
	});

	test('closes dialog on overlay click', async ({ page }) => {
		await page.getByRole('button', { name: 'Open dialog' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();

		// Click the overlay (outside the dialog content)
		// bits-ui renders an overlay as a sibling to the content
		await page.locator('[data-dialog-overlay]').click({ force: true });

		await expect(dialog).not.toBeVisible();
	});

	test('submits form inside dialog', async ({ page }) => {
		await page.getByRole('button', { name: 'Open dialog' }).click();

		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Display name').fill('Updated Name');

		await page.route('**/api/profile', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ success: true })
			})
		);

		await dialog.getByRole('button', { name: 'Save changes' }).click();

		// Dialog closes after successful save
		await expect(dialog).not.toBeVisible();

		// Page reflects updated data
		await expect(page.getByText('Updated Name')).toBeVisible();
	});
});
```

---

## 4. Accessibility Audit

Full-page axe scan with known-issue filtering.

```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('accessibility audits', () => {
	const pages = ['/', '/features', '/pricing', '/contact', '/login'];

	for (const path of pages) {
		test(`${path} has no accessibility violations`, async ({ page }) => {
			await page.goto(path);

			// Wait for page to fully render (SvelteKit hydration)
			await page.waitForLoadState('networkidle');

			const results = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
				.analyze();

			expect(results.violations).toEqual([]);
		});
	}

	test('dialog is accessible when open', async ({ page }) => {
		await page.goto('/examples/dialog');

		await page.getByRole('button', { name: 'Open dialog' }).click();
		await expect(page.getByRole('dialog')).toBeVisible();

		const results = await new AxeBuilder({ page })
			.include('[role="dialog"]')
			.analyze();

		expect(results.violations).toEqual([]);
	});

	test('form page is accessible with errors shown', async ({ page }) => {
		await page.goto('/contact');

		// Submit empty form to trigger validation errors
		await page.getByRole('button', { name: 'Send message' }).click();

		// Scan after errors are visible
		const results = await new AxeBuilder({ page }).analyze();

		expect(results.violations).toEqual([]);
	});

	test('dark mode is accessible', async ({ page }) => {
		await page.goto('/');

		// Enable dark mode
		await page.evaluate(() => {
			document.documentElement.classList.add('dark');
		});
		await page.waitForTimeout(100);

		const results = await new AxeBuilder({ page }).analyze();

		// Color contrast must pass in dark mode too
		expect(results.violations).toEqual([]);
	});

	test('keyboard navigation order is logical', async ({ page }) => {
		await page.goto('/');

		const focusOrder: string[] = [];

		// Tab through the page and record focus order
		for (let i = 0; i < 15; i++) {
			await page.keyboard.press('Tab');

			const focused = await page.evaluate(() => {
				const el = document.activeElement;
				if (!el) return 'none';
				return el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || el.tagName;
			});

			focusOrder.push(focused);
		}

		// Navigation links should come before main content
		const navIndex = focusOrder.findIndex((f) => f === 'Home');
		const mainContentIndex = focusOrder.findIndex((f) => f.includes('Get started'));

		if (navIndex !== -1 && mainContentIndex !== -1) {
			expect(navIndex).toBeLessThan(mainContentIndex);
		}
	});
});
```

---

## 5. Visual Regression

Component screenshot comparison with dark/light modes.

```typescript
// tests/e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test';

test.describe('visual regression', () => {
	test('home page hero matches baseline', async ({ page }) => {
		await page.goto('/');

		// Wait for fonts and images to load
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveScreenshot('home-hero.png', {
			fullPage: false
		});
	});

	test('button variants match baseline', async ({ page }) => {
		await page.goto('/examples/button');

		const showcase = page.locator('[data-component-showcase]');
		await expect(showcase).toHaveScreenshot('button-variants.png');
	});

	test('card component - light mode', async ({ page }) => {
		await page.goto('/examples/card');
		await page.waitForLoadState('networkidle');

		// Ensure light mode
		await page.evaluate(() => {
			document.documentElement.classList.remove('dark');
		});

		const card = page.locator('[data-card-example]');
		await expect(card).toHaveScreenshot('card-light.png');
	});

	test('card component - dark mode', async ({ page }) => {
		await page.goto('/examples/card');
		await page.waitForLoadState('networkidle');

		// Enable dark mode (Tailwind CSS v4 convention: class on html element)
		await page.evaluate(() => {
			document.documentElement.classList.add('dark');
		});
		await page.waitForTimeout(100); // Wait for style recalculation

		const card = page.locator('[data-card-example]');
		await expect(card).toHaveScreenshot('card-dark.png');
	});

	test('form with validation errors matches baseline', async ({ page }) => {
		await page.goto('/contact');

		// Submit empty form to trigger error states
		await page.getByRole('button', { name: 'Send message' }).click();

		// Wait for error messages to appear
		await expect(page.getByText('Name is required')).toBeVisible();

		await expect(page.locator('form')).toHaveScreenshot('form-errors.png');
	});

	test('dialog overlay matches baseline', async ({ page }) => {
		await page.goto('/examples/dialog');

		await page.getByRole('button', { name: 'Open dialog' }).click();
		await expect(page.getByRole('dialog')).toBeVisible();

		// Small delay for dialog animation to complete
		await page.waitForTimeout(300);

		await expect(page).toHaveScreenshot('dialog-open.png', {
			maxDiffPixelRatio: 0.01
		});
	});

	test('responsive layout - mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveScreenshot('home-mobile.png', {
			fullPage: true
		});
	});
});
```

---

## 6. Authenticated Route

Login, navigate to protected page, assert content.

```typescript
// tests/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
	await page.goto('/login');

	await page.getByLabel('Email').fill('test@example.com');
	await page.getByLabel('Password').fill('securepassword');
	await page.getByRole('button', { name: 'Sign in' }).click();

	// Wait for redirect to dashboard after successful login
	await page.waitForURL('**/dashboard');
	await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

	// Save authenticated state
	await page.context().storageState({ path: 'tests/.auth/user.json' });
});
```

```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

// This test file uses the authenticated storageState configured in playwright.config.ts
// See references/playwright-config.md for the setup project configuration

test.describe('authenticated dashboard', () => {
	test('displays user dashboard', async ({ page }) => {
		await page.goto('/dashboard');

		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
		await expect(page.getByText('Welcome back')).toBeVisible();
	});

	test('shows user profile information', async ({ page }) => {
		await page.goto('/dashboard/profile');

		await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
		await expect(page.getByText('test@example.com')).toBeVisible();
	});

	test('navigates between dashboard pages', async ({ page }) => {
		await page.goto('/dashboard');

		// Sidebar navigation
		const sidebar = page.getByRole('navigation', { name: 'Dashboard' });
		await sidebar.getByRole('link', { name: 'Settings' }).click();

		await expect(page).toHaveURL('/dashboard/settings');
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

		// Active link is marked
		await expect(sidebar.getByRole('link', { name: 'Settings' })).toHaveAttribute(
			'aria-current',
			'page'
		);
	});

	test('logs out and redirects to login', async ({ page }) => {
		await page.goto('/dashboard');

		await page.getByRole('button', { name: 'Sign out' }).click();

		await expect(page).toHaveURL(/.*login/);
		await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
	});

	test('protects routes from unauthenticated access', async ({ browser }) => {
		// Create a fresh context WITHOUT storageState
		const context = await browser.newContext();
		const page = await context.newPage();

		await page.goto('http://localhost:5173/dashboard');

		// SvelteKit hooks redirect to login
		await expect(page).toHaveURL(/.*login/);
		await expect(page.getByLabel('Email')).toBeVisible();

		await context.close();
	});

	test('handles expired session gracefully', async ({ page }) => {
		await page.goto('/dashboard');

		// Simulate an API returning 401 (session expired)
		await page.route('**/api/user', (route) =>
			route.fulfill({ status: 401, body: 'Unauthorized' })
		);

		// Trigger an action that calls the API
		await page.getByRole('button', { name: 'Refresh data' }).click();

		// App should redirect to login or show re-auth prompt
		await expect(
			page.getByText('Session expired').or(page.locator('[href*="login"]'))
		).toBeVisible({ timeout: 5000 });
	});
});
```
