<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { analyzedPlan, selectedNode, loadPlan, rawJson, sqlQuery } from '$lib/stores/plan';
	import { planHistory } from '$lib/stores/history';
	import { comparison } from '$lib/stores/comparison';
	const comparisonIsActive = comparison.isActive;
	import { onboarding, currentStep } from '$lib/stores/onboarding';
	import { decodeFromUrl, updateUrlHash, hasUrlState } from '$lib/utils/url-state';
	import ExplainInput from '$lib/components/ExplainInput.svelte';
	import PlanTree from '$lib/components/PlanTree.svelte';
	import NodeDetails from '$lib/components/NodeDetails.svelte';
	import SuggestionPanel from '$lib/components/SuggestionPanel.svelte';
	import Legend from '$lib/components/Legend.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import NodeList from '$lib/components/NodeList.svelte';
	import ExportMenu from '$lib/components/ExportMenu.svelte';
	import PlanHistory from '$lib/components/PlanHistory.svelte';
	import OnboardingTooltips from '$lib/components/OnboardingTooltips.svelte';
	import MobileNav from '$lib/components/MobileNav.svelte';
	import PlanComparison from '$lib/components/PlanComparison.svelte';

	let showSuggestions = $state(true);
	let showHistory = $state(false);
	let mobilePanel = $state<'tree' | 'list' | 'details' | 'insights'>('tree');

	// Load plan from URL on mount
	onMount(() => {
		if (browser && hasUrlState()) {
			const state = decodeFromUrl(window.location.hash);
			if (state) {
				loadPlan(state.json, state.sql ?? '');
			}
		}

		// Start onboarding for new users (check if they haven't completed it)
		let unsubOnboarding: (() => void) | undefined;
		onboarding.hasCompleted.subscribe((completed) => {
			if (!completed && browser) {
				// Delay start to let page render
				setTimeout(() => onboarding.start(), 500);
			}
		})();
	});

	// Update URL when plan changes
	$effect(() => {
		if (browser && $analyzedPlan && $rawJson) {
			updateUrlHash({ json: $rawJson, sql: $sqlQuery || undefined });
			// Save to history
			planHistory.addPlan($rawJson, $sqlQuery || undefined, $analyzedPlan.executionTime);
		}
	});

	// Advance onboarding when plan loads
	$effect(() => {
		if ($analyzedPlan && $currentStep?.id === 'input') {
			onboarding.skipToStep('hot-nodes');
		}
	});

	function toggleHistory() {
		showHistory = !showHistory;
	}

	function handleMobilePanelChange(panel: 'tree' | 'list' | 'details' | 'insights') {
		mobilePanel = panel;
		if (panel === 'details') {
			showSuggestions = false;
		} else if (panel === 'insights') {
			showSuggestions = true;
		}
	}
</script>

<svelte:head>
	<title>PostgreSQL EXPLAIN Viewer</title>
	<meta name="description" content="Visualize and analyze PostgreSQL EXPLAIN plans with performance insights and optimization suggestions." />
</svelte:head>

<!-- Plan Comparison Overlay -->
{#if $comparisonIsActive}
	<PlanComparison />
{/if}

<!-- Onboarding Tooltips -->
<OnboardingTooltips />

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
					<div class="hidden sm:block">
						<h1 class="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">EXPLAIN Viewer</h1>
						<p class="text-[11px] text-[var(--text-tertiary)] leading-tight">PostgreSQL Query Analyzer</p>
					</div>
				</div>
			</div>

			<div class="flex items-center gap-2 sm:gap-3">
				{#if $analyzedPlan}
					<div class="hidden md:block">
						<Legend />
					</div>

					<!-- Compare Button -->
					<button
						onclick={() => comparison.enable()}
						class="btn btn-ghost hidden sm:flex"
						title="Compare plans"
					>
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
						<span class="hidden lg:inline">Compare</span>
					</button>

					<!-- Export Menu -->
					<ExportMenu />
				{/if}

				<!-- History Button -->
				<button
					onclick={toggleHistory}
					class="btn btn-ghost relative"
					title="Plan history"
					aria-expanded={showHistory}
				>
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span class="hidden lg:inline">History</span>
				</button>

				<div class="w-px h-6 bg-[var(--border-primary)] hidden sm:block"></div>
				<ThemeToggle />
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-1 min-h-0 p-3 sm:p-4 pb-16 md:pb-4">
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
				<!-- Analysis View - Desktop -->
				<div class="h-full hidden md:grid grid-cols-12 gap-3 animate-fade-in">
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

				<!-- Analysis View - Mobile -->
				<div class="h-full md:hidden animate-fade-in">
					{#if mobilePanel === 'tree'}
						<div class="h-full card overflow-hidden">
							<PlanTree />
						</div>
					{:else if mobilePanel === 'list'}
						<div class="h-full card p-4 overflow-hidden">
							<NodeList />
						</div>
					{:else if mobilePanel === 'details'}
						<div class="h-full card p-4 overflow-hidden">
							<NodeDetails />
						</div>
					{:else if mobilePanel === 'insights'}
						<div class="h-full card p-4 overflow-hidden">
							<SuggestionPanel />
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</main>

	<!-- Mobile Navigation -->
	<MobileNav activePanel={mobilePanel} onPanelChange={handleMobilePanelChange} />
</div>

<!-- History Slide-out Panel -->
{#if showHistory}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
		onclick={() => showHistory = false}
		onkeydown={(e) => e.key === 'Escape' && (showHistory = false)}
		role="button"
		tabindex="-1"
		aria-label="Close history panel"
	></div>

	<!-- Panel -->
	<div class="fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[90vw] bg-[var(--surface-elevated)] border-l border-[var(--border-primary)] shadow-xl animate-slide-in-right">
		<div class="flex flex-col h-full p-4">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-semibold text-[var(--text-primary)]">History</h2>
				<button
					onclick={() => showHistory = false}
					class="p-1.5 rounded-lg hover:bg-[var(--surface-tertiary)] text-[var(--text-secondary)]"
					aria-label="Close"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="flex-1 min-h-0">
				<PlanHistory onClose={() => showHistory = false} />
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes slide-in-right {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	.animate-slide-in-right {
		animation: slide-in-right 0.2s ease-out;
	}
</style>
