/**
 * Compression utilities using lz-string
 * Used for URL state persistence and plan history storage
 */

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

/**
 * Compress a string for URL-safe storage
 */
export function compress(data: string): string {
	return compressToEncodedURIComponent(data);
}

/**
 * Decompress a URL-safe compressed string
 * Returns null if decompression fails
 */
export function decompress(data: string): string | null {
	try {
		const result = decompressFromEncodedURIComponent(data);
		return result ?? null;
	} catch {
		return null;
	}
}

/**
 * Estimate the size of a string in bytes (UTF-8)
 */
export function estimateSize(data: string): number {
	return new Blob([data]).size;
}

/**
 * Compress and return with metadata for debugging
 */
export function compressWithStats(data: string): { compressed: string; ratio: number; originalSize: number; compressedSize: number } {
	const compressed = compress(data);
	const originalSize = estimateSize(data);
	const compressedSize = estimateSize(compressed);
	const ratio = originalSize > 0 ? compressedSize / originalSize : 1;

	return {
		compressed,
		ratio,
		originalSize,
		compressedSize
	};
}
