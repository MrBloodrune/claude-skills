---
name: Bits-UI Code Reviewer
description: This skill should be used when reviewing code in a Svelte 5 / bits-ui component library. Triggers on requests like "review this code", "check my component", "is this following best practices", "review PR", "code review", "audit this component", "validate my implementation", or any code quality assessment task for bits-ui projects.
---

# Bits-UI Code Reviewer

Provide comprehensive code review for Svelte 5 / bits-ui component library code, covering patterns, accessibility, performance, security, and maintainability.

## Review Framework

### Review Categories

| Category | Priority | Focus Areas |
|----------|----------|-------------|
| **Critical** | P0 | Security vulnerabilities, breaking bugs, accessibility violations |
| **Architecture** | P1 | Pattern compliance, component structure, API design |
| **Quality** | P2 | TypeScript types, code style, maintainability |
| **Performance** | P3 | Bundle size, reactivity efficiency, render optimization |
| **Polish** | P4 | Documentation, naming, edge cases |

---

## Critical Review Checks

### Security

**XSS Prevention:**
```svelte
<!-- BAD: Direct HTML injection -->
{@html userInput}

<!-- GOOD: Use text content or sanitize -->
{userInput}
<!-- Or if HTML needed, sanitize first -->
{@html DOMPurify.sanitize(userInput)}
```

**Event Handler Safety:**
```svelte
<!-- BAD: Inline eval-like patterns -->
<button onclick="eval(userCode)">

<!-- GOOD: Explicit handler functions -->
<button onclick={handleClick}>
```

### Accessibility (WCAG 2.1 AA)

**Required Attributes:**
```svelte
<!-- BAD: Missing accessible name -->
<button><svg>...</svg></button>

<!-- GOOD: Screen reader accessible -->
<button aria-label="Close dialog"><svg>...</svg></button>

<!-- GOOD: Using bits-ui primitives (automatic ARIA) -->
<DialogPrimitive.Close>
	<svg>...</svg>
	<span class="sr-only">Close</span>
</DialogPrimitive.Close>
```

**Focus Management:**
```svelte
<!-- Ensure focus-visible styles -->
class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

<!-- Keyboard navigation -->
<button onkeydown={(e) => e.key === 'Enter' && handleAction()}>
```

**Color Contrast:**
- Text on `bg-primary`: must use `text-primary-foreground`
- Text on `bg-destructive`: must use `text-destructive-foreground`
- Never rely on color alone to convey information

---

## Architecture Review

### Component Structure Compliance

**File Organization:**
```
✅ CORRECT:
src/lib/components/ui/button/
├── Button.svelte
├── IconButton.svelte
└── index.ts

❌ WRONG:
src/lib/components/Button.svelte  # Missing folder
src/lib/components/ui/button.svelte  # Wrong capitalization
```

**Barrel File Pattern:**
```typescript
// ✅ CORRECT
export { default as Button } from './Button.svelte';
export { default as IconButton } from './IconButton.svelte';

// ❌ WRONG: Re-exporting without default
export { Button } from './Button.svelte';

// ❌ WRONG: Default export in barrel
export default Button;
```

### Props Pattern Compliance

**Required Pattern:**
```svelte
<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	// ✅ CORRECT: Type unions for variants
	type Variant = 'default' | 'secondary' | 'destructive';
	type Size = 'sm' | 'default' | 'lg';

	// ✅ CORRECT: Props type definition
	type Props = {
		variant?: Variant;
		size?: Size;
		class?: string;
		children?: Snippet;
		disabled?: boolean;
		ref?: HTMLElement | null;
	};

	// ✅ CORRECT: Destructuring with defaults
	let {
		variant = 'default',
		size = 'default',
		class: className = '',
		children,
		disabled = false,
		ref = $bindable(null),
		...restProps
	}: Props = $props();

	// ✅ CORRECT: Class mappings as Record<Type, string>
	const variantClasses: Record<Variant, string> = { ... };
</script>
```

**Common Violations:**
```svelte
<!-- ❌ WRONG: Using 'class' directly without renaming -->
let { class, ...rest } = $props();  // 'class' is reserved!

<!-- ✅ CORRECT -->
let { class: className = '', ...rest } = $props();

<!-- ❌ WRONG: Not using $bindable for ref -->
let { ref = null } = $props();

<!-- ✅ CORRECT -->
let { ref = $bindable(null) } = $props();

<!-- ❌ WRONG: String concatenation for classes -->
class={`${baseClasses} ${variantClasses[variant]} ${className}`}

<!-- ✅ CORRECT: Using cn() -->
class={cn(baseClasses, variantClasses[variant], className)}
```

