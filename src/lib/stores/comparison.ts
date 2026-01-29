/**
 * Plan Comparison Store
 * Manages side-by-side comparison of two query plans
 */

import { writable, derived } from 'svelte/store';
import type { AnalyzedPlan } from '$lib/types/explain';
import { parseExplainJson } from '$lib/utils/parser';
import { analyzePlan } from '$lib/utils/analyzer';
import { resetSuggestionCounter } from '$lib/utils/suggestions';

export interface ComparisonState {
	planA: AnalyzedPlan | null;
	planB: AnalyzedPlan | null;
	rawJsonA: string;
	rawJsonB: string;
	sqlA: string;
	sqlB: string;
	errorA: string | null;
	errorB: string | null;
}

const initialState: ComparisonState = {
	planA: null,
	planB: null,
	rawJsonA: '',
	rawJsonB: '',
	sqlA: '',
	sqlB: '',
	errorA: null,
	errorB: null
};

function createComparisonStore() {
	const state = writable<ComparisonState>(initialState);
	const isActive = writable(false);

	return {
		subscribe: state.subscribe,
		isActive: { subscribe: isActive.subscribe },

		/**
		 * Enable comparison mode
		 */
		enable(): void {
			isActive.set(true);
		},

		/**
		 * Disable comparison mode and clear state
		 */
		disable(): void {
			isActive.set(false);
			state.set(initialState);
		},

		/**
		 * Load plan A
		 */
		loadPlanA(json: string, sql: string = ''): boolean {
			resetSuggestionCounter();
			const result = parseExplainJson(json);

			if (!result.success) {
				state.update((s) => ({
					...s,
					planA: null,
					rawJsonA: json,
					sqlA: sql,
					errorA: result.error
				}));
				return false;
			}

			const plan = analyzePlan(result.plan, result.hasAnalyzeData);
			if (sql && !plan.queryText) {
				plan.queryText = sql;
			}

			state.update((s) => ({
				...s,
				planA: plan,
				rawJsonA: json,
				sqlA: sql,
				errorA: null
			}));
			return true;
		},

		/**
		 * Load plan B
		 */
		loadPlanB(json: string, sql: string = ''): boolean {
			resetSuggestionCounter();
			const result = parseExplainJson(json);

			if (!result.success) {
				state.update((s) => ({
					...s,
					planB: null,
					rawJsonB: json,
					sqlB: sql,
					errorB: result.error
				}));
				return false;
			}

			const plan = analyzePlan(result.plan, result.hasAnalyzeData);
			if (sql && !plan.queryText) {
				plan.queryText = sql;
			}

			state.update((s) => ({
				...s,
				planB: plan,
				rawJsonB: json,
				sqlB: sql,
				errorB: null
			}));
			return true;
		},

		/**
		 * Swap plans A and B
		 */
		swap(): void {
			state.update((s) => ({
				planA: s.planB,
				planB: s.planA,
				rawJsonA: s.rawJsonB,
				rawJsonB: s.rawJsonA,
				sqlA: s.sqlB,
				sqlB: s.sqlA,
				errorA: s.errorB,
				errorB: s.errorA
			}));
		},

		/**
		 * Clear both plans
		 */
		clear(): void {
			state.set(initialState);
		}
	};
}

export const comparison = createComparisonStore();

export const comparisonSummary = derived(comparison, ($state) => {
	if (!$state.planA || !$state.planB) return null;

	const timeA = $state.planA.totalTime;
	const timeB = $state.planB.totalTime;
	const timeDiff = timeB - timeA;
	const timePercent = timeA > 0 ? ((timeDiff / timeA) * 100) : 0;

	const suggestionsA = $state.planA.allSuggestions.length;
	const suggestionsB = $state.planB.allSuggestions.length;

	return {
		timeA,
		timeB,
		timeDiff,
		timePercent,
		isImproved: timeDiff < 0,
		suggestionsA,
		suggestionsB,
		suggestionsDiff: suggestionsB - suggestionsA
	};
});
