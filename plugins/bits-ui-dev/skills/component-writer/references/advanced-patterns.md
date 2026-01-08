# Advanced Component Patterns

Real patterns from the bits-ui component library for complex use cases.

---

## 1. Complex State Management (WheelSelector Pattern)

For components with physics-based interactions, momentum scrolling, or complex state:

```svelte
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import type { Snippet } from 'svelte';

  type WheelItem = {
    id: string;
    label: string;
    value?: string | number;
  };

  type Props = {
    items: WheelItem[];
    value?: string;
    onValueChange?: (value: string) => void;
    size?: 'sm' | 'default' | 'lg';
    class?: string;
  };

  let {
    items,
    value = $bindable(items[0]?.id ?? ''),
    onValueChange,
    size = 'default',
    class: className = ''
  }: Props = $props();

  // Internal state with $state()
  let containerRef: HTMLDivElement | null = $state(null);
  let isDragging = $state(false);
  let scrollPosition = $state(0);

  // Physics constants
  const FRICTION = 0.92;
  const MIN_VELOCITY = 0.5;
  const SNAP_DURATION = 80;

  // Tracking variables (not reactive)
  let velocity = 0;
  let lastPos = 0;
  let lastTime = 0;
  let animationId: number | null = null;

  // Derived state for visual index
  const visualIndex = $derived(() => {
    const itemHeight = getItemHeight();
    return Math.round(scrollPosition / itemHeight);
  });

  function getItemHeight(): number {
    // Size-dependent item height calculation
    const heights = { sm: 32, default: 40, lg: 48 };
    return heights[size];
  }

  function scrollToIndex(index: number) {
    if (!containerRef) return;
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    const targetScroll = index * getItemHeight();
    const startScroll = scrollPosition;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / SNAP_DURATION, 1);

      // Ease-out function
      const eased = 1 - Math.pow(1 - progress, 3);
      scrollPosition = startScroll + (targetScroll - startScroll) * eased;

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        scrollPosition = targetScroll;
        updateValue();
      }
    }

    animationId = requestAnimationFrame(animate);
  }

  function handleDragStart(e: MouseEvent | TouchEvent) {
    isDragging = true;
    lastPos = getClientPos(e);
    lastTime = performance.now();
    velocity = 0;

    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function getClientPos(e: MouseEvent | TouchEvent): number {
    return 'touches' in e ? e.touches[0].clientY : e.clientY;
  }

  function updateValue() {
    const index = Math.round(scrollPosition / getItemHeight());
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    const newValue = items[clampedIndex]?.id;
    if (newValue && newValue !== value) {
      value = newValue;
      onValueChange?.(newValue);
    }
  }
</script>

<div
  bind:this={containerRef}
  class={cn('relative overflow-hidden', className)}
  onmousedown={handleDragStart}
  ontouchstart={handleDragStart}
  role="listbox"
  tabindex="0"
>
  {#each items as item, index}
    <div
      role="option"
      aria-selected={item.id === value}
      class={cn(
        'transition-opacity duration-150',
        index === visualIndex() ? 'opacity-100' : 'opacity-40'
      )}
    >
      {item.label}
    </div>
  {/each}
</div>
```

**Key Patterns:**
- Use `$state()` for reactive internal state
- Use plain variables for non-reactive tracking (velocity, animationId)
- Use `$derived()` with function for computed values that depend on reactive state
- Use `requestAnimationFrame` for smooth animations
- Support both mouse and touch events

---

## 2. Orientation-Aware Components (Carousel Pattern)

For components that support both horizontal and vertical orientations:

```svelte
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import type { Snippet } from 'svelte';

  type CarouselItem = {
    id: string;
    label: string;
    icon?: string;
  };

  type Size = 'sm' | 'md' | 'lg';
  type Orientation = 'horizontal' | 'vertical';

  type Props = {
    items: CarouselItem[];
    activeId?: string;
    onActiveChange?: (id: string) => void;
    size?: Size;
    orientation?: Orientation;
    class?: string;
    children?: Snippet<[{ item: CarouselItem; isActive: boolean }]>;
  };

  let {
    items,
    activeId = $bindable(items[0]?.id ?? ''),
    onActiveChange,
    size = 'md',
    orientation = 'horizontal',
    class: className = '',
    children
  }: Props = $props();

  // Derived orientation flag for cleaner conditionals
  const isVertical = $derived(orientation === 'vertical');

  // Size configuration varies by orientation
  const sizeConfig: Record<Size, {
    height: string;
    width: string;
    itemWidth: string;
    itemHeight: string;
    gap: string;
    visibleItems: number;
  }> = {
    sm: {
      height: isVertical ? 'h-48' : 'h-8',
      width: isVertical ? 'w-8' : 'w-48',
      itemWidth: 'w-8',
      itemHeight: 'h-8',
      gap: 'gap-1',
      visibleItems: 5
    },
    md: {
      height: isVertical ? 'h-64' : 'h-12',
      width: isVertical ? 'w-12' : 'w-64',
      itemWidth: 'w-12',
      itemHeight: 'h-12',
      gap: 'gap-2',
      visibleItems: 5
    },
    lg: {
      height: isVertical ? 'h-80' : 'h-16',
      width: isVertical ? 'w-16' : 'w-80',
      itemWidth: 'w-16',
      itemHeight: 'h-16',
      gap: 'gap-3',
      visibleItems: 5
    }
  };

  const config = $derived(sizeConfig[size]);

  // Arrange items for infinite scroll effect
  const arrangedItems = $derived(() => {
    const activeIndex = items.findIndex(item => item.id === activeId);
    if (activeIndex === -1) return items;

    const half = Math.floor(config.visibleItems / 2);
    const result: CarouselItem[] = [];

    for (let i = -half; i <= half; i++) {
      const index = (activeIndex + i + items.length) % items.length;
      result.push(items[index]);
    }

    return result;
  });

  function handleKeyDown(e: KeyboardEvent) {
    const currentIndex = items.findIndex(item => item.id === activeId);
    let newIndex = currentIndex;

    // Orientation-aware keyboard navigation
    if (isVertical) {
      if (e.key === 'ArrowUp') newIndex = currentIndex - 1;
      if (e.key === 'ArrowDown') newIndex = currentIndex + 1;
    } else {
      if (e.key === 'ArrowLeft') newIndex = currentIndex - 1;
      if (e.key === 'ArrowRight') newIndex = currentIndex + 1;
    }

    if (e.key === 'Home') newIndex = 0;
    if (e.key === 'End') newIndex = items.length - 1;

    // Wrap around
    newIndex = (newIndex + items.length) % items.length;

    if (newIndex !== currentIndex) {
      e.preventDefault();
      activeId = items[newIndex].id;
      onActiveChange?.(items[newIndex].id);
    }
  }
</script>

<div
  class={cn(
    'relative flex items-center justify-center overflow-hidden',
    isVertical ? 'flex-col' : 'flex-row',
    config.height,
    config.width,
    config.gap,
    className
  )}
  role="tablist"
  aria-orientation={orientation}
  tabindex="0"
  onkeydown={handleKeyDown}
>
  {#each arrangedItems() as item, index}
    {@const isActive = item.id === activeId}
    {@const centerIndex = Math.floor(config.visibleItems / 2)}
    {@const distance = Math.abs(index - centerIndex)}

    <button
      role="tab"
      aria-selected={isActive}
      tabindex={isActive ? 0 : -1}
      class={cn(
        'shrink-0 transition-all duration-200',
        config.itemWidth,
        config.itemHeight,
        isActive
          ? 'bg-primary text-primary-foreground scale-110'
          : 'bg-muted text-muted-foreground',
        distance > 0 && `opacity-${100 - distance * 20}`
      )}
      onclick={() => {
        activeId = item.id;
        onActiveChange?.(item.id);
      }}
    >
      {#if children}
        {@render children({ item, isActive })}
      {:else}
        {item.label}
      {/if}
    </button>
  {/each}
</div>
```

**Key Patterns:**
- Use `$derived()` for orientation flag
- Size config varies by orientation
- Keyboard navigation is orientation-aware
- Use `aria-orientation` for accessibility
- Support custom rendering via Snippet with parameters

---

## 3. Checkbox with Indeterminate + Snippet Children

For form controls with complex states and custom render logic:

```svelte
<script lang="ts">
  import { Checkbox as CheckboxPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils.js';

  type Props = {
    checked?: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    name?: string;
    value?: string;
    class?: string;
    ref?: HTMLButtonElement | null;
    onCheckedChange?: (checked: boolean) => void;
    onIndeterminateChange?: (indeterminate: boolean) => void;
  };

  let {
    checked = $bindable(false),
    indeterminate = $bindable(false),
    disabled = false,
    name,
    value,
    class: className = '',
    ref = $bindable(null),
    onCheckedChange,
    onIndeterminateChange
  }: Props = $props();
</script>

<CheckboxPrimitive.Root
  bind:ref
  bind:checked
  bind:indeterminate
  {disabled}
  {name}
  {value}
  {onCheckedChange}
  {onIndeterminateChange}
  class={cn(
    'peer h-5 w-5 shrink-0 cursor-pointer rounded-md border border-border bg-background',
    'ring-offset-background transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground',
    'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:text-primary-foreground',
    'hover:border-primary/50',
    'active:scale-95',
    className
  )}
>
  <!-- Snippet children pattern: bits-ui passes state to render function -->
  {#snippet children({ checked, indeterminate })}
    <span class="flex items-center justify-center text-current">
      {#if indeterminate}
        <!-- Indeterminate icon (minus) -->
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M20 12H4" />
        </svg>
      {:else if checked}
        <!-- Checked icon (checkmark) -->
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
      {/if}
    </span>
  {/snippet}
</CheckboxPrimitive.Root>
```

**Key Patterns:**
- bits-ui primitives pass state to snippet children
- Use `{#snippet children({ checked, indeterminate })}` for state-aware rendering
- Handle both checked and indeterminate states
- Style both states consistently with data-[state=...] classes

---

## 4. Custom Animation Components

### Ripple Effect Pattern