### State Management

**Svelte 5 Runes Usage:**
```svelte
<!-- ❌ WRONG: Old Svelte 4 reactive patterns -->
$: doubled = count * 2;
$: { console.log(count); }

<!-- ✅ CORRECT: Svelte 5 runes -->
const doubled = $derived(count * 2);
$effect(() => { console.log(count); });

<!-- ❌ WRONG: Mutable assignment without $state -->
let items = [];
items.push(newItem);  // Won't trigger reactivity!

<!-- ✅ CORRECT -->
let items = $state([]);
items.push(newItem);  // Reactivity works
```

---

## Quality Review

### TypeScript Requirements

**Type Coverage:**
```typescript
// ✅ CORRECT: All props typed
type Props = {
	variant?: 'default' | 'secondary';
	onClick?: (event: MouseEvent) => void;
	data: Record<string, unknown>;
};

// ❌ WRONG: Using 'any'
type Props = {
	data: any;
	handler: Function;
};

// ❌ WRONG: Missing types
let { variant, size } = $props();  // Implicit any!
```

**Event Handler Types:**
```typescript
// ✅ CORRECT
onclick?: (event: MouseEvent) => void;
onkeydown?: (event: KeyboardEvent) => void;
oninput?: (event: Event & { currentTarget: HTMLInputElement }) => void;

// ❌ WRONG
onclick?: (e) => void;  // Missing type
```

### Code Style

**Naming Conventions:**
```typescript
// ✅ CORRECT
type Variant = 'default' | 'secondary';  // PascalCase for types
const variantClasses = { ... };          // camelCase for variables
const handleClick = () => { };           // camelCase for functions

// ❌ WRONG
type variant = 'default';                // lowercase type
const VariantClasses = { };              // PascalCase variable
const HandleClick = () => { };           // PascalCase function
```

**Import Organization:**
```svelte
<script lang="ts">
	// 1. External packages
	import { Button as ButtonPrimitive } from 'bits-ui';
	import type { Snippet } from 'svelte';

	// 2. Internal utilities
	import { cn } from '$lib/utils.js';

	// 3. Local components (if any)
	import Icon from './Icon.svelte';

	// 4. Types/interfaces
	type Props = { ... };
</script>
```

### Maintainability

**Avoid Magic Numbers/Strings:**
```svelte
<!-- ❌ WRONG -->
class="h-[42px] delay-[350ms]"

<!-- ✅ CORRECT: Use design tokens -->
class="h-10"  // Or define custom token if needed
const sizeClasses = { default: 'h-10' };
```

**Comment Complex Logic:**
```svelte
<!-- ✅ CORRECT: Explain non-obvious behavior -->
// Calculate percentage, handling null value edge case
const percentage = $derived(value != null ? (value / max) * 100 : 0);
```

---

## Performance Review

### Reactivity Optimization

**Avoid Unnecessary Re-renders:**
```svelte
<!-- ❌ WRONG: Creating new object on every render -->
<Child config={{ theme: 'dark', size: 'lg' }} />

<!-- ✅ CORRECT: Define outside or use $derived -->
const config = { theme: 'dark', size: 'lg' };
<Child {config} />
```

**Derived vs Effect:**
```svelte
<!-- ❌ WRONG: Using effect for derived data -->
let doubled = $state(0);
$effect(() => { doubled = count * 2; });

<!-- ✅ CORRECT: Use derived for computed values -->
const doubled = $derived(count * 2);
```

### Bundle Size

**Import Specificity:**
```typescript
// ❌ WRONG: Importing entire library
import { Button, Dialog, Accordion, ... } from 'bits-ui';

// ✅ CORRECT: Import only what's needed
import { Button as ButtonPrimitive } from 'bits-ui';
```

---

## Styling Review

### Design Token Usage

**Required Semantic Tokens:**
```css
/* ✅ CORRECT: Using semantic tokens */
bg-primary text-primary-foreground
bg-secondary text-secondary-foreground
bg-destructive text-destructive-foreground
bg-muted text-muted-foreground
border-border
ring-ring

/* ❌ WRONG: Hardcoded colors */
bg-blue-500 text-white
bg-gray-100
border-gray-200
```

