/**
 * Onboarding Store
 * Manages first-time user onboarding flow with localStorage persistence
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'onboarding-completed';

export interface OnboardingStep {
	id: string;
	title: string;
	description: string;
	targetSelector: string;
	position: 'top' | 'bottom' | 'left' | 'right';
	showAfterPlanLoad?: boolean;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
	{
		id: 'input',
		title: 'Paste your EXPLAIN JSON',
		description: 'Paste the output from EXPLAIN (ANALYZE, FORMAT JSON) to visualize your query plan.',
		targetSelector: '.card textarea, .card .input',
		position: 'right'
	},
	{
		id: 'hot-nodes',
		title: 'Hot nodes highlighted',
		description: 'Red-bordered nodes with warning indicators are "hot" nodes that may need optimization.',
		targetSelector: '.col-span-6, .lg\\:col-span-6',
		position: 'left',
		showAfterPlanLoad: true
	},
	{
		id: 'node-details',
		title: 'Click for details',
		description: 'Click any node in the tree to see detailed metrics and properties in the Details panel.',
		targetSelector: '.col-span-6 svg, .lg\\:col-span-6 svg',
		position: 'left',
		showAfterPlanLoad: true
	},
	{
		id: 'suggestions',
		title: 'View suggestions',
		description: 'Check the Insights tab for optimization suggestions based on your query plan.',
		targetSelector: '.tab:nth-child(2)',
		position: 'left',
		showAfterPlanLoad: true
	}
];

function loadCompletedState(): boolean {
	if (!browser) return true; // Skip onboarding on server
	try {
		return localStorage.getItem(STORAGE_KEY) === 'true';
	} catch {
		return false;
	}
}

function saveCompletedState(completed: boolean): void {
	if (!browser) return;
	try {
		if (completed) {
			localStorage.setItem(STORAGE_KEY, 'true');
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
	} catch {
		// Ignore storage errors
	}
}

function createOnboardingStore() {
	const hasCompleted = writable(loadCompletedState());
	const currentStepIndex = writable(0);
	const isActive = writable(false);

	return {
		hasCompleted: { subscribe: hasCompleted.subscribe },
		currentStepIndex: { subscribe: currentStepIndex.subscribe },
		isActive: { subscribe: isActive.subscribe },

		/**
		 * Start the onboarding flow
		 */
		start(): void {
			hasCompleted.update(() => {
				currentStepIndex.set(0);
				isActive.set(true);
				return false;
			});
		},

		/**
		 * Go to next step
		 */
		next(): void {
			currentStepIndex.update((i) => {
				const nextIndex = i + 1;
				if (nextIndex >= ONBOARDING_STEPS.length) {
					this.complete();
					return i;
				}
				return nextIndex;
			});
		},

		/**
		 * Go to previous step
		 */
		prev(): void {
			currentStepIndex.update((i) => Math.max(0, i - 1));
		},

		/**
		 * Skip to a specific step (used after plan load)
		 */
		skipToStep(stepId: string): void {
			const index = ONBOARDING_STEPS.findIndex((s) => s.id === stepId);
			if (index !== -1) {
				currentStepIndex.set(index);
			}
		},

		/**
		 * Complete onboarding
		 */
		complete(): void {
			hasCompleted.set(true);
			isActive.set(false);
			saveCompletedState(true);
		},

		/**
		 * Reset onboarding (for testing)
		 */
		reset(): void {
			hasCompleted.set(false);
			currentStepIndex.set(0);
			isActive.set(false);
			saveCompletedState(false);
		},

		/**
		 * Dismiss without completing (user can restart later)
		 */
		dismiss(): void {
			isActive.set(false);
		}
	};
}

export const onboarding = createOnboardingStore();

export const currentStep = derived(
	[onboarding.currentStepIndex, onboarding.isActive],
	([$index, $isActive]) => {
		if (!$isActive) return null;
		return ONBOARDING_STEPS[$index] ?? null;
	}
);

export const progress = derived(
	onboarding.currentStepIndex,
	($index) => ({
		current: $index + 1,
		total: ONBOARDING_STEPS.length
	})
);