```svelte
<script lang="ts">
  import { Button as ButtonPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils.js';
  import type { Snippet } from 'svelte';

  type Props = {
    class?: string;
    children?: Snippet;
    disabled?: boolean;
  };

  let {
    class: className = '',
    children,
    disabled = false
  }: Props = $props();

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

<ButtonPrimitive.Root
  {disabled}
  onclick={handleRipple}
  class={cn(
    'relative overflow-hidden',
    'inline-flex items-center justify-center rounded-md px-4 py-2',
    'bg-primary text-primary-foreground',
    className
  )}
>
  {#if rippling}
    <span
      class="absolute rounded-full bg-white/40 animate-[ripple_0.6s_linear] pointer-events-none"
      style="left: {rippleX}px; top: {rippleY}px; width: 20px; height: 20px; transform: translate(-50%, -50%);"
    ></span>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</ButtonPrimitive.Root>

<style>
  @keyframes ripple {
    to {
      transform: translate(-50%, -50%) scale(20);
      opacity: 0;
    }
  }
</style>
```

### Gradient Animation Pattern

```svelte
<script lang="ts">
  type Animation = 'gradient' | 'shimmer' | 'glow';

  const animationClasses: Record<Animation, string> = {
    gradient: 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-[length:200%_100%] hover:bg-[position:100%_0] transition-[background-position] duration-500',
    shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent hover:before:translate-x-full before:transition-transform before:duration-700',
    glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-primary/50 transition-shadow duration-300'
  };
</script>
```

### Staggered Loading Animation

```svelte
<!-- Loading dots with staggered animation -->
<span class="flex gap-1">
  <span class="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.3s]"></span>
  <span class="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.15s]"></span>
  <span class="h-2 w-2 rounded-full bg-current animate-bounce"></span>
</span>

<!-- Loading bars with staggered animation -->
<span class="flex gap-0.5 items-end h-4">
  <span class="w-1 bg-current animate-[pulse_0.75s_ease-in-out_infinite] h-2"></span>
  <span class="w-1 bg-current animate-[pulse_0.75s_ease-in-out_infinite_0.15s] h-3"></span>
  <span class="w-1 bg-current animate-[pulse_0.75s_ease-in-out_infinite_0.3s] h-4"></span>
  <span class="w-1 bg-current animate-[pulse_0.75s_ease-in-out_infinite_0.45s] h-3"></span>
</span>
```

**Key Patterns:**
- Use `[animation-delay:Xs]` for staggered timing
- Use `animate-[keyframe_duration_function]` for custom animations
- Use `bg-[length:X_Y]` and `bg-[position:X_Y]` for gradient animations
- Always include `overflow-hidden` for contained effects
- Use CSS custom properties for complex calculations

---

## 5. Mixed Export Pattern (Compound Components)

For compound components like Dialog, Accordion, DropdownMenu:

```typescript
// index.ts
import { Dialog as DialogPrimitive } from 'bits-ui';

// Re-export primitives directly (no styling needed)
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

// Export styled custom components
export { default as DialogContent } from './DialogContent.svelte';
export { default as DialogOverlay } from './DialogOverlay.svelte';
export { default as DialogHeader } from './DialogHeader.svelte';
export { default as DialogFooter } from './DialogFooter.svelte';
export { default as DialogTitle } from './DialogTitle.svelte';
export { default as DialogDescription } from './DialogDescription.svelte';
```

**Why this pattern:**
- Root, Trigger, Close need no styling - re-export directly
- Content, Overlay, Header need styling - create Svelte components
- Users compose: `<Dialog><DialogTrigger>...</DialogTrigger><DialogContent>...</DialogContent></Dialog>`

---

## 6. Complex Size Configuration (Nested Objects)

When sizes affect multiple sub-elements differently:

```typescript
const sizeClasses: Record<Size, {
  root: string;
  thumb: string;
  track: string;
  indicator: string;
}> = {
  sm: {
    root: 'h-5 w-9',
    thumb: 'h-4 w-4 data-[state=checked]:translate-x-4',
    track: 'rounded-full',
    indicator: 'h-1 w-1'
  },
  default: {
    root: 'h-6 w-11',
    thumb: 'h-5 w-5 data-[state=checked]:translate-x-5',
    track: 'rounded-full',
    indicator: 'h-1.5 w-1.5'
  },
  lg: {
    root: 'h-7 w-14',
    thumb: 'h-6 w-6 data-[state=checked]:translate-x-7',
    track: 'rounded-full',
    indicator: 'h-2 w-2'
  }
};

// Usage in template
<Root class={cn(baseClasses, sizeClasses[size].root)}>
  <Thumb class={cn(thumbBase, sizeClasses[size].thumb)} />
</Root>
```

---

## Summary

| Pattern | Use When |
|---------|----------|
| Physics State | Momentum scrolling, drag interactions |
| Orientation Aware | Horizontal/vertical layouts |
| Snippet Children | State-dependent custom rendering |
| Ripple Animation | Click feedback effects |
| Gradient Animation | Hover effects on backgrounds |
| Mixed Exports | Compound component systems |
| Nested Size Config | Multiple sub-elements need sizing |