**Dark Mode Compatibility:**
```css
/* ✅ CORRECT: Uses tokens that auto-adapt */
bg-background text-foreground

/* ❌ WRONG: Hardcoded that won't adapt */
bg-white text-black
```

### State Styling

**Required Interactive States:**
```css
/* All interactive elements MUST have: */
hover:bg-...                           /* Hover feedback */
focus-visible:ring-2 focus-visible:ring-ring  /* Focus ring */
disabled:opacity-50 disabled:pointer-events-none  /* Disabled state */
active:scale-[0.98]                    /* Click feedback (optional) */
```

**Data Attribute States (bits-ui):**
```css
data-[state=checked]:bg-primary        /* Checked checkboxes/toggles */
data-[state=open]:...                  /* Open dropdowns/dialogs */
data-[state=active]:...                /* Active tabs */
data-[highlighted]:bg-accent           /* Highlighted list items */
data-[disabled]:opacity-50             /* Disabled via primitive */
```

### Class Merging

**Always Use cn():**
```svelte
<!-- ✅ CORRECT -->
class={cn(baseClasses, variantClasses[variant], className)}

<!-- ❌ WRONG: Template literal -->
class={`${baseClasses} ${variant === 'default' ? 'bg-primary' : 'bg-secondary'}`}

<!-- ❌ WRONG: Array join -->
class={[baseClasses, variantClasses[variant]].join(' ')}
```

---

## Review Checklist

### Pre-Merge Requirements

**Structure:**
- [ ] Component in correct directory structure
- [ ] index.ts exports all components
- [ ] Added to src/lib/index.ts

**TypeScript:**
- [ ] All props typed with explicit type definition
- [ ] No use of `any` or `Function`
- [ ] Variant/size unions properly defined
- [ ] Event handlers properly typed

**Svelte 5 Patterns:**
- [ ] Using $props() not `export let`
- [ ] Using $state(), $derived(), $effect() appropriately
- [ ] Using $bindable() for two-way bound props
- [ ] Using Snippet type for children

**Styling:**
- [ ] Using cn() for class merging
- [ ] Using semantic design tokens
- [ ] Dark mode compatible
- [ ] All interactive states present (hover, focus, disabled)

**Accessibility:**
- [ ] bits-ui primitives used for complex interactions
- [ ] Screen reader text for icon-only buttons
- [ ] Keyboard navigation works
- [ ] Focus visible styles present

**Performance:**
- [ ] No unnecessary reactivity
- [ ] Appropriate use of $derived vs $effect
- [ ] No heavy computations in render path

---

## Review Output Format

When reviewing code, structure feedback as:

```markdown
## Code Review: [Component Name]

### Critical Issues (Must Fix)
1. **[Issue]**: [Description]
   - Location: `file:line`
   - Fix: [Specific fix]

### Architecture Issues
1. **[Issue]**: [Description]
   - Current: `code snippet`
   - Recommended: `code snippet`

### Quality Improvements
1. **[Suggestion]**: [Description]
   - Benefit: [Why this matters]

### Positive Observations
- [What's done well]

### Summary
- Critical: X issues
- Architecture: X issues
- Quality: X suggestions
- Ready for merge: Yes/No
```

---

## Common Anti-Patterns

### Anti-Pattern: Prop Drilling

```svelte
<!-- ❌ WRONG: Passing props through many levels -->
<Parent>
	<Child prop={value}>
		<GrandChild prop={value}>
			<Target prop={value} />

<!-- ✅ CORRECT: Use context for deep props -->
<script>
	import { setContext } from 'svelte';
	setContext('theme', { value });
</script>
```

### Anti-Pattern: Inline Complex Logic

```svelte
<!-- ❌ WRONG: Complex logic in template -->
<div class={variant === 'primary' ? (size === 'lg' ? 'p-4 text-lg' : 'p-2 text-sm') : 'p-3'}>

<!-- ✅ CORRECT: Define mappings in script -->
const classes = cn(variantClasses[variant], sizeClasses[size]);
<div class={classes}>
```

### Anti-Pattern: Missing Error Boundaries

```svelte
<!-- Consider for complex components -->
{#if error}
	<div class="text-destructive">{error.message}</div>
{:else}
	{@render children()}
{/if}
```

---

## Reference Files

See the `references/` directory for review resources:
- `review-checklist.md` - Complete pre-merge checklist
- `common-issues.md` - Quick reference for frequent problems and fixes
