/**
 * URL State Persistence
 * Stores and retrieves plan data from URL hash for shareable links
 *
 * Two URL formats are supported:
 * - Slug URLs: #p/my-slug - references localStorage history
 * - Compressed URLs: #plan=<compressed> - portable, self-contained
 */

import { compress, decompress } from './compression';

export interface UrlState {
	json: string;
	sql?: string;
	title?: string;
}

export type ParsedUrl =
	| { type: 'slug'; slug: string }
	| { type: 'compressed'; state: UrlState }
	| null;

const URL_PREFIX = 'plan=';
const SLUG_PREFIX = 'p/';

/**
 * Encode plan state to URL hash
 */
export function encodeToUrl(state: UrlState): string {
	const data = JSON.stringify(state);
	const compressed = compress(data);
	return `#${URL_PREFIX}${compressed}`;
}

/**
 * Parse URL hash to determine type and extract data
 * Returns null if no valid state found
 */
export function parseUrlHash(hash: string): ParsedUrl {
	if (!hash || !hash.startsWith('#')) {
		return null;
	}

	const content = hash.slice(1);

	// Check for slug URL: #p/my-slug
	if (content.startsWith(SLUG_PREFIX)) {
		const slug = content.slice(SLUG_PREFIX.length);
		if (slug) {
			return { type: 'slug', slug };
		}
		return null;
	}

	// Check for compressed URL: #plan=<compressed>
	if (content.startsWith(URL_PREFIX)) {
		const compressed = content.slice(URL_PREFIX.length);
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
			return { type: 'compressed', state: state as UrlState };
		} catch {
			return null;
		}
	}

	return null;
}

/**
 * Decode plan state from URL hash (legacy function for backwards compatibility)
 * Returns null if no valid state found
 */
export function decodeFromUrl(hash: string): UrlState | null {
	const parsed = parseUrlHash(hash);
	if (parsed?.type === 'compressed') {
		return parsed.state;
	}
	return null;
}

/**
 * Encode slug to URL hash format
 */
export function encodeSlugUrl(slug: string): string {
	return `#${SLUG_PREFIX}${slug}`;
}

/**
 * Update the current URL hash with plan state (compressed format)
 * Uses replaceState to avoid polluting history
 */
export function updateUrlHash(state: UrlState): void {
	const hash = encodeToUrl(state);
	window.history.replaceState(null, '', hash);
}

/**
 * Update the current URL hash with slug format
 * Uses replaceState to avoid polluting history
 */
export function updateUrlWithSlug(slug: string): void {
	const hash = encodeSlugUrl(slug);
	window.history.replaceState(null, '', hash);
}

/**
 * Clear the URL hash
 */
export function clearUrlHash(): void {
	window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

/**
 * Check if current URL has plan data (either slug or compressed)
 */
export function hasUrlState(): boolean {
	const hash = window.location.hash;
	return hash.startsWith(`#${URL_PREFIX}`) || hash.startsWith(`#${SLUG_PREFIX}`);
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
