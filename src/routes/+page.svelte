<script lang="ts">
	import { analyzedPlan, selectedNode } from '$lib/stores/plan';
	import ExplainInput from '$lib/components/ExplainInput.svelte';
	import PlanTree from '$lib/components/PlanTree.svelte';
	import NodeDetails from '$lib/components/NodeDetails.svelte';
	import SuggestionPanel from '$lib/components/SuggestionPanel.svelte';
	import Legend from '$lib/components/Legend.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import NodeList from '$lib/components/NodeList.svelte';

	let showSuggestions = $state(true);
</script>

<svelte:head>
	<title>PostgreSQL EXPLAIN Viewer</title>
	<meta name="description" content="Visualize and analyze PostgreSQL EXPLAIN plans with performance insights and optimization suggestions." />
</svelte:head>

<div class="h-screen flex flex-col overflow-hidden bg-[var(--surface-secondary)]">
	<!-- Header -->
	<header class="flex-shrink-0 bg-[var(--surface-elevated)] border-b border-[var(--border-primary)]" style="box-shadow: var(--shadow-xs);">
		<div class="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<!-- Logo / Brand -->
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
						<svg class="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
						</svg>
					</div>
					<div>
						<h1 class="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">EXPLAIN Viewer</h1>
						<p class="text-[11px] text-[var(--text-tertiary)] leading-tight">PostgreSQL Query Analyzer</p>
					</div>
				</div>
			</div>

			<div class="flex items-center gap-3">
				{#if $analyzedPlan}
					<Legend />
				{/if}
				<div class="w-px h-6 bg-[var(--border-primary)]"></div>
				<ThemeToggle />
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-1 min-h-0 p-3 sm:p-4">
		<div class="max-w-screen-2xl mx-auto h-full">
			{#if !$analyzedPlan}
				<!-- Landing State -->
				<div class="h-full flex items-center justify-center animate-fade-in">
					<div class="w-full max-w-2xl">
						<!-- Hero Card -->
						<div class="card p-6 sm:p-8">
							<div class="text-center mb-6">
								<div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-4">
									<svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
									</svg>
								</div>
								<h2 class="text-xl font-semibold text-[var(--text-primary)] mb-1">Analyze Your Query Plan</h2>
								<p class="text-sm text-[var(--text-secondary)]">Paste your PostgreSQL EXPLAIN output to visualize and optimize</p>
							</div>
							<ExplainInput />
						</div>

						<!-- Help Text -->
						<div class="mt-5 flex items-center justify-center gap-2 text-sm text-[var(--text-tertiary)]">
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span>Run with <code class="code-inline">EXPLAIN (ANALYZE, FORMAT JSON)</code></span>
						</div>
					</div>
				</div>
			{:else}
				<!-- Analysis View -->
				<div class="h-full grid grid-cols-12 gap-3 animate-fade-in">
					<!-- Left Panel: Summary + Node List -->
					<div class="col-span-12 lg:col-span-3 flex flex-col gap-3 min-h-0">
						<!-- Plan Summary -->
						<div class="flex-shrink-0 max-h-[45%] card p-4 overflow-hidden">
							<ExplainInput />
						</div>

						<!-- Node List -->
						<div class="flex-1 min-h-0 card p-4 overflow-hidden">
							<NodeList />
						</div>
					</div>

					<!-- Center: Tree Visualization -->
					<div class="col-span-12 lg:col-span-6 min-h-0 card overflow-hidden">
						<PlanTree />
					</div>

					<!-- Right Panel: Details/Suggestions -->
					<div class="col-span-12 lg:col-span-3 flex flex-col gap-3 min-h-0">
						<!-- Tab Toggle -->
						<div class="flex-shrink-0 tabs">
							<button
								onclick={() => showSuggestions = false}
								class="tab {!showSuggestions ? 'tab-active' : ''}"
							>
								<span class="flex items-center justify-center gap-1.5">
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
									</svg>
									Details
								</span>
							</button>
							<button
								onclick={() => showSuggestions = true}
								class="tab {showSuggestions ? 'tab-active' : ''}"
							>
								<span class="flex items-center justify-center gap-1.5">
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
									</svg>
									Insights
									{#if $analyzedPlan.allSuggestions.length > 0}
										<span class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-[var(--color-primary-500)] text-white">
											{$analyzedPlan.allSuggestions.length}
										</span>
									{/if}
								</span>
							</button>
						</div>

						<!-- Panel Content -->
						<div class="flex-1 min-h-0 card p-4 overflow-hidden">
							{#if showSuggestions}
								<SuggestionPanel />
							{:else}
								<NodeDetails />
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</main>
</div>
