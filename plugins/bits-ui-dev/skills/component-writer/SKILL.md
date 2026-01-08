---
name: Bits-UI Component Writer
description: This skill should be used when creating new UI components for a Svelte 5 / bits-ui component library. Triggers on requests like "create a component", "add a new button variant", "implement [component] component", "build a dropdown", "make a form input", "add a size to component", or any component development task using bits-ui primitives with Tailwind CSS styling.
---

# Bits-UI Component Writer

Create production-quality Svelte 5 components using bits-ui primitives with Tailwind CSS v4 styling.

## Project Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Svelte | 5.x | Component framework using runes |
| bits-ui | 2.x | Headless component primitives |
| Tailwind CSS | 4.x | Utility-first styling with @theme tokens |
| tailwind-merge + clsx | 3.x / 2.x | Smart class merging via cn() |

## Directory Structure

```
src/lib/components/ui/[component-name]/
├── [Component].svelte       # Main component wrapping bits-ui primitive
├── [Variant].svelte         # Optional variant components
└── index.ts                 # Barrel file exporting all components
```

**Key Locations:**
- Components: `src/lib/components/ui/`
- Main exports: `src/lib/index.ts`
- Utilities: `src/lib/utils.ts` (cn() function)
- Global styles: `src/app.css` (theme tokens)

---

## Component Template

Every component follows this structure:

```svelte
<script lang="ts">
	import { [Primitive] as [Primitive]Primitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	// 1. Define variant and size types
	type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
	type Size = 'sm' | 'default' | 'lg';

	// 2. Define props interface
	type Props = {
		variant?: Variant;
		size?: Size;
		class?: string;
		style?: string;
		children?: Snippet;
		disabled?: boolean;
		ref?: HTMLElement | null;
		// Add component-specific props
	};

	// 3. Destructure props with defaults using $props()
	let {
		variant = 'default',
		size = 'default',
		class: className = '',
		style,
		children,
		disabled = false,
		ref = $bindable(null),
		...restProps
	}: Props = $props();

	// 4. Define variant class mappings
	const variantClasses: Record<Variant, string> = {
		default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
		secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm',
		outline: 'border border-border bg-background hover:bg-accent hover:text-accent-foreground shadow-sm',
		ghost: 'hover:bg-accent hover:text-accent-foreground',
		destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm'
	};

	// 5. Define size class mappings
	const sizeClasses: Record<Size, string> = {
		sm: 'h-8 px-3 text-xs',
		default: 'h-10 px-4 py-2',
		lg: 'h-12 px-8 text-base'
	};

	// 6. Define base classes (always applied)
	const baseClasses = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
</script>

<!-- 7. Render with bits-ui primitive -->
<[Primitive]Primitive.Root
	bind:ref
	{disabled}
	{style}
	class={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</[Primitive]Primitive.Root>
```

### Step 2: Create the Barrel File (index.ts)

```typescript
export { default as ComponentName } from './ComponentName.svelte';
export { default as ComponentVariant } from './ComponentVariant.svelte';
// Export additional components...
```

### Step 3: Add to Main Library Export

In `src/lib/index.ts`:
```typescript
export * from './components/ui/component-name';
```

---

## Svelte 5 Runes Reference

### $state() - Reactive State
```typescript
let count = $state(0);
let items = $state<string[]>([]);
let user = $state({ name: '', email: '' });
```

### $derived() - Computed Values
```typescript
const percentage = $derived(value != null ? (value / max) * 100 : 0);
const isValid = $derived(email.includes('@') && password.length >= 8);
```

### $effect() - Side Effects
```typescript
$effect(() => {
	console.log('Count changed:', count);
	// Cleanup function (optional)
	return () => cleanup();
});
```

### $bindable() - Two-Way Bindable Props
```typescript
let ref = $bindable(null);
let value = $bindable('');
let checked = $bindable(false);
let open = $bindable(false);
```

### $props() - Component Props
```typescript
let {
	variant = 'default',
	size = 'default',
	class: className = '',  // Rename reserved word
	...restProps           // Spread remaining props
}: Props = $props();
```

### Snippet - Flexible Children
```typescript
import type { Snippet } from 'svelte';

type Props = {
	children?: Snippet;
	// With parameters:
	children?: Snippet<[{ selected: boolean; highlighted: boolean }]>;
};

// Render snippet
{#if children}
	{@render children()}
{/if}

// With parameters
{@render children({ selected, highlighted })}
```

---

## Styling System

### Design Tokens (src/app.css)

The library uses oklch color space with semantic naming:

