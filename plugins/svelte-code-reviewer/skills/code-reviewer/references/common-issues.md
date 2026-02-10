# Common Issues in Bits-UI Components

A quick reference of frequently found issues and their fixes.

---

## Critical Issues

### 1. XSS Vulnerability

**Problem**: Rendering unsanitized user input as HTML.

```svelte
<!-- DANGEROUS -->
{@html userInput}
```

**Fix**:
```svelte
<!-- Safe - text content -->
{userInput}

<!-- If HTML needed, sanitize -->
{@html DOMPurify.sanitize(userInput)}
```

### 2. Missing Accessible Name

**Problem**: Icon-only buttons without accessible name.

```svelte
<!-- WRONG - no accessible name -->
<button onclick={close}>
    <XIcon />
</button>
```

**Fix**:
```svelte
<!-- Option 1: aria-label -->
<button onclick={close} aria-label="Close">
    <XIcon />
</button>

<!-- Option 2: sr-only text -->
<button onclick={close}>
    <XIcon />
    <span class="sr-only">Close</span>
</button>
```

### 3. Missing Type Safety

**Problem**: Props without explicit types.

```svelte
<!-- WRONG - implicit any -->
let { data, handler } = $props();
```

**Fix**:
```svelte
type Props = {
    data: Record<string, unknown>;
    handler: (event: MouseEvent) => void;
};

let { data, handler }: Props = $props();
```

---

## Architecture Issues

### 4. Not Using cn() Utility

**Problem**: Manual class concatenation instead of cn().

```svelte
<!-- WRONG - template literal -->
class={`${baseClasses} ${variant === 'primary' ? 'bg-primary' : 'bg-secondary'}`}
```

**Fix**:
```svelte
class={cn(baseClasses, variantClasses[variant], className)}
```

### 5. Reserved Word 'class' Not Renamed

**Problem**: Using `class` directly in destructuring.

```svelte
<!-- WRONG - syntax error -->
let { class } = $props();
```

**Fix**:
```svelte
let { class: className = '' } = $props();
```

### 6. ref Not Using $bindable()

**Problem**: ref prop won't work for binding.

```svelte
<!-- WRONG - binding won't work -->
let { ref = null } = $props();
```

**Fix**:
```svelte
let { ref = $bindable(null) } = $props();
```

### 7. Svelte 4 Reactive Syntax

**Problem**: Using old reactive patterns.

```svelte
<!-- WRONG - Svelte 4 -->
export let value = '';
$: doubled = value * 2;
```

**Fix**:
```svelte
<!-- Svelte 5 -->
let { value = $bindable('') } = $props();
const doubled = $derived(value * 2);
```

---

## Quality Issues

### 8. Hardcoded Colors

**Problem**: Using specific color values instead of semantic tokens.

```svelte
<!-- WRONG -->
class="bg-blue-500 text-white border-gray-200"
```

**Fix**:
```svelte
class="bg-primary text-primary-foreground border-border"
```

### 9. Missing Interactive States

**Problem**: Missing hover, focus, or disabled styles.

```svelte
<!-- WRONG - incomplete states -->
class="bg-primary text-primary-foreground"
```

**Fix**:
```svelte
class="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
```

### 10. Magic Numbers

**Problem**: Arbitrary values instead of design tokens.

```svelte
<!-- WRONG -->
class="h-[42px] w-[180px]"
```

**Fix**:
```svelte
<!-- Use closest design token -->
class="h-10 w-44"
```

---

## Performance Issues

### 11. Effect for Derived Value

**Problem**: Using $effect when $derived would work.

```svelte
<!-- WRONG - unnecessary effect -->
let doubled = $state(0);
$effect(() => { doubled = count * 2; });
```

**Fix**:
```svelte
const doubled = $derived(count * 2);
```

### 12. Object Creation in Template

**Problem**: Creating new object on every render.

```svelte
<!-- WRONG - new object each render -->
<Child config={{ theme: 'dark' }} />
```

**Fix**:
```svelte
<script>
    const config = { theme: 'dark' };
</script>
<Child {config} />
```

---

## Quick Reference: Correct Pattern

```svelte
<script lang="ts">
    import { Component as ComponentPrimitive } from 'bits-ui';
    import { cn } from '$lib/utils.js';
    import type { Snippet } from 'svelte';

    type Variant = 'default' | 'secondary';
    type Size = 'sm' | 'default' | 'lg';

    type Props = {
        variant?: Variant;
        size?: Size;
        class?: string;
        children?: Snippet;
        disabled?: boolean;
        ref?: HTMLElement | null;
    };

    let {
        variant = 'default',
        size = 'default',
        class: className = '',
        children,
        disabled = false,
        ref = $bindable(null),
        ...restProps
    }: Props = $props();

    const variantClasses: Record<Variant, string> = {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
    };

    const sizeClasses: Record<Size, string> = {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-4',
        lg: 'h-12 px-6 text-base'
    };

    const baseClasses = 'inline-flex items-center justify-center rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
</script>

<ComponentPrimitive.Root
    bind:ref
    {disabled}
    class={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
    {...restProps}
>
    {#if children}
        {@render children()}
    {/if}
</ComponentPrimitive.Root>
```
