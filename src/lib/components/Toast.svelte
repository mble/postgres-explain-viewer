<script lang="ts">
	import { toast } from '$lib/stores/toast';
</script>

{#if $toast.length > 0}
	<div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
		{#each $toast as t (t.id)}
			<div
				class="flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg animate-slide-up {
					t.type === 'success' ? 'bg-emerald-600 text-white' :
					t.type === 'error' ? 'bg-red-600 text-white' :
					'bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-primary)]'
				}"
				role="status"
				aria-live="polite"
			>
				{#if t.type === 'success'}
					<svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				{:else if t.type === 'error'}
					<svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				{:else}
					<svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				{/if}
				<span class="text-sm font-medium">{t.message}</span>
				<button
					onclick={() => toast.dismiss(t.id)}
					class="ml-2 opacity-70 hover:opacity-100 transition-opacity"
					aria-label="Dismiss"
				>
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		{/each}
	</div>
{/if}
