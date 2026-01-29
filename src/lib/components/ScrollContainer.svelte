<script lang="ts">
	import { onMount } from 'svelte';

	let { children, class: className = '' } = $props();

	let container: HTMLDivElement;
	let canScrollUp = $state(false);
	let canScrollDown = $state(false);

	function updateScrollIndicators() {
		if (!container) return;

		const { scrollTop, scrollHeight, clientHeight } = container;
		const threshold = 5; // Small threshold to account for rounding

		canScrollUp = scrollTop > threshold;
		canScrollDown = scrollTop + clientHeight < scrollHeight - threshold;
	}

	onMount(() => {
		updateScrollIndicators();

		const resizeObserver = new ResizeObserver(() => {
			updateScrollIndicators();
		});
		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
		};
	});
</script>

<div class="relative h-full {className}">
	<!-- Top fade indicator -->
	{#if canScrollUp}
		<div
			class="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white dark:from-gray-800 to-transparent pointer-events-none z-10"
		></div>
	{/if}

	<!-- Scrollable content -->
	<div
		bind:this={container}
		onscroll={updateScrollIndicators}
		class="h-full overflow-y-auto"
	>
		{@render children()}
	</div>

	<!-- Bottom fade indicator -->
	{#if canScrollDown}
		<div
			class="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none z-10"
		></div>
	{/if}
</div>
