<!--
  EXAMPLE: Switch Component

  This is the canonical example of a stateful component with two-way binding.
  Key patterns demonstrated:
  - bits-ui Switch primitive with nested Thumb
  - Two-way binding with $bindable() for checked state
  - Complex size mappings (separate root and thumb classes)
  - data-[state=...] for state-based styling
  - Spread restProps for flexibility
-->
<script lang="ts">
	import { Switch as SwitchPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	// Size union type
	type Size = 'sm' | 'default' | 'lg';

	// Props with callback for external state management
	type Props = {
		checked?: boolean;
		disabled?: boolean;
		name?: string;
		value?: string;
		size?: Size;
		class?: string;
		ref?: HTMLButtonElement | null;
		onCheckedChange?: (checked: boolean) => void;  // Callback pattern
	};

	let {
		checked = $bindable(false),  // $bindable for two-way binding
		disabled = false,
		name,
		value,
		size = 'default',
		class: className = '',
		ref = $bindable(null),
		onCheckedChange,
		...restProps  // Capture remaining props
	}: Props = $props();

	// Complex size classes - different classes for root and thumb
	const sizeClasses: Record<Size, { root: string; thumb: string }> = {
		sm: {
			root: 'h-5 w-9',
			thumb: 'h-4 w-4 data-[state=checked]:translate-x-4'
		},
		default: {
			root: 'h-6 w-11',
			thumb: 'h-5 w-5 data-[state=checked]:translate-x-5'
		},
		lg: {
			root: 'h-7 w-14',
			thumb: 'h-6 w-6 data-[state=checked]:translate-x-7'
		}
	};
</script>

<!-- Root component - the clickable track -->
<SwitchPrimitive.Root
	bind:ref
	bind:checked
	{disabled}
	{name}
	{value}
	{onCheckedChange}
	class={cn(
		'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted',  // State-based colors
		sizeClasses[size].root,
		className
	)}
	{...restProps}
>
	<!-- Thumb component - the sliding circle -->
	<SwitchPrimitive.Thumb
		class={cn(
			'pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform',
			'data-[state=unchecked]:translate-x-0',  // State-based position
			sizeClasses[size].thumb
		)}
	/>
</SwitchPrimitive.Root>
