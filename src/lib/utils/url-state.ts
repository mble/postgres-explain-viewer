/**
 * URL State Persistence
 * Stores and retrieves plan data from URL hash for shareable links
 */

import { compress, decompress } from './compression';

export interface UrlState {
	json: string;
	sql?: string;
}

const URL_PREFIX = 'plan=';

/**
 * Encode plan state to URL hash
 */
export function encodeToUrl(state: UrlState): string {
	const data = JSON.stringify(state);
	const compressed = compress(data);
	return `#${URL_PREFIX}${compressed}`;
}

/**
 * Decode plan state from URL hash
 * Returns null if no valid state found
 */
export function decodeFromUrl(hash: string): UrlState | null {
	if (!hash || !hash.startsWith(`#${URL_PREFIX}`)) {
		return null;
	}

	const compressed = hash.slice(1 + URL_PREFIX.length);
	if (!compressed) {
		return null;
	}

	const decompressed = decompress(compressed);
	if (!decompressed) {
		return null;
	}

	try {
		const state = JSON.parse(decompressed);
		if (typeof state.json !== 'string') {
			return null;
		}
		return state as UrlState;
	} catch {
		return null;
	}
}

/**
 * Update the current URL hash with plan state
 * Uses replaceState to avoid polluting history
 */
export function updateUrlHash(state: UrlState): void {
	const hash = encodeToUrl(state);
	window.history.replaceState(null, '', hash);
}

/**
 * Clear the URL hash
 */
export function clearUrlHash(): void {
	window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

/**
 * Check if current URL has plan data
 */
export function hasUrlState(): boolean {
	return window.location.hash.startsWith(`#${URL_PREFIX}`);
}

/**
 * Get shareable URL with current plan
 */
export function getShareableUrl(state: UrlState): string {
	const hash = encodeToUrl(state);
	return `${window.location.origin}${window.location.pathname}${hash}`;
}

/**
 * Copy shareable URL to clipboard
 */
export async function copyShareableUrl(state: UrlState): Promise<boolean> {
	const url = getShareableUrl(state);
	try {
		await navigator.clipboard.writeText(url);
		return true;
	} catch {
		return false;
	}
}
