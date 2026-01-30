/**
 * Plan History Store
 * Stores up to 20 recent plans in localStorage with LRU eviction
 */

import { writable, derived } from 'svelte/store';
import { compress, decompress } from '$lib/utils/compression';
import { slugify, generateSlug } from '$lib/utils/slug';
import { browser } from '$app/environment';

const MAX_HISTORY_SIZE = 20;
const STORAGE_KEY = 'plan-history';

export interface HistoryEntry {
	id: string;
	timestamp: number;
	label: string;
	slug: string;
	title?: string;
	compressedPlan: string;
	compressedSql?: string;
	executionTime: number | null;
}

function generateId(): string {
	return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateLabel(json: string, sql: string | undefined): string {
	// Try to extract a meaningful label from SQL first
	if (sql) {
		// Look for table names in FROM clause
		const fromMatch = sql.match(/FROM\s+["']?(\w+)["']?/i);
		if (fromMatch) {
			return `Query on ${fromMatch[1]}`;
		}

		// First 30 chars of SQL
		const sqlSnippet = sql.trim().slice(0, 30).replace(/\s+/g, ' ');
		if (sqlSnippet.length > 0) {
			return sqlSnippet + (sql.length > 30 ? '...' : '');
		}
	}

	// Try to extract from plan JSON
	try {
		const plan = JSON.parse(json);
		const root = Array.isArray(plan) ? plan[0]?.Plan : plan.Plan;
		if (root) {
			const tableName = root['Relation Name'] || root['Index Name'];
			if (tableName) {
				return `${root['Node Type']} on ${tableName}`;
			}
			return root['Node Type'] || 'Query Plan';
		}
	} catch {
		// Ignore parse errors
	}

	return 'Query Plan';
}

/**
 * Migrate legacy entries that don't have slugs
 */
function migrateEntries(entries: HistoryEntry[]): HistoryEntry[] {
	const existingSlugs = new Set<string>();

	return entries.map((entry) => {
		if (entry.slug) {
			existingSlugs.add(entry.slug);
			return entry;
		}

		// Generate slug from title or label
		const text = entry.title || entry.label;
		const slug = generateSlug(text, existingSlugs);
		existingSlugs.add(slug);

		return { ...entry, slug };
	});
}

function loadFromStorage(): HistoryEntry[] {
	if (!browser) return [];

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];

		const entries = JSON.parse(stored);
		if (!Array.isArray(entries)) return [];

		// Validate entries (slug is optional for migration)
		const validEntries = entries.filter(
			(entry: unknown): entry is HistoryEntry =>
				typeof entry === 'object' &&
				entry !== null &&
				typeof (entry as HistoryEntry).id === 'string' &&
				typeof (entry as HistoryEntry).timestamp === 'number' &&
				typeof (entry as HistoryEntry).label === 'string' &&
				typeof (entry as HistoryEntry).compressedPlan === 'string'
		);

		// Migrate entries without slugs
		return migrateEntries(validEntries);
	} catch {
		return [];
	}
}

function saveToStorage(entries: HistoryEntry[]): void {
	if (!browser) return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
	} catch (e) {
		// Storage might be full, try to clear old entries
		console.warn('Failed to save history, clearing old entries:', e);
		const reduced = entries.slice(0, Math.floor(entries.length / 2));
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
		} catch {
			// Give up
		}
	}
}

function createHistoryStore() {
	const entries = writable<HistoryEntry[]>(loadFromStorage());

	// Auto-save to localStorage on changes
	entries.subscribe((value) => {
		saveToStorage(value);
	});

	return {
		subscribe: entries.subscribe,

		/**
		 * Add a new plan to history
		 */
		addPlan(json: string, sql?: string, executionTime?: number | null, title?: string): HistoryEntry {
			let entry: HistoryEntry;

			entries.update((current) => {
				// Remove duplicate (same compressed plan)
				const compressedPlan = compress(json);
				const filtered = current.filter((e) => e.compressedPlan !== compressedPlan);

				// Get existing slugs for uniqueness
				const existingSlugs = new Set(filtered.map((e) => e.slug));

				// Generate label and slug
				const label = generateLabel(json, sql);
				const slug = generateSlug(title || label, existingSlugs);

				entry = {
					id: generateId(),
					timestamp: Date.now(),
					label,
					slug,
					title,
					compressedPlan,
					compressedSql: sql ? compress(sql) : undefined,
					executionTime: executionTime ?? null
				};

				// Add new entry at the beginning
				const updated = [entry, ...filtered];

				// Enforce max size (LRU eviction)
				return updated.slice(0, MAX_HISTORY_SIZE);
			});

			return entry!;
		},

		/**
		 * Get decompressed plan data from a history entry
		 */
		getPlanData(entry: HistoryEntry): { json: string; sql?: string } | null {
			const json = decompress(entry.compressedPlan);
			if (!json) return null;

			const sql = entry.compressedSql ? decompress(entry.compressedSql) : undefined;

			return { json, sql: sql ?? undefined };
		},

		/**
		 * Remove a specific entry
		 */
		remove(id: string): void {
			entries.update((current) => current.filter((e) => e.id !== id));
		},

		/**
		 * Clear all history
		 */
		clear(): void {
			entries.set([]);
		},

		/**
		 * Update entry label
		 */
		updateLabel(id: string, label: string): void {
			entries.update((current) =>
				current.map((e) => (e.id === id ? { ...e, label } : e))
			);
		},

		/**
		 * Get entry by slug
		 */
		getBySlug(slug: string): HistoryEntry | undefined {
			let result: HistoryEntry | undefined;
			entries.subscribe((current) => {
				result = current.find((e) => e.slug === slug);
			})();
			return result;
		},

		/**
		 * Update entry title and regenerate slug
		 */
		updateTitle(id: string, title: string): string {
			let newSlug = '';
			entries.update((current) => {
				const index = current.findIndex((e) => e.id === id);
				if (index === -1) return current;

				// Get existing slugs excluding the current entry
				const existingSlugs = new Set(
					current.filter((e) => e.id !== id).map((e) => e.slug)
				);

				// Generate new slug from title
				newSlug = generateSlug(title || current[index].label, existingSlugs);

				return current.map((e) =>
					e.id === id ? { ...e, title, slug: newSlug } : e
				);
			});
			return newSlug;
		}
	};
}

export const planHistory = createHistoryStore();

export const historyCount = derived(planHistory, ($history) => $history.length);
