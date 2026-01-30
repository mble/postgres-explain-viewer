<script lang="ts">
	import { planHistory, type HistoryEntry } from '$lib/stores/history';
	import { loadPlan } from '$lib/stores/plan';
	import { updateUrlWithSlug } from '$lib/utils/url-state';
	import { browser } from '$app/environment';
	import ScrollContainer from './ScrollContainer.svelte';

	interface Props {
		onClose?: () => void;
	}

	let { onClose }: Props = $props();

	let editingId = $state<string | null>(null);
	let editValue = $state('');

	function formatTimestamp(timestamp: number): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now.getTime() - timestamp;

		// Less than 1 minute
		if (diff < 60000) {
			return 'Just now';
		}

		// Less than 1 hour
		if (diff < 3600000) {
			const mins = Math.floor(diff / 60000);
			return `${mins}m ago`;
		}

		// Less than 24 hours
		if (diff < 86400000) {
			const hours = Math.floor(diff / 3600000);
			return `${hours}h ago`;
		}

		// Same year
		if (date.getFullYear() === now.getFullYear()) {
			return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
		}

		// Different year
		return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function formatTime(ms: number | null): string {
		if (ms === null) return '';
		if (ms >= 1000) return (ms / 1000).toFixed(2) + 's';
		return ms.toFixed(1) + 'ms';
	}

	function handleLoad(entry: HistoryEntry) {
		const data = planHistory.getPlanData(entry);
		if (data) {
			loadPlan(data.json, data.sql ?? '');
			onClose?.();
		}
	}

	function handleDelete(e: Event, id: string) {
		e.stopPropagation();
		planHistory.remove(id);
	}

	function handleClearAll() {
		if (confirm('Clear all plan history?')) {
			planHistory.clear();
		}
	}

	function startEditing(e: Event, entry: HistoryEntry) {
		e.stopPropagation();
		editingId = entry.id;
		editValue = entry.title || entry.label;
	}

	function saveEdit(entry: HistoryEntry) {
		if (editingId === entry.id) {
			const newSlug = planHistory.updateTitle(entry.id, editValue.trim());
			// Update URL if this is the currently loaded plan
			if (browser && newSlug) {
				const currentHash = window.location.hash;
				if (currentHash.includes(entry.slug) || currentHash === `#p/${entry.slug}`) {
					updateUrlWithSlug(newSlug);
				}
			}
			editingId = null;
		}
	}

	function cancelEdit() {
		editingId = null;
		editValue = '';
	}

	function handleEditKeydown(e: KeyboardEvent, entry: HistoryEntry) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveEdit(entry);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelEdit();
		}
	}
</script>

<div class="flex flex-col h-full">
	<div class="flex items-center justify-between mb-3">
		<h2 class="text-sm font-semibold text-[var(--text-primary)]">History</h2>
		{#if $planHistory.length > 0}
			<button
				onclick={handleClearAll}
				class="text-xs text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
			>
				Clear All
			</button>
		{/if}
	</div>

	{#if $planHistory.length === 0}
		<div class="flex-1 flex items-center justify-center">
			<div class="text-center text-[var(--text-tertiary)]">
				<svg class="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p class="text-sm">No history yet</p>
				<p class="text-xs mt-1">Plans you analyze will appear here</p>
			</div>
		</div>
	{:else}
		<div class="flex-1 min-h-0">
			<ScrollContainer>
				<div class="space-y-2 pb-1">
					{#each $planHistory as entry (entry.id)}
						<div
							class="relative p-3 rounded-lg bg-[var(--surface-tertiary)] hover:bg-[var(--surface-secondary)] border border-transparent hover:border-[var(--border-primary)] transition-all group cursor-pointer"
							onclick={() => editingId !== entry.id && handleLoad(entry)}
							onkeydown={(e) => e.key === 'Enter' && editingId !== entry.id && handleLoad(entry)}
							role="button"
							tabindex="0"
						>
							<div class="flex items-start justify-between gap-2">
								<div class="flex-1 min-w-0">
									{#if editingId === entry.id}
										<input
											type="text"
											bind:value={editValue}
											onkeydown={(e) => handleEditKeydown(e, entry)}
											onblur={() => saveEdit(entry)}
											class="w-full text-sm font-medium text-[var(--text-primary)] bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-500)]"
											onclick={(e) => e.stopPropagation()}
										/>
									{:else}
										<p class="text-sm font-medium text-[var(--text-primary)] truncate">
											{entry.title || entry.label}
										</p>
									{/if}
									<div class="flex items-center gap-2 mt-1">
										<span class="text-xs text-[var(--text-tertiary)]">
											{formatTimestamp(entry.timestamp)}
										</span>
										{#if entry.executionTime !== null}
											<span class="text-xs font-mono text-[var(--text-secondary)]">
												{formatTime(entry.executionTime)}
											</span>
										{/if}
									</div>
								</div>
								<div class="flex items-center gap-1">
									{#if editingId !== entry.id}
										<button
											onclick={(e) => startEditing(e, entry)}
											class="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-all"
											aria-label="Edit title"
										>
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
												<path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
											</svg>
										</button>
									{/if}
									<button
										onclick={(e) => handleDelete(e, entry.id)}
										class="p-1 text-[var(--text-tertiary)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
										aria-label="Delete from history"
									>
										<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</ScrollContainer>
		</div>
	{/if}
</div>
