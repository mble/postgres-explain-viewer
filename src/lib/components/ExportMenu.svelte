<script lang="ts">
	import { analyzedPlan, rawJson, sqlQuery, planTitle } from '$lib/stores/plan';
	import { exportSvg, exportPng, exportMarkdown, copyLlmPrompt } from '$lib/utils/export';
	import { copyShareableUrl, type UrlState } from '$lib/utils/url-state';
	import { toast } from '$lib/stores/toast';

	let isOpen = $state(false);
	let isExporting = $state(false);

	function toggleMenu(e: Event) {
		e.stopPropagation();
		isOpen = !isOpen;
	}

	function closeMenu() {
		isOpen = false;
	}

	function getSvgElement(): SVGSVGElement | null {
		return document.querySelector('.col-span-6 svg, .lg\\:col-span-6 svg');
	}

	async function handleExportSvg() {
		const svg = getSvgElement();
		if (svg) {
			exportSvg(svg, 'query-plan.svg');
		}
		closeMenu();
	}

	async function handleExportPng() {
		const svg = getSvgElement();
		if (svg) {
			isExporting = true;
			try {
				await exportPng(svg, 'query-plan.png', 2);
			} catch (e) {
				console.error('PNG export failed:', e);
				toast.error('Failed to export PNG');
			} finally {
				isExporting = false;
			}
		}
		closeMenu();
	}

	function handleExportMarkdown() {
		if ($analyzedPlan) {
			exportMarkdown($analyzedPlan, 'query-analysis.md');
		}
		closeMenu();
	}

	async function handleCopyForLlm() {
		if ($analyzedPlan) {
			const success = await copyLlmPrompt($analyzedPlan);
			if (success) {
				toast.success('Copied to clipboard');
			} else {
				toast.error('Failed to copy');
			}
		}
		closeMenu();
	}

	async function handleCopyLink() {
		const state: UrlState = {
			json: $rawJson,
			sql: $sqlQuery || undefined,
			title: $planTitle
		};

		const success = await copyShareableUrl(state);
		if (success) {
			toast.success('Link copied to clipboard');
		} else {
			toast.error('Failed to copy link');
		}
		closeMenu();
	}

	// Close menu when clicking outside
	function handleClickOutside(e: MouseEvent) {
		if (isOpen) {
			closeMenu();
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative">
	<button
		onclick={toggleMenu}
		class="btn btn-secondary gap-1.5"
		aria-label="Export options"
		aria-expanded={isOpen}
	>
		<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
		</svg>
		<span class="hidden sm:inline">Export</span>
		<svg class="w-3 h-3 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isOpen}
		<div
			class="absolute right-0 mt-2 w-48 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-primary)] shadow-lg z-50 py-1 animate-scale-in origin-top-right"
			role="menu"
			aria-label="Export options"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && closeMenu()}
		>
			<button
				onclick={handleCopyLink}
				class="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)] flex items-center gap-2"
				role="menuitem"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
				</svg>
				<span>Copy Link</span>
			</button>

			<button
				onclick={handleCopyForLlm}
				class="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)] flex items-center gap-2"
				role="menuitem"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
				</svg>
				<span>Copy for LLM</span>
			</button>

			<div class="h-px bg-[var(--border-secondary)] my-1"></div>

			<button
				onclick={handleExportSvg}
				class="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)] flex items-center gap-2"
				role="menuitem"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				<span>Export as SVG</span>
			</button>

			<button
				onclick={handleExportPng}
				disabled={isExporting}
				class="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
				role="menuitem"
			>
				{#if isExporting}
					<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					<span>Exporting...</span>
				{:else}
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
					<span>Export as PNG</span>
				{/if}
			</button>

			<button
				onclick={handleExportMarkdown}
				class="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)] flex items-center gap-2"
				role="menuitem"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
				<span>Export Report (MD)</span>
			</button>
		</div>
	{/if}
</div>
