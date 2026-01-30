<script lang="ts">
	import { rawJson, parseError, loadPlan, clearPlan, analyzedPlan } from '$lib/stores/plan';
	import { EXAMPLE_PLAN } from '$lib/constants/example';
	import ScrollContainer from './ScrollContainer.svelte';
	import SqlHighlight from './SqlHighlight.svelte';

	interface Props {
		onTitleChange?: (title: string | undefined) => void;
	}

	let { onTitleChange }: Props = $props();

	let jsonInput = $state('');
	let sqlInput = $state('');
	let titleInput = $state('');
	let activeTab = $state<'json' | 'sql'>('json');

	// Notify parent when title changes
	$effect(() => {
		onTitleChange?.(titleInput.trim() || undefined);
	});

	function handleParse() {
		loadPlan(jsonInput, sqlInput);
	}

	function handleLoadExample() {
		jsonInput = JSON.stringify(EXAMPLE_PLAN, null, 2);
		sqlInput = "SELECT COUNT(*) FROM orders o\nJOIN customers c ON o.customer_id = c.id\nWHERE o.status = 'completed' AND c.country = 'US';";
		loadPlan(jsonInput, sqlInput);
	}

	function handleClear() {
		jsonInput = '';
		sqlInput = '';
		titleInput = '';
		clearPlan();
	}

	function scrollToSection(sectionId: string) {
		const element = document.getElementById(sectionId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	}

	function formatBlocks(blocks: number): string {
		const bytes = blocks * 8192;
		return `${blocks.toLocaleString()} (${formatBytes(bytes)})`;
	}
</script>

<div class="flex flex-col h-full">
	{#if !$analyzedPlan}
		<!-- Input Mode -->
		<div class="flex-shrink-0 flex items-center justify-between mb-3">
			<h2 class="text-sm font-semibold text-[var(--text-primary)]">Input</h2>
		</div>

		<!-- Title input -->
		<input
			type="text"
			bind:value={titleInput}
			placeholder="Plan title (optional)"
			class="input mb-3 text-sm"
		/>

		<!-- Tab buttons -->
		<div class="flex-shrink-0 tabs mb-3">
			<button
				onclick={() => activeTab = 'json'}
				class="tab {activeTab === 'json' ? 'tab-active' : ''}"
			>
				EXPLAIN JSON
			</button>
			<button
				onclick={() => activeTab = 'sql'}
				class="tab {activeTab === 'sql' ? 'tab-active' : ''}"
			>
				<span>SQL</span>
				<span class="text-[var(--text-tertiary)] text-[10px] ml-1">(optional)</span>
			</button>
		</div>

		<!-- Input areas -->
		{#if activeTab === 'json'}
			<textarea
				bind:value={jsonInput}
				placeholder="Paste EXPLAIN (ANALYZE, FORMAT JSON) output..."
				class="input input-mono flex-1 min-h-0 resize-none"
			></textarea>
		{:else}
			<textarea
				bind:value={sqlInput}
				placeholder="Paste the SQL query (optional)..."
				class="input input-mono flex-1 min-h-0 resize-none"
			></textarea>
		{/if}

		{#if $parseError}
			<div class="alert alert-danger mt-3 animate-slide-up">
				<svg class="alert-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<div class="alert-content">
					<p class="alert-description">{$parseError}</p>
				</div>
			</div>
		{/if}

		<div class="flex-shrink-0 flex gap-2 mt-3">
			<button
				onclick={handleParse}
				disabled={!jsonInput.trim()}
				class="btn btn-primary flex-1"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
				</svg>
				Analyze Plan
			</button>
			<button
				onclick={handleLoadExample}
				class="btn btn-secondary"
			>
				Example
			</button>
		</div>
	{:else}
		<!-- Summary Mode -->
		<div class="flex-shrink-0 flex items-center justify-between mb-3">
			<h2 class="text-sm font-semibold text-[var(--text-primary)]">Summary</h2>
		</div>

		<div class="flex-1 min-h-0">
			<ScrollContainer>
				<div class="space-y-3 pb-1">
					<!-- Clear button -->
					<button
						onclick={handleClear}
						class="w-full btn btn-secondary group hover:!border-red-300 dark:hover:!border-red-700"
					>
						<svg class="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						<span class="group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Clear & Load New Plan</span>
					</button>

					<!-- Data availability badges -->
					<div class="flex flex-wrap gap-1.5">
						{#if $analyzedPlan.hasAnalyzeData}
							<button
								onclick={() => scrollToSection('section-timing')}
								class="badge badge-success badge-interactive"
							>
								ANALYZE
							</button>
						{/if}
						{#if $analyzedPlan.hasBufferData}
							<button
								onclick={() => scrollToSection('section-buffers')}
								class="badge badge-info badge-interactive"
							>
								BUFFERS
							</button>
						{/if}
						{#if $analyzedPlan.hasWalData}
							<button
								onclick={() => scrollToSection('section-wal')}
								class="badge badge-interactive"
								style="background: linear-gradient(180deg, #f3e8ff 0%, #e9d5ff 100%); color: #7c3aed; border: 1px solid #e9d5ff;"
							>
								WAL
							</button>
						{/if}
						{#if $analyzedPlan.hasSettingsData}
							<button
								onclick={() => scrollToSection('section-settings')}
								class="badge badge-warning badge-interactive"
							>
								SETTINGS
							</button>
						{/if}
						{#if $analyzedPlan.queryText}
							<button
								onclick={() => scrollToSection('section-query')}
								class="badge badge-neutral badge-interactive"
							>
								SQL
							</button>
						{/if}
					</div>

					<!-- Suggestions status -->
					{#if $analyzedPlan.allSuggestions}
						{@const suggestionCount = $analyzedPlan.allSuggestions.length}
						{@const hasCritical = $analyzedPlan.allSuggestions.some(s => s.severity === 'critical')}
						{@const hasWarning = $analyzedPlan.allSuggestions.some(s => s.severity === 'warning')}
						<div class="alert {
							suggestionCount === 0 ? 'alert-success' :
							hasCritical ? 'alert-danger' :
							hasWarning ? 'alert-warning' : 'alert-info'
						}">
							{#if suggestionCount > 0}
								<div class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold {
									hasCritical ? 'bg-red-500' : hasWarning ? 'bg-amber-500' : 'bg-blue-500'
								}">!</div>
							{:else}
								<div class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold bg-emerald-500">
									<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									</svg>
								</div>
							{/if}
							<div class="alert-content">
								<p class="alert-title">
									{#if suggestionCount === 0}
										No issues found
									{:else}
										{suggestionCount} suggestion{suggestionCount !== 1 ? 's' : ''}
									{/if}
								</p>
								<p class="alert-description text-[11px] opacity-80">
									{#if suggestionCount === 0}
										Your query plan looks optimized
									{:else if hasCritical}
										Critical issues need attention
									{:else if hasWarning}
										Review suggestions for improvements
									{:else}
										Minor optimizations available
									{/if}
								</p>
							</div>
						</div>
					{/if}

					<!-- Timing -->
					<div id="section-timing" class="stat-card">
						<h3 class="metric-label mb-2">Timing</h3>
						<div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
							{#if $analyzedPlan.executionTime !== null}
								<div class="metric">
									<span class="metric-label">Execution</span>
									<span class="metric-value">{$analyzedPlan.executionTime.toFixed(2)}<span class="metric-unit">ms</span></span>
								</div>
							{/if}
							{#if $analyzedPlan.planningTime !== null}
								<div class="metric">
									<span class="metric-label">Planning</span>
									<span class="metric-value">{$analyzedPlan.planningTime.toFixed(2)}<span class="metric-unit">ms</span></span>
								</div>
							{/if}
							<div class="metric col-span-2 pt-1.5 border-t border-[var(--border-secondary)]">
								<span class="metric-label">Total Time</span>
								<span class="metric-value text-base">{$analyzedPlan.totalTime.toFixed(2)}<span class="metric-unit">ms</span></span>
							</div>
						</div>
					</div>

					<!-- Buffer Stats -->
					{#if $analyzedPlan.bufferStats}
						<div id="section-buffers" class="stat-card">
							<h3 class="metric-label mb-2">Buffers</h3>
							<div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
								{#if $analyzedPlan.bufferStats.sharedHit > 0}
									<div class="metric">
										<span class="metric-label">Shared Hit</span>
										<span class="metric-value">{$analyzedPlan.bufferStats.sharedHit.toLocaleString()}</span>
									</div>
								{/if}
								{#if $analyzedPlan.bufferStats.sharedRead > 0}
									<div class="metric">
										<span class="metric-label">Shared Read</span>
										<span class="metric-value">{$analyzedPlan.bufferStats.sharedRead.toLocaleString()}</span>
									</div>
								{/if}
								{#if $analyzedPlan.bufferStats.sharedDirtied > 0}
									<div class="metric">
										<span class="metric-label">Dirtied</span>
										<span class="metric-value">{$analyzedPlan.bufferStats.sharedDirtied.toLocaleString()}</span>
									</div>
								{/if}
								{#if $analyzedPlan.bufferStats.sharedWritten > 0}
									<div class="metric">
										<span class="metric-label">Written</span>
										<span class="metric-value">{$analyzedPlan.bufferStats.sharedWritten.toLocaleString()}</span>
									</div>
								{/if}
								{#if $analyzedPlan.bufferStats.tempRead > 0 || $analyzedPlan.bufferStats.tempWritten > 0}
									<div class="metric col-span-2">
										<span class="metric-label">Temp R/W</span>
										<span class="metric-value">{$analyzedPlan.bufferStats.tempRead}/{$analyzedPlan.bufferStats.tempWritten}</span>
									</div>
								{/if}
							</div>
							{#if $analyzedPlan.bufferStats.sharedHit > 0 || $analyzedPlan.bufferStats.sharedRead > 0}
								{@const total = $analyzedPlan.bufferStats.sharedHit + $analyzedPlan.bufferStats.sharedRead}
								{@const hitRate = total > 0 ? ($analyzedPlan.bufferStats.sharedHit / total * 100) : 0}
								<div class="mt-2 pt-2 border-t border-[var(--border-secondary)]">
									<div class="flex items-center justify-between mb-1">
										<span class="metric-label">Cache Hit Rate</span>
										<span class="metric-value text-sm {hitRate >= 90 ? 'text-emerald-600 dark:text-emerald-400' : hitRate >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}">
											{hitRate.toFixed(1)}%
										</span>
									</div>
									<div class="progress">
										<div class="progress-bar {hitRate >= 90 ? 'progress-success' : hitRate >= 70 ? 'progress-warning' : 'progress-danger'}" style="width: {hitRate}%"></div>
									</div>
								</div>
							{/if}
						</div>
					{/if}

					<!-- WAL Stats -->
					{#if $analyzedPlan.walStats}
						<div id="section-wal" class="stat-card">
							<h3 class="metric-label mb-2">WAL</h3>
							<div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
								<div class="metric">
									<span class="metric-label">Records</span>
									<span class="metric-value">{$analyzedPlan.walStats.records.toLocaleString()}</span>
								</div>
								{#if $analyzedPlan.walStats.fpi > 0}
									<div class="metric">
										<span class="metric-label">FPI</span>
										<span class="metric-value">{$analyzedPlan.walStats.fpi.toLocaleString()}</span>
									</div>
								{/if}
								<div class="metric">
									<span class="metric-label">Size</span>
									<span class="metric-value">{formatBytes($analyzedPlan.walStats.bytes)}</span>
								</div>
							</div>
						</div>
					{/if}

					<!-- Settings -->
					{#if $analyzedPlan.hasSettingsData}
						<div id="section-settings" class="stat-card">
							<h3 class="metric-label mb-2">Settings</h3>
							<div class="space-y-1">
								{#each Object.entries($analyzedPlan.settings) as [key, value]}
									<div class="flex items-center justify-between text-xs">
										<span class="text-[var(--text-secondary)] truncate mr-2" title={key}>{key}</span>
										<span class="font-mono text-[var(--text-primary)] truncate flex-shrink-0" title={value}>{value}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Triggers -->
					{#if $analyzedPlan.triggers && $analyzedPlan.triggers.length > 0}
						<div class="stat-card">
							<h3 class="metric-label mb-2">Triggers</h3>
							{#each $analyzedPlan.triggers as trigger}
								<div class="flex items-center justify-between text-xs py-1">
									<span class="font-medium text-[var(--text-primary)]">{trigger['Trigger Name']}</span>
									<span class="text-[var(--text-tertiary)]">on {trigger.Relation}</span>
									<span class="font-mono text-[var(--text-secondary)]">{trigger.Time.toFixed(2)}ms x{trigger.Calls}</span>
								</div>
							{/each}
						</div>
					{/if}

					<!-- Query -->
					{#if $analyzedPlan.queryText}
						<div id="section-query" class="stat-card">
							<h3 class="metric-label mb-2">Query</h3>
							<SqlHighlight sql={$analyzedPlan.queryText} />
						</div>
					{/if}
				</div>
			</ScrollContainer>
		</div>
	{/if}
</div>