```css
@theme {
	/* Semantic Colors */
	--color-background: oklch(1 0 0);
	--color-foreground: oklch(0.145 0 0);
	--color-primary: oklch(0.205 0 0);
	--color-primary-foreground: oklch(0.985 0 0);
	--color-secondary: oklch(0.97 0 0);
	--color-accent: oklch(0.97 0 0);
	--color-muted: oklch(0.96 0 0);
	--color-destructive: oklch(0.577 0.245 27.325);
	--color-success: oklch(0.6 0.2 145);
	--color-warning: oklch(0.8 0.15 85);
	--color-border: oklch(0.922 0 0);
	--color-ring: oklch(0.708 0 0);

	/* Radius Tokens */
	--radius-sm: 0.25rem;
	--radius-md: 0.375rem;
	--radius-lg: 0.5rem;
	--radius-xl: 0.75rem;
	--radius-2xl: 1rem;
	--radius-full: 9999px;
}
```

### Dark Mode (Media Query)
```css
@media (prefers-color-scheme: dark) {
	@theme {
		--color-background: oklch(0.145 0 0);
		--color-foreground: oklch(0.985 0 0);
		/* Invert colors appropriately */
	}
}
```

### The cn() Utility

Located at `src/lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
```

**Usage:**
```typescript
class={cn(
	baseClasses,           // Always applied first
	variantClasses[variant], // Variant-specific
	sizeClasses[size],      // Size-specific
	className               // User overrides (wins conflicts)
)}
```

### Common Class Patterns

**Interactivity:**
```
hover:bg-primary/90                    # Hover with opacity
active:scale-[0.98]                    # Click feedback
disabled:pointer-events-none disabled:opacity-50
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**State-Based (bits-ui):**
```
data-[state=checked]:bg-primary        # Checked state
data-[state=open]:rotate-180           # Open state
data-[disabled]:opacity-50             # Disabled via data attribute
data-[highlighted]:bg-accent           # Highlighted item
```

**Transitions:**
```
transition-all duration-200            # Smooth transitions
transition-colors duration-150
```

---

## Component Type Patterns

### 1. Simple Stateless Component (Badge)

```svelte
<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	type Variant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

	type Props = {
		variant?: Variant;
		class?: string;
		children?: Snippet;
	};

	let { variant = 'default', class: className = '', children }: Props = $props();

	const variantClasses: Record<Variant, string> = {
		default: 'bg-primary text-primary-foreground shadow hover:bg-primary/80',
		secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
		destructive: 'bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
		outline: 'text-foreground border border-border',
		success: 'bg-success text-success-foreground shadow hover:bg-success/80',
		warning: 'bg-warning text-warning-foreground shadow hover:bg-warning/80'
	};
</script>

<span class={cn(
	'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors',
	variantClasses[variant],
	className
)}>
	{#if children}
		{@render children()}
	{/if}
</span>
```

### 2. Stateful Component with bits-ui (Switch)

```svelte
<script lang="ts">
	import { Switch as SwitchPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	type Size = 'sm' | 'default' | 'lg';

	type Props = {
		checked?: boolean;
		onCheckedChange?: (checked: boolean) => void;
		disabled?: boolean;
		size?: Size;
		class?: string;
		ref?: HTMLButtonElement | null;
	};

	let {
		checked = $bindable(false),
		onCheckedChange,
		disabled = false,
		size = 'default',
		class: className = '',
		ref = $bindable(null)
	}: Props = $props();

	const sizeClasses: Record<Size, { root: string; thumb: string }> = {
		sm: { root: 'h-4 w-7', thumb: 'h-3 w-3 data-[state=checked]:translate-x-3' },
		default: { root: 'h-5 w-9', thumb: 'h-4 w-4 data-[state=checked]:translate-x-4' },
		lg: { root: 'h-6 w-11', thumb: 'h-5 w-5 data-[state=checked]:translate-x-5' }
	};
</script>

<SwitchPrimitive.Root
	bind:ref
	bind:checked
	{onCheckedChange}
	{disabled}
	class={cn(
		'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted',
		sizeClasses[size].root,
		className
	)}
>
	<SwitchPrimitive.Thumb
		class={cn(
			'pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform',
			'data-[state=unchecked]:translate-x-0',
			sizeClasses[size].thumb
		)}
	/>
</SwitchPrimitive.Root>
```

### 3. Compound Component Pattern (Accordion)

**Accordion.svelte** (Root):
```svelte
<script lang="ts">
	import { Accordion as AccordionPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	type SingleProps = {
		type: 'single';
		value?: string;
		disabled?: boolean;
		class?: string;
		children?: Snippet;
	};

	type MultipleProps = {
		type: 'multiple';
		value?: string[];
		disabled?: boolean;
		class?: string;
		children?: Snippet;
	};

	type Props = SingleProps | MultipleProps;

	let { type, value = $bindable(type === 'single' ? '' : []), disabled = false, class: className = '', children }: Props = $props();
</script>

{#if type === 'single'}
	<AccordionPrimitive.Root {type} bind:value {disabled} class={cn('w-full', className)}>
		{#if children}{@render children()}{/if}
	</AccordionPrimitive.Root>
{:else}
	<AccordionPrimitive.Root {type} bind:value {disabled} class={cn('w-full', className)}>
		{#if children}{@render children()}{/if}
	</AccordionPrimitive.Root>
{/if}
```

### 4. Component with Portal (Dialog)

**DialogContent.svelte**:
```svelte
<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	type Props = {
		class?: string;
		children?: Snippet;
	};

	let { class: className = '', children }: Props = $props();
</script>

<DialogPrimitive.Portal>
	<DialogPrimitive.Overlay
		class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
	/>
	<DialogPrimitive.Content
		class={cn(
			'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
			'rounded-lg border border-border bg-background p-6 shadow-lg',
			'data-[state=open]:animate-in data-[state=closed]:animate-out',
			'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
			'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
			className
		)}
	>
		{#if children}{@render children()}{/if}
	</DialogPrimitive.Content>
</DialogPrimitive.Portal>
```

### 5. Mixed Export Pattern (index.ts)

```typescript
import { Dialog as DialogPrimitive } from 'bits-ui';

// Re-export primitives directly (no styling needed)
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

// Export styled variants
export { default as DialogContent } from './DialogContent.svelte';
export { default as DialogHeader } from './DialogHeader.svelte';
export { default as DialogFooter } from './DialogFooter.svelte';
export { default as DialogTitle } from './DialogTitle.svelte';
export { default as DialogDescription } from './DialogDescription.svelte';
```

---

## Animation Patterns

### Loading States

```svelte
{#if loading}
	<!-- Spinner -->
	<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
		<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
		<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
	</svg>

	<!-- Dots -->
	<span class="flex gap-1">
		<span class="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]"></span>
		<span class="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]"></span>
		<span class="h-1.5 w-1.5 rounded-full bg-current animate-bounce"></span>
	</span>
{/if}
```

### Ripple Effect

```svelte
<script lang="ts">
	let rippling = $state(false);
	let rippleX = $state(0);
	let rippleY = $state(0);

	function handleRipple(e: MouseEvent) {
		const button = e.currentTarget as HTMLButtonElement;
		const rect = button.getBoundingClientRect();
		rippleX = e.clientX - rect.left;
		rippleY = e.clientY - rect.top;
		rippling = true;
		setTimeout(() => (rippling = false), 600);
	}
</script>

<button onclick={handleRipple} class="relative overflow-hidden">
	{#if rippling}
		<span
			class="absolute rounded-full bg-white/40 animate-[ripple_0.6s_linear] pointer-events-none"
			style="left: {rippleX}px; top: {rippleY}px; width: 20px; height: 20px; transform: translate(-50%, -50%);"
		></span>
	{/if}
	Click me
</button>
```

---

## Checklist for New Components

Before submitting a new component, verify:

- [ ] **Structure**: Component in `src/lib/components/ui/[name]/` with index.ts
- [ ] **TypeScript**: All props typed, variant/size unions defined
- [ ] **Runes**: Using $props(), $state(), $bindable() correctly
- [ ] **Styling**: Using cn() for class merging, semantic tokens
- [ ] **Accessibility**: Proper ARIA attributes via bits-ui primitives
- [ ] **Dark Mode**: Colors work in both light and dark themes
- [ ] **States**: hover, focus-visible, disabled, active states
- [ ] **Transitions**: Smooth transitions with appropriate durations
- [ ] **Exports**: Added to component index.ts and src/lib/index.ts
- [ ] **Example**: Created example page in src/routes/examples/

---

## Critical Rules

1. **Always use cn()** for class merging - never template literals
2. **Always rename class prop** to className: `class: className = ''`
3. **Always use $bindable()** for ref and two-way bound props
4. **Always define types** for Variant, Size, and Props
5. **Always use semantic tokens** - never hardcoded colors
6. **Always include states**: hover, focus-visible, disabled, active
7. **Always use bits-ui primitives** for complex interactions
8. **Never use export let** - use $props() rune instead

## Additional Resources

### Reference Files

See the `references/` directory for detailed guidance:

- **`advanced-patterns.md`** - Complex patterns including:
  - Physics-based state management (WheelSelector momentum scrolling)
  - Orientation-aware components (Carousel horizontal/vertical)
  - Checkbox with indeterminate state + snippet children
  - Custom animations (ripple, gradient, staggered)
  - Mixed export pattern for compound components
  - Nested size configuration objects

- **`button-example.svelte`** - Simple stateless component pattern
- **`switch-example.svelte`** - Stateful component with two-way binding
- **`dialog-example.svelte`** - Portal-based overlay component

### Context7 Documentation

For bits-ui API details and Tailwind CSS v4 features, use Context7 to query:
- `/huntabyte/bits-ui` - bits-ui component primitives API
- `/tailwindlabs/tailwindcss` - Tailwind CSS v4 @theme syntax
